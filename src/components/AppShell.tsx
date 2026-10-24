"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  BookOpen,
  History,
  FileCheck2,
  Menu,
  X,
  Database,
  Building2,
  ChevronRight,
  LogOut,
  HelpCircle,
  AlertCircle,
  PlusCircle,
  Bell,
  FileText,
  Clock,
} from 'lucide-react';
import { useBrandSession, PERSONAS } from '@/context/BrandSessionContext';
import { AuthScreen } from '@/components/AuthScreen';
import { OnboardingTour } from '@/components/OnboardingTour';
import type { InAppNotification } from '@/lib/types';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Home',
    href: '/',
    icon: LayoutDashboard,
    description: 'Workspace overview and recent activity',
  },
  {
    name: 'Check Content',
    href: '/studio',
    icon: FileCheck2,
    badge: 'Core',
    description: 'Interactive review and 1-click fixes',
  },
  {
    name: 'My Drafts',
    href: '/drafts',
    icon: FileText,
    description: 'Browse, manage, and filter all marketing drafts',
  },
  {
    name: 'Review Queue',
    href: '/queue',
    icon: Clock,
    description: 'Governance evaluation for submitted content',
  },
  {
    name: 'My Brands & Rules',
    href: '/knowledge',
    icon: BookOpen,
    description: 'Guidelines, prohibited words, and facts',
  },
  {
    name: 'Approvals & History',
    href: '/history',
    icon: History,
    description: 'Saved versions and audit records',
  },
  {
    name: 'Team & Workspaces',
    href: '/team',
    icon: Building2,
    description: 'Workspaces, team members, and invites',
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [queueCount, setQueueCount] = useState<number>(0);

  const {
    currentUser,
    isDemoMode,
    isAuthLoading,
    logout,
    exitDemoMode,
    showOnboardingTour,
    setShowOnboardingTour,
    brands,
    selectedBrandId,
    setSelectedBrandId,
    activeBrand,
    currentPersona,
    setCurrentPersona,
  } = useBrandSession();

  // Load real notifications and queue count from API
  useEffect(() => {
    if (!currentUser && !isDemoMode) return;

    let isMounted = true;
    const fetchStats = async () => {
      try {
        if (currentUser) {
          const notifRes = await fetch('/api/notifications');
          const notifJson = await notifRes.json();
          if (isMounted && notifJson.success) {
            setNotifications(notifJson.data || []);
            setUnreadCount(notifJson.unread_count || 0);
          }
        }

        const queueRes = await fetch(`/api/governance/queue${isDemoMode ? '?demo=true' : ''}`);
        const queueJson = await queueRes.json();
        if (isMounted && queueJson.success) {
          setQueueCount(queueJson.count || 0);
        }
      } catch {
        // ignore network error
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [currentUser, isDemoMode, pathname]);

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const isCurrent = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex flex-col items-center justify-center p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 animate-pulse mb-4">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-gray-600">Verifying BrandLens AI session...</p>
      </div>
    );
  }

  // Not authenticated and not in demo mode -> render Auth Screen
  if (!currentUser && !isDemoMode) {
    return <AuthScreen />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50/70 font-sans text-gray-900">
      {/* Onboarding tour modal (if triggered) */}
      <OnboardingTour
        isOpen={showOnboardingTour}
        onClose={() => setShowOnboardingTour(false)}
      />

      {/* 1. Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-gray-200 bg-white">
        {/* Logo and Brand Identity */}
        <div className="flex h-18 items-center gap-3 border-b border-gray-150 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-gray-950">BrandLens AI</span>
            </div>
            <p className="text-[11px] font-medium text-gray-500">
              Evidence-First Brand Governance
            </p>
          </div>
        </div>

        {/* Brand Selector Dropdown */}
        <div className="p-4 border-b border-gray-150 bg-gray-50/50">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Active Brand Profile
            </label>
            <Link
              href="/knowledge"
              className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
            >
              <PlusCircle className="h-3 w-3" />
              <span>New Brand</span>
            </Link>
          </div>
          <div className="relative">
            {brands.length > 0 ? (
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 cursor-pointer"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.industry})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-500 text-center">
                <span>No brands yet. </span>
                <Link href="/knowledge" className="font-semibold text-blue-600 underline">
                  Create one
                </Link>
              </div>
            )}
            {brands.length > 0 && (
              <Building2 className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-gray-400" />
            )}
          </div>
          {activeBrand && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 px-0.5">
              <span>{activeBrand.rules.length} brand rules</span>
              <span className="text-emerald-700 font-medium">Active</span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-4">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const active = isCurrent(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      active ? 'text-white' : 'text-gray-400 group-hover:text-gray-700'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.href === '/queue' && queueCount > 0 ? (
                  <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                    {queueCount}
                  </span>
                ) : item.badge && !active ? (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    {item.badge}
                  </span>
                ) : null}
                {active && <ChevronRight className="h-3.5 w-3.5 text-white/80" />}
              </Link>
            );
          })}
        </nav>

        {/* Need Help / Restart Tour Trigger */}
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setShowOnboardingTour(true)}
            className="w-full flex items-center gap-2 rounded-lg border border-gray-200 bg-white py-2 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <HelpCircle className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>Open Getting Started Tour</span>
          </button>
        </div>

        {/* User Account or Demo Mode Footer */}
        <div className="border-t border-gray-150 p-4 bg-gray-50/60">
          {currentUser ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Signed In User
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200 uppercase">
                  {currentUser.role}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-900 truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">{currentUser.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-gray-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-gray-600 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : isDemoMode ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-600" />
                  <span>Demo Mode</span>
                </span>
                <button
                  type="button"
                  onClick={exitDemoMode}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-800"
                >
                  Exit Demo
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mb-2 leading-tight">
                Simulating preloaded sample brands (ApexPay &amp; Verdant Aura).
              </p>
              <div className="flex gap-1 mb-2">
                {PERSONAS.map((p) => {
                  const isSelected = p.id === currentPersona.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCurrentPersona(p)}
                      className={`flex-1 rounded-md py-1 px-1.5 text-center text-[10px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-blue-700 shadow-2xs ring-1 ring-blue-500 font-bold'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title={`${p.name} (${p.role})`}
                    >
                      <span className="block font-bold">{p.avatar}</span>
                      <span className="text-[8px] block opacity-75 capitalize">{p.role}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={exitDemoMode}
                className="w-full py-1 px-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-semibold transition-colors text-center"
              >
                Sign In to Your Workspace
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* 2. Main Layout Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Demo Mode Top Banner */}
        {isDemoMode && (
          <div className="bg-amber-500/15 border-b border-amber-300/60 px-4 py-2 flex items-center justify-between text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                <strong>Demo Mode Active:</strong> You are exploring preloaded fintech and skincare sample brands. Data is isolated from personal accounts.
              </span>
            </div>
            <button
              onClick={exitDemoMode}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors shrink-0"
            >
              Sign In or Register
            </button>
          </div>
        )}

        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold text-gray-900 text-sm">BrandLens AI</span>
          </div>

          <div className="flex items-center gap-2">
            {brands.length > 0 && (
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-gray-200 bg-white p-4 space-y-3">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isCurrent(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-gray-150 flex items-center justify-between">
              {currentUser ? (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="text-xs font-bold text-gray-900">{currentUser.name}</div>
                    <div className="text-[10px] text-gray-500 capitalize">{currentUser.role}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Sign Out
                  </button>
                </div>
              ) : isDemoMode ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-amber-700">Demo Mode</span>
                  <button
                    onClick={exitDemoMode}
                    className="text-xs font-semibold text-blue-600"
                  >
                    Exit Demo
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Top Bar for Desktop */}
        <div className="hidden lg:flex items-center justify-between border-b border-gray-200/80 bg-white/90 backdrop-blur-xs px-8 py-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Workspace Brand:
            </span>
            <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">
              {activeBrand ? activeBrand.name : brands.length === 0 ? 'No Brand Created Yet' : 'Select a Brand'}
            </span>
            {activeBrand && (
              <span className="text-xs text-gray-500">
                ({activeBrand.industry})
              </span>
            )}
            <Link
              href="/team"
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/80 px-2.5 py-1 text-xs font-semibold text-purple-900 hover:bg-purple-100 transition-colors ml-2"
            >
              <Building2 className="h-3.5 w-3.5 text-purple-600" />
              <span>Team &amp; Workspaces</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {/* Real In-App Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-2xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white p-3 shadow-xl border border-gray-200 z-50 space-y-2">
                  <div className="flex items-center justify-between border-b border-gray-150 pb-2 px-1">
                    <span className="text-xs font-bold text-gray-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1.5">
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-400">
                        No notifications yet
                      </p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <Link
                          key={n.id}
                          href={n.link || '/queue'}
                          onClick={() => setNotificationsOpen(false)}
                          className={`block p-2 rounded-xl text-xs transition-colors ${
                            !n.is_read ? 'bg-blue-50/60 font-semibold' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-gray-900">{n.title}</div>
                          <div className="text-[11px] text-gray-500 font-normal line-clamp-2">
                            {n.message}
                          </div>
                          <div className="text-[9px] text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="text-gray-300">|</span>

            <div className="flex items-center gap-1.5 text-gray-600">
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span>Immutable Audit Trail</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="text-gray-600">
              {currentUser ? (
                <span>
                  Role: <strong className="text-gray-900 capitalize">{currentUser.role}</strong>
                </span>
              ) : (
                <span>
                  Demo Persona: <strong className="text-gray-900">{currentPersona.name}</strong> ({currentPersona.title})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
