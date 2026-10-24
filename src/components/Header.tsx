/**
 * @deprecated Legacy prototype header with persona switcher.
 * Replaced by genuine authentication, server-issued session cookies, and AppShell sidebar navigation.
 */
"use client";

import React from 'react';
import { ShieldCheck, UserCheck, Database, Layers } from 'lucide-react';
import type { UserPersona } from '@/lib/types';
import { useBrandSession, PERSONAS } from '@/context/BrandSessionContext';

interface HeaderProps {
  currentPersona?: UserPersona;
  onSelectPersona?: (persona: UserPersona) => void;
  brandCount?: number;
}

export { PERSONAS };

export function Header({
  currentPersona: propPersona,
  onSelectPersona: propOnSelect,
  brandCount: propBrandCount,
}: HeaderProps) {
  const session = useBrandSession();

  const currentPersona = propPersona || session.currentPersona;
  const onSelectPersona = propOnSelect || session.setCurrentPersona;
  const brandCount = propBrandCount !== undefined ? propBrandCount : session.brands.length;

  return (
    <header className="border-b border-gray-200 bg-white shadow-xs">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-gray-900">BrandLens AI</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-700/10">
                Governance Studio
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Evidence-first brand compliance &amp; deterministic review
            </p>
          </div>
        </div>

        {/* Status badges & Persona Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* DB persistence indicator */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <Database className="h-3.5 w-3.5 text-emerald-600" />
            <span>SQLite WAL</span>
            <span className="rounded bg-emerald-200/60 px-1 text-[10px] text-emerald-900">
              {brandCount} brands
            </span>
          </div>

          {/* Engine indicator */}
          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-medium text-blue-800">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            <span>Deterministic + Contextual AI</span>
          </div>

          {/* Demo Persona Switcher */}
          <div
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1"
            title="Demo Role Switcher — Not Real Login: Simulated user identities for evaluating role-based permissions and approval flows."
          >
            <div className="flex items-center gap-1 pl-2 text-xs font-semibold text-gray-500">
              <UserCheck className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden xl:inline text-[11px] font-bold text-gray-700">Demo Role Switcher (Simulation):</span>
              <span className="xl:hidden hidden md:inline text-[11px] font-bold text-gray-700">Demo Role:</span>
            </div>
            <div className="flex gap-1">
              {PERSONAS.map((p) => {
                const isActive = p.id === currentPersona.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPersona(p)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-blue-700 shadow-xs ring-1 ring-gray-950/10 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                    title={`Simulate ${p.name} (${p.title}) — Role: ${p.role}. (Demo simulation, not real login)`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      {p.avatar}
                    </span>
                    <span className="hidden sm:inline">{p.name.split(' ')[0]}</span>
                    <span className="text-[10px] opacity-75 capitalize">({p.role})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
