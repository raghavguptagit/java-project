import React, { useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  Calendar,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { AiAssistantView } from './components/AiAssistantView';
import { BillingView } from './components/BillingView';
import { ComplaintsView } from './components/ComplaintsView';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { FacilitiesView, NoticesView } from './components/NoticesFacilitiesView';
import { AuditView, ExpensesView, FlatsView } from './components/OperationsView';
import { VisitorsView } from './components/VisitorsView';
import { apiRequest, formatRole, getStoredToken, setStoredToken } from './lib/api';
import type { NotificationItem, Role, Society, User } from './types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'RESIDENT', 'SECURITY', 'MAINTENANCE_STAFF'] },
  { id: 'billing', label: 'Bills & Payments', icon: Receipt, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'RESIDENT'] },
  { id: 'complaints', label: 'Complaints', icon: Wrench, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'RESIDENT', 'MAINTENANCE_STAFF'] },
  { id: 'visitors', label: 'Visitors & Gate', icon: ShieldCheck, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'RESIDENT', 'SECURITY'] },
  { id: 'notices', label: 'Notices', icon: MessageSquare, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'RESIDENT', 'SECURITY', 'MAINTENANCE_STAFF'] },
  { id: 'facilities', label: 'Facilities & Booking', icon: Calendar, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'RESIDENT', 'MAINTENANCE_STAFF'] },
  { id: 'flats', label: 'Flats & Directory', icon: Home, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'RESIDENT', 'SECURITY'] },
  { id: 'expenses', label: 'Expenses & Ledger', icon: Wallet, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'RESIDENT'] },
  { id: 'assistant', label: 'AI Assistant', icon: Sparkles, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'RESIDENT', 'SECURITY', 'MAINTENANCE_STAFF'] },
  { id: 'audit', label: 'Audit Log', icon: FileText, roles: ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER'] },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    apiRequest<{ user: User; society: Society }>('/auth/me')
      .then((res) => {
        setUser(res.user);
        setSociety(res.society);
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    apiRequest<NotificationItem[]>('/notifications').then(setNotifications).catch(() => {});
  }, [user]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  }

  async function handleLogout() {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    setStoredToken(null);
    setUser(null);
    setActiveTab('dashboard');
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Loading SocietySync...
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        onSuccess={(u) => {
          setUser(u);
          setActiveTab('dashboard');
          apiRequest<{ user: User; society: Society }>('/auth/me')
            .then((res) => setSociety(res.society))
            .catch(() => {});
        }}
      />
    );
  }

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const currentNav = allowedNav.find((n) => n.id === activeTab) || allowedNav[0];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-indigo-700 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">SocietySync</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const active = currentNav.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="text-sm font-semibold text-slate-900 truncate">{user.displayName}</div>
          <div className="text-xs text-slate-500">{formatRole(user.role)}</div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-xl">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-bold text-slate-900">SocietySync</span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {allowedNav.map((item) => {
                const Icon = item.icon;
                const active = currentNav.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Sign out ({user.displayName})
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-900">{society?.name || 'Green Valley Residency'}</span>
              <span className="mx-2 text-slate-300">/</span>
              <span>{currentNav.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setShowNotifications((s) => !s)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-700 text-white text-[10px] font-mono flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-40">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-900">Notifications</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiRequest('/notifications/read-all', { method: 'POST' });
                      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                    }}
                    className="text-xs text-indigo-700 hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-xs text-slate-500 py-4 text-center">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="text-xs p-2 rounded-lg bg-slate-50">
                        <div className="font-medium text-slate-900">{n.title}</div>
                        <div className="text-slate-600 mt-0.5">{n.body}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {toast && (
            <div
              role="status"
              className="mb-4 px-4 py-2.5 bg-slate-900 text-white text-sm rounded-lg flex items-center justify-between"
            >
              <span>{toast}</span>
              <button type="button" onClick={() => setToast('')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentNav.id === 'dashboard' && <DashboardView user={user} onNavigate={setActiveTab} />}
          {currentNav.id === 'billing' && <BillingView user={user} onNotify={notify} />}
          {currentNav.id === 'complaints' && <ComplaintsView user={user} onNotify={notify} />}
          {currentNav.id === 'visitors' && <VisitorsView user={user} onNotify={notify} />}
          {currentNav.id === 'notices' && <NoticesView user={user} onNotify={notify} />}
          {currentNav.id === 'facilities' && <FacilitiesView user={user} onNotify={notify} />}
          {currentNav.id === 'flats' && <FlatsView user={user} onNotify={notify} />}
          {currentNav.id === 'expenses' && <ExpensesView user={user} onNotify={notify} />}
          {currentNav.id === 'assistant' && <AiAssistantView user={user} />}
          {currentNav.id === 'audit' && <AuditView />}
        </main>
      </div>
    </div>
  );
}
