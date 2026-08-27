import React, { useState } from 'react';
import { PlantExpense } from '../../types';
import { INITIAL_PLANT_EXPENSES } from '../../data/initialProducts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  FileDown,
  Calendar,
  CreditCard,
  Building2,
  Trash2,
  PieChart,
  Tag
} from 'lucide-react';

interface PlantExpensesTabProps {
  totalRevenue: number;
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const PlantExpensesTab: React.FC<PlantExpensesTabProps> = ({ totalRevenue, showToast }) => {
  const [expenses, setExpenses] = useState<PlantExpense[]>(() => {
    try {
      const saved = localStorage.getItem('hh_plant_expenses');
      return saved ? JSON.parse(saved) : INITIAL_PLANT_EXPENSES;
    } catch {
      return INITIAL_PLANT_EXPENSES;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Expense Form
  const [newExpense, setNewExpense] = useState<Partial<PlantExpense>>({
    date: new Date().toISOString().split('T')[0],
    category: 'PET Preforms & Caps',
    title: '',
    amount: 0,
    paymentMode: 'UPI',
    vendorName: '',
    invoiceOrBillRef: '',
    notes: ''
  });

  const saveExpenses = (updated: PlantExpense[]) => {
    setExpenses(updated);
    try {
      localStorage.setItem('hh_plant_expenses', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save expenses:', e);
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount || newExpense.amount <= 0) {
      showToast('Missing Fields', 'Please enter title and valid expense amount.', 'warning');
      return;
    }

    const created: PlantExpense = {
      id: `EXP-${Date.now()}`,
      date: newExpense.date || new Date().toISOString().split('T')[0],
      category: newExpense.category || 'Other Operational',
      title: newExpense.title,
      amount: Number(newExpense.amount),
      paymentMode: newExpense.paymentMode || 'UPI',
      vendorName: newExpense.vendorName || '',
      invoiceOrBillRef: newExpense.invoiceOrBillRef || '',
      notes: newExpense.notes || '',
      createdAt: new Date().toISOString()
    };

    const updated = [created, ...expenses];
    saveExpenses(updated);
    setIsAddModalOpen(false);
    setNewExpense({
      date: new Date().toISOString().split('T')[0],
      category: 'PET Preforms & Caps',
      title: '',
      amount: 0,
      paymentMode: 'UPI',
      vendorName: '',
      invoiceOrBillRef: '',
      notes: ''
    });
    showToast('Expense Recorded', `₹${created.amount} recorded under ${created.category}.`, 'success');
  };

  const handleDeleteExpense = (id: string, title: string) => {
    if (window.confirm(`Delete expense record: "${title}"?`)) {
      const updated = expenses.filter(e => e.id !== id);
      saveExpenses(updated);
      showToast('Expense Removed', 'Expense item deleted.', 'info');
    }
  };

  const exportExpensesCsv = () => {
    if (expenses.length === 0) {
      showToast('No Records', 'No expenses available to export.', 'info');
      return;
    }
    const headers = ['Expense ID', 'Date', 'Category', 'Expense Title', 'Amount (INR)', 'Payment Mode', 'Vendor Name', 'Invoice / Bill Reference', 'Notes'];
    const rows = expenses.map(e => [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${e.category}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      e.amount,
      `"${e.paymentMode}"`,
      `"${(e.vendorName || '').replace(/"/g, '""')}"`,
      `"${(e.invoiceOrBillRef || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HH_Plant_Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported', 'Expenses CSV downloaded.', 'success');
  };

  const filtered = expenses.filter(e => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.vendorName && e.vendorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.invoiceOrBillRef && e.invoiceOrBillRef.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Financial P&L Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 block uppercase">Total Store Revenue</span>
          <span className="font-heading text-2xl font-black text-slate-900 mt-1 block">
            ₹{totalRevenue.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Gross Invoiced Sales
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-rose-200 bg-rose-50/30 shadow-xs">
          <span className="text-xs font-bold text-rose-800 block uppercase">Total Plant Expenses</span>
          <span className="font-heading text-2xl font-black text-rose-900 mt-1 block">
            ₹{totalExpenses.toLocaleString()}
          </span>
          <span className="text-[11px] text-rose-700 font-semibold mt-1 block">
            Raw Materials & Operations
          </span>
        </div>

        <div className={`rounded-3xl p-5 border shadow-xs ${netProfit >= 0 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'}`}>
          <span className="text-xs font-bold text-slate-700 block uppercase">Net Operating Profit</span>
          <span className={`font-heading text-2xl font-black mt-1 block ${netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
            ₹{netProfit.toLocaleString()}
          </span>
          <span className={`text-[11px] font-bold mt-1 block ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {netProfit >= 0 ? '● Positive Operational Surplus' : '● Operational Deficit'}
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-purple-200 bg-purple-50/40 shadow-xs">
          <span className="text-xs font-bold text-purple-800 block uppercase">Operating Margin</span>
          <span className="font-heading text-2xl font-black text-purple-900 mt-1 block">
            {marginPercent}%
          </span>
          <span className="text-[11px] text-purple-700 font-semibold mt-1 block">
            Profit to Revenue Ratio
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search expense, vendor, or invoice ref..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
          >
            <option value="all">All Expense Categories</option>
            <option value="PET Preforms & Caps">PET Preforms & Caps</option>
            <option value="Corrugated Boxes & Shrink Pack">Corrugated Boxes & Shrink Pack</option>
            <option value="Fleet Fuel & Vehicle Service">Fleet Fuel & Transport</option>
            <option value="RO Membrane & Filter Consumables">RO Membrane & Filtration</option>
            <option value="Electricity & Water Treatment">Electricity & Water</option>
            <option value="Plant Labor & Staff Wages">Plant Staff Wages</option>
            <option value="Other Operational">Other Operational</option>
          </select>

          <button
            onClick={exportExpensesCsv}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Plant Expense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900">
              Plant Operational & Production Expense Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized raw materials, packaging consumables, fleet fuel, utilities, and labor outlays.
            </p>
          </div>
          <span className="font-heading text-sm font-black text-rose-800">
            Total: ₹{totalExpenses.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Expense Title / Description</th>
                <th className="p-3.5">Vendor / Supplier</th>
                <th className="p-3.5">Bill / Ref #</th>
                <th className="p-3.5">Payment Mode</th>
                <th className="p-3.5 text-right">Amount (INR)</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No expense records found. Click "Record Plant Expense" to add entries.
                  </td>
                </tr>
              ) : (
                filtered.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/80">
                    <td className="p-3.5 whitespace-nowrap text-slate-600 font-mono">
                      {exp.date}
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 max-w-xs">
                      {exp.title}
                      {exp.notes && <span className="block text-[10px] text-slate-400 font-normal">{exp.notes}</span>}
                    </td>
                    <td className="p-3.5 text-slate-600 truncate max-w-[130px]">
                      {exp.vendorName || '—'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {exp.invoiceOrBillRef || '—'}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {exp.paymentMode}
                    </td>
                    <td className="p-3.5 text-right font-heading font-black text-rose-700 text-sm whitespace-nowrap">
                      ₹{exp.amount.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.title)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                        title="Delete expense entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  Record Plant Operating Expense
                </h3>
                <p className="text-xs text-slate-500">Add operational cost for production or transport.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={newExpense.date}
                    onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category *</label>
                  <select
                    value={newExpense.category}
                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="PET Preforms & Caps">PET Preforms & Caps</option>
                    <option value="Corrugated Boxes & Shrink Pack">Corrugated Boxes & Shrink Pack</option>
                    <option value="Fleet Fuel & Vehicle Service">Fleet Fuel & Vehicle Service</option>
                    <option value="RO Membrane & Filter Consumables">RO Membrane & Filter Consumables</option>
                    <option value="Electricity & Water Treatment">Electricity & Water Treatment</option>
                    <option value="Plant Labor & Staff Wages">Plant Labor & Staff Wages</option>
                    <option value="Other Operational">Other Operational</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Title / Item Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5,000 pcs 28mm Blue Tamper-Proof Caps"
                    value={newExpense.title}
                    onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount in INR (₹) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-rose-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={newExpense.paymentMode}
                    onChange={e => setNewExpense({ ...newExpense, paymentMode: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vendor / Supplier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Packaging Ltd."
                    value={newExpense.vendorName}
                    onChange={e => setNewExpense({ ...newExpense, vendorName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invoice / Bill Reference #</label>
                  <input
                    type="text"
                    placeholder="e.g. BILL-9821"
                    value={newExpense.invoiceOrBillRef}
                    onChange={e => setNewExpense({ ...newExpense, invoiceOrBillRef: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Cleared by Plant Manager"
                    value={newExpense.notes}
                    onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
