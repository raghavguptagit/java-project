import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiRequest, formatDateTime, statusColorClass } from '../lib/api';
import type { Complaint, ComplaintPriority, ComplaintStatus, StaffMember, User } from '../types';

export function ComplaintsView({ user, onNotify }: { user: User; onNotify: (msg: string) => void }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [category, setCategory] = useState('Plumbing');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusNote, setStatusNote] = useState('');

  async function loadAll() {
    setError('');
    try {
      const [c, s] = await Promise.all([
        apiRequest<Complaint[]>('/complaints'),
        apiRequest<StaffMember[]>('/staff'),
      ]);
      setComplaints(c);
      setStaff(s);
      if (selected) {
        const refreshed = c.find((item) => item.id === selected.id) || null;
        setSelected(refreshed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaints.');
    }
  }

  useEffect(() => {
    loadAll();
  }, [user.id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await apiRequest<Complaint>('/complaints', {
        method: 'POST',
        body: JSON.stringify({ category, priority, title, description }),
      });
      setTitle('');
      setDescription('');
      setShowCreate(false);
      setSelected(created);
      onNotify(`Complaint ${created.ticketNumber} created.`);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create complaint.');
    }
  }

  async function handleAssign(complaintId: string, staffUserId: string) {
    try {
      const updated = await apiRequest<Complaint>(`/complaints/${complaintId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ staffUserId }),
      });
      setSelected(updated);
      onNotify('Staff assigned to ticket.');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign staff.');
    }
  }

  async function handleTransition(complaintId: string, nextStatus: ComplaintStatus) {
    try {
      const updated = await apiRequest<Complaint>(`/complaints/${complaintId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus, note: statusNote || undefined }),
      });
      setStatusNote('');
      setSelected(updated);
      onNotify(`Ticket moved to ${nextStatus}.`);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Complaints & Service Requests</h2>
          <p className="text-xs text-slate-500">Track SLA targets, staff assignment, and resolution history</p>
        </div>
        {(user.role === 'RESIDENT' || user.role === 'SOCIETY_ADMIN') && (
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-lg flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Complaint</span>
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option>Plumbing</option>
                <option>Electrical</option>
                <option>Elevator</option>
                <option>Housekeeping</option>
                <option>Security</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="LOW">Low (72h SLA)</option>
                <option value="MEDIUM">Medium (24h SLA)</option>
                <option value="HIGH">High (12h SLA)</option>
                <option value="URGENT">Urgent (4h SLA)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
              <input
                type="text"
                required
                placeholder="Brief issue summary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Details</label>
            <textarea
              required
              rows={2}
              placeholder="Describe the location and issue clearly..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg cursor-pointer"
            >
              Submit Ticket
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {complaints.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No complaints in your queue.</div>
            ) : (
              complaints.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    selected?.id === c.id ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">
                      {c.ticketNumber} · {c.flatLabel} · {c.category}
                    </span>
                    <span className={`text-xs font-semibold ${statusColorClass(c.status)}`}>{c.status}</span>
                  </div>
                  <div className="mt-1 font-medium text-slate-900">{c.title}</div>
                  <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-3">
                    <span>Priority: {c.priority}</span>
                    <span>Assigned: {c.assignedStaffName || 'Unassigned'}</span>
                    <span>SLA Due: {formatDateTime(c.slaDueAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {!selected ? (
            <div className="text-sm text-slate-500 py-8 text-center">Select a complaint to view details and timeline.</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="font-mono text-xs text-slate-500">{selected.ticketNumber}</div>
                <h3 className="text-base font-semibold text-slate-900 mt-1">{selected.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{selected.description}</p>
              </div>

              {user.role === 'SOCIETY_ADMIN' && (
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Assign Maintenance Staff</label>
                  <select
                    value={selected.assignedStaffId || ''}
                    onChange={(e) => e.target.value && handleAssign(selected.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select staff...</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.userId || s.id}>
                        {s.name} ({s.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <input
                  type="text"
                  placeholder="Optional update note..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <div className="flex flex-wrap gap-2">
                  {(selected.status === 'OPEN' || selected.status === 'ASSIGNED' || selected.status === 'REOPENED') &&
                    (user.role === 'MAINTENANCE_STAFF' || user.role === 'SOCIETY_ADMIN') && (
                      <button
                        type="button"
                        onClick={() => handleTransition(selected.id, 'IN_PROGRESS')}
                        className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-md cursor-pointer"
                      >
                        Mark In Progress
                      </button>
                    )}
                  {(selected.status === 'ASSIGNED' || selected.status === 'IN_PROGRESS' || selected.status === 'REOPENED') &&
                    (user.role === 'MAINTENANCE_STAFF' || user.role === 'SOCIETY_ADMIN') && (
                      <button
                        type="button"
                        onClick={() => handleTransition(selected.id, 'RESOLVED')}
                        className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-md cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    )}
                  {selected.status === 'RESOLVED' && (user.role === 'RESIDENT' || user.role === 'SOCIETY_ADMIN') && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleTransition(selected.id, 'CLOSED')}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-md cursor-pointer"
                      >
                        Confirm & Close
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTransition(selected.id, 'REOPENED')}
                        className="px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md cursor-pointer"
                      >
                        Reopen
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-700 mb-2">Activity Timeline</div>
                <div className="space-y-2.5">
                  {selected.events.map((ev) => (
                    <div key={ev.id} className="text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span className="font-medium text-slate-800">{ev.actorName}</span>
                        <span className="font-mono">{formatDateTime(ev.createdAt)}</span>
                      </div>
                      <div className="text-slate-600 mt-0.5">{ev.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
