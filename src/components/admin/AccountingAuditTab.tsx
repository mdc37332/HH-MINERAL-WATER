import React, { useState, useMemo, useEffect } from 'react';
import {
  Invoice,
  PlantExpense,
  PurchaseExpenseCategory,
  ManualJournalVoucher,
  AdminSettings,
  JournalEntry,
  LedgerAccount,
  AccountCategory
} from '../../types';
import { useStore } from '../../context/StoreContext';
import { safeStorage } from '../../lib/storage';
import { INITIAL_PLANT_EXPENSES } from '../../data/initialProducts';
import {
  generateJournalEntries,
  buildGeneralLedger,
  buildTrialBalance,
  buildProfitAndLoss,
  buildBalanceSheet,
  buildCaAuditSummary,
  exportJournalToCsv,
  exportTrialBalanceToCsv,
  fitAllProductRevenueInvoices,
  STANDARD_ACCOUNT_HEADS
} from '../../lib/accountingEngine';
import { getFinancialYear } from '../../lib/invoiceGenerator';
import {
  BookOpen,
  Receipt,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Printer,
  FileDown,
  Filter,
  Search,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  Scale,
  ArrowRight,
  X,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Trash2,
  Zap,
  Lock,
  ShieldAlert,
  AlertOctagon,
  Check
} from 'lucide-react';

interface AccountingAuditTabProps {
  invoices: Invoice[];
  expenses: PlantExpense[];
  settings?: AdminSettings;
  focusedInvoiceId?: string | null;
  onViewInvoiceModal?: (invoice: Invoice) => void;
}

