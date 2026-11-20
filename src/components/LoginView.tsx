import React, { useState } from 'react';
import { Building2, Lock, Mail, ArrowRight } from 'lucide-react';
import { apiRequest, setStoredToken } from '../lib/api';
import type { User } from '../types';

interface LoginViewProps {
  onSuccess: (user: User) => void;
}

const DEMO_ACCOUNTS = [
  { label: 'Society Admin', email: 'admin@greenvalley.in', password: 'Admin@123', scope: 'Full society operations' },
  { label: 'Resident (A-101)', email: 'resident@greenvalley.in', password: 'Resident@123', scope: 'Own flat bills, complaints, visitors' },
  { label: 'Committee Member', email: 'committee@greenvalley.in', password: 'Committee@123', scope: 'Reports & expense approvals' },
  { label: 'Security Desk', email: 'security@greenvalley.in', password: 'Security@123', scope: 'Gate check-in/out & walk-ins' },
  { label: 'Maintenance Staff', email: 'staff@greenvalley.in', password: 'Staff@123', scope: 'Assigned work orders only' },
];

export function LoginView({ onSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('admin@greenvalley.in');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(res.token);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(acc: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: acc.email, password: acc.password }),
      });
      setStoredToken(res.token);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <div className="lg:w-1/2 bg-slate-900 text-white p-8 lg:p-16 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">SocietySync</span>
          </div>
          <h1 className="mt-12 text-3xl lg:text-4xl font-bold tracking-tight leading-tight max-w-lg text-balance">
            Your community. Connected. Transparent.
          </h1>
          <p className="mt-4 text-slate-300 text-base max-w-md leading-relaxed">
            Unified residential operations for maintenance billing, service complaints, gate security, amenity bookings,
            and transparent society accounting.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-3 gap-6 max-w-lg">
          <div>
            <div className="text-2xl font-semibold font-mono tabular-nums">3 Towers</div>
            <div className="text-xs text-slate-400 mt-1">Green Valley Demo</div>
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono tabular-nums">5 Roles</div>
            <div className="text-xs text-slate-400 mt-1">Server-enforced RBAC</div>
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono tabular-nums">Gemini AI</div>
            <div className="text-xs text-slate-400 mt-1">Grounded Policy FAQ</div>
          </div>
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to SocietySync</h2>
          <p className="mt-1 text-sm text-slate-600">Access Green Valley Residency operations workspace</p>

          {error && (
            <div role="alert" className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1.5 relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="name@greenvalley.in"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1.5 relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Signing in...' : 'Sign in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-500 mb-3">Quick Demo Role Access</div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => quickLogin(acc)}
                  className="w-full text-left px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">{acc.label}</div>
                    <div className="text-xs text-slate-500">{acc.scope}</div>
                  </div>
                  <span className="text-xs font-mono text-indigo-700 whitespace-nowrap">Sign in</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
