"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Filter,
  Building2,
  User,
  ArrowRight,
} from 'lucide-react';
import { useBrandSession } from '@/context/BrandSessionContext';
import type { Draft } from '@/lib/types';

interface QueueItem extends Draft {
  brand_name?: string;
  submitter_name?: string;
  latest_score?: number;
}

export default function ReviewQueuePage() {
  const { currentUser, isDemoMode } = useBrandSession();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');

  // Decision Modal State
  const [activeItem, setActiveItem] = useState<QueueItem | null>(null);
  const [decisionType, setDecisionType] = useState<'approve' | 'request_changes' | 'reject' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const url = `/api/governance/queue${isDemoMode ? '?demo=true' : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setQueue(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const url = `/api/governance/queue${isDemoMode ? '?demo=true' : ''}`;
        const res = await fetch(url);
        const json = await res.json();
        if (isMounted && json.success) {
          setQueue(json.data || []);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [isDemoMode]);

  const handleDecisionSubmit = async () => {
    if (!activeItem || !decisionType) return;

    if ((decisionType === 'request_changes' || decisionType === 'reject') && decisionNotes.trim().length < 5) {
      alert('Please provide a constructive review comment (at least 5 characters).');
      return;
    }

    setIsSubmittingDecision(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/governance/decide${isDemoMode ? '?demo=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: activeItem.id,
          decision: decisionType,
          comment: decisionNotes.trim() || `Formally ${decisionType}d via Review Queue`,
          actor_name: currentUser?.name || 'Reviewer',
          actor_role: currentUser?.role || 'reviewer',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Draft "${activeItem.title}" successfully ${decisionType === 'approve' ? 'approved' : decisionType === 'request_changes' ? 'marked with changes requested' : 'rejected'}.`,
        });
        setActiveItem(null);
        setDecisionType(null);
        setDecisionNotes('');
        await fetchQueue();
      } else {
        setFeedbackMessage({
          type: 'error',
          text: json.error || 'Failed to submit decision.',
        });
      }
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'Network error while recording decision.',
      });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (selectedBrandFilter !== 'all' && item.brand_id !== selectedBrandFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50/60 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-gray-950">Review Queue</h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                {queue.length} Pending
              </span>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 max-w-2xl leading-relaxed">
              Examine marketing submissions awaiting formal brand governance sign-off. Review exact content revisions, evidence checks, and recorded findings before approving or requesting changes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchQueue}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/studio"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <span>Open Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`rounded-xl border p-4 text-xs font-semibold flex items-center justify-between ${
              feedbackMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-gray-400 hover:text-gray-600 font-bold ml-3"
            >
              &times;
            </button>
          </div>
        )}

        {/* Self-approval disclaimer notice */}
        {currentUser && currentUser.role === 'copywriter' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Copywriter Role Active</strong>
              <span>
                You are signed in with the Copywriter role. You can inspect pending drafts, but server-side policy prevents self-approval of your own submissions. Only designated Reviewers or Brand Managers can formally sign off on drafts.
              </span>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-700">Filter by Brand:</span>
            <select
              value={selectedBrandFilter}
              onChange={(e) => setSelectedBrandFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Brands ({queue.length})</option>
              {Array.from(new Set(queue.map((q) => q.brand_id))).map((bid) => {
                const item = queue.find((q) => q.brand_id === bid);
                return (
                  <option key={bid} value={bid}>
                    {item?.brand_name || bid}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Showing {filteredQueue.length} of {queue.length} items
          </div>
        </div>

        {/* Queue List */}
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Loading pending review queue...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Review Queue is Clear</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              There are no marketing drafts currently waiting for governance evaluation. When authors click &quot;Submit for Approval&quot; in the studio, their submissions will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredQueue.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:border-gray-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase border border-blue-100">
                        {item.channel.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">
                        Revision #{item.current_revision}
                      </span>
                      {item.latest_score !== undefined && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                            item.latest_score >= 80
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          Score: {item.latest_score}/100
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-950 mt-1">{item.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveItem(item);
                        setDecisionType('approve');
                      }}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveItem(item);
                        setDecisionType('request_changes');
                      }}
                      className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveItem(item);
                        setDecisionType('reject');
                      }}
                      className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      Reject
                    </button>
                    <Link
                      href={`/studio?draftId=${item.id}`}
                      className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>Studio</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* Content snippet */}
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-800 font-mono leading-relaxed border border-gray-150 line-clamp-3">
                  {item.content}
                </div>

                {/* Submitter & Brand meta */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 gap-2 pt-1">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      <strong>Brand:</strong> {item.brand_name || item.brand_id}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <strong>Submitted by:</strong> {item.submitter_name || 'Copywriter'}
                    </span>
                  </div>
                  <div>
                    Submitted: {new Date(item.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Decision Modal */}
        {activeItem && decisionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-150 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold ${
                      decisionType === 'approve'
                        ? 'bg-emerald-600'
                        : decisionType === 'request_changes'
                        ? 'bg-amber-500'
                        : 'bg-rose-600'
                    }`}
                  >
                    {decisionType === 'approve' ? '✓' : decisionType === 'request_changes' ? '!' : '✕'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 capitalize">
                      {decisionType.replace('_', ' ')} Draft
                    </h3>
                    <p className="text-[11px] text-gray-500 truncate max-w-xs">{activeItem.title}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem(null);
                    setDecisionType(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reviewer Notes {decisionType !== 'approve' && <span className="text-rose-600">*</span>}
                </label>
                <textarea
                  rows={4}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder={
                    decisionType === 'approve'
                      ? 'e.g. Approved. Copy satisfies all brand voice guidelines and substantiated claims.'
                      : decisionType === 'request_changes'
                      ? 'e.g. Please qualify the zero maintenance fee claim with mandatory interchange disclosure.'
                      : 'e.g. Rejected due to prohibited superlatives and lack of verified evidence.'
                  }
                  className="w-full rounded-xl border border-gray-200 p-3 text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
                />
                {decisionType !== 'approve' && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Provide clear, actionable feedback to guide the copywriter in updating their draft.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem(null);
                    setDecisionType(null);
                  }}
                  className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDecisionSubmit}
                  disabled={isSubmittingDecision}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer ${
                    decisionType === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : decisionType === 'request_changes'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingDecision ? 'Recording Decision...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
