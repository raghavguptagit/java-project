import React, { useEffect, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { apiRequest, formatDate, formatDateTime, formatINR, statusColorClass } from '../lib/api';
import type { AuditLog, Building, Expense, Flat, User } from '../types';

export function FlatsView({ user, onNotify }: { user: User; onNotify: (msg: string) => void }) {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [buildingId, setBuildingId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [flatType, setFlatType] = useState('3 BHK');
  const [residentName, setResidentName] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [f, b] = await Promise.all([apiRequest<Flat[]>('/flats'), apiRequest<Building[]>('/buildings')]);
    setFlats(f);
    setBuildings(b);
    if (!buildingId && b.length > 0) setBuildingId(b[0].id);
  }

  useEffect(() => {
    load();
  }, [user.id]);

  async function handleAddFlat(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/flats', {
        method: 'POST',
        body: JSON.stringify({ buildingId, unitNumber, flatType, residentName }),
      });
      setUnitNumber('');
      setResidentName('');
      setShowAdd(false);
      onNotify(`Unit ${unitNumber.toUpperCase()} added.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flat.');
    }
  }

  const filtered = flats.filter(
    (f) =>
      f.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
      (f.residentName || '').toLowerCase().includes(search.toLowerCase()) ||
      f.buildingName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Flats & Resident Directory</h2>
          <p className="text-xs text-slate-500">Green Valley Residency buildings, units, and occupancy</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search unit or resident..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
          />
          {user.role === 'SOCIETY_ADMIN' && (
            <button
              type="button"
              onClick={() => setShowAdd((s) => !s)}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Flat
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}

      {showAdd && user.role === 'SOCIETY_ADMIN' && (
        <form onSubmit={handleAddFlat} className="p-5 bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            required
            placeholder="Unit (e.g. C-403)"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <select
            value={flatType}
            onChange={(e) => setFlatType(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option>2 BHK</option>
            <option>3 BHK</option>
            <option>4 BHK Penthouse</option>
          </select>
          <input
            type="text"
            placeholder="Primary Resident (opt)"
            value={residentName}
            onChange={(e) => setResidentName(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg cursor-pointer">
            Save Unit
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Building</th>
                <th className="px-4 py-3 font-medium">Type / Area</th>
                <th className="px-4 py-3 font-medium">Primary Resident</th>
                <th className="px-4 py-3 font-medium">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">{f.unitNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{f.buildingName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {f.flatType} · <span className="font-mono">{f.areaSqft} sq.ft</span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{f.residentName || '—'}</td>
                  <td className={`px-4 py-3 text-xs font-semibold ${statusColorClass(f.occupancyStatus)}`}>
                    {f.occupancyStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ExpensesView({ user, onNotify }: { user: User; onNotify: (msg: string) => void }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState('Maintenance');
  const [vendorName, setVendorName] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  async function load() {
    const data = await apiRequest<Expense[]>('/expenses');
    setExpenses(data);
  }

  useEffect(() => {
    load();
  }, [user.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify({ category, vendorName, title, amount: Number(amount) }),
    });
    setVendorName('');
    setTitle('');
    setAmount('');
    setShowAdd(false);
    onNotify('Expense submitted for approval.');
    load();
  }

  async function handleDecision(id: string, decision: 'APPROVE' | 'REJECT' | 'MARK_PAID') {
    await apiRequest(`/expenses/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason: decision === 'REJECT' ? 'Requires revised vendor quote' : undefined }),
    });
    onNotify(`Expense ${decision.toLowerCase().replace('_', ' ')}.`);
    load();
  }

  function exportCsv() {
    const header = 'Date,Category,Vendor,Title,Amount,Status\n';
    const rows = expenses
      .map((e) => `${e.expenseDate},"${e.category}","${e.vendorName}","${e.title}",${e.amount},${e.status}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'societysync-expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Expenses & Transparent Ledger</h2>
          <p className="text-xs text-slate-500">Vendor payouts, committee approvals, and exportable financial records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          {user.role === 'SOCIETY_ADMIN' && (
            <button
              type="button"
              onClick={() => setShowAdd((s) => !s)}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Submit Expense
            </button>
          )}
        </div>
      </div>

      {showAdd && user.role === 'SOCIETY_ADMIN' && (
        <form onSubmit={handleSubmit} className="p-5 bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            required
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            required
            placeholder="Vendor Name"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            required
            placeholder="Expense Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <input
            type="number"
            required
            min="1"
            placeholder="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
          />
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg cursor-pointer">
            Submit
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Title / Vendor</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{formatDate(e.expenseDate)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{e.title}</div>
                    <div className="text-xs text-slate-500">{e.vendorName}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.category}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">{formatINR(e.amount)}</td>
                  <td className={`px-4 py-3 text-xs font-semibold ${statusColorClass(e.status)}`}>{e.status}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {(user.role === 'SOCIETY_ADMIN' || user.role === 'COMMITTEE_MEMBER') && e.status === 'SUBMITTED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDecision(e.id, 'APPROVE')}
                          className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-md cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(e.id, 'REJECT')}
                          className="px-2.5 py-1 text-xs font-medium bg-rose-50 text-rose-700 rounded-md cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {user.role === 'SOCIETY_ADMIN' && e.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleDecision(e.id, 'MARK_PAID')}
                        className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-md cursor-pointer"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    apiRequest<AuditLog[]>('/audit').then(setLogs).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Immutable Audit Log</h2>
        <p className="text-xs text-slate-500">Traceable history of financial, security, and administrative actions</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{log.actorName}</div>
                    <div className="text-xs text-slate-500">{log.actorRole}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-700">{log.action}</td>
                  <td className="px-4 py-3 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
