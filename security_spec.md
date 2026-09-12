# Security Specification: HH Mineral Water Firestore Security Architecture

## 1. Data Invariants & Access Control Model

### A. Role-Based & Identity Invariants
- **Public Data**:
  - `products`: Publicly viewable catalog. Writes/updates/deletions strictly restricted to verified administrators (`isAdmin()`).
  - `settings`: Store operational settings, helpline numbers, and rates. Publicly viewable; writable only by verified administrators.
- **Orders Invariants**:
  - Any customer (authenticated or guest checkout) may create a new Order provided the payload adheres strictly to `isValidOrder(data)` (valid IDs, customer name, phone, item counts, total amounts, and initial status 'New').
  - Only administrators (`isAdmin()`) can change order status or update order fields.
  - Deletion of orders is strictly restricted to administrators.
  - Terminal states (`Cancelled`, `Delivered`) cannot be altered by non-administrators.
- **Invoices Invariants**:
  - Invoices are linked to valid order IDs.
  - Creation is allowed when creating an order (`isValidInvoice(data)`).
  - Modifications or deletions are strictly reserved for administrators.
- **User Profiles & PII Invariants**:
  - `users/{userId}` contains sensitive personal identifiable information (PII) including full names, saved delivery addresses, phone numbers, and emails.
  - Read and Write permissions are strictly confined to `isOwner(userId) || isAdmin()`.
  - Blanket reads or public listing of user documents is strictly denied.
- **Audit Logs Invariants**:
  - `product_audit_logs/{logId}` records administrative actions on product catalogs.
  - Creation requires `isValidProductAuditLog(data)`.
  - Updates and deletions are restricted to administrators.

---

## 2. The "Dirty Dozen" Threat Payloads (Negative Test Cases)

1. **Payload 1 (Shadow Field Injection in Product)**:
   - Attempt: Attacker writes a product with an arbitrary unverified property `{ id: 'p1', name: 'Water', price: 10, evilBackdoor: true }`.
   - Invariant Violation: Violates the strict field validation schema.

2. **Payload 2 (Unauthenticated Product Deletion)**:
   - Attempt: Unauthenticated user sends `DELETE /products/prod-250ml`.
   - Invariant Violation: Non-admin deletion of global catalog item.

3. **Payload 3 (Order Status Tampering by Guest)**:
   - Attempt: Client issues an update setting `status: 'Delivered'` on an unpaid or active order without admin credentials.
   - Invariant Violation: State progression gate bypass.

4. **Payload 4 (Identity Spoofing in Customer Profile)**:
   - Attempt: Authenticated user `UID_A` attempts to read or modify `/users/UID_B`.
   - Invariant Violation: PII isolation breach (Horizontal privilege escalation).

5. **Payload 5 (Role Escalation in User Profile)**:
   - Attempt: Customer updates their own user profile `{ role: 'admin' }`.
   - Invariant Violation: Self-assigned privilege escalation.

6. **Payload 6 (Oversized ID Resource Poisoning)**:
   - Attempt: Attacker attempts to write a document with a 2,000-character junk string as `productId` or `orderId`.
   - Invariant Violation: Denial of Wallet / Resource exhaustion attack.

7. **Payload 7 (Negative Price / Total Amount Exploitation)**:
   - Attempt: Order submitted with `totalAmount: -500`.
   - Invariant Violation: Data boundary invariant failure.

8. **Payload 8 (Terminal State Modification)**:
   - Attempt: Customer attempts to revive or alter an order whose status is `Delivered` or `Cancelled`.
   - Invariant Violation: Terminal state lock violation.

9. **Payload 9 (Unbounded Array Injection in Order Items)**:
   - Attempt: Attacker sends an order with 5,000 synthetic cart items to exhaust database write limits.
   - Invariant Violation: Array boundary limit violation (`items.size() <= 100`).

10. **Payload 10 (Global Settings Override by Public)**:
    - Attempt: Unauthenticated client updates `/settings/store_config` setting `freeDeliveryMinAmount: 0`.
    - Invariant Violation: Unauthorized store policy mutation.

11. **Payload 11 (Audit Log Destruction)**:
    - Attempt: Non-admin sends `DELETE /product_audit_logs/audit-123`.
    - Invariant Violation: Tampering with compliance and audit trails.

12. **Payload 12 (Invoice Data Manipulation)**:
    - Attempt: Non-admin updates an existing invoice to alter `grandTotal` or tax amounts.
    - Invariant Violation: Legal GST billing document modification attempt.

---

## 3. Test Runner Definition: `firestore.rules.test.ts`

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'lithe-benefit-q6b5h',
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore Security Rules Matrix', () => {
  test('DD-1: Denies product write from non-admin', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(unauthDb, 'products', 'p1'), { id: 'p1', name: 'Water', price: 10 }));
  });

  test('DD-2: Denies product delete from non-admin', async () => {
    const userDb = testEnv.authenticatedContext('user_123').firestore();
    await assertFails(deleteDoc(doc(userDb, 'products', 'prod-250ml')));
  });

  test('DD-4: Denies accessing foreign user PII profile', async () => {
    const userDb = testEnv.authenticatedContext('user_123').firestore();
    await assertFails(getDoc(doc(userDb, 'users', 'user_victim')));
  });

  test('DD-7: Denies order creation with negative amount', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(unauthDb, 'orders', 'HH-ORD-1'), {
        id: 'HH-ORD-1',
        totalAmount: -100,
        status: 'New',
        customer: { name: 'Test', phone: '8017341130', address: 'Kolkata', city: 'Kolkata', pincode: '700001' },
        items: []
      })
    );
  });

  test('DD-10: Denies store settings modification from non-admin', async () => {
    const userDb = testEnv.authenticatedContext('user_123').firestore();
    await assertFails(setDoc(doc(userDb, 'settings', 'store_config'), { freeDeliveryMinAmount: 0 }));
  });

  test('DD-11: Denies deleting audit logs', async () => {
    const userDb = testEnv.authenticatedContext('user_123').firestore();
    await assertFails(deleteDoc(doc(userDb, 'product_audit_logs', 'log-1')));
  });

  test('DD-12: Denies modifying existing invoice', async () => {
    const userDb = testEnv.authenticatedContext('user_123').firestore();
    await assertFails(updateDoc(doc(userDb, 'invoices', 'HH-2026-0001'), { grandTotal: 0 }));
  });
});
```
