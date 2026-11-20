import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiRequest, formatINR } from '../lib/api';
import type { User } from '../types';

interface DashboardData {
  kpis: {
    totalFlats: number;
    occupiedFlats: number;
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    openComplaints: number;
    totalComplaints: number;
    checkedInVisitors: number;
    expectedVisitors: number;
    approvedExpenses: number;
    pendingExpenses: number;
    upcomingBookings: number;
    unreadNotices: number;
  };
  monthlySeries: { month: string; collected: number; expenses: number }[];
  complaintByStatus: { status: string; count: number }[];
}

export function DashboardView({ user, onNavigate }: { user: User; onNavigate: (tab: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<DashboardData>('/dashboard/summary')
      .then(setData)
      .catch((err) => setError(err.message));
  }, [user.id]);

  if (error) {
    return (
      <div className="p-6 bg-white border border-rose-200 rounded-xl text-sm text-rose-700">
        Failed to load dashboard summary: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const { kpis } = data;
  const showFinance = user.role === 'SOCIETY_ADMIN' || user.role === 'COMMITTEE_MEMBER' || user.role === 'RESIDENT';

  const cards =
    user.role === 'SECURITY'
      ? [
          { label: 'Checked-In Visitors', value: String(kpis.checkedInVisitors), sub: 'Currently inside premises', tab: 'visitors' },
          { label: 'Expected / Awaiting', value: String(kpis.expectedVisitors), sub: 'Scheduled or walk-in queue', tab: 'visitors' },
          { label: 'Occupied Flats', value: `${kpis.occupiedFlats} / ${kpis.totalFlats}`, sub: 'Green Valley Residency', tab: 'flats' },
          { label: 'Unread Notices', value: String(kpis.unreadNotices), sub: 'Active gate announcements', tab: 'notices' },
        ]
      : user.role === 'MAINTENANCE_STAFF'
      ? [
          { label: 'Assigned Open Tickets', value: String(kpis.openComplaints), sub: `${kpis.totalComplaints} total assigned`, tab: 'complaints' },
          { label: 'Upcoming Facility Slots', value: String(kpis.upcomingBookings), sub: 'Check readiness', tab: 'facilities' },
          { label: 'Unread Notices', value: String(kpis.unreadNotices), sub: 'Society updates', tab: 'notices' },
          { label: 'Total Units', value: String(kpis.totalFlats), sub: 'Across 3 towers', tab: 'flats' },
        ]
      : [
          {
            label: user.role === 'RESIDENT' ? 'Your Outstanding Dues' : 'Total Outstanding Dues',
            value: formatINR(kpis.totalOutstanding),
            sub: `${formatINR(kpis.totalCollected)} collected`,
            tab: 'billing',
          },
          {
            label: 'Open Complaints',
            value: String(kpis.openComplaints),
            sub: `${kpis.totalComplaints} total tickets`,
            tab: 'complaints',
          },
          {
            label: 'Active Visitors',
            value: `${kpis.checkedInVisitors} In / ${kpis.expectedVisitors} Exp`,
            sub: 'Gate security log',
            tab: 'visitors',
          },
          {
            label: 'Occupancy & Amenities',
            value: `${kpis.occupiedFlats}/${kpis.totalFlats} occupied`,
            sub: `${kpis.upcomingBookings} upcoming bookings`,
            tab: 'facilities',
          },
        ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onNavigate(c.tab)}
            className="text-left p-5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition-colors cursor-pointer"
          >
            <div className="text-xs font-medium text-slate-500">{c.label}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums truncate">{c.value}</div>
            <div className="mt-1 text-xs text-slate-500">{c.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {showFinance && (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Collections vs. Society Expenses</h2>
                <p className="text-xs text-slate-500 mt-0.5">Monthly cashflow overview (INR)</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('expenses')}
                className="text-xs font-medium text-indigo-700 hover:underline cursor-pointer"
              >
                View ledger
              </button>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(value) => formatINR(Number(value))} />
                  <Bar dataKey="collected" name="Collected" fill="#4338ca" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className={`${showFinance ? 'lg:col-span-1' : 'lg:col-span-3'} bg-white border border-slate-200 rounded-xl p-6`}>
          <h2 className="text-base font-semibold text-slate-900">Operational Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">Live status breakdown</p>
          <div className="mt-5 divide-y divide-slate-100">
            {data.complaintByStatus.map((row) => (
              <div key={row.status} className="py-2.5 flex items-center justify-between text-sm">
                <span className="text-slate-600">{row.status.replace('_', ' ')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">{row.count}</span>
              </div>
            ))}
            <div className="py-2.5 flex items-center justify-between text-sm">
              <span className="text-slate-600">Pending Expense Approvals</span>
              <span className="font-mono tabular-nums font-semibold text-amber-700">{kpis.pendingExpenses}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between text-sm">
              <span className="text-slate-600">Unread Notices</span>
              <span className="font-mono tabular-nums font-semibold text-indigo-700">{kpis.unreadNotices}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
