"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  GitCompare,
  ShieldCheck,
  History,
} from 'lucide-react';
import type { DetailedDraftRevision } from '@/lib/db';
import type { AuditLog, DraftChannel } from '@/lib/types';
import { useBrandSession } from '@/context/BrandSessionContext';
import { computeWordDiff } from '@/lib/engine/diff';

export default function ApprovalsHistoryPage() {
  const { setDraftTitle, setDraftContent, setDraftChannel, isDemoMode } = useBrandSession();
  const [activeTab, setActiveTab] = useState<'versions' | 'audit'>('versions');

  // Revisions state
  const [revisions, setRevisions] = useState<DetailedDraftRevision[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(true);
  const [expandedRevId, setExpandedRevId] = useState<string | null>(null);

  // Visual Diff state
  const [diffBaseRevId, setDiffBaseRevId] = useState<string>('');
  const [diffCompareRevId, setDiffCompareRevId] = useState<string>('');

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoadingRevisions(true);
      setIsLoadingAudit(true);
      try {
        const histUrl = isDemoMode ? '/api/history?demo=true' : '/api/history';
        const auditUrl = isDemoMode ? '/api/audit?demo=true' : '/api/audit';

        const [resHist, resAudit] = await Promise.all([
          fetch(histUrl),
          fetch(auditUrl),
        ]);

        if (resHist.ok && isMounted) {
          const json = await resHist.json();
          if (json.success && Array.isArray(json.data)) {
            setRevisions(json.data);
            if (json.data.length > 0) {
              setExpandedRevId(json.data[0].id);
              // Setup default diff comparison if multiple versions exist
              if (json.data.length >= 2) {
                setDiffBaseRevId(json.data[json.data.length - 1].id);
                setDiffCompareRevId(json.data[0].id);
              } else {
                setDiffBaseRevId(json.data[0].id);
                setDiffCompareRevId(json.data[0].id);
              }
            } else {
              setExpandedRevId(null);
              setDiffBaseRevId('');
              setDiffCompareRevId('');
            }
          }
        }

        if (resAudit.ok && isMounted) {
          const jsonAudit = await resAudit.json();
          if (jsonAudit.success && Array.isArray(jsonAudit.data)) {
            setAuditLogs(jsonAudit.data);
          } else {
            setAuditLogs([]);
          }
        }
      } catch (err) {
        console.error('Failed to load history and audit data:', err);
      } finally {
        if (isMounted) {
          setIsLoadingRevisions(false);
          setIsLoadingAudit(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isDemoMode]);

  const restoreRevisionToStudio = (rev: DetailedDraftRevision) => {
    if (rev.draft_title) setDraftTitle(rev.draft_title);
    setDraftContent(rev.content);
    if (rev.channel) setDraftChannel(rev.channel as DraftChannel);
  };

  // Compute active diff between selected revisions
  const baseRev = revisions.find((r) => r.id === diffBaseRevId);
  const compareRev = revisions.find((r) => r.id === diffCompareRevId);
  const diffSegments =
    baseRev && compareRev ? computeWordDiff(baseRev.content, compareRev.content) : [];

  const addedWordsCount = diffSegments
    .filter((s) => s.type === 'added')
    .reduce((sum, s) => sum + s.value.trim().split(/\s+/).filter(Boolean).length, 0);

  const removedWordsCount = diffSegments
    .filter((s) => s.type === 'removed')
    .reduce((sum, s) => sum + s.value.trim().split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                Governance &amp; Version History
              </span>
              <span className="text-xs text-gray-500">Immutable Audit Trail</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight text-gray-950">
              Saved Versions &amp; Governance Decisions
            </h1>
            <p className="mt-1 text-sm text-gray-600 max-w-2xl">
              Inspect historical draft versions, compare copy changes with visual diffs, and review
              the chronological audit trail of all governance decisions.
            </p>
          </div>

          <Link
            href="/studio"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Open Review Studio</span>
          </Link>
        </div>
      </div>

      {/* 2. Primary Tabs: Versions & Diff vs Audit Trail */}
      <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('versions')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 font-bold transition-all ${
            activeTab === 'versions'
              ? 'bg-white text-gray-900 shadow-2xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <History className="h-4 w-4 text-blue-600" />
          <span>Saved Versions &amp; Visual Diff ({revisions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-white text-gray-900 shadow-2xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          <span>Governance Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: Versions & Visual Diff */}
      {activeTab === 'versions' && (
        <div className="space-y-6">
          {/* Visual Diff Tool */}
          {revisions.length >= 2 && (
            <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-150 pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <GitCompare className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      Visual Version Comparison (Diff Viewer)
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      See exactly which words were added, removed, or modified between two snapshots.
                    </p>
                  </div>
                </div>

                {/* Diff Metrics */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-300">
                    +{addedWordsCount} words added
                  </span>
                  <span className="rounded bg-red-100 px-2 py-0.5 font-bold text-red-800 border border-red-300">
                    -{removedWordsCount} words removed
                  </span>
                </div>
              </div>

              {/* Version Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Original Base Version (From)
                  </label>
                  <select
                    value={diffBaseRevId}
                    onChange={(e) => setDiffBaseRevId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    {revisions.map((r) => (
                      <option key={r.id} value={r.id}>
                        v{r.version} — {r.draft_title || 'Draft'} ({new Date(r.created_at).toLocaleTimeString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Newer Compare Version (To)
                  </label>
                  <select
                    value={diffCompareRevId}
                    onChange={(e) => setDiffCompareRevId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    {revisions.map((r) => (
                      <option key={r.id} value={r.id}>
                        v{r.version} — {r.draft_title || 'Draft'} ({new Date(r.created_at).toLocaleTimeString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rendered Diff Box */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-xs leading-relaxed font-sans max-h-72 overflow-y-auto whitespace-pre-wrap">
                {diffSegments.length > 0 ? (
                  diffSegments.map((seg, idx) => {
                    if (seg.type === 'added') {
                      return (
                        <ins
                          key={idx}
                          className="bg-emerald-150 text-emerald-950 font-semibold no-underline px-1 py-0.5 rounded border border-emerald-300 mx-0.5"
                          title="Added text"
                        >
                          {seg.value}
                        </ins>
                      );
                    }
                    if (seg.type === 'removed') {
                      return (
                        <del
                          key={idx}
                          className="bg-red-150 text-red-950 line-through px-1 py-0.5 rounded border border-red-300 mx-0.5"
                          title="Removed text"
                        >
                          {seg.value}
                        </del>
                      );
                    }
                    return <span key={idx} className="text-gray-800">{seg.value}</span>;
                  })
                ) : (
                  <span className="text-gray-500 italic">No differences between selected versions.</span>
                )}
              </div>
            </div>
          )}

          {/* Revisions Timeline List */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="border-b border-gray-150 pb-4 mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Stored Version Timeline</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Chronological log of submitted marketing copy drafts and applied corrections.
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {revisions.length} total saved versions
              </span>
            </div>

            {isLoadingRevisions ? (
              <div className="py-12 text-center text-xs text-gray-500">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
                Loading version history...
              </div>
            ) : revisions.length > 0 ? (
              <div className="space-y-4">
                {revisions.map((rev) => {
                  const isExpanded = expandedRevId === rev.id;
                  return (
                    <div
                      key={rev.id}
                      className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs hover:border-gray-300 transition-colors"
                    >
                      <div
                        onClick={() => setExpandedRevId(isExpanded ? null : rev.id)}
                        className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 font-bold text-xs text-blue-800">
                            v{rev.version}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-xs text-gray-900">
                                {rev.draft_title || 'Untitled Draft'}
                              </h3>
                              {rev.brand_name && (
                                <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                                  {rev.brand_name}
                                </span>
                              )}
                              {(rev.draft_title?.includes('DEMO SAMPLE') || rev.draft_id?.includes('sample')) && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-200">
                                  DEMO SAMPLE
                                </span>
                              )}
                              {rev.channel && (
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 capitalize">
                                  {rev.channel.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {rev.change_summary || 'Updated copy'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1 text-gray-500">
                            <User className="h-3 w-3 text-gray-400" />
                            <span>{rev.created_by}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>{new Date(rev.created_at).toLocaleString()}</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 border-t border-gray-150 bg-white space-y-3">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-semibold uppercase tracking-wider text-[10px]">
                              Snapshot Content ({rev.content.length} characters)
                            </span>
                            <Link
                              href="/studio"
                              onClick={() => restoreRevisionToStudio(rev)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              <span>Load into Review Studio</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>

                          <div className="rounded-lg bg-gray-50 p-3.5 font-sans text-xs text-gray-800 border border-gray-200/70 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                            {rev.content}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono pt-1">
                            <span>Version ID: {rev.id}</span>
                            <span>Draft: {rev.draft_id}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
                No versions recorded yet. Submit or edit drafts in the Review Studio to create saved
                versions automatically.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Governance Audit Trail */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-150 pb-4">
            <h2 className="text-base font-bold text-gray-900">Governance Audit Trail</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanent, tamper-evident log of all brand creations, draft submissions, reviews, and
              approval decisions.
            </p>
          </div>

          {isLoadingAudit ? (
            <div className="py-12 text-center text-xs text-gray-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent mx-auto mb-2" />
              Loading audit logs...
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Actor &amp; Role</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Details / Comment</th>
                    <th className="py-2.5 px-3">Target ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-3 text-gray-500 font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900">{log.actor}</div>
                        <span className="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] font-medium text-gray-700 capitalize">
                          {log.actor_role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            log.action === 'DRAFT_APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : log.action === 'CHANGES_REQUESTED'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : log.action === 'DRAFT_REJECTED'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : log.action === 'APPROVAL_INVALIDATED'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : log.action === 'SUBMITTED_FOR_REVIEW'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-700 max-w-md">
                        {log.details}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-400">
                        {log.draft_id || log.brand_id || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
              No audit logs recorded yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
