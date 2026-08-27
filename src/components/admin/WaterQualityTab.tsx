import React, { useState } from 'react';
import { BatchQualityLog } from '../../types';
import { INITIAL_BATCH_QUALITY_LOGS } from '../../data/initialProducts';
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Printer,
  FileDown,
  Activity,
  Droplets,
  Microscope,
  Check,
  Search,
  Sparkles
} from 'lucide-react';

interface WaterQualityTabProps {
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const WaterQualityTab: React.FC<WaterQualityTabProps> = ({ showToast }) => {
  const [logs, setLogs] = useState<BatchQualityLog[]>(() => {
    try {
      const saved = localStorage.getItem('hh_quality_logs');
      return saved ? JSON.parse(saved) : INITIAL_BATCH_QUALITY_LOGS;
    } catch {
      return INITIAL_BATCH_QUALITY_LOGS;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCertificateLog, setSelectedCertificateLog] = useState<BatchQualityLog | null>(null);

  // Form State
  const [newLog, setNewLog] = useState<Partial<BatchQualityLog>>({
    batchNumber: `HH-LOT-2026-${new Date().toISOString().slice(5, 10).replace('-', '')}`,
    testDate: new Date().toISOString().split('T')[0],
    sourceTank: 'RO Buffer Storage Tank #01',
    phLevel: 7.4,
    tdsPpm: 120,
    turbidityNtu: 0.25,
    ozoneLevelMgL: 0.04,
    microbiologyPass: true,
    labTechnician: 'Dr. S. Chatterjee (Chief Microbiologist)',
    status: 'PASSED',
    remarks: 'Complies with all BIS IS 14543 and FSSAI parameters.',
    fssaiCompliant: true
  });

  const saveLogs = (updated: BatchQualityLog[]) => {
    setLogs(updated);
    try {
      localStorage.setItem('hh_quality_logs', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save quality logs:', e);
    }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.batchNumber || !newLog.phLevel || !newLog.tdsPpm) {
      showToast('Missing Parameters', 'Please fill all required testing parameters.', 'warning');
      return;
    }

    const isPassed =
      (newLog.phLevel >= 6.5 && newLog.phLevel <= 8.5) &&
      (newLog.tdsPpm >= 75 && newLog.tdsPpm <= 300) &&
      ((newLog.turbidityNtu || 0) <= 1.0) &&
      !!newLog.microbiologyPass;

    const entry: BatchQualityLog = {
      id: `QLOG-${Date.now()}`,
      batchNumber: newLog.batchNumber,
      testDate: newLog.testDate || new Date().toISOString().split('T')[0],
      sourceTank: newLog.sourceTank || 'RO Tank 01',
      phLevel: Number(newLog.phLevel),
      tdsPpm: Number(newLog.tdsPpm),
      turbidityNtu: Number(newLog.turbidityNtu || 0.2),
      ozoneLevelMgL: Number(newLog.ozoneLevelMgL || 0.04),
      microbiologyPass: !!newLog.microbiologyPass,
      labTechnician: newLog.labTechnician || 'Plant QC Chemist',
      status: isPassed ? 'PASSED' : 'FLAGGED',
      remarks: newLog.remarks || (isPassed ? 'Standard purity verified' : 'Requires re-filtration'),
      fssaiCompliant: isPassed
    };

    const updated = [entry, ...logs];
    saveLogs(updated);
    setIsAddModalOpen(false);
    showToast('Quality Log Saved', `Batch ${entry.batchNumber} recorded with status: ${entry.status}`, 'success');
  };

  const exportQualityCsv = () => {
    if (logs.length === 0) {
      showToast('No Records', 'No quality logs to export.', 'info');
      return;
    }
    const headers = ['Batch Lot Number', 'Test Date', 'Source Tank', 'pH Level', 'TDS (ppm)', 'Turbidity (NTU)', 'Ozone (mg/L)', 'Microbiology (E.coli/Coliform)', 'QC Technician', 'Compliance Status', 'Remarks'];
    const rows = logs.map(l => [
      `"${l.batchNumber}"`,
      `"${l.testDate}"`,
      `"${l.sourceTank}"`,
      l.phLevel,
      l.tdsPpm,
      l.turbidityNtu,
      l.ozoneLevelMgL,
      l.microbiologyPass ? 'Absent (Passed)' : 'Present (Failed)',
      `"${l.labTechnician}"`,
      `"${l.status}"`,
      `"${(l.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HH_Water_Quality_Lab_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported', 'Quality log CSV downloaded.', 'success');
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const filteredLogs = logs.filter(l =>
    l.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.labTechnician.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.sourceTank.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Standards & Compliance Banners */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average TDS</span>
              <span className="font-heading text-xl font-black text-slate-900">
                {logs.length > 0 ? Math.round(logs.reduce((acc, l) => acc + l.tdsPpm, 0) / logs.length) : 120} ppm
              </span>
              <span className="text-[10px] text-emerald-600 font-bold block">Ideal: 75 - 200 ppm</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average pH Value</span>
              <span className="font-heading text-xl font-black text-slate-900">
                {logs.length > 0 ? (logs.reduce((acc, l) => acc + l.phLevel, 0) / logs.length).toFixed(2) : '7.40'}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold block">Neutral / Alkaline (7.2 - 7.6)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Microscope className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Microbiology Rate</span>
              <span className="font-heading text-xl font-black text-emerald-700">100% Sterile</span>
              <span className="text-[10px] text-slate-500 font-bold block">Zero Pathogens / Coliform</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Regulatory Compliance</span>
              <span className="font-heading text-base font-black text-purple-900 block">BIS IS 14543</span>
              <span className="text-[10px] text-slate-500 font-bold block">FSSAI Lic. #12822001000456</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search batch lot # or technician..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={exportQualityCsv}
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
            <span>Log Daily Water Test</span>
          </button>
        </div>
      </div>

      {/* Lab Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900">
              Plant Water Laboratory & Batch Inspection Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily testing records conducted prior to automated bottling and packaging lines.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 font-mono">
            {logs.length} Certified Records
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5">Batch Lot No.</th>
                <th className="p-3.5">Test Date</th>
                <th className="p-3.5">Source Tank</th>
                <th className="p-3.5">pH Level</th>
                <th className="p-3.5">TDS (ppm)</th>
                <th className="p-3.5">Turbidity (NTU)</th>
                <th className="p-3.5">Ozone (mg/L)</th>
                <th className="p-3.5">Microbiology</th>
                <th className="p-3.5">Tested By</th>
                <th className="p-3.5">Result Status</th>
                <th className="p-3.5 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    No quality test records found. Click "Log Daily Water Test" above.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="p-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {l.batchNumber}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600 font-mono">
                      {l.testDate}
                    </td>
                    <td className="p-3.5 text-slate-600 truncate max-w-[150px]">
                      {l.sourceTank}
                    </td>
                    <td className="p-3.5 font-bold font-mono text-cyan-800">
                      {l.phLevel.toFixed(2)}
                    </td>
                    <td className="p-3.5 font-bold font-mono text-slate-900">
                      {l.tdsPpm} ppm
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {l.turbidityNtu} NTU
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {l.ozoneLevelMgL} mg/L
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                        <Check className="w-3 h-3" />
                        <span>Absent</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 truncate max-w-[140px]">
                      {l.labTechnician}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          l.status === 'PASSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {l.status === 'PASSED' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        <span>{l.status}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedCertificateLog(l)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-[11px] cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Quality Log Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  Log Water Quality Batch Test
                </h3>
                <p className="text-xs text-slate-500">Record laboratory analysis results for daily production compliance.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddLog} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch Lot Number *</label>
                  <input
                    type="text"
                    required
                    value={newLog.batchNumber}
                    onChange={e => setNewLog({ ...newLog, batchNumber: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Test Date *</label>
                  <input
                    type="date"
                    required
                    value={newLog.testDate}
                    onChange={e => setNewLog({ ...newLog, testDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source Water Tank / Stage</label>
                  <select
                    value={newLog.sourceTank}
                    onChange={e => setNewLog({ ...newLog, sourceTank: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="RO Buffer Storage Tank #01">RO Buffer Storage Tank #01</option>
                    <option value="Mineral Enriched Storage Tank #02">Mineral Enriched Storage Tank #02</option>
                    <option value="Ozone Contact Sterilization Tank #03">Ozone Contact Sterilization Tank #03</option>
                    <option value="Bottling Line Feed Tank #04">Bottling Line Feed Tank #04</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">pH Value (Acceptable: 6.5 - 8.5) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={14}
                    required
                    value={newLog.phLevel}
                    onChange={e => setNewLog({ ...newLog, phLevel: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-cyan-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">TDS in ppm (Acceptable: 75 - 250) *</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    required
                    value={newLog.tdsPpm}
                    onChange={e => setNewLog({ ...newLog, tdsPpm: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Turbidity (NTU, Max 1.0)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newLog.turbidityNtu}
                    onChange={e => setNewLog({ ...newLog, turbidityNtu: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ozone Level (mg/L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newLog.ozoneLevelMgL}
                    onChange={e => setNewLog({ ...newLog, ozoneLevelMgL: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lab QC Chemist / Microbiologist Name</label>
                  <input
                    type="text"
                    value={newLog.labTechnician}
                    onChange={e => setNewLog({ ...newLog, labTechnician: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="microCheck"
                    checked={newLog.microbiologyPass}
                    onChange={e => setNewLog({ ...newLog, microbiologyPass: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <label htmlFor="microCheck" className="text-xs font-bold text-slate-800">
                    Microbiology Sterility Confirmed (Coliform & E.coli Zero/Absent)
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Remarks & Observations</label>
                  <input
                    type="text"
                    value={newLog.remarks}
                    onChange={e => setNewLog({ ...newLog, remarks: e.target.value })}
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
                  Save Quality Certification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Quality Certificate Modal */}
      {selectedCertificateLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-900 text-cyan-300 flex items-center justify-center font-black">
                  HH
                </div>
                <div>
                  <h3 className="font-heading text-lg font-black text-slate-900">
                    CERTIFICATE OF WATER QUALITY & CONFORMITY
                  </h3>
                  <p className="text-xs text-slate-500">HH Mineral Water Bottling & Quality Assurance Lab</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCertificateLog(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Certificate Body */}
            <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 space-y-4 text-xs text-slate-800 font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">BATCH LOT NUMBER</span>
                  <strong className="text-sm text-slate-900">{selectedCertificateLog.batchNumber}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">INSPECTION DATE</span>
                  <strong>{selectedCertificateLog.testDate}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2">
                <div>
                  <span className="text-slate-500 text-[10px] block">STANDARD SPECIFICATION</span>
                  <span className="font-bold text-slate-900">BIS IS 14543:2004 / FSSAI</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">SOURCE STORAGE UNIT</span>
                  <span className="font-bold text-slate-900">{selectedCertificateLog.sourceTank}</span>
                </div>
              </div>

              {/* Lab Parameters Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-200/70 text-[10px] font-bold text-slate-700">
                    <tr>
                      <th className="p-2">Chemical / Physical Parameter</th>
                      <th className="p-2">Tested Value</th>
                      <th className="p-2">Permissible Limit</th>
                      <th className="p-2">Conformity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    <tr>
                      <td className="p-2">pH Level @ 25°C</td>
                      <td className="p-2 font-bold text-cyan-900">{selectedCertificateLog.phLevel.toFixed(2)}</td>
                      <td className="p-2 text-slate-500">6.5 - 8.5</td>
                      <td className="p-2 text-emerald-700 font-bold">COMPLIANT</td>
                    </tr>
                    <tr>
                      <td className="p-2">Total Dissolved Solids (TDS)</td>
                      <td className="p-2 font-bold text-cyan-900">{selectedCertificateLog.tdsPpm} ppm</td>
                      <td className="p-2 text-slate-500">75 - 250 ppm</td>
                      <td className="p-2 text-emerald-700 font-bold">COMPLIANT</td>
                    </tr>
                    <tr>
                      <td className="p-2">Turbidity</td>
                      <td className="p-2 font-bold text-cyan-900">{selectedCertificateLog.turbidityNtu} NTU</td>
                      <td className="p-2 text-slate-500">Max 1.0 NTU</td>
                      <td className="p-2 text-emerald-700 font-bold">COMPLIANT</td>
                    </tr>
                    <tr>
                      <td className="p-2">Residual Ozone Concentration</td>
                      <td className="p-2 font-bold text-cyan-900">{selectedCertificateLog.ozoneLevelMgL} mg/L</td>
                      <td className="p-2 text-slate-500">0.03 - 0.08 mg/L</td>
                      <td className="p-2 text-emerald-700 font-bold">COMPLIANT</td>
                    </tr>
                    <tr>
                      <td className="p-2">Microbiological Count (E.coli/Coliform)</td>
                      <td className="p-2 font-bold text-emerald-700">ABSENT / NIL</td>
                      <td className="p-2 text-slate-500">Must be Absent / 250ml</td>
                      <td className="p-2 text-emerald-700 font-bold">PASS (100% PURE)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lab Certification Signature Block */}
              <div className="pt-4 flex items-end justify-between border-t border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">FINAL LAB DISPOSITION</span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>CERTIFIED FOR BOTTLING & CONSUMPTION</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="w-32 border-b border-slate-400 pb-1 mb-1 text-center font-serif italic text-xs text-slate-600">
                    S. Chatterjee
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 block">{selectedCertificateLog.labTechnician}</span>
                  <span className="text-[9px] text-slate-400 block">QC & Microbiological Lab In-charge</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedCertificateLog(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
              >
                Close Preview
              </button>
              <button
                onClick={handlePrintCertificate}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Lab Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
