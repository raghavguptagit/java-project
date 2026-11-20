import React, { useEffect, useState } from 'react';
import { Calendar, Check, Pin, Plus } from 'lucide-react';
import { apiRequest, formatDateTime, formatINR, statusColorClass } from '../lib/api';
import type { Booking, Facility, Notice, User } from '../types';

export function NoticesView({ user, onNotify }: { user: User; onNotify: (msg: string) => void }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Maintenance');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('IMPORTANT');
  const [pinned, setPinned] = useState(false);

  async function load() {
    const data = await apiRequest<Notice[]>('/notices');
    setNotices(data);
  }

  useEffect(() => {
    load();
  }, [user.id]);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    await apiRequest('/notices', {
      method: 'POST',
      body: JSON.stringify({ title, body, category, priority, pinned }),
    });
    setTitle('');
    setBody('');
    setShowCreate(false);
    onNotify('Notice published to society residents.');
    load();
  }

  async function markRead(id: string) {
    await apiRequest(`/notices/${id}/read`, { method: 'POST' });
    load();
  }

  const canPublish = user.role === 'SOCIETY_ADMIN' || user.role === 'COMMITTEE_MEMBER';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Notices & Announcements</h2>
          <p className="text-xs text-slate-500">Official society circulars, AGM notices, and maintenance alerts</p>
        </div>
        {canPublish && (
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-lg flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Notice</span>
          </button>
        )}
      </div>

      {showCreate && canPublish && (
        <form onSubmit={handlePublish} className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'NORMAL' | 'IMPORTANT' | 'URGENT')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="NORMAL">Normal</option>
                <option value="IMPORTANT">Important</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Announcement Body</label>
            <textarea
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin to top of notice board
            </label>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg cursor-pointer"
            >
              Publish
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {notices.map((n) => {
          const isRead = n.readByUserIds.includes(user.id);
          return (
            <article key={n.id} className="p-5 bg-white border border-slate-200 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  {n.pinned && <Pin className="w-3.5 h-3.5 text-indigo-700" />}
                  <span>{n.category}</span>
                  <span>·</span>
                  <span className={statusColorClass(n.priority)}>{n.priority}</span>
                  <span>·</span>
                  <span>{formatDateTime(n.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{n.readByUserIds.length} read</span>
                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="inline-flex items-center gap-1 text-indigo-700 font-medium hover:underline cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark Read
                    </button>
                  )}
                </div>
              </div>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{n.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{n.body}</p>
              <div className="mt-3 text-xs text-slate-500">Issued by {n.createdByName} · Audience: {n.audience}</div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function FacilitiesView({ user, onNotify }: { user: User; onNotify: (msg: string) => void }) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');

  const [facilityId, setFacilityId] = useState('');
  const [date, setDate] = useState('2026-11-22');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [attendeeCount, setAttendeeCount] = useState('10');

  async function loadAll() {
    setError('');
    const [f, b] = await Promise.all([apiRequest<Facility[]>('/facilities'), apiRequest<Booking[]>('/bookings')]);
    setFacilities(f);
    setBookings(b);
    if (!facilityId && f.length > 0) setFacilityId(f[0].id);
  }

  useEffect(() => {
    loadAll();
  }, [user.id]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const startAt = `${date}T${startTime}:00.000Z`;
      const endAt = `${date}T${endTime}:00.000Z`;
      const created = await apiRequest<Booking>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          facilityId,
          startAt,
          endAt,
          attendeeCount: Number(attendeeCount),
        }),
      });
      onNotify(`Booking ${created.status.toLowerCase()} for ${created.facilityName}.`);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed.');
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await apiRequest(`/bookings/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      onNotify(`Booking updated to ${status}.`);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Facilities & Amenity Booking</h2>
        <p className="text-xs text-slate-500">Reserve society amenities with automatic overlap conflict prevention</p>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {facilities.map((f) => (
          <div key={f.id} className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{f.name}</h3>
                <span className="font-mono text-xs font-semibold text-indigo-700">
                  {f.fee > 0 ? formatINR(f.fee) : 'Free'}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">{f.description}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <div>Location: {f.location} · Capacity: {f.capacity}</div>
              <div>Hours: {f.openingTime} – {f.closingTime} · {f.approvalRequired ? 'Admin approval required' : 'Instant confirmation'}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleBook} className="p-5 bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Facility</label>
          <select
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Start</label>
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">End</label>
          <input
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="w-20">
            <label className="block text-xs font-medium text-slate-600 mb-1">Guests</label>
            <input
              type="number"
              min="1"
              value={attendeeCount}
              onChange={(e) => setAttendeeCount(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>
          <button
            type="submit"
            className="flex-1 py-2 px-3 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Calendar className="w-4 h-4" /> Book
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 text-sm font-semibold text-slate-900">Scheduled Bookings</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">Flat / Resident</th>
                <th className="px-4 py-3 font-medium">Slot</th>
                <th className="px-4 py-3 font-medium text-right">Fee</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.facilityName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {b.flatLabel} · {b.bookedByName}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {formatDateTime(b.startAt)} → {formatDateTime(b.endAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatINR(b.fee)}</td>
                  <td className={`px-4 py-3 text-xs font-semibold ${statusColorClass(b.status)}`}>{b.status}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {user.role === 'SOCIETY_ADMIN' && b.status === 'REQUESTED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(b.id, 'CONFIRMED')}
                          className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-md cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(b.id, 'REJECTED')}
                          className="px-2.5 py-1 text-xs font-medium bg-rose-50 text-rose-700 rounded-md cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {(b.status === 'CONFIRMED' || b.status === 'REQUESTED') &&
                      (user.role === 'SOCIETY_ADMIN' || b.bookedBy === user.id) && (
                        <button
                          type="button"
                          onClick={() => updateStatus(b.id, 'CANCELLED')}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          Cancel
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
