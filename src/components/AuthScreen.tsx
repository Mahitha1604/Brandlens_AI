"use client";

import React, { useState } from 'react';
import { useBrandSession } from '@/context/BrandSessionContext';
import type { PersonaRole } from '@/lib/types';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const { login, register, enterDemoMode } = useBrandSession();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<PersonaRole>('copywriter');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const result = await login(email, password);
        if (result.success) {
          onSuccess?.();
        } else {
          setErrorMessage(result.error || 'Failed to sign in. Please verify your credentials.');
        }
      } else {
        const result = await register(email, password, name, role);
        if (result.success) {
          onSuccess?.();
        } else {
          setErrorMessage(result.error || 'Failed to create account. Email may already be in use.');
        }
      }
    } catch {
      setErrorMessage('An unexpected network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoClick = () => {
    enterDemoMode();
    onSuccess?.();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-sky-500/10 to-emerald-500/15 blur-3xl pointer-events-none rounded-full" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          BrandLens AI • Enterprise Content Studio
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Check your content before publishing.
        </h1>
        <p className="mt-3 text-sm text-slate-400 max-w-sm mx-auto">
          Verify marketing copy against your brand guidelines and check factual claims against approved supporting evidence.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800">
          {/* Tab selector */}
          <div className="flex rounded-lg bg-slate-800/80 p-1 mb-6 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                mode === 'signin'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password {mode === 'register' && <span className="text-slate-500 font-normal">(min. 8 characters)</span>}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Primary Role
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <label className={`flex items-start p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    role === 'copywriter'
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="copywriter"
                      checked={role === 'copywriter'}
                      onChange={() => setRole('copywriter')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-2.5">
                      <div className="font-semibold text-slate-200">Copywriter / Creator</div>
                      <div className="text-[11px] text-slate-400">Drafts marketing content and applies automated corrections.</div>
                    </div>
                  </label>

                  <label className={`flex items-start p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    role === 'reviewer'
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="reviewer"
                      checked={role === 'reviewer'}
                      onChange={() => setRole('reviewer')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-2.5">
                      <div className="font-semibold text-slate-200">Compliance Reviewer</div>
                      <div className="text-[11px] text-slate-400">Reviews submissions, requests revisions, and approves content.</div>
                    </div>
                  </label>

                  <label className={`flex items-start p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    role === 'admin'
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={role === 'admin'}
                      onChange={() => setRole('admin')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-2.5">
                      <div className="font-semibold text-slate-200">Brand Administrator</div>
                      <div className="text-[11px] text-slate-400">Manages brand guidelines, claims rules, and full governance.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {mode === 'signin' ? 'Sign In to Workspace' : 'Create My Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500 font-semibold tracking-wider">
                Or explore without signing up
              </span>
            </div>
          </div>

          {/* Try Demo Mode Action */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleDemoClick}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-all flex items-center justify-center gap-2 group"
            >
              <svg className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Explore Preloaded Demo Mode</span>
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Preview BrandLens AI with sample fintech (<span className="text-slate-400 font-medium">ApexPay</span>) and skincare (<span className="text-slate-400 font-medium">Verdant Aura</span>) datasets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