export const AccountingAuditTab: React.FC<AccountingAuditTabProps> = ({
  invoices = [],
  expenses = [],
  settings,
  focusedInvoiceId,
  onViewInvoiceModal
}) => {
  const {
    adminSettings,
    showToast,
    orders = [],
    invoices: storeInvoices = [],
    saveInvoiceToDb,
    isAdminUnlocked,
    isFactoryStaffUnlocked,
    deleteInvoice,
    deleteAllInvoices
  } = useStore();
  const effectiveSettings = settings || adminSettings;

  // Role discriminator: Factory staff has view-only access, all delete actions strictly reserved for Admin
  const isFactoryStaffMode = Boolean(isFactoryStaffUnlocked && !isAdminUnlocked);
  const isAdmin = Boolean(isAdminUnlocked);

  // Active Sub-Tab
  const [subTab, setSubTab] = useState<'journal' | 'ledger' | 'trial-balance' | 'pnl' | 'balance-sheet' | 'purchases' | 'ca-audit'>('journal');
  const [financialYear, setFinancialYear] = useState<string>(() => getFinancialYear());
  const [journalSearch, setJournalSearch] = useState<string>(focusedInvoiceId || '');
  const [journalTypeFilter, setJournalTypeFilter] = useState<string>('all');
  const [selectedLedgerCode, setSelectedLedgerCode] = useState<string>(STANDARD_ACCOUNT_HEADS.SALES_WATER_2201.code);
  const [pnlViewMode, setPnlViewMode] = useState<'schedule3' | 'tformat'>('schedule3');

  // Zero-Base Accounts Mode: Starts strictly from ₹0.00 (all transactions dynamically collected from live product sales revenue & raw material purchases)
  const [zeroBaseMode, setZeroBaseMode] = useState<boolean>(() => effectiveSettings?.accountingZeroBaseMode !== false);

  // Master Account Wipe state: Clears all accounting records and resets ledgers strictly to ₹0.00
  const [isAccountWiped, setIsAccountWiped] = useState<boolean>(() => {
    try {
      return safeStorage.getItem('hh_accounting_wiped_v1') === 'true';
    } catch {
      return false;
    }
  });

  // Master Account Wipe timestamp (blocks pre-wipe orders/invoices from ever re-appearing)
  const [wipedInvoicesBefore, setWipedInvoicesBefore] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem('hh_accounting_wiped_before_v1');
      return saved ? Number(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Track individual deleted journal entries / invoices / orders
  const [deletedJournalIds, setDeletedJournalIds] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem('hh_deleted_journal_ids_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Deletion Confirmation Modals State
  const [isConfirmDeleteAllAccountsOpen, setIsConfirmDeleteAllAccountsOpen] = useState(false);
  const [isConfirmDeleteAllPurchasesOpen, setIsConfirmDeleteAllPurchasesOpen] = useState(false);
  const [isConfirmDeleteAllJournalOpen, setIsConfirmDeleteAllJournalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PlantExpense | null>(null);
  const [isDeletingAccounts, setIsDeletingAccounts] = useState(false);
  const [wipeExpensesChecked, setWipeExpensesChecked] = useState(true);
  const [wipeManualVouchersChecked, setWipeManualVouchersChecked] = useState(true);
  const [wipeInvoicesChecked, setWipeInvoicesChecked] = useState(true);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Plant Expenses & Raw Material Purchases persistence (strictly honors empty [] after deletion)
  const [plantExpenses, setPlantExpenses] = useState<PlantExpense[]>(() => {
    try {
      const wiped = safeStorage.getItem('hh_accounting_wiped_v1') === 'true';
      const saved = safeStorage.getItem('hh_plant_expenses');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      if (wiped) return [];
    } catch {}
    return expenses.length > 0 ? expenses : INITIAL_PLANT_EXPENSES;
  });

  // Keep plantExpenses synchronized if modified/deleted in another tab (e.g., PlantExpensesTab or AdminPanel)
  useEffect(() => {
    const syncExpenses = () => {
      try {
        const saved = safeStorage.getItem('hh_plant_expenses');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setPlantExpenses(parsed);
          }
        }
      } catch {}
    };
    window.addEventListener('hh_plant_expenses_updated', syncExpenses);
    return () => window.removeEventListener('hh_plant_expenses_updated', syncExpenses);
  }, []);

  // Modal State: Record Raw Material Purchase
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [purchaseCategory, setPurchaseCategory] = useState<PurchaseExpenseCategory>('PET Preforms & Caps');
  const [purchaseTitle, setPurchaseTitle] = useState('');
  const [purchaseVendor, setPurchaseVendor] = useState('Apex Polymers India Ltd.');
  const [purchaseGstin, setPurchaseGstin] = useState('19AAACP9981K1Z3');
  const [purchaseBillRef, setPurchaseBillRef] = useState('');
  const [purchaseHsn, setPurchaseHsn] = useState('3923');
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(5000);
  const [purchaseUnit, setPurchaseUnit] = useState('pcs');
  const [purchaseTaxableAmount, setPurchaseTaxableAmount] = useState<number>(12000);
  const [purchaseGstRate, setPurchaseGstRate] = useState<number>(18);
  const [purchasePaymentMode, setPurchasePaymentMode] = useState<'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque' | 'Credit / Sundry Creditor'>('Bank Transfer');
  const [purchasePaymentStatus, setPurchasePaymentStatus] = useState<'Paid' | 'Pending / Credit Due'>('Paid');
  const [purchaseItcEligible, setPurchaseItcEligible] = useState<boolean>(true);
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [purchasesCategoryFilter, setPurchasesCategoryFilter] = useState('all');

  // Manual Journal Vouchers persistence
  const [manualVouchers, setManualVouchers] = useState<ManualJournalVoucher[]>(() => {
    try {
      const saved = safeStorage.getItem('hh_manual_vouchers_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isNewVoucherModalOpen, setIsNewVoucherModalOpen] = useState(false);
  const [newVoucherDate, setNewVoucherDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newVoucherNarration, setNewVoucherNarration] = useState('');
  const [newVoucherDebitCode, setNewVoucherDebitCode] = useState('6099'); // Depreciation
  const [newVoucherCreditCode, setNewVoucherCreditCode] = useState('1599'); // Accumulated Depreciation
  const [newVoucherAmount, setNewVoucherAmount] = useState<number>(5000);

  // 100% of product revenue automatically collected and fitted from active (non-deleted) orders and invoices
  const effectiveInvoices = useMemo(() => {
    if (isAccountWiped) return [];
    const rawInvoices = invoices && invoices.length > 0 ? invoices : storeInvoices;
    const filteredOrders = (orders || []).filter(o => {
      if (!o) return false;
      if (deletedJournalIds.includes(o.id) || (o.invoiceNumber && deletedJournalIds.includes(o.invoiceNumber))) {
        return false;
      }
      if (wipedInvoicesBefore > 0) {
        const createdMs = new Date(o.createdAt || 0).getTime();
        if (createdMs && createdMs <= wipedInvoicesBefore) return false;
      }
      return true;
    });
    const filteredRawInvoices = (rawInvoices || []).filter(inv => {
      if (!inv) return false;
      const invId1 = `JV-SALES-${inv.invoiceNumber}`;
      const invId2 = inv.invoiceNumber || inv.id;
      if (
        deletedJournalIds.includes(invId1) ||
        deletedJournalIds.includes(invId2) ||
        deletedJournalIds.includes(inv.id) ||
        (inv.orderId && deletedJournalIds.includes(inv.orderId))
      ) {
        return false;
      }
      if (wipedInvoicesBefore > 0) {
        const createdMs = new Date(inv.createdAt || inv.invoiceDate || 0).getTime();
        if (createdMs && createdMs <= wipedInvoicesBefore) return false;
      }
      return true;
    });
    const fitted = fitAllProductRevenueInvoices(filteredOrders, filteredRawInvoices, effectiveSettings);
    if (deletedJournalIds.length > 0) {
      return fitted.filter(inv => {
        const invId1 = `JV-SALES-${inv.invoiceNumber}`;
        const invId2 = inv.invoiceNumber || inv.id;
        return (
          !deletedJournalIds.includes(invId1) &&
          !deletedJournalIds.includes(invId2) &&
          !deletedJournalIds.includes(inv.id) &&
          !(inv.orderId && deletedJournalIds.includes(inv.orderId))
        );
      });
    }
    return fitted;
  }, [orders, invoices, storeInvoices, effectiveSettings, isAccountWiped, wipedInvoicesBefore, deletedJournalIds]);

  // Accounting Engine computations
  const journalEntries = useMemo(() => {
    if (isAccountWiped) return [];
    const entries = generateJournalEntries(effectiveInvoices, plantExpenses, manualVouchers, effectiveSettings);
    if (deletedJournalIds.length > 0) {
      return entries.filter(e => !deletedJournalIds.includes(e.id) && !deletedJournalIds.includes(e.referenceId));
    }
    return entries;
  }, [effectiveInvoices, plantExpenses, manualVouchers, effectiveSettings, isAccountWiped, deletedJournalIds]);

  const generalLedger = useMemo(() => {
    return buildGeneralLedger(journalEntries, undefined, zeroBaseMode);
  }, [journalEntries, zeroBaseMode]);

  const trialBalance = useMemo(() => {
    return buildTrialBalance(generalLedger, undefined, financialYear);
  }, [generalLedger, financialYear]);

  const pnlStatement = useMemo(() => {
    return buildProfitAndLoss(generalLedger, financialYear, zeroBaseMode);
  }, [generalLedger, financialYear, zeroBaseMode]);

  const balanceSheet = useMemo(() => {
    return buildBalanceSheet(generalLedger, pnlStatement, undefined, financialYear, zeroBaseMode);
  }, [generalLedger, pnlStatement, financialYear, zeroBaseMode]);

  const caAuditSummary = useMemo(() => {
    return buildCaAuditSummary(effectiveInvoices, effectiveSettings, financialYear);
  }, [effectiveInvoices, effectiveSettings, financialYear]);

  // Filtered Journal Entries
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter(e => {
      if (journalTypeFilter !== 'all') {
        if (journalTypeFilter === 'sales' && e.sourceType !== 'invoice') return false;
        if (journalTypeFilter === 'expense' && e.sourceType !== 'expense') return false;
        if (journalTypeFilter === 'manual' && e.sourceType !== 'manual_jv') return false;
      }
      if (journalSearch.trim()) {
        const q = journalSearch.toLowerCase().trim();
        const matchVoucher = e.voucherNumber.toLowerCase().includes(q);
        const matchRef = e.referenceId.toLowerCase().includes(q);
        const matchParty = (e.customerName || e.vendorName || '').toLowerCase().includes(q);
        const matchNarration = e.narration.toLowerCase().includes(q);
        const matchAccount = e.lines.some(l => l.accountName.toLowerCase().includes(q) || l.accountCode.includes(q));
        return matchVoucher || matchRef || matchParty || matchNarration || matchAccount;
      }
      return true;
    });
  }, [journalEntries, journalTypeFilter, journalSearch]);

  // Selected Ledger Account
  const activeLedgerAccount = generalLedger[selectedLedgerCode] || Object.values(generalLedger)[0];

  // Save manual voucher
  const handleSaveManualVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVoucherAmount <= 0) {
      showToast?.('Invalid Amount', 'Please specify a positive voucher amount.', 'warning');
      return;
    }
    const debHead = Object.values(STANDARD_ACCOUNT_HEADS).find(h => h.code === newVoucherDebitCode);
    const credHead = Object.values(STANDARD_ACCOUNT_HEADS).find(h => h.code === newVoucherCreditCode);

    if (!debHead || !credHead) {
      showToast?.('Invalid Accounts', 'Please select valid Debit and Credit accounts.', 'error');
      return;
    }

    const created: ManualJournalVoucher = {
      id: `JV-${Date.now()}`,
      voucherNumber: `JV/2026/${String(manualVouchers.length + 1).padStart(4, '0')}`,
      date: newVoucherDate,
      narration: newVoucherNarration.trim() || `Being adjusting entry for ${debHead.name} to ${credHead.name}.`,
      lines: [
        {
          accountCode: debHead.code,
          accountName: debHead.name,
          category: debHead.category,
          debit: newVoucherAmount,
          credit: 0
        },
        {
          accountCode: credHead.code,
          accountName: credHead.name,
          category: credHead.category,
          debit: 0,
          credit: newVoucherAmount
        }
      ],
      createdAt: new Date().toISOString()
    };

    const updated = [created, ...manualVouchers];
    setManualVouchers(updated);
    if (isAccountWiped) {
      setIsAccountWiped(false);
      try {
        safeStorage.removeItem('hh_accounting_wiped_v1');
      } catch {}
    }
    try {
      safeStorage.setItem('hh_manual_vouchers_v1', JSON.stringify(updated));
    } catch {}

    setIsNewVoucherModalOpen(false);
    setNewVoucherNarration('');
    showToast?.('Journal Voucher Posted', `JV ${created.voucherNumber} created for ₹${newVoucherAmount.toLocaleString('en-IN')}.`, 'success');
  };

  // Save Raw Material Purchase
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseTaxableAmount <= 0) {
      showToast?.('Invalid Taxable Amount', 'Please specify a positive taxable amount for raw material purchase.', 'warning');
      return;
    }

    const rate = purchaseGstRate;
    const cgst = purchaseItcEligible ? Math.round((purchaseTaxableAmount * (rate / 200)) * 100) / 100 : 0;
    const sgst = purchaseItcEligible ? Math.round((purchaseTaxableAmount * (rate / 200)) * 100) / 100 : 0;
    const totalAmount = Math.round((purchaseTaxableAmount + cgst + sgst) * 100) / 100;

    const newPurchase: PlantExpense = {
      id: `PUR-${Date.now()}`,
      date: purchaseDate,
      category: purchaseCategory,
      title: purchaseTitle.trim() || `${purchaseCategory} (${purchaseQuantity} ${purchaseUnit})`,
      amount: totalAmount,
      taxableAmount: purchaseTaxableAmount,
      gstRate: rate,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: 0,
      hsnCode: purchaseHsn || '3923',
      vendorName: purchaseVendor.trim() || 'Raw Material Supplier',
      vendorGstin: purchaseGstin.trim().toUpperCase() || 'URP',
      invoiceOrBillRef: purchaseBillRef.trim() || `BILL-${Date.now().toString().slice(-5)}`,
      paymentMode: purchasePaymentMode,
      paymentStatus: purchasePaymentStatus,
      itcEligible: purchaseItcEligible,
      quantity: purchaseQuantity,
      unit: purchaseUnit,
      notes: purchaseNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    const updated = [newPurchase, ...plantExpenses];
    setPlantExpenses(updated);
    if (isAccountWiped) {
      setIsAccountWiped(false);
      try {
        safeStorage.removeItem('hh_accounting_wiped_v1');
      } catch {}
    }
    try {
      safeStorage.setItem('hh_plant_expenses', JSON.stringify(updated));
      window.dispatchEvent(new Event('hh_plant_expenses_updated'));
    } catch {}

    setIsNewPurchaseModalOpen(false);
    setPurchaseTitle('');
    setPurchaseBillRef('');
    showToast?.(
      'Raw Material Purchase Recorded',
      `Bill #${newPurchase.invoiceOrBillRef} for ₹${totalAmount.toLocaleString('en-IN')} posted to journal & ITC register.`,
      'success'
    );
  };

  // Delete Raw Material Purchase (Single - Admin Only)
  const handleDeletePurchase = (purchaseId: string) => {
    if (!isAdmin) {
      showToast?.('Admin Access Required', 'Only Administrator can delete purchase records. Factory staff has view-only access.', 'error');
      return;
    }
    const target = plantExpenses.find(p => p.id === purchaseId);
    if (target) {
      setPurchaseToDelete(target);
    } else {
      const updated = plantExpenses.filter(p => p.id !== purchaseId);
      setPlantExpenses(updated);
      try {
        safeStorage.setItem('hh_plant_expenses', JSON.stringify(updated));
        window.dispatchEvent(new Event('hh_plant_expenses_updated'));
      } catch {}
      showToast?.('Purchase Deleted', 'Raw material purchase voucher removed from books.', 'info');
    }
  };

  const handleConfirmDeletePurchase = () => {
    if (!isAdmin) {
      showToast?.('Admin Access Required', 'Only Administrator can delete purchase records.', 'error');
      return;
    }
    if (!purchaseToDelete) return;
    const purchaseId = purchaseToDelete.id;
    const updated = plantExpenses.filter(p => p.id !== purchaseId);
    setPlantExpenses(updated);
    const nextDeleted = Array.from(new Set([
      ...deletedJournalIds,
      purchaseId,
      `JV-EXP-${purchaseId}`,
      ...(purchaseToDelete.invoiceOrBillRef ? [purchaseToDelete.invoiceOrBillRef] : [])
    ])).filter(Boolean);
    setDeletedJournalIds(nextDeleted);
    try {
      safeStorage.setItem('hh_plant_expenses', JSON.stringify(updated));
      safeStorage.setItem('hh_deleted_journal_ids_v1', JSON.stringify(nextDeleted));
      window.dispatchEvent(new Event('hh_plant_expenses_updated'));
    } catch {}
    setPurchaseToDelete(null);
    showToast?.('Purchase Deleted', `Bill #${purchaseToDelete.invoiceOrBillRef || purchaseToDelete.id} permanently deleted from books.`, 'info');
  };

  // Delete All Raw Material Purchases (Admin Only)
  const handleDeleteAllPurchases = () => {
    if (!isAdmin) {
      showToast?.('Admin Access Required', 'Only Administrator can delete purchases register. Factory staff has view-only access.', 'error');
      return;
    }
    const deletedExpIds = plantExpenses.flatMap(p => [p.id, `JV-EXP-${p.id}`, p.invoiceOrBillRef || '']).filter(Boolean);
    const nextDeleted = Array.from(new Set([...deletedJournalIds, ...deletedExpIds]));
    setPlantExpenses([]);
    setDeletedJournalIds(nextDeleted);
    try {
      safeStorage.setItem('hh_plant_expenses', JSON.stringify([]));
      safeStorage.setItem('hh_deleted_journal_ids_v1', JSON.stringify(nextDeleted));
      window.dispatchEvent(new Event('hh_plant_expenses_updated'));
    } catch {}
    setIsConfirmDeleteAllPurchasesOpen(false);
    showToast?.('All Purchases Deleted', 'Raw materials purchase register and ITC claims have been permanently deleted.', 'info');
  };

  // Delete Single Journal Entry (Admin Only)
  const handleDeleteJournalEntry = async (entry: JournalEntry) => {
    if (!isAdmin) {
      showToast?.('Admin Access Required', 'Only Administrator can delete journal vouchers. Factory staff has view-only access.', 'error');
      return;
    }

    const extraDeletedIds: string[] = [entry.id, entry.referenceId];

    if (entry.sourceType === 'manual_jv') {
      const updated = manualVouchers.filter(v => v.id !== entry.referenceId && v.voucherNumber !== entry.voucherNumber);
      setManualVouchers(updated);
      try {
        safeStorage.setItem('hh_manual_vouchers_v1', JSON.stringify(updated));
      } catch {}
    } else if (entry.sourceType === 'expense') {
      const updated = plantExpenses.filter(p => p.id !== entry.referenceId && p.invoiceOrBillRef !== entry.referenceId);
      setPlantExpenses(updated);
      try {
        safeStorage.setItem('hh_plant_expenses', JSON.stringify(updated));
        window.dispatchEvent(new Event('hh_plant_expenses_updated'));
      } catch {}
    } else if (entry.sourceType === 'invoice') {
      const matchingInv = [...effectiveInvoices, ...storeInvoices, ...invoices].find(
        inv =>
          inv.invoiceNumber === entry.referenceId ||
          inv.id === entry.referenceId ||
          `JV-SALES-${inv.invoiceNumber}` === entry.id
      );
      if (matchingInv) {
        if (matchingInv.id) extraDeletedIds.push(matchingInv.id);
        if (matchingInv.invoiceNumber) extraDeletedIds.push(matchingInv.invoiceNumber, `JV-SALES-${matchingInv.invoiceNumber}`);
        if (matchingInv.orderId) extraDeletedIds.push(matchingInv.orderId);
      }
      if (deleteInvoice && (matchingInv?.id || entry.referenceId)) {
        try {
          await deleteInvoice(matchingInv?.id || entry.referenceId);
        } catch (err) {
          console.warn('Error deleting invoice from journal:', err);
        }
      }
    }

    const nextDeleted = Array.from(new Set([...deletedJournalIds, ...extraDeletedIds])).filter(Boolean);
    setDeletedJournalIds(nextDeleted);
    try {
      safeStorage.setItem('hh_deleted_journal_ids_v1', JSON.stringify(nextDeleted));
    } catch {}

    setEntryToDelete(null);
    showToast?.('Journal Entry Deleted', `Voucher #${entry.voucherNumber} permanently deleted from daybook and ledger accounts.`, 'info');
  };

  // Delete All Journal Entries (Admin Only)
  const handleDeleteAllJournalEntries = async () => {
    if (!isAdmin) {
      showToast?.('Admin Access Required', 'Only Administrator can clear journal vouchers.', 'error');
      return;
    }

    setManualVouchers([]);
    try {
      safeStorage.setItem('hh_manual_vouchers_v1', JSON.stringify([]));
    } catch {}

    const allIds: string[] = [];
    journalEntries.forEach(e => {
      allIds.push(e.id, e.referenceId);
      if (e.sourceType === 'invoice') {
        const matchingInv = [...effectiveInvoices, ...storeInvoices, ...invoices].find(
          inv => inv.invoiceNumber === e.referenceId || inv.id === e.referenceId || `JV-SALES-${inv.invoiceNumber}` === e.id
        );
        if (matchingInv?.id) allIds.push(matchingInv.id);
        if (matchingInv?.invoiceNumber) allIds.push(matchingInv.invoiceNumber, `JV-SALES-${matchingInv.invoiceNumber}`);
        if (matchingInv?.orderId) allIds.push(matchingInv.orderId);
      }
    });
    orders.forEach(o => {
      if (o?.id) allIds.push(o.id);
      if (o?.invoiceNumber) allIds.push(o.invoiceNumber, `JV-SALES-${o.invoiceNumber}`);
    });

    const nowMs = Date.now();
    setWipedInvoicesBefore(nowMs);
    const updated = Array.from(new Set([...deletedJournalIds, ...allIds])).filter(Boolean);
    setDeletedJournalIds(updated);
    try {
      safeStorage.setItem('hh_deleted_journal_ids_v1', JSON.stringify(updated));
      safeStorage.setItem('hh_accounting_wiped_before_v1', String(nowMs));
    } catch {}

    setIsConfirmDeleteAllJournalOpen(false);
    showToast?.('Daybook Cleared', 'All journal vouchers and daybook postings permanently cleared from books.', 'info');
  };

  // Master: Delete All Detail From Account & Zero Ledger (Admin Only)
  const handleDeleteAllAccountDetails = async () => {
    if (!isAdmin) {
      showToast?.('Admin Access Required', 'Only Administrator can delete or reset accounting records and journals. Factory staff has view-only access.', 'error');
      return;
    }

    setIsDeletingAccounts(true);
    try {
      const wipedIds = [...deletedJournalIds];

      if (wipeExpensesChecked) {
        plantExpenses.forEach(p => {
          wipedIds.push(p.id, `JV-EXP-${p.id}`);
          if (p.invoiceOrBillRef) wipedIds.push(p.invoiceOrBillRef);
        });
        setPlantExpenses([]);
        try {
          safeStorage.setItem('hh_plant_expenses', JSON.stringify([]));
          window.dispatchEvent(new Event('hh_plant_expenses_updated'));
        } catch {}
      }

      if (wipeManualVouchersChecked) {
        manualVouchers.forEach(v => {
          wipedIds.push(v.id, v.voucherNumber);
        });
        setManualVouchers([]);
        try {
          safeStorage.setItem('hh_manual_vouchers_v1', JSON.stringify([]));
        } catch {}
      }

      if (wipeInvoicesChecked) {
        [...effectiveInvoices, ...storeInvoices, ...invoices].forEach(inv => {
          if (inv?.id) wipedIds.push(inv.id);
          if (inv?.invoiceNumber) wipedIds.push(inv.invoiceNumber, `JV-SALES-${inv.invoiceNumber}`);
          if (inv?.orderId) wipedIds.push(inv.orderId);
        });
        orders.forEach(o => {
          if (o?.id) wipedIds.push(o.id);
          if (o?.invoiceNumber) wipedIds.push(o.invoiceNumber, `JV-SALES-${o.invoiceNumber}`);
        });
        const nowMs = Date.now();
        setWipedInvoicesBefore(nowMs);
        try {
          safeStorage.setItem('hh_accounting_wiped_before_v1', String(nowMs));
        } catch {}
        if (deleteAllInvoices) {
          try {
            await deleteAllInvoices();
          } catch (err) {
            console.warn('Error purging invoices:', err);
          }
        }
      }

      const nextDeleted = Array.from(new Set(wipedIds)).filter(Boolean);
      setDeletedJournalIds(nextDeleted);
      const fullyWiped = wipeExpensesChecked && wipeManualVouchersChecked && wipeInvoicesChecked;
      setIsAccountWiped(fullyWiped);
      setZeroBaseMode(true);
      try {
        if (fullyWiped) {
          safeStorage.setItem('hh_accounting_wiped_v1', 'true');
        }
        safeStorage.setItem('hh_deleted_journal_ids_v1', JSON.stringify(nextDeleted));
      } catch {}

      setIsConfirmDeleteAllAccountsOpen(false);
      setDeleteConfirmationText('');
      showToast?.(
        'All Account Details Deleted & Books Zeroed',
        'All selected transactions permanently deleted from ledger. Accounts remain cleared.',
        'success'
      );
    } finally {
      setIsDeletingAccounts(false);
    }
  };


  // 1-Click Sync All Store Orders into official GST Invoices
  const handleSyncAllOrdersToInvoices = async () => {
    let newlyCreatedCount = 0;
    for (const inv of effectiveInvoices) {
      const exists = storeInvoices.some(si => si.id === inv.id || si.orderId === inv.orderId || si.invoiceNumber === inv.invoiceNumber);
      if (!exists && saveInvoiceToDb) {
        try {
          await saveInvoiceToDb(inv);
          newlyCreatedCount++;
        } catch {}
      }
    }
    showToast?.(
      'Product Revenue Auto-Fitted',
      `Synchronized ${effectiveInvoices.length} orders into official GST invoices (Total: ₹${caAuditSummary.grossTurnover.toLocaleString('en-IN')}).`,
      'success'
    );
  };

  // Export handlers
  const handleExportJournalCsv = () => {
    const csv = exportJournalToCsv(filteredJournalEntries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HH_Mineral_Water_Journal_Register_${financialYear}.csv`;
    a.click();
    showToast?.('Journal Exported', 'Journal register downloaded as CSV (Tally / Excel compatible).', 'success');
  };

  const handleExportTrialBalanceCsv = () => {
    const csv = exportTrialBalanceToCsv(trialBalance);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HH_Mineral_Water_Trial_Balance_${financialYear}.csv`;
    a.click();
    showToast?.('Trial Balance Exported', 'Trial balance statement downloaded as CSV.', 'success');
  };

  const handlePrintAuditPack = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-slate-800 animate-in fade-in">
      {/* TOP HEADER: CA Audit & Statutory Suite */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-cyan-900/40 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-black shadow-inner shrink-0">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  Statutory Accounting Engine
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Double-Entry (Mercantile Accrual)
                </span>
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-black text-white mt-1">
                Chartered Accountant (CA) Audit & Final Accounts
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Automated double-entry general journal, ledger khata, balanced trial balance, manufacturing P&L, and balance sheet generated directly from live GST Tax Invoices and factory expenses.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Master: Delete All Detail From Account (Admin Only) */}
            {isAdmin ? (
              <button
                type="button"
                id="btn-delete-all-accounts"
                onClick={() => setIsConfirmDeleteAllAccountsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer bg-rose-500/20 text-rose-300 border-rose-400/40 hover:bg-rose-500/35 hover:text-white shadow-xs"
                title="Admin Only: Delete all account details, purge vouchers & purchases, and zero books"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete All Account Details</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-delete-all-accounts-locked"
                onClick={() => {
                  showToast?.('Admin Access Required', 'Only Administrator can delete or reset accounting records and journals. Factory staff has view-only access.', 'error');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-not-allowed bg-slate-800/80 text-slate-400 border-slate-700/60 opacity-80"
                title="🔒 Admin Only: Delete all account details"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Delete All Accounts</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded font-bold">Admin</span>
              </button>
            )}

            {/* Auto-Fit Revenue Button */}
            <button
              type="button"
              id="btn-autofit-product-revenue"
              onClick={handleSyncAllOrdersToInvoices}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition-all shadow-md cursor-pointer"
              title="Auto-Fit all store orders into compliant GST Tax Invoices and collect 100% of product revenue"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950" />
              <span>Auto-Fit Revenue ({orders.length} Orders)</span>
            </button>

            {/* Record Raw Material Purchase Button */}
            <button
              type="button"
              id="btn-record-raw-material"
              onClick={() => setIsNewPurchaseModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              title="Record raw material purchase (PET Preforms, Boxes, Minerals, Filters, Fleet Fuel) with Input Tax Credit (ITC)"
            >
              <Receipt className="w-3.5 h-3.5 text-purple-200" />
              <span>+ Raw Material</span>
            </button>

            {/* Financial Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 font-semibold">FY:</span>
              <select
                value={financialYear}
                onChange={e => setFinancialYear(e.target.value)}
                className="bg-transparent text-white font-bold font-mono outline-none cursor-pointer"
              >
                <option value="2026-27" className="bg-slate-900 text-white">2026-27</option>
                <option value="2025-26" className="bg-slate-900 text-white">2025-26</option>
                <option value="2024-25" className="bg-slate-900 text-white">2024-25</option>
              </select>
            </div>

            <button
              type="button"
              id="btn-add-manual-jv"
              onClick={() => setIsNewVoucherModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              title="Post Manual Journal Voucher (e.g. Depreciation, Adjustments)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Post JV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAuditPack}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="Print Official CA Audit Dossier"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print Dossier</span>
            </button>
          </div>
        </div>

        {/* Financial Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Turnover</span>
            <span className="text-sm font-black text-cyan-300 font-mono">
              ₹{caAuditSummary.grossTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Product Sales</span>
            <span className="text-sm font-black text-white font-mono">
              ₹{pnlStatement.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Output GST (18%)</span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              ₹{caAuditSummary.outputGstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Profit</span>
            <span className={`text-sm font-black font-mono ${pnlStatement.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{pnlStatement.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Operating Profit</span>
            <span className={`text-sm font-black font-mono ${pnlStatement.netProfitBeforeTax >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{pnlStatement.netProfitBeforeTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Trial Balance</span>
            <span className={`text-xs font-black inline-flex items-center gap-1 ${trialBalance.isBalanced ? 'text-emerald-300' : 'text-amber-400'}`}>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{trialBalance.isBalanced ? '100% Balanced' : `Diff: ₹${trialBalance.difference}`}</span>
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Balance Sheet</span>
            <span className={`text-xs font-black inline-flex items-center gap-1 ${balanceSheet.isBalanced ? 'text-emerald-300' : 'text-amber-400'}`}>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{balanceSheet.isBalanced ? '100% Balanced' : `Diff: ₹${balanceSheet.difference}`}</span>
            </span>
          </div>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold print:hidden">
        {[
          { id: 'journal', label: `General Journal (${journalEntries.length} Entries)`, icon: BookOpen },
          { id: 'ledger', label: 'General Ledger (Khata)', icon: Layers },
          { id: 'trial-balance', label: 'Trial Balance', icon: Scale, badge: trialBalance.isBalanced ? 'Balanced' : 'Check' },
          { id: 'pnl', label: 'Profit & Loss A/c (Trading & P&L)', icon: TrendingUp },
          { id: 'balance-sheet', label: 'Balance Sheet (Final Accounts)', icon: Building2, badge: balanceSheet.isBalanced ? 'Balanced' : 'Check' },
          { id: 'purchases', label: `Raw Materials & Purchases (${plantExpenses.length})`, icon: Receipt },
          { id: 'ca-audit', label: 'CA Audit & Form 3CD Checklist', icon: ShieldCheck, badge: 'Verified' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`accounting-tab-${tab.id}`}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white font-bold shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
                  tab.badge === 'Balanced' || tab.badge === 'Verified' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-amber-100 text-amber-800'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: GENERAL JOURNAL (DAYBOOK / ROZNAMCHA)
         ========================================================================= */}
      {subTab === 'journal' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search journal entries by voucher no, invoice ref, customer, or account name..."
                  value={journalSearch}
                  onChange={e => setJournalSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:border-cyan-600"
                />
                {journalSearch && (
                  <button
                    onClick={() => setJournalSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={journalTypeFilter}
                onChange={e => setJournalTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold cursor-pointer outline-none focus:border-cyan-600"
              >
                <option value="all">All Vouchers ({journalEntries.length})</option>
                <option value="sales">Sales Invoices ({effectiveInvoices.length})</option>
                <option value="expense">Factory Expenses ({isAccountWiped ? 0 : plantExpenses.length})</option>
                <option value="manual">Manual JVs ({manualVouchers.length})</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin ? (
                <button
                  type="button"
                  id="btn-delete-all-journal"
                  onClick={() => setIsConfirmDeleteAllJournalOpen(true)}
                  disabled={journalEntries.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Clear all journal daybook vouchers and postings"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete All Journal Entries</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => showToast?.('Admin Access Required', 'Only Administrator can delete or clear journal entries. Factory staff has view-only access.', 'error')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 font-bold cursor-not-allowed opacity-80"
                  title="🔒 Admin Only: Clear journal vouchers"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Delete All JVs</span>
                  <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-600 font-bold">Admin</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportJournalCsv}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold transition-colors cursor-pointer"
                title="Download Daybook Journal as CSV (Tally / Zoho Books ready)"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export Journal (CSV)</span>
              </button>
            </div>
          </div>

          {/* Double-Entry CA Audit Status Banner */}
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-950 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <span className="font-extrabold text-emerald-950 block">
                  Double-Entry Equilibrium Verified (Debit ≡ Credit)
                </span>
                <span className="text-[11px] text-emerald-700">
                  All {journalEntries.length} general journal vouchers are strictly balanced with zero paisa imbalance.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-200/60 text-emerald-900 border border-emerald-300">
                Audit Status: 100% Balanced
              </span>
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-3.5">
            {filteredJournalEntries.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600">No Journal Entries found.</p>
                <p className="text-xs text-slate-400 mt-1">
                  {isAccountWiped
                    ? 'All journal details have been wiped from account. Daybook starts at clean ₹0.00.'
                    : 'Journal entries are automatically created when GST invoices are issued or plant expenses are logged.'}
                </p>
              </div>
            ) : (
              filteredJournalEntries.map(entry => (
                <div
                  key={entry.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-cyan-600/40 transition-colors"
                >
                  {/* Voucher Header Bar */}
                  <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        entry.voucherType === 'Sales'
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                          : entry.voucherType === 'Purchase / Expense'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {entry.voucherType}
                      </span>
                      <span className="font-mono font-bold text-slate-900">{entry.voucherNumber}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-medium">{entry.date}</span>
                      {entry.referenceId && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-cyan-700 font-mono font-semibold">Ref: {entry.referenceId}</span>
                        </>
                      )}
                      {entry.customerName && (
                        <span className="text-slate-700 font-semibold hidden sm:inline">
                          — Party: {entry.customerName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-500">Dr/Cr Total:</span>
                      <span className="font-black text-slate-900">₹{entry.totalDebit.toFixed(2)}</span>
                      {entry.isBalanced ? (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          ✓ Balanced
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          Mismatch
                        </span>
                      )}

                      {/* Individual Delete Entry (Admin Only) */}
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setEntryToDelete(entry)}
                          className="ml-2 p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200 flex items-center gap-1 font-sans text-[11px] font-bold"
                          title={`Delete Journal Voucher #${entry.voucherNumber}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      ) : (
                        <span
                          className="ml-2 px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed flex items-center gap-0.5 font-sans"
                          title="Deletion locked: Administrator access required"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span className="hidden sm:inline">Locked</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Debits and Credits Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-4 w-28">Code</th>
                          <th className="py-1.5 px-3">Particulars (Account Head)</th>
                          <th className="py-1.5 px-3 text-right w-32">Debit (Dr. ₹)</th>
                          <th className="py-1.5 px-3 text-right w-32">Credit (Cr. ₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entry.lines.map((line, lIdx) => {
                          const isDr = line.debit > 0;
                          return (
                            <tr key={lIdx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-4 font-mono text-slate-500 font-medium">
                                {line.accountCode}
                              </td>
                              <td className="py-2 px-3">
                                <div className={`font-semibold ${isDr ? 'text-slate-900' : 'text-slate-700 pl-6'}`}>
                                  {isDr ? '' : 'To '}{line.accountName}
                                  {isDr && <span className="text-slate-400 font-normal ml-1">A/c ... Dr.</span>}
                                </div>
                                {line.notes && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">{line.notes}</div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {line.debit > 0 ? `₹${line.debit.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {line.credit > 0 ? `₹${line.credit.toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Narration Footer */}
                  <div className="bg-slate-50/40 px-4 py-2 border-t border-slate-100 text-[11px] text-slate-600 italic flex items-center justify-between">
                    <span>(Narration: {entry.narration})</span>
                    {entry.sourceType === 'invoice' && onViewInvoiceModal && (
                      <button
                        type="button"
                        onClick={() => {
                          const inv = invoices.find(i => i.invoiceNumber === entry.referenceId || i.id === entry.referenceId);
                          if (inv) onViewInvoiceModal(inv);
                        }}
                        className="not-italic text-cyan-700 hover:text-cyan-800 font-bold flex items-center gap-1 cursor-pointer ml-2 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Invoice</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: GENERAL LEDGER (KHATA BAHI)
         ========================================================================= */}
      {subTab === 'ledger' && (
        <div className="space-y-4">
          {/* Account Selector Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="flex-1">
              <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">
                Select General Ledger Account Head:
              </label>
              <select
                value={selectedLedgerCode}
                onChange={e => setSelectedLedgerCode(e.target.value)}
                className="w-full sm:w-auto min-w-[340px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900 text-sm focus:outline-none focus:border-cyan-600 cursor-pointer"
              >
                {(Object.values(generalLedger) as LedgerAccount[]).map(acc => (
                  <option key={acc.accountCode} value={acc.accountCode}>
                    [{acc.accountCode}] {acc.accountName} ({acc.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Account Summary Stats */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Opening Balance</span>
                <span className="font-mono font-bold text-slate-800">
                  ₹{activeLedgerAccount.openingBalance.toFixed(2)} {activeLedgerAccount.openingType}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Debit / Credit</span>
                <span className="font-mono font-bold text-slate-800">
                  ₹{activeLedgerAccount.totalDebit.toFixed(2)} / ₹{activeLedgerAccount.totalCredit.toFixed(2)}
                </span>
              </div>

              <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-200 text-right">
                <span className="text-[10px] text-cyan-800 uppercase font-bold block">Closing Balance</span>
                <span className="font-mono font-black text-cyan-900 text-sm">
                  ₹{activeLedgerAccount.closingBalance.toFixed(2)} {activeLedgerAccount.closingType}
                </span>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  [{activeLedgerAccount.accountCode}] {activeLedgerAccount.accountName}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Category: <span className="text-cyan-400 font-semibold">{activeLedgerAccount.category}</span> • Total Postings: {activeLedgerAccount.postings.length}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                Balance: ₹{activeLedgerAccount.closingBalance.toFixed(2)} {activeLedgerAccount.closingType}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-24">Date</th>
                    <th className="py-2.5 px-3 w-32">Voucher #</th>
                    <th className="py-2.5 px-3">Particulars (Contra Head / Details)</th>
                    <th className="py-2.5 px-3 text-right w-28">Debit (₹)</th>
                    <th className="py-2.5 px-3 text-right w-28">Credit (₹)</th>
                    <th className="py-2.5 px-4 text-right w-36">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/60 font-semibold">
                    <td className="py-2 px-4 text-slate-500 font-mono">01-Apr</td>
                    <td className="py-2 px-3 text-slate-400">—</td>
                    <td className="py-2 px-3 text-slate-700 italic">To / By Opening Balance b/f</td>
                    <td className="py-2 px-3 text-right font-mono">
                      {activeLedgerAccount.openingType === 'Dr' ? `₹${activeLedgerAccount.openingBalance.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {activeLedgerAccount.openingType === 'Cr' ? `₹${activeLedgerAccount.openingBalance.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{activeLedgerAccount.openingBalance.toFixed(2)} {activeLedgerAccount.openingType}
                    </td>
                  </tr>

                  {activeLedgerAccount.postings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No transactions posted in this account for the selected period.
                      </td>
                    </tr>
                  ) : (
                    activeLedgerAccount.postings.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono text-slate-600">{p.date}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-cyan-700">{p.voucherNumber}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800">{p.particulars}</span>
                          <span className="text-[10px] text-slate-400 block italic">{p.narration}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {p.debit > 0 ? `₹${p.debit.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {p.credit > 0 ? `₹${p.credit.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{p.runningBalance.toFixed(2)} <span className="text-[10px] text-slate-500">{p.balanceType}</span>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Totals & Closing Balance Row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-4 text-slate-900 uppercase">
                      Total & Closing Balance c/f
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900">
                      ₹{activeLedgerAccount.totalDebit.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900">
                      ₹{activeLedgerAccount.totalCredit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-cyan-800 text-sm font-black">
                      ₹{activeLedgerAccount.closingBalance.toFixed(2)} {activeLedgerAccount.closingType}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: TRIAL BALANCE
         ========================================================================= */}
      {subTab === 'trial-balance' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Trial Balance as of {trialBalance.asOfDate} (Financial Year {trialBalance.financialYear})
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Summary of all general ledger account balances to verify mathematical accuracy before drafting final accounts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportTrialBalanceCsv}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold cursor-pointer"
                title="Download Trial Balance as CSV"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export (CSV)</span>
              </button>
            </div>
          </div>

          {/* Trial Balance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-24">Account Code</th>
                    <th className="py-3 px-4">Account Head / Ledger Title</th>
                    <th className="py-3 px-3 text-center w-32">Classification</th>
                    <th className="py-3 px-4 text-right w-40">Debit Balance (₹)</th>
                    <th className="py-3 px-4 text-right w-40">Credit Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trialBalance.items.map((it, idx) => (
                    <tr key={it.accountCode} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-500">
                        {it.accountCode}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        {it.accountName}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          it.category === 'Asset'
                            ? 'bg-blue-100 text-blue-800'
                            : it.category === 'Liability'
                            ? 'bg-amber-100 text-amber-800'
                            : it.category === 'Equity'
                            ? 'bg-purple-100 text-purple-800'
                            : it.category === 'Revenue'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {it.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {it.debitBalance > 0 ? `₹${it.debitBalance.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {it.creditBalance > 0 ? `₹${it.creditBalance.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-slate-900 text-white font-black text-sm border-t-2 border-slate-900">
                    <td colSpan={3} className="py-3 px-4 uppercase tracking-wider">
                      TOTAL DEBITS & CREDITS
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-cyan-300">
                      ₹{trialBalance.totalDebits.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-cyan-300">
                      ₹{trialBalance.totalCredits.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Trial Balance Status Indicator */}
            <div className={`p-4 border-t flex items-center justify-between text-xs ${
              trialBalance.isBalanced ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold">
                  {trialBalance.isBalanced
                    ? '✓ Trial Balance is Arithmetically Verified & Perfectly Balanced.'
                    : `Trial Balance Difference detected: ₹${trialBalance.difference}`}
                </span>
              </div>
              <span className="font-mono font-bold">
                Difference: ₹{trialBalance.difference.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PROFIT & LOSS ACCOUNT (TRADING & P&L A/C)
         ========================================================================= */}
      {subTab === 'pnl' && (
        <div className="space-y-4">
          {/* Header & Format Toggle */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Trading & Profit and Loss Statement for the period ended (FY {pnlStatement.financialYear})
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Indian Accounting Standard compliant manufacturing & operations statement.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPnlViewMode('schedule3')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pnlViewMode === 'schedule3' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Vertical (Schedule III)
              </button>
              <button
                type="button"
                onClick={() => setPnlViewMode('tformat')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pnlViewMode === 'tformat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Traditional (T-Format)
              </button>
            </div>
          </div>

          {pnlViewMode === 'schedule3' ? (
            /* Vertical Schedule III Format */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-200 text-xs">
              {/* Part 1: Revenue from Operations */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-sm uppercase tracking-wider">
                    I. Revenue from Operations
                  </span>
                  <span className="font-mono font-bold text-slate-500 text-[11px]">Amount (₹)</span>
                </div>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Gross Sales of Packaged Drinking Water (HSN 2201)</span>
                    <span className="font-mono font-bold text-slate-900">₹{pnlStatement.grossSales.toFixed(2)}</span>
                  </div>
                  {pnlStatement.discountsAllowed > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Less: Volume Discounts & Trade Rebates Allowed</span>
                      <span className="font-mono font-bold">- ₹{pnlStatement.discountsAllowed.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1.5 border-t border-slate-100 text-slate-900">
                    <span>Net Sales Revenue (A)</span>
                    <span className="font-mono text-sm text-cyan-800">₹{pnlStatement.netSales.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Part 2: Cost of Materials Consumed & Direct Manufacturing */}
              <div className="p-5 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-sm uppercase tracking-wider">
                    II. Cost of Goods Sold (Direct Bottling Expenses)
                  </span>
                  <span className="font-mono font-bold text-slate-500 text-[11px]">Amount (₹)</span>
                </div>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Opening Stock of Bottled Water & Preforms</span>
                    <span className="font-mono">₹{pnlStatement.openingStock.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PET Preforms & Caps Consumed (13.5g / 28mm)</span>
                    <span className="font-mono">₹{pnlStatement.petPreformsAndCaps.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Corrugated Boxes & Shrink Packaging</span>
                    <span className="font-mono">₹{pnlStatement.corrugatedBoxesAndPackaging.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plant Electricity & Industrial RO Treatment Power</span>
                    <span className="font-mono">₹{pnlStatement.waterTreatmentAndPlantPower.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plant Bottling & Inspection Shift Wages</span>
                    <span className="font-mono">₹{pnlStatement.plantBottlingWages.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Less: Closing Stock of Finished Bottles & Materials</span>
                    <span className="font-mono">- ₹{pnlStatement.closingStock.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1.5 border-t border-slate-200 text-slate-900">
                    <span>Cost of Goods Sold (B)</span>
                    <span className="font-mono text-slate-900">₹{pnlStatement.costOfGoodsSold.toFixed(2)}</span>
                  </div>
                </div>

                {/* Gross Profit Callout */}
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between font-bold text-emerald-950">
                  <div>
                    <span className="text-sm">GROSS PROFIT (A - B)</span>
                    <span className="text-xs text-emerald-700 block font-normal">
                      Gross Margin: {pnlStatement.grossProfitMarginPercent}%
                    </span>
                  </div>
                  <span className="font-mono text-base font-black text-emerald-700">
                    ₹{pnlStatement.grossProfit.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Part 3: Other Operating Incomes */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-sm uppercase tracking-wider">
                    III. Other Operating Incomes
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Freight & Doorstep Delivery Charges Recovered</span>
                    <span className="font-mono font-bold">₹{pnlStatement.deliveryFreightRecovered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custom Label & Plate Setup Charges (SAC 9989)</span>
                    <span className="font-mono font-bold">₹{pnlStatement.customSetupFeeIncome.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-100 text-slate-900">
                    <span>Total Other Operating Incomes (C)</span>
                    <span className="font-mono">₹{pnlStatement.totalIndirectIncome.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Part 4: Indirect & Administrative Expenses */}
              <div className="p-5 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-sm uppercase tracking-wider">
                    IV. Indirect & Operational Overheads
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Fleet Fuel & Delivery Vehicle Maintenance</span>
                    <span className="font-mono">₹{pnlStatement.fleetFuelAndVehicleRunning.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RO Membrane, Sediment Filters & Ozone Spares</span>
                    <span className="font-mono">₹{pnlStatement.roMembraneAndFilterConsumables.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Administrative, Laboratory Microbiological Testing & Licensing</span>
                    <span className="font-mono">₹{pnlStatement.administrativeAndGeneralExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Depreciation on Plant Machinery & Vehicles</span>
                    <span className="font-mono">₹{pnlStatement.depreciation.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1.5 border-t border-slate-200 text-slate-900">
                    <span>Total Operating Overheads (D)</span>
                    <span className="font-mono">₹{pnlStatement.totalIndirectExpenses.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Part 5: NET PROFIT BEFORE TAX */}
              <div className="p-5 bg-gradient-to-r from-cyan-900 to-slate-900 text-white flex items-center justify-between">
                <div>
                  <h4 className="font-heading text-lg font-black tracking-tight">
                    NET PROFIT BEFORE TAX (Gross Profit + C - D)
                  </h4>
                  <p className="text-xs text-cyan-300 mt-0.5">
                    Net Profit Margin: <span className="font-bold font-mono">{pnlStatement.netProfitMarginPercent}%</span> • Transferred to Proprietor's Capital Account
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-cyan-300">
                    ₹{pnlStatement.netProfitBeforeTax.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Traditional Dual-Column T-Format */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-2 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Debit Side: Particulars & Expenses */}
              <div className="p-4 space-y-2">
                <div className="bg-slate-900 text-white font-bold p-2 rounded-lg text-center uppercase">
                  Dr. (Particulars / Expenses)
                </div>
                <div className="space-y-1.5 pt-1 text-slate-800">
                  <div className="flex justify-between"><span>To Opening Stock</span><span className="font-mono font-bold">₹{pnlStatement.openingStock.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>To PET Preforms & Caps</span><span className="font-mono font-bold">₹{pnlStatement.petPreformsAndCaps.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>To Packaging & Boxes</span><span className="font-mono font-bold">₹{pnlStatement.corrugatedBoxesAndPackaging.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>To RO Treatment & Power</span><span className="font-mono font-bold">₹{pnlStatement.waterTreatmentAndPlantPower.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>To Bottling Wages</span><span className="font-mono font-bold">₹{pnlStatement.plantBottlingWages.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-emerald-700 pt-2 border-t border-slate-200">
                    <span>To Gross Profit c/d</span>
                    <span className="font-mono">₹{pnlStatement.grossProfit.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t-2 border-slate-300">
                    <div className="flex justify-between"><span>To Fleet Running & Fuel</span><span className="font-mono font-bold">₹{pnlStatement.fleetFuelAndVehicleRunning.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>To RO Spares & Filters</span><span className="font-mono font-bold">₹{pnlStatement.roMembraneAndFilterConsumables.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>To Admin & Lab Testing</span><span className="font-mono font-bold">₹{pnlStatement.administrativeAndGeneralExpenses.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>To Depreciation</span><span className="font-mono font-bold">₹{pnlStatement.depreciation.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-cyan-800 pt-2 border-t border-slate-200 text-sm">
                      <span>To Net Profit (Transferred to Capital)</span>
                      <span className="font-mono font-black">₹{pnlStatement.netProfitBeforeTax.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credit Side: Incomes & Sales */}
              <div className="p-4 space-y-2">
                <div className="bg-slate-900 text-white font-bold p-2 rounded-lg text-center uppercase">
                  Cr. (Incomes / Receipts)
                </div>
                <div className="space-y-1.5 pt-1 text-slate-800">
                  <div className="flex justify-between"><span>By Gross Sales (HSN 2201)</span><span className="font-mono font-bold">₹{pnlStatement.grossSales.toFixed(2)}</span></div>
                  {pnlStatement.discountsAllowed > 0 && (
                    <div className="flex justify-between text-rose-600"><span>Less: Discounts Allowed</span><span className="font-mono font-bold">- ₹{pnlStatement.discountsAllowed.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between"><span>By Closing Stock</span><span className="font-mono font-bold">₹{pnlStatement.closingStock.toFixed(2)}</span></div>
                  <div className="pt-8 border-t-2 border-slate-300">
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>By Gross Profit b/d</span>
                      <span className="font-mono">₹{pnlStatement.grossProfit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2"><span>By Freight & Delivery Recovered</span><span className="font-mono font-bold">₹{pnlStatement.deliveryFreightRecovered.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>By Custom Setup Fees (SAC 9989)</span><span className="font-mono font-bold">₹{pnlStatement.customSetupFeeIncome.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: BALANCE SHEET (FINAL STATEMENT OF FINANCIAL POSITION)
         ========================================================================= */}
      {subTab === 'balance-sheet' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Balance Sheet as of {balanceSheet.asOfDate} (Financial Year {balanceSheet.financialYear})
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Indian GAAP & Companies Act compliant statement of assets, liabilities, and owner equity.
              </p>
            </div>

            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              balanceSheet.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Balanced (Assets = Liabilities + Equity)</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-2 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* LEFT SIDE: CAPITAL & LIABILITIES */}
            <div className="p-5 space-y-4">
              <div className="border-b border-slate-200 pb-2 flex items-center justify-between font-black text-slate-900 text-sm uppercase">
                <span>I. Capital & Liabilities</span>
                <span className="font-mono text-xs text-slate-500">Amount (₹)</span>
              </div>

              {/* Capital Account */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 block uppercase text-[11px] text-cyan-800">
                  (A) Proprietor's Capital Account
                </span>
                <div className="pl-3 space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Opening Capital</span>
                    <span className="font-mono">₹{balanceSheet.capitalAccount.openingCapital.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Add: Capital Introduced</span>
                    <span className="font-mono">+ ₹{balanceSheet.capitalAccount.capitalIntroduced.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Add: Net Profit from P&L A/c</span>
                    <span className="font-mono">+ ₹{balanceSheet.capitalAccount.addNetProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Less: Drawings</span>
                    <span className="font-mono">- ₹{balanceSheet.capitalAccount.lessDrawings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Closing Capital Balance</span>
                    <span className="font-mono">₹{balanceSheet.capitalAccount.closingCapital.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Current Liabilities */}
              <div className="space-y-1.5 pt-2">
                <span className="font-bold text-slate-800 block uppercase text-[11px] text-cyan-800">
                  (B) Current Liabilities & Provisions
                </span>
                <div className="pl-3 space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Output CGST Payable A/c (9%)</span>
                    <span className="font-mono">₹{balanceSheet.currentLiabilities.outputCgstPayable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Output SGST Payable A/c (9%)</span>
                    <span className="font-mono">₹{balanceSheet.currentLiabilities.outputSgstPayable.toFixed(2)}</span>
                  </div>
                  {balanceSheet.currentLiabilities.outputIgstPayable > 0 && (
                    <div className="flex justify-between">
                      <span>Output IGST Payable A/c (18%)</span>
                      <span className="font-mono">₹{balanceSheet.currentLiabilities.outputIgstPayable.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Sundry Creditors (Material & Packaging Payables)</span>
                    <span className="font-mono">₹{balanceSheet.currentLiabilities.sundryCreditors.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding Factory Power & Expenses</span>
                    <span className="font-mono">₹{balanceSheet.currentLiabilities.outstandingExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total Current Liabilities</span>
                    <span className="font-mono">₹{balanceSheet.currentLiabilities.totalCurrentLiabilities.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Total Liabilities Box */}
              <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center font-black text-sm text-slate-900">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono text-base text-cyan-800">
                  ₹{balanceSheet.totalLiabilitiesAndEquity.toFixed(2)}
                </span>
              </div>
            </div>

            {/* RIGHT SIDE: ASSETS */}
            <div className="p-5 space-y-4">
              <div className="border-b border-slate-200 pb-2 flex items-center justify-between font-black text-slate-900 text-sm uppercase">
                <span>II. Assets</span>
                <span className="font-mono text-xs text-slate-500">Amount (₹)</span>
              </div>

              {/* Fixed Assets */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 block uppercase text-[11px] text-cyan-800">
                  (A) Fixed Assets (Property, Plant & Equipment)
                </span>
                <div className="pl-3 space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>RO Treatment & Mineral Water Bottling Plant</span>
                    <span className="font-mono">₹{balanceSheet.fixedAssets.bottlingPlantMachinery.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commercial Delivery Fleet (Tata Ace)</span>
                    <span className="font-mono">₹{balanceSheet.fixedAssets.deliveryFleetVehicles.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Less: Accumulated Statutory Depreciation</span>
                    <span className="font-mono">- ₹{balanceSheet.fixedAssets.lessAccumulatedDepreciation.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Net Block (Fixed Assets)</span>
                    <span className="font-mono">₹{balanceSheet.fixedAssets.netFixedAssets.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Current Assets */}
              <div className="space-y-1.5 pt-2">
                <span className="font-bold text-slate-800 block uppercase text-[11px] text-cyan-800">
                  (B) Current Assets & Inventories
                </span>
                <div className="pl-3 space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Finished Goods Stock (Packaged Water Cases)</span>
                    <span className="font-mono">₹{balanceSheet.currentAssets.finishedGoodsStock.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Raw Materials Stock (Preforms, Caps, Boxes)</span>
                    <span className="font-mono">₹{balanceSheet.currentAssets.rawMaterialsStock.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sundry Debtors (Trade Receivables)</span>
                    <span className="font-mono">₹{balanceSheet.currentAssets.sundryDebtors.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank Balances (State Bank of India A/c)</span>
                    <span className="font-mono">₹{balanceSheet.currentAssets.bankBalances.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash in Hand (Counter Float)</span>
                    <span className="font-mono">₹{balanceSheet.currentAssets.cashInHand.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total Current Assets</span>
                    <span className="font-mono">₹{balanceSheet.currentAssets.totalCurrentAssets.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Total Assets Box */}
              <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center font-black text-sm text-slate-900">
                <span>TOTAL ASSETS</span>
                <span className="font-mono text-base text-cyan-800">
                  ₹{balanceSheet.totalAssets.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Balance Sheet Equilibrium Status Bar */}
            <div className={`p-4 border-t col-span-1 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs ${
              balanceSheet.isBalanced ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  {balanceSheet.isBalanced
                    ? '✓ Double-Entry Law Verified: Total Assets strictly equal Total Liabilities & Equity (₹0.00 difference).'
                    : `Balance Sheet Difference detected: ₹${balanceSheet.difference.toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
                <span>Assets: ₹{balanceSheet.totalAssets.toFixed(2)}</span>
                <span>=</span>
                <span>Liab & Eq: ₹{balanceSheet.totalLiabilitiesAndEquity.toFixed(2)}</span>
                <span className="bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                  Balanced
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: CA STATUTORY AUDIT & FORM 3CD CHECKLIST
         ========================================================================= */}
      {subTab === 'ca-audit' && (
        <div className="space-y-5">
          {/* Audit Verification Dossier */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Statutory Tax Audit Dossier</span>
                </div>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-slate-900">
                  Indian Income Tax Sec 44AB & Form 3CD Compliance Certificate
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Entity: <strong className="text-slate-800">{effectiveSettings.legalBusinessName || 'HH MINERAL WATER BOTTLING & BEVERAGES'}</strong> • GSTIN: <strong className="text-slate-800 font-mono">{effectiveSettings.gstin || '19AAACH1234F1Z8'}</strong> • PAN: <strong className="text-slate-800 font-mono">{effectiveSettings.panNumber || 'AAACH1234F'}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-500 block">Assessment Year</span>
                <span className="text-base font-black font-mono text-cyan-800">{caAuditSummary.assessmentYear}</span>
              </div>
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
                  1. Turnover & GST Reconciliation
                </h4>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Total Gross Turnover / Receipts:</span>
                    <span className="font-mono font-bold">₹{caAuditSummary.grossTurnover.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxable Turnover for GST (HSN 2201 + SAC 9989):</span>
                    <span className="font-mono font-bold">₹{caAuditSummary.taxableTurnover.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exempt / Zero-Rated Turnover:</span>
                    <span className="font-mono font-bold">₹{caAuditSummary.exemptTurnover.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                    <span>Output GST Reconciled (GSTR-1 / GSTR-3B):</span>
                    <span className="font-mono">₹{caAuditSummary.outputGstTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
                  2. Cash Transactions & System Monitoring (Sec 269ST)
                </h4>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Method of Accounting:</span>
                    <span className="font-bold text-slate-900">{caAuditSummary.methodOfAccounting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High-Value Cash Receipts (Above ₹2,00,000):</span>
                    <span className={`font-mono font-bold ${caAuditSummary.cashReceiptsOverLimitCount === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {caAuditSummary.cashReceiptsOverLimitCount} Violations (100% Compliant)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valuation of Closing Stock:</span>
                    <span className="font-bold text-slate-900">At Cost (FIFO Method)</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span>TDS / TCS Applicability:</span>
                    <span className="font-bold text-slate-900">Verified & In Order</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HSN Summary Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-800">
                HSN / SAC Code Summary (GSTR-1 Table 12 & Statutory Audit Form 3CD)
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">HSN / SAC</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-2 text-center">UQC</th>
                      <th className="py-2 px-2 text-center">Total Qty</th>
                      <th className="py-2 px-3 text-right">Taxable Val (₹)</th>
                      <th className="py-2 px-3 text-right">CGST 9% (₹)</th>
                      <th className="py-2 px-3 text-right">SGST 9% (₹)</th>
                      <th className="py-2 px-3 text-right">Total GST (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {caAuditSummary.hsnSummary.map(h => {
                      const totalGst = h.cgst + h.sgst + h.igst;
                      return (
                        <tr key={h.hsnCode}>
                          <td className="py-2 px-3 font-mono font-bold text-cyan-800">{h.hsnCode}</td>
                          <td className="py-2 px-3 text-slate-700">{h.description}</td>
                          <td className="py-2 px-2 text-center font-bold text-slate-500">{h.uqc}</td>
                          <td className="py-2 px-2 text-center font-mono font-bold">{h.totalQuantity}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">₹{h.taxableValue.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono">₹{h.cgst.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono">₹{h.sgst.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">₹{totalGst.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auditor Certificate & Sign-Off Block */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-cyan-700" />
                <span>Statutory Auditor's Certification & Sign-off (Rule 6G & Section 44AB)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed italic">
                "{caAuditSummary.auditorRemarks} The books of accounts (General Journal, Ledger, Trial Balance, Trading & P&L A/c, and Balance Sheet) were examined on test-check basis. In our opinion, the financial statements give a true and fair view of the state of affairs as on 31st March of the relevant accounting period."
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">For and on behalf of Management</span>
                  <p className="font-bold text-slate-900 mt-4">Authorized Signatory / Managing Partner</p>
                  <p className="text-[11px] text-slate-500">{effectiveSettings.legalBusinessName || 'HH MINERAL WATER'}</p>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Statutory Chartered Accountants</span>
                  <div className="mt-4 space-y-0.5">
                    <p className="font-bold text-slate-900">Chartered Accountants & Statutory Auditors</p>
                    <p className="text-[11px] text-slate-500 font-mono">FRN: 320984E / M.No: 064921</p>
                    <p className="text-[11px] text-cyan-800 font-mono font-bold">UDIN: 26064921AAAACH9281</p>
                    <p className="text-[10px] text-slate-400">Place: Kolkata • Date: {new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB: RAW MATERIALS & PURCHASES REGISTER (GSTR-2B & ITC SET-OFF)
         ========================================================================= */}
      {subTab === 'purchases' && (() => {
        const query = purchasesSearch.toLowerCase().trim();
        const filteredPurchases = plantExpenses.filter(p => {
          if (purchasesCategoryFilter !== 'all' && p.category !== purchasesCategoryFilter) return false;
          if (!query) return true;
          return (
            (p.title || '').toLowerCase().includes(query) ||
            (p.vendorName || '').toLowerCase().includes(query) ||
            (p.vendorGstin || '').toLowerCase().includes(query) ||
            (p.invoiceOrBillRef || '').toLowerCase().includes(query) ||
            (p.hsnCode || '').toLowerCase().includes(query)
          );
        });

        const totalPurchasesGross = plantExpenses.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const totalTaxable = plantExpenses.reduce((s, p) => s + (Number(p.taxableAmount || p.amount) || 0), 0);
        const totalCgst = plantExpenses.reduce((s, p) => s + (Number(p.cgstAmount) || 0), 0);
        const totalSgst = plantExpenses.reduce((s, p) => s + (Number(p.sgstAmount) || 0), 0);
        const totalItc = totalCgst + totalSgst;
        const netGstPayable = Math.max(0, Math.round((caAuditSummary.outputGstTotal - totalItc) * 100) / 100);

        return (
          <div className="space-y-6 animate-in fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Purchases</span>
                <span className="text-lg font-black font-mono text-slate-900 block">
                  ₹{totalPurchasesGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500">{plantExpenses.length} Material Invoices</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Taxable Base</span>
                <span className="text-lg font-black font-mono text-cyan-800 block">
                  ₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500">COGS Net Cost Base</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Input CGST (9%)</span>
                <span className="text-lg font-black font-mono text-emerald-700 block">
                  ₹{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">Central Tax Credit</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Input SGST (9%)</span>
                <span className="text-lg font-black font-mono text-emerald-700 block">
                  ₹{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">State Tax Credit</span>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total ITC Claimed</span>
                <span className="text-lg font-black font-mono text-emerald-800 block">
                  ₹{totalItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">CGST Act Sec 16 Credit</span>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-4 rounded-2xl border border-slate-800 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block">Net GST Payable (GSTR-3B)</span>
                <span className="text-lg font-black font-mono text-cyan-300 block">
                  ₹{netGstPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400">After ITC Set-off</span>
              </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search vendor, GSTIN, bill ref, HSN or material title..."
                    value={purchasesSearch}
                    onChange={e => setPurchasesSearch(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-cyan-600"
                  />
                </div>

                <select
                  value={purchasesCategoryFilter}
                  onChange={e => setPurchasesCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="PET Preforms & Caps">PET Preforms & Caps</option>
                  <option value="Corrugated Boxes & Shrink Pack">Corrugated Master Cartons</option>
                  <option value="Water Treatment Chemicals & Minerals">Water Minerals & Salts</option>
                  <option value="RO Membrane & Filter Consumables">RO Filters & Consumables</option>
                  <option value="Fleet Fuel & Vehicle Service">Fleet Fuel & Transport</option>
                  <option value="Electricity & Water Treatment">Plant Power & Electricity</option>
                  <option value="Plant Labor & Staff Wages">Plant Labor Wages</option>
                  <option value="Plant Machinery Spares">Machinery Spares</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <button
                    type="button"
                    id="btn-delete-all-purchases"
                    onClick={() => setIsConfirmDeleteAllPurchasesOpen(true)}
                    disabled={plantExpenses.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clear all raw material purchases and ITC claims"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete All Purchases</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => showToast?.('Admin Access Required', 'Only Administrator can delete purchases. Factory staff has view-only access.', 'error')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs rounded-xl cursor-not-allowed opacity-80"
                    title="🔒 Admin Only: Delete all purchases"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Delete All (Admin)</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-add-purchase-subtab"
                  onClick={() => setIsNewPurchaseModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Record Raw Material</span>
                </button>
              </div>
            </div>

            {/* Purchases Register Table (GSTR-2B) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-purple-600" />
                    <span>Raw Material & Manufacturing Purchases Register (GSTR-2B Statement)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Official record of supplier tax invoices, inward HSN classifications, GSTINs, and Input Tax Credit (ITC) eligibility.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  Showing {filteredPurchases.length} of {plantExpenses.length} Records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Bill Ref #</th>
                      <th className="py-2.5 px-3">Supplier / Vendor</th>
                      <th className="py-2.5 px-3">Category & HSN</th>
                      <th className="py-2.5 px-3 text-right">Qty & Unit</th>
                      <th className="py-2.5 px-3 text-right">Taxable Val (₹)</th>
                      <th className="py-2.5 px-3 text-right">CGST 9% (₹)</th>
                      <th className="py-2.5 px-3 text-right">SGST 9% (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Bill (₹)</th>
                      <th className="py-2.5 px-3 text-center">Payment</th>
                      <th className="py-2.5 px-3 text-center">ITC Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-400">
                          {isAccountWiped
                            ? 'All raw material purchases have been cleared. Books are currently at ₹0.00 baseline.'
                            : 'No purchases matching filter. Click "+ Record Raw Material" to add your first supplier bill.'}
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map(p => {
                        const isItc = p.itcEligible !== false;
                        const cgst = Number(p.cgstAmount || 0);
                        const sgst = Number(p.sgstAmount || 0);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{p.date}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-cyan-800">{p.invoiceOrBillRef || '-'}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 block">{p.vendorName || 'Supplier'}</span>
                              <span className="font-mono text-[10px] text-slate-400 block">{p.vendorGstin || 'URP'}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-800 block text-[11px]">{p.category}</span>
                              <span className="font-mono text-[10px] text-purple-700 font-semibold block">
                                HSN {p.hsnCode || '3923'} ({p.gstRate || 18}%)
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {p.quantity ? `${p.quantity.toLocaleString('en-IN')} ${p.unit || ''}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              ₹{(p.taxableAmount || p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                              ₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                              ₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950">
                              ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                (p.paymentStatus || '').toLowerCase().includes('pending')
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {p.paymentMode || 'Bank'} • {p.paymentStatus || 'Paid'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                isItc ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {isItc ? '✓ ITC Claimed' : 'Ineligible'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePurchase(p.id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors border border-transparent hover:border-rose-200"
                                  title={`Delete raw material purchase #${p.invoiceOrBillRef || p.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span
                                  className="p-1 rounded-lg text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed inline-flex items-center justify-center text-[10px]"
                                  title="Deletion locked: Administrator access required"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL: POST MANUAL JOURNAL VOUCHER (JV)
         ========================================================================= */}
      {isNewVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Post Manual Journal Voucher (JV)</h3>
                  <p className="text-[11px] text-slate-500">Record adjusting entries, depreciation, provisions, or capital movements.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVoucherModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualVoucher} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={newVoucherDate}
                    onChange={e => setNewVoucherDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={newVoucherAmount}
                    onChange={e => setNewVoucherAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 outline-none focus:border-cyan-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Debit Account (Dr. Head) *</label>
                <select
                  value={newVoucherDebitCode}
                  onChange={e => setNewVoucherDebitCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-600"
                >
                  {Object.values(STANDARD_ACCOUNT_HEADS).map(h => (
                    <option key={h.code} value={h.code}>
                      [{h.code}] {h.name} ({h.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Credit Account (Cr. Head) *</label>
                <select
                  value={newVoucherCreditCode}
                  onChange={e => setNewVoucherCreditCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-600"
                >
                  {Object.values(STANDARD_ACCOUNT_HEADS).map(h => (
                    <option key={h.code} value={h.code}>
                      [{h.code}] {h.name} ({h.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Accounting Narration *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Being depreciation on machinery / provision for expenses..."
                  value={newVoucherNarration}
                  onChange={e => setNewVoucherNarration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 outline-none focus:border-cyan-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewVoucherModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer shadow-md"
                >
                  Post Journal Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RECORD RAW MATERIAL PURCHASE WITH INPUT TAX CREDIT (ITC)
         ========================================================================= */}
      {isNewPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Record Raw Material Purchase</h3>
                  <p className="text-[11px] text-slate-500">
                    Supplier bill entry with Input Tax Credit (ITC) separation for CA statutory audit & GSTR-2B.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPurchaseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Material Category *</label>
                  <select
                    value={purchaseCategory}
                    onChange={e => {
                      const cat = e.target.value as PurchaseExpenseCategory;
                      setPurchaseCategory(cat);
                      if (cat === 'PET Preforms & Caps') {
                        setPurchaseHsn('3923');
                        setPurchaseUnit('pcs');
                      } else if (cat === 'Corrugated Boxes & Shrink Pack') {
                        setPurchaseHsn('4819');
                        setPurchaseUnit('cartons');
                      } else if (cat === 'Water Treatment Chemicals & Minerals') {
                        setPurchaseHsn('2833');
                        setPurchaseUnit('kg');
                      } else if (cat === 'RO Membrane & Filter Consumables') {
                        setPurchaseHsn('8421');
                        setPurchaseUnit('pcs');
                      } else if (cat === 'Fleet Fuel & Vehicle Service') {
                        setPurchaseHsn('2710');
                        setPurchaseUnit('litres');
                        setPurchaseItcEligible(false);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-600"
                  >
                    <option value="PET Preforms & Caps">PET Preforms & Bottle Closures (HSN 3923)</option>
                    <option value="Corrugated Boxes & Shrink Pack">Corrugated Master Boxes & Film (HSN 4819)</option>
                    <option value="Water Treatment Chemicals & Minerals">Water Treatment Minerals & Salts (HSN 2833)</option>
                    <option value="RO Membrane & Filter Consumables">RO Membranes & Carbon Cartridges (HSN 8421)</option>
                    <option value="Electricity & Water Treatment">Plant Electricity & Industrial Power</option>
                    <option value="Plant Labor & Staff Wages">Bottling Shift Labor & Wages</option>
                    <option value="Fleet Fuel & Vehicle Service">Delivery Fleet Diesel & Service (HSN 2710)</option>
                    <option value="Plant Machinery Spares">Filling Nozzles & Plant Spares (HSN 8421)</option>
                    <option value="Other Operational">Other Plant Operational</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bill Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Title / Material Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5,000 Pcs Virgin PET Preforms 13.5g (Blue Neck 28mm)"
                  value={purchaseTitle}
                  onChange={e => setPurchaseTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 outline-none focus:border-cyan-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Polymers India Ltd."
                    value={purchaseVendor}
                    onChange={e => setPurchaseVendor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    placeholder="19AAACP9981K1Z3"
                    value={purchaseGstin}
                    onChange={e => setPurchaseGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 outline-none focus:border-cyan-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier Bill / Invoice Ref # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APEX/2026/891"
                    value={purchaseBillRef}
                    onChange={e => setPurchaseBillRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    placeholder="3923"
                    value={purchaseHsn}
                    onChange={e => setPurchaseHsn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 outline-none focus:border-cyan-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={purchaseQuantity}
                      onChange={e => setPurchaseQuantity(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit</label>
                    <input
                      type="text"
                      placeholder="pcs"
                      value={purchaseUnit}
                      onChange={e => setPurchaseUnit(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">Taxable Base Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={purchaseTaxableAmount}
                    onChange={e => setPurchaseTaxableAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-mono font-bold text-purple-950 outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-purple-950 mb-1">GST Tax Rate (%)</label>
                  <select
                    value={purchaseGstRate}
                    onChange={e => setPurchaseGstRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-bold text-purple-950 outline-none"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
                <div>
                  <span className="block font-bold text-purple-950 mb-1">Calculated Grand Total</span>
                  <div className="px-3 py-2 bg-white border border-purple-300 rounded-xl font-mono font-black text-purple-950 text-sm">
                    ₹{(() => {
                      const cgst = purchaseItcEligible ? (purchaseTaxableAmount * (purchaseGstRate / 200)) : 0;
                      return Math.round((purchaseTaxableAmount + cgst * 2) * 100) / 100;
                    })().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* ITC Eligibility & Tax Breakdown Info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purchaseItcEligible}
                    onChange={e => setPurchaseItcEligible(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Eligible for Input Tax Credit (ITC)</span>
                    <span className="text-[10px] text-slate-500">Auto-routes CGST 9% and SGST 9% to Current Asset ITC set-off head</span>
                  </div>
                </label>

                {purchaseItcEligible && purchaseGstRate > 0 && (
                  <span className="text-right font-mono text-[11px] font-bold text-emerald-700">
                    ITC: ₹{(Math.round((purchaseTaxableAmount * (purchaseGstRate / 100)) * 100) / 100).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={purchasePaymentMode}
                    onChange={e => setPurchasePaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Credit / Sundry Creditor">Credit / Sundry Creditor (Payable)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={purchasePaymentStatus}
                    onChange={e => setPurchasePaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                  >
                    <option value="Paid">Paid in Full</option>
                    <option value="Pending / Credit Due">Pending / Credit Due (Sundry Creditor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Internal Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Received at warehouse bay 2, inspected for quality certification."
                  value={purchaseNotes}
                  onChange={e => setPurchaseNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold cursor-pointer shadow-md"
                >
                  Record Purchase & Claim ITC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: MASTER DELETE ALL ACCOUNT DETAILS & ZERO LEDGER (ADMIN ONLY)
         ========================================================================= */}
      {isConfirmDeleteAllAccountsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-rose-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0 shadow-inner">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-slate-900">
                    Delete All Detail From Account
                  </h3>
                  <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Administrator Master Ledger Reset & Zero Baseline</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmDeleteAllAccountsOpen(false);
                  setDeleteConfirmationText('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                This action will <strong className="text-rose-700">permanently purge all accounting details</strong> and reset the Chartered Accountant audit books, general journal daybook, ledger khata, trial balance, and final accounts to a <strong className="text-slate-900">strict ₹0.00 zero-base balance</strong>.
              </p>

              {/* What will be deleted selection */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 uppercase text-[11px] block">
                  Select Details to Delete & Zero Out:
                </span>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wipeExpensesChecked}
                    onChange={e => setWipeExpensesChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 block">Delete Raw Material Purchases & Factory Expenses</span>
                    <span className="text-[11px] text-slate-500">Purges {plantExpenses.length} expense vouchers and GSTR-2B Input Tax Credit claims</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wipeManualVouchersChecked}
                    onChange={e => setWipeManualVouchersChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 block">Delete Manual Journal Vouchers (JVs)</span>
                    <span className="text-[11px] text-slate-500">Purges {manualVouchers.length} adjusting and depreciation journal entries</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wipeInvoicesChecked}
                    onChange={e => setWipeInvoicesChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 block">Clear GST Sales Invoices from Ledger Books</span>
                    <span className="text-[11px] text-slate-500">Disconnects {effectiveInvoices.length} customer order invoices from revenue ledger</span>
                  </div>
                </label>

                <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-emerald-800 font-bold text-[11px]">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Enforces Zero-Base Mode (Debit ₹0.00 = Credit ₹0.00 balanced)</span>
                </div>
              </div>

              {/* Safety Confirmation text */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Type <span className="font-mono font-black text-rose-600">DELETE</span> to confirm master account wipe:
                </label>
                <input
                  type="text"
                  placeholder="Type DELETE"
                  value={deleteConfirmationText}
                  onChange={e => setDeleteConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 uppercase focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmDeleteAllAccountsOpen(false);
                  setDeleteConfirmationText('');
                }}
                disabled={isDeletingAccounts}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-all-accounts-submit"
                onClick={handleDeleteAllAccountDetails}
                disabled={isDeletingAccounts || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeletingAccounts ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Wiping All Accounts...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete All Account Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DELETE ALL JOURNAL ENTRIES (ADMIN ONLY)
         ========================================================================= */}
      {isConfirmDeleteAllJournalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-slate-900">
                  Delete All Journal Entries
                </h3>
                <p className="text-xs text-rose-600 font-bold">Clear Daybook & Manual Vouchers</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear all <strong className="text-slate-900 font-bold">{journalEntries.length} journal vouchers</strong> from the daybook? This will remove manual journal vouchers and daybook postings.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                Admin action only. Make sure to export a CSV backup before clearing.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllJournalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllJournalEntries}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Clear All Journal Entries</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DELETE SINGLE JOURNAL ENTRY (ADMIN ONLY)
         ========================================================================= */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-slate-900">
                  Delete Journal Entry
                </h3>
                <p className="text-xs text-slate-500 font-mono">Voucher: {entryToDelete.voucherNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete journal voucher <strong>#{entryToDelete.voucherNumber}</strong> ({entryToDelete.voucherType}) dated <strong>{entryToDelete.date}</strong>?
            </p>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1">
              <p className="text-slate-700">
                Total Dr/Cr: <span className="font-mono font-bold text-slate-900">₹{entryToDelete.totalDebit.toFixed(2)}</span>
              </p>
              <p className="text-slate-500 italic text-[11px]">
                Narration: {entryToDelete.narration}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteJournalEntry(entryToDelete)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DELETE SINGLE RAW MATERIAL PURCHASE (ADMIN ONLY)
         ========================================================================= */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-slate-900">
                  Delete Raw Material Purchase
                </h3>
                <p className="text-xs text-slate-500 font-mono">Bill Ref: {purchaseToDelete.invoiceOrBillRef || purchaseToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this purchase bill from <strong>{purchaseToDelete.vendorName}</strong> for <strong>₹{purchaseToDelete.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>?
            </p>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1">
              <p className="text-slate-800 font-semibold">
                Category: {purchaseToDelete.category} • HSN: {purchaseToDelete.hsnCode}
              </p>
              <p className="text-slate-600">
                Taxable: ₹{purchaseToDelete.taxableAmount || purchaseToDelete.amount} • Input Tax Credit: {purchaseToDelete.itcEligible ? 'Claimed' : 'None'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePurchase}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Purchase</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DELETE ALL PURCHASES (ADMIN ONLY)
         ========================================================================= */}
      {isConfirmDeleteAllPurchasesOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-slate-900">
                  Delete All Purchases
                </h3>
                <p className="text-xs text-rose-600 font-bold">Clear Raw Materials Register</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear all <strong className="text-slate-900 font-bold">{plantExpenses.length} raw material purchase records</strong>? This will remove all inward supplier bills and Input Tax Credit (ITC) entries from the ledger.
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                This action is irreversible and restricted exclusively to Administrator.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllPurchasesOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllPurchases}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete All Purchases</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
