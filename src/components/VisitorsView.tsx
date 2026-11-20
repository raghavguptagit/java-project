import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, Plus } from 'lucide-react';
import { apiRequest, formatDateTime, statusColorClass } from '../lib/api';
import type { Flat, User, VisitorRecord } from '../types';

export function VisitorsView({ user, onNotify }: { user: User; onNotify: (msg: string) => void }) {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('Guest Visit');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [flatId, setFlatId] = useState('');

  async function loadAll() {
    setError('');
    try {
      const [v, f] = await Promise.all([
        apiRequest<VisitorRecord[]>('/visitors'),
        apiRequest<Flat[]>('/flats'),
      ]);
      setVisitors(v);
      setFlats(f);
      if (!flatId && f.length > 0) setFlatId(f[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visitors.');
    }
  }

  useEffect(() => {
    loadAll();
  }, [user.id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const isWalkIn = user.role === 'SECURITY';
      const created = await apiRequest<VisitorRecord>('/visitors', {
        method: 'POST',
        body: JSON.stringify({
          visitorName,
          phone,
          purpose,
          vehicleNumber,
          flatId: user.role === 'RESIDENT' ? user.flatId : flatId,
          isWalkIn,
        }),
      });
      setVisitorName('');
      setPhone('');
      setVehicleNumber('');
      setShowCreate(false);
      onNotify(
        isWalkIn
          ? `Walk-in logged for ${created.flatLabel} (awaiting approval).`
          : `Visitor pre-approved. Invite Code: ${created.inviteCode}`
      );
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create visitor record.');
    }
  }

  async function handleAction(id: string, action: string) {
    try {
      await apiRequest(`/visitors/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      onNotify(`Visitor status updated (${action.replace('_', ' ')}).`);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  const isGate = user.role === 'SECURITY' || user.role === 'SOCIETY_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Visitors & Gate Management</h2>
          <p className="text-xs text-slate-500">
            {user.role === 'SECURITY'
              ? 'Verify invite codes, log walk-ins, and record gate check-in / check-out'
              : 'Pre-approve guests with single-use invite codes and track gate entries'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-lg flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{user.role === 'SECURITY' ? 'Log Walk-In' : 'Pre-Approve Visitor'}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="p-5 bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-4">
          {user.role !== 'RESIDENT' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Flat</label>
              <select
                value={flatId}
                onChange={(e) => setFlatId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.unitNumber}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Visitor Name</label>
            <input
              type="text"
              required
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone (masked)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Purpose</label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle (opt)</label>
              <input
                type="text"
                placeholder="MH-12-..."
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Invite Code</th>
                <th className="px-4 py-3 font-medium">Visitor</th>
                <th className="px-4 py-3 font-medium">Flat</th>
                <th className="px-4 py-3 font-medium">Purpose / Vehicle</th>
                <th className="px-4 py-3 font-medium">Check-In / Out</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Gate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visitors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-700">{v.inviteCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{v.visitorName}</div>
                    {v.phoneMasked && <div className="text-xs text-slate-500 font-mono">{v.phoneMasked}</div>}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{v.flatLabel}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{v.purpose}</div>
                    {v.vehicleNumber && <div className="text-xs font-mono text-slate-500">{v.vehicleNumber}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">
                    <div>In: {formatDateTime(v.checkedInAt)}</div>
                    <div>Out: {formatDateTime(v.checkedOutAt)}</div>
                  </td>
                  <td className={`px-4 py-3 text-xs font-semibold ${statusColorClass(v.status)}`}>{v.status}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {v.status === 'AWAITING_APPROVAL' && (user.role === 'RESIDENT' || user.role === 'SOCIETY_ADMIN') && (
                      <button
                        type="button"
                        onClick={() => handleAction(v.id, 'APPROVE')}
                        className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                    {isGate && (v.status === 'EXPECTED' || v.status === 'APPROVED') && (
                      <button
                        type="button"
                        onClick={() => handleAction(v.id, 'CHECK_IN')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" /> Check In
                      </button>
                    )}
                    {isGate && v.status === 'CHECKED_IN' && (
                      <button
                        type="button"
                        onClick={() => handleAction(v.id, 'CHECK_OUT')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-md cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Check Out
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
