"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileCheck2,
  BookOpen,
  History,
  Building2,
  ArrowRight,
  Layers,
  Clock,
  CheckCircle2,
  Send,
  Wand2,
  PlusCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useBrandSession } from '@/context/BrandSessionContext';
import type { Draft } from '@/lib/types';

interface AppStats {
  brands_count: number;
  rules_count: number;
  drafts_count: number;
  revisions_count: number;
  approved_drafts_count: number;
  pending_reviews_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    activeBrand,
    brands,
    isDemoMode,
    setDraftContent,
    setDraftTitle,
    setDraftChannel,
    setTargetAudience,
    loadSampleDraft,
  } = useBrandSession();
  const [stats, setStats] = useState<AppStats | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const statsUrl = isDemoMode ? '/api/stats?demo=true' : '/api/stats';
        const draftsUrl = isDemoMode ? '/api/drafts?demo=true' : '/api/drafts';

        const [resStats, resDrafts] = await Promise.all([
          fetch(statsUrl),
          fetch(draftsUrl),
        ]);

        if (resStats.ok && isMounted) {
          const json = await resStats.json();
          if (json.success) setStats(json.data);
        }

        if (resDrafts.ok && isMounted) {
          const json = await resDrafts.json();
          if (json.success && Array.isArray(json.data)) {
            setRecentDrafts(json.data.slice(0, 5));
          } else {
            setRecentDrafts([]);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [isDemoMode]);

  const openDraftInStudio = (draft: Draft) => {
    setDraftTitle(draft.title);
    setDraftContent(draft.content);
    setDraftChannel(draft.channel);
    setTargetAudience(draft.target_audience);
  };

  const handleTrySample = () => {
    loadSampleDraft({
      title: '[DEMO SAMPLE] Enterprise Payments Overview (Flagged Copy)',
      channel: 'landing_page',
      audience: 'Corporate Treasurers',
      content:
        'ApexPay delivers effortless, lightning-fast cross-border payments. We guarantee 100% fraud prevention across all tier-1 corridors with bank-grade security and zero transaction fees. Trusted by 5,000+ financial institutions, our revolutionary platform eliminates all settlement delays and ensures your enterprise funds move with miraculous speed.',
    });
    router.push('/studio');
  };

  const gettingStartedSteps = [
    {
      num: 1,
      title: 'Create or Select a Brand',
      desc: 'Pick a sample brand or create your own profile with industry details.',
      link: '/knowledge',
      actionLabel: 'Go to Brand Knowledge',
      icon: Building2,
    },
    {
      num: 2,
      title: 'Add Guidelines & Facts',
      desc: 'Define tone of voice, approved terminology, and verified corporate facts.',
      link: '/knowledge',
      actionLabel: 'Manage Rules',
      icon: BookOpen,
    },
    {
      num: 3,
      title: 'Submit Content for Review',
      desc: 'Paste marketing copy into Review Studio with optional focus instructions.',
      link: '/studio',
      actionLabel: 'Open Review Studio',
      icon: Send,
    },
    {
      num: 4,
      title: 'Review Findings & Apply Fixes',
      desc: 'Inspect color-coded rule checks and apply suggested fixes with one click.',
      link: '/studio',
      actionLabel: 'Inspect Copy',
      icon: Wand2,
    },
    {
      num: 5,
      title: 'Send for Governance Approval',
      desc: 'Submit compliant copy for formal reviewer sign-off and audit logging.',
      link: '/history',
      actionLabel: 'View Approvals',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Welcoming Hero Banner */}
      <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50/90 via-indigo-50/50 to-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/90 px-3 py-1 text-xs font-bold text-blue-800">
              <span>Brand Governance Dashboard</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-950">
              Check your content before publishing.
            </h1>
            <p className="text-sm text-gray-700 max-w-2xl leading-relaxed">
              Review marketing content against your brand guidelines and check whether factual claims have appropriate supporting evidence.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-gray-600">
              <span>Active Brand:</span>
              {activeBrand ? (
                <>
                  <strong className="text-gray-950">{activeBrand.name}</strong>
                  {activeBrand.is_sample ? (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                      DEMO SAMPLE
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-200">
                      Your Brand
                    </span>
                  )}
                </>
              ) : (
                <span className="text-amber-800 font-medium">No brand created yet. Click &apos;Set Up My Brand&apos; to begin.</span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Primary Action 1 */}
            <Link
              href="/studio"
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Check My Content</span>
            </Link>

            {/* Primary Action 2 */}
            <Link
              href="/knowledge"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <PlusCircle className="h-4 w-4 text-blue-600" />
              <span>Set Up My Brand</span>
            </Link>

            {/* Separate, Clearly Labeled Try a Sample Action */}
            <button
              type="button"
              onClick={handleTrySample}
              className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
              title="Load a demonstration draft with intentional compliance issues"
            >
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Try a Sample</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid with Plain-English Labels & Explanations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Your Brands
            </span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-gray-950">
            {stats ? stats.brands_count : brands.length || '...'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Configured brand profiles in workspace</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Brand Rules
            </span>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-gray-950">
            {stats ? stats.rules_count : '...'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Guidelines, terminology &amp; approved facts</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Drafts Reviewed
            </span>
            <FileCheck2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-gray-950">
            {stats ? stats.drafts_count : '...'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {stats?.approved_drafts_count || 0} approved, {stats?.pending_reviews_count || 0} in review
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Saved Versions
            </span>
            <History className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-gray-950">
            {stats ? stats.revisions_count : '...'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Tracked revision snapshots with visual diffs</p>
        </div>
      </div>

      {/* 3. Visible "Getting Started" Guide */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="border-b border-gray-150 pb-4 mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <span>Getting Started with BrandLens AI</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Five simple steps to check, polish, and approve your marketing copy.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {gettingStartedSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="rounded-xl border border-gray-150 bg-gray-50/60 p-4 flex flex-col justify-between hover:border-blue-200 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                      {step.num}
                    </span>
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-xs text-gray-950 mb-1">{step.title}</h3>
                  <p className="text-[11px] text-gray-600 leading-relaxed mb-3">{step.desc}</p>
                </div>
                <Link
                  href={step.link}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 pt-2 border-t border-gray-200/60"
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Three-Layer Review Architecture Walkthrough */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="border-b border-gray-150 pb-4 mb-5">
          <h2 className="text-base font-bold text-gray-900">
            How BrandLens AI Reviews Your Content
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Content is verified through three complementary layers of governance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-xl border border-blue-150 bg-blue-50/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs">
                1
              </span>
              <h3 className="font-bold text-xs text-blue-950">Layer 1: Deterministic Engine</h3>
            </div>
            <p className="text-xs text-blue-900 leading-relaxed">
              Sub-millisecond scans check your text against exact brand rules: prohibited buzzwords,
              trademark capitalization, and mandatory disclaimer phrases.
            </p>
          </div>

          <div className="rounded-xl border border-purple-150 bg-purple-50/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-600 text-white font-bold text-xs">
                2
              </span>
              <h3 className="font-bold text-xs text-purple-950">Layer 2: Contextual AI Review</h3>
            </div>
            <p className="text-xs text-purple-900 leading-relaxed">
              Server-side AI evaluates tone of voice, unsubstantiated superlatives (like &quot;miraculous&quot; or &quot;100% risk-free&quot;),
              and custom reviewer focus instructions.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-150 bg-emerald-50/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white font-bold text-xs">
                3
              </span>
              <h3 className="font-bold text-xs text-emerald-950">Layer 3: Supporting Evidence</h3>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Checks whether factual statements have approved corporate citations in your brand
              knowledge base. Flags unverified claims honestly without fabricating evidence.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Recent Draft Submissions Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-150 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Drafts &amp; Submissions</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Review history and decisions recorded in your persistent database.
            </p>
          </div>
          <Link
            href="/history"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <span>View All Saved Versions</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading recent drafts...</div>
        ) : recentDrafts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Updated</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentDrafts.map((draft) => (
                  <tr key={draft.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <span>{draft.title}</span>
                        {draft.id.includes('sample') && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                            DEMO SAMPLE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono truncate max-w-xs">
                        {draft.content.slice(0, 70)}...
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          draft.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : draft.status === 'under_review'
                            ? 'bg-blue-100 text-blue-800'
                            : draft.status === 'changes_requested'
                            ? 'bg-amber-100 text-amber-800'
                            : draft.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {draft.status === 'under_review'
                          ? 'In Review'
                          : draft.status === 'changes_requested'
                          ? 'Changes Requested'
                          : draft.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 capitalize">
                        {draft.channel.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                        v{draft.current_revision}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span>{new Date(draft.updated_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href="/studio"
                        onClick={() => openDraftInStudio(draft)}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-800 hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <span>Open in Studio</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-xs text-gray-600 font-medium mb-1">No drafts reviewed yet.</p>
            <p className="text-[11px] text-gray-500 mb-4 max-w-sm mx-auto">
              Ready to verify your marketing copy? Paste your content in the Review Studio to run
              instant compliance checks.
            </p>
            <Link
              href="/studio"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Create Your First Draft in Review Studio</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
