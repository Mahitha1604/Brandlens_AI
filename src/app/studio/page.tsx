"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Sparkles,
  Check,
  CheckCircle2,
  Info,
  Layers,
  Wand2,
  RotateCcw,
  CheckCheck,
  AlertCircle,
  XCircle,
  MessageSquare,
  ArrowUpRight,
  Save,
  Plus,
  Trash2,
  Copy,
  Edit3,
  X,
} from 'lucide-react';
import { useBrandSession } from '@/context/BrandSessionContext';
import type { DraftChannel, DeterministicFinding, ContextualFinding } from '@/lib/types';

export default function ReviewStudioPage() {
  const {
    activeBrand,
    currentPersona,
    draftTitle,
    setDraftTitle,
    draftChannel,
    setDraftChannel,
    targetAudience,
    setTargetAudience,
    draftContent,
    setDraftContent,
    reviewInstructions,
    setReviewInstructions,
    submittedDraft,
    setSubmittedDraft,
    reviewResponse,
    isReviewing,
    appliedFindingIds,
    lastCorrectionMessage,
    applyCorrection,
    applyAllGrammarCorrections,
    executeReview,
    submitDraftForReview,
    decideDraft,
    loadSampleDraft,
    brandDrafts,
    activeDraftId,
    lastSavedAt,
    isReviewStale,
    selectDraft,
    createNewDraft,
    saveCurrentDraft,
    deleteCurrentDraft,
  } = useBrandSession();

  const [activeTab, setActiveTab] = useState<'all' | 'grammar' | 'rules' | 'contextual'>('all');
  const [editorMode, setEditorMode] = useState<'edit' | 'highlighter'>('edit');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Governance decision state
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionFeedback, setDecisionFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);

  const [copySuccess, setCopySuccess] = useState(false);

  // AI Settings & Custom Key state
  const [showAiSettingsModal, setShowAiSettingsModal] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('brandlens_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [savedGeminiApiKey, setSavedGeminiApiKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('brandlens_gemini_api_key') || '';
    } catch {
      return '';
    }
  });

  const handleSaveGeminiKey = (key: string) => {
    try {
      if (key.trim()) {
        localStorage.setItem('brandlens_gemini_api_key', key.trim());
        setSavedGeminiApiKey(key.trim());
      } else {
        localStorage.removeItem('brandlens_gemini_api_key');
        setSavedGeminiApiKey('');
      }
      setShowAiSettingsModal(false);
    } catch {
      // Ignore
    }
  };

  const handleSendForApproval = async () => {
    setIsDeciding(true);
    setDecisionFeedback(null);
    const result = await submitDraftForReview();
    setIsDeciding(false);
    if (result.success) {
      setDecisionFeedback({ type: 'success', text: result.message });
    } else {
      setDecisionFeedback({ type: 'error', text: result.message });
    }
  };

  const handleCopyCopy = async () => {
    if (!draftContent) return;
    try {
      await navigator.clipboard.writeText(draftContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleWithdrawSubmission = async () => {
    if (!submittedDraft) return;
    setIsDeciding(true);
    setDecisionFeedback(null);
    try {
      const res = await fetch('/api/governance/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: submittedDraft.id,
          decision: 'withdraw',
          comment: 'Withdrawn by author for revision',
          actor_name: currentPersona.name,
          actor_role: currentPersona.role,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDecisionFeedback({ type: 'success', text: 'Submission withdrawn. You can now edit and re-review.' });
        if (json.data) setSubmittedDraft(json.data);
      } else {
        setDecisionFeedback({ type: 'error', text: json.error || 'Failed to withdraw submission.' });
      }
    } catch {
      setDecisionFeedback({ type: 'error', text: 'Network error while withdrawing submission.' });
    } finally {
      setIsDeciding(false);
    }
  };

  const handleMakeDecision = async (decision: 'approve' | 'request_changes' | 'reject') => {
    if (
      (decision === 'request_changes' || decision === 'reject') &&
      (!decisionComment || decisionComment.trim().length < 5)
    ) {
      setDecisionFeedback({
        type: 'error',
        text: 'Reviewer comment is required (minimum 5 characters) to request changes or reject.',
      });
      return;
    }

    setIsDeciding(true);
    setDecisionFeedback(null);
    const result = await decideDraft(decision, decisionComment);
    setIsDeciding(false);
    if (result.success) {
      setDecisionFeedback({ type: 'success', text: result.message });
      setDecisionComment('');
    } else {
      setDecisionFeedback({ type: 'error', text: result.message });
    }
  };

  // Sample presets for quick testing (clearly labelled as DEMO SAMPLE)
  const sampleDrafts = [
    {
      label: '🚩 [DEMO SAMPLE] Flawed Copy',
      desc: 'Contains multiple prohibited terms, false superlatives, and unverified volume',
      title: '[DEMO SAMPLE] Enterprise Payments Overview (Flagged Copy)',
      channel: 'landing_page' as DraftChannel,
      audience: 'Corporate Treasurers',
      content:
        activeBrand?.id === 'apexpay'
          ? `Welcome to apex pay, the bulletproof payments solution for modern business. Our zero-risk treasury engine delivers 100% uptime with instantaneous cross-border wire transfers. Act now before it is too late to lock in completely free platform access and over $50B in processed volume!`
          : `Introducing our miraculous formula that cures acne and is 100% natural and chemical-free. Enjoy zero emission shipping!`,
    },
    {
      label: '✅ [DEMO SAMPLE] Compliant Copy',
      desc: 'Accurate terminology, verified statistics, and proper qualification disclosures',
      title: '[DEMO SAMPLE] Institutional Payment Infrastructure Overview',
      channel: 'landing_page' as DraftChannel,
      audience: 'Chief Financial Officers',
      content:
        activeBrand?.id === 'apexpay'
          ? `Welcome to ApexPay, the defense-in-depth payments platform for modern enterprises. Our risk-mitigated treasury architecture provides 99.97% audited availability with near real-time settlement across 38 global currencies ($14.2B processed volume in FY2025). Enjoy zero monthly account maintenance fees (standard per-transaction interchange applies).`
          : `Discover Verdant Aura botanical skincare. Formulated with 98.4% plant-derived ingredients and safe clean preservatives, our serum helps visibly diminish the appearance of fine lines. Packaged in 100% post-consumer recycled aluminum, with carbon-neutral delivery verified through Pachama reforestation credits.`,
    },
  ];

  const handleNewContentCheck = () => {
    createNewDraft();
    setEditorMode('edit');
    setReviewError(null);
    setReviewInstructions('');
    setTimeout(() => {
      const el = document.getElementById('draftContentArea') as HTMLTextAreaElement | null;
      if (el) el.focus();
    }, 50);
  };

  const handleReviewSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isReviewing) return;
    setReviewError(null);
    const success = await executeReview();
    if (success) {
      setEditorMode('highlighter');
    } else {
      setReviewError('Failed to complete review. Please ensure your marketing content has at least 5 characters and try again.');
    }
  };

  const handleSaveDraft = async () => {
    if (isSavingDraft || !draftContent.trim()) return;
    setIsSavingDraft(true);
    setSaveFeedback(null);
    try {
      const res = await saveCurrentDraft();
      if (res.success) {
        setSaveFeedback(res.message);
        setTimeout(() => setSaveFeedback(null), 3500);
      } else {
        setSaveFeedback(res.message || 'Failed to save draft');
        setTimeout(() => setSaveFeedback(null), 4000);
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Helper to render interactive highlighted draft
  const renderHighlightedText = () => {
    if (!reviewResponse || !draftContent) {
      return <div className="text-gray-400 italic">No review executed yet.</div>;
    }

    // Combine all unapplied findings with start and end indices
    interface HighlightSpan {
      id: string;
      start: number;
      end: number;
      text: string;
      severity: string;
      type: 'deterministic' | 'contextual';
      isApplied: boolean;
    }

    const spans: HighlightSpan[] = [];

    reviewResponse.deterministic.findings.forEach((f) => {
      spans.push({
        id: f.id,
        start: f.start_index,
        end: f.end_index,
        text: f.flagged_text,
        severity: f.severity,
        type: 'deterministic',
        isApplied: appliedFindingIds.includes(f.id),
      });
    });

    reviewResponse.contextual.findings.forEach((f) => {
      spans.push({
        id: f.id,
        start: f.start_index,
        end: f.end_index,
        text: f.flagged_text,
        severity: f.severity,
        type: 'contextual',
        isApplied: appliedFindingIds.includes(f.id),
      });
    });

    // Filter valid spans that fit within current text bounds
    const validSpans = spans
      .filter((s) => s.start >= 0 && s.end <= draftContent.length && s.start < s.end)
      .sort((a, b) => a.start - b.start);

    // Non-overlapping segments
    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    for (let i = 0; i < validSpans.length; i++) {
      const span = validSpans[i];
      if (span.start < currentIndex) {
        continue; // skip overlapping for clean rendering
      }

      if (span.start > currentIndex) {
        segments.push(
          <span key={`text-${currentIndex}`}>
            {draftContent.slice(currentIndex, span.start)}
          </span>
        );
      }

      const isSelected = selectedFindingId === span.id;
      let badgeColor = 'bg-blue-100 text-blue-900 border-blue-300';
      if (span.isApplied) {
        badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200 line-through opacity-60';
      } else if (span.severity === 'violation') {
        badgeColor = 'bg-red-150 text-red-950 border-red-300 ring-1 ring-red-400';
      } else if (span.severity === 'warning') {
        badgeColor = 'bg-amber-150 text-amber-950 border-amber-300 ring-1 ring-amber-400';
      }

      segments.push(
        <mark
          key={span.id}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedFindingId(span.id);
          }}
          className={`cursor-pointer rounded px-1.5 py-0.5 mx-0.5 border font-medium transition-all ${badgeColor} ${
            isSelected ? 'ring-2 ring-blue-600 font-bold' : ''
          }`}
          title={`Click to inspect finding: ${span.text}`}
        >
          {draftContent.slice(span.start, span.end)}
        </mark>
      );

      currentIndex = span.end;
    }

    if (currentIndex < draftContent.length) {
      segments.push(
        <span key={`text-end`}>{draftContent.slice(currentIndex)}</span>
      );
    }

    const totalFindings =
      (reviewResponse?.deterministic.findings.length || 0) +
      (reviewResponse?.contextual.findings.length || 0);

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between rounded-xl bg-blue-50/90 border border-blue-200 px-3.5 py-2 text-xs text-blue-950 gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="font-bold">Review Preview</span>
            <span className="rounded bg-blue-200/70 px-1.5 py-0.2 text-[10px] font-extrabold text-blue-900">
              {totalFindings} {totalFindings === 1 ? 'Finding' : 'Findings'}
            </span>
            <span className="text-gray-500 text-[11px] hidden sm:inline">(Click any marked phrase to inspect details)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEditorMode('edit');
                setTimeout(() => {
                  const el = document.getElementById('draftContentArea') as HTMLTextAreaElement | null;
                  if (el) el.focus();
                }, 50);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-300 hover:bg-blue-100 cursor-pointer shadow-2xs transition-colors"
              title="Return to raw textarea to edit or paste new text"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit / Replace Text</span>
            </button>
            <button
              type="button"
              onClick={handleNewContentCheck}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-100 cursor-pointer shadow-2xs transition-colors"
              title="Clear editor and start checking new or different content"
            >
              <Plus className="h-3 w-3 text-blue-600" />
              <span>Check Different Content</span>
            </button>
            <button
              type="button"
              onClick={handleCopyCopy}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-100 cursor-pointer shadow-2xs transition-colors"
              title="Copy current copy to clipboard"
            >
              {copySuccess ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-gray-500" />}
              <span>{copySuccess ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
        <div
          onClick={() => {
            // Click on unmarked text flips to edit mode
            setEditorMode('edit');
            setTimeout(() => {
              const el = document.getElementById('draftContentArea') as HTMLTextAreaElement | null;
              if (el) el.focus();
            }, 50);
          }}
          className="rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap font-sans text-gray-800 min-h-[220px] cursor-text hover:border-blue-400 transition-colors"
          title="Click to return to text editor"
        >
          {segments}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
              Review Studio
            </span>
            <span className="text-xs text-gray-500">
              Brand: <strong>{activeBrand?.name || 'No brand selected'}</strong>
              {activeBrand?.is_sample && (
                <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-900 border border-amber-200">
                  DEMO SAMPLE
                </span>
              )}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
            Check your content before publishing.
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Automatic brand-rule checks, contextual tone evaluation, and evidence-linked findings with 1-click fixes.
          </p>
        </div>

        {/* AI Engine Status & Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAiSettingsModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-900 hover:bg-purple-100 transition-colors cursor-pointer shadow-2xs"
            title="Configure AI Engine (Gemini LLM or Built-in Linguistic AI)"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>{savedGeminiApiKey ? 'Gemini 2.0 AI' : 'Built-in Linguistic AI'}</span>
          </button>

          <span className="text-xs font-semibold text-gray-500">Try a Sample:</span>
          {sampleDrafts.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadSampleDraft(sample)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 shadow-2xs transition-colors cursor-pointer"
              title={sample.desc}
            >
              <span>{sample.label}</span>
            </button>
          ))}
          {(draftTitle || draftContent || targetAudience || reviewInstructions) && (
            <button
              type="button"
              onClick={handleNewContentCheck}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear all fields to start checking different content"
            >
              <Plus className="h-3.5 w-3.5 text-blue-600" />
              <span>Check Different Content</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning if no brand is configured */}
      {!activeBrand && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>No brand profile configured.</strong> Please set up your brand first so BrandLens AI knows which guidelines and terminology rules to check against.
            </span>
          </div>
          <Link
            href="/knowledge"
            className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700 transition-colors shrink-0"
          >
            Set Up My Brand
          </Link>
        </div>
      )}

      {/* 2. Top Draft Management Bar */}
      {activeBrand && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Drafts ({brandDrafts.length}):
            </span>
            <select
              value={activeDraftId || ''}
              onChange={(e) => {
                const target = brandDrafts.find((d) => d.id === e.target.value);
                if (target) {
                  selectDraft(target);
                } else {
                  createNewDraft();
                }
              }}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-xs truncate"
            >
              <option value="">+ New Unsaved Draft</option>
              {brandDrafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.channel.replace('_', ' ')}) • {d.status.toUpperCase()} • Rev #{d.current_revision}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => createNewDraft()}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Draft</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {saveFeedback && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {saveFeedback}
              </span>
            )}
            {lastSavedAt && !saveFeedback && (
              <span className="text-[11px] text-gray-400 font-mono">
                Last saved: {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={!draftContent.trim() || isSavingDraft}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              <Save className="h-3.5 w-3.5 text-gray-500" />
              <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
            </button>

            {activeDraftId && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this saved draft?')) {
                    await deleteCurrentDraft(activeDraftId);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                title="Delete this draft"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Main Studio Grid (Split-Pane: Left Editor, Right Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Editor & Submission (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Campaign Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="draftTitleInput"
                    className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1"
                  >
                    Name this piece of content (optional)
                  </label>
                  <input
                    id="draftTitleInput"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="e.g. Q4 Launch Email"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="channelSelect"
                    className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1"
                  >
                    Where will this appear?
                  </label>
                  <select
                    id="channelSelect"
                    value={draftChannel}
                    onChange={(e) => setDraftChannel(e.target.value as DraftChannel)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="landing_page">Landing Page</option>
                    <option value="website_copy">Website Copy</option>
                    <option value="instagram_post">Instagram Post</option>
                    <option value="linkedin_post">LinkedIn Post</option>
                    <option value="social_ad">Paid Social Ad</option>
                    <option value="email_newsletter">Email / Newsletter</option>
                    <option value="blog_post">Blog / Article</option>
                    <option value="press_release">Press Release</option>
                    <option value="other">Other Collateral</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="audienceInput"
                    className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1"
                  >
                    Who is this message for? (optional)
                  </label>
                  <input
                    id="audienceInput"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Enterprise Leads"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Natural Language Review Instructions */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="instructionsInput"
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Anything specific you want us to check? (optional)</span>
                  </label>
                </div>
                <input
                  id="instructionsInput"
                  value={reviewInstructions}
                  onChange={(e) => setReviewInstructions(e.target.value)}
                  placeholder="e.g. Focus on FTC disclosure requirements, avoid hyperbolic claims, and verify speed metrics..."
                  maxLength={1000}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                />
              </div>

              {/* Stale Review Alert Banner */}
              {isReviewStale && draftContent.trim() && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold">Content modified since last check.</span>
                      <span className="text-amber-800 ml-1">The review findings below reflect the previous text. Rerun to update.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReviewSubmit()}
                    disabled={isReviewing}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700 transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Rerun Review</span>
                  </button>
                </div>
              )}

              {/* Review Error Banner */}
              {reviewError && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReviewSubmit()}
                    disabled={isReviewing}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* Draft Content Editor with Mode Switcher & Quick Actions */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="draftContentArea"
                      className="text-[11px] font-bold uppercase tracking-wider text-gray-700"
                    >
                      Paste marketing content here *
                    </label>
                    {reviewResponse && (
                      <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setEditorMode('edit')}
                          className={`rounded px-2.5 py-0.5 font-medium transition-colors cursor-pointer ${
                            editorMode === 'edit'
                              ? 'bg-white font-bold text-gray-900 shadow-2xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          ✏️ Editor (Type / Paste)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorMode('highlighter')}
                          className={`rounded px-2.5 py-0.5 font-medium transition-colors cursor-pointer ${
                            editorMode === 'highlighter'
                              ? 'bg-white font-bold text-blue-700 shadow-2xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          🔍 Highlights ({
                            (reviewResponse.deterministic.findings.length || 0) +
                            (reviewResponse.contextual.findings.length || 0)
                          })
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {draftContent.trim() && (
                      <button
                        type="button"
                        onClick={handleNewContentCheck}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                        title="Clear content and start checking new copy"
                      >
                        <Plus className="h-3 w-3 text-blue-600" />
                        <span>New / Different Copy</span>
                      </button>
                    )}
                    <span className="text-[11px] text-gray-500 font-mono">
                      {draftContent.length} chars |{' '}
                      {draftContent.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                </div>

                {editorMode === 'edit' ? (
                  <textarea
                    id="draftContentArea"
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={8}
                    required
                    minLength={5}
                    placeholder={activeBrand?.name ? `Enter or paste marketing copy for ${activeBrand.name}...` : 'Enter or paste marketing copy here...'}
                    className="w-full rounded-xl border border-gray-300 p-3.5 text-xs font-sans leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  renderHighlightedText()
                )}
              </div>

              {/* 1-Click Correction Feedback Alert */}
              {lastCorrectionMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{lastCorrectionMessage}</span>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Rerun Review</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isReviewing || draftContent.trim().length < 5 || !activeBrand}
                    title={!activeBrand ? 'Please create or select a brand profile first' : 'Run brand review'}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isReviewing ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Checking Content with AI...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Check Content with AI</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNewContentCheck}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer"
                    title="Clear this draft and start checking new or different content"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-600" />
                    <span>Check Different Content</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCopy}
                    disabled={!draftContent.trim()}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Copy current copy to clipboard"
                  >
                    {copySuccess ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-gray-500" />
                    )}
                    <span>{copySuccess ? 'Copied!' : 'Copy Clean Copy'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-gray-500">
                  Author: <strong>{currentPersona.name}</strong> ({currentPersona.role})
                </div>
              </div>
            </form>
          </div>

          {/* Governance Status & Decision Panel */}
          {submittedDraft && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <div className="border-b border-gray-150 pb-3 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Workflow Status:
                    </span>
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider ${
                        submittedDraft.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : submittedDraft.status === 'under_review'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : submittedDraft.status === 'changes_requested'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : submittedDraft.status === 'rejected'
                          ? 'bg-red-100 text-red-900 border border-red-300'
                          : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}
                    >
                      {submittedDraft.status === 'under_review'
                        ? 'In Review'
                        : submittedDraft.status === 'changes_requested'
                        ? 'Changes Requested'
                        : submittedDraft.status === 'approved'
                        ? 'Approved'
                        : submittedDraft.status === 'rejected'
                        ? 'Rejected'
                        : 'Draft'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded bg-blue-50 px-2 py-0.5 font-bold text-blue-700 text-[10px]">
                      Revision #{submittedDraft.current_revision}
                    </span>
                    <span className="font-mono text-gray-400 text-[11px]">{submittedDraft.id}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  {submittedDraft.status === 'draft' && 'Next action: Review flagged items and click "Submit for Governance Approval" when ready.'}
                  {submittedDraft.status === 'under_review' && 'Next action: Awaiting reviewer evaluation and sign-off.'}
                  {submittedDraft.status === 'changes_requested' && 'Next action: Address the reviewer notes below, update copy, and resubmit.'}
                  {submittedDraft.status === 'approved' && 'Next action: Formally approved for publication.'}
                  {submittedDraft.status === 'rejected' && 'Next action: Copy rejected. Review commentary and prepare alternative content.'}
                </p>
              </div>

              {/* Approval Invalidation Notice if content was approved */}
              {submittedDraft.status === 'approved' && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Approved Brand Copy</strong>
                    <span>
                      This draft is formally approved. Any subsequent content edits will
                      automatically invalidate this approval and require re-review.
                    </span>
                  </div>
                </div>
              )}

              {/* Reviewer Feedback / Decision Notes Box */}
              {submittedDraft.last_decision_notes && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs text-blue-950 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-blue-800">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                      <span>Reviewer Notes from {submittedDraft.last_decided_by || 'Reviewer'}:</span>
                    </span>
                    {submittedDraft.last_decided_at && (
                      <span className="text-gray-400">
                        {new Date(submittedDraft.last_decided_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <p className="bg-white/80 p-2.5 rounded-lg border border-blue-150 leading-relaxed text-gray-800">
                    &quot;{submittedDraft.last_decision_notes}&quot;
                  </p>
                </div>
              )}

              {/* Decision Feedback Banner */}
              {decisionFeedback && (
                <div
                  className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${
                    decisionFeedback.type === 'success'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-red-300 bg-red-50 text-red-900'
                  }`}
                >
                  {decisionFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  )}
                  <span>{decisionFeedback.text}</span>
                </div>
              )}

              {/* Role-Based Governance Controls */}
              <div className="pt-2 border-t border-gray-150 space-y-3">
                {currentPersona.role === 'copywriter' ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 p-3 rounded-xl">
                    <div>
                      <h4 className="font-bold text-xs text-gray-800">Copywriter Authoring Actions</h4>
                      <p className="text-[11px] text-gray-500">
                        {submittedDraft.status === 'under_review'
                          ? 'Draft submitted. Awaiting reviewer sign-off.'
                          : 'Ready for formal governance approval? Send to reviewers.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {submittedDraft.status === 'under_review' ? (
                        <button
                          type="button"
                          onClick={handleWithdrawSubmission}
                          disabled={isDeciding}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <span>Withdraw Submission</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendForApproval}
                          disabled={isDeciding}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          <span>Submit for Governance Approval</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                        <CheckCheck className="h-4 w-4 text-blue-600" />
                        <span>Reviewer Sign-Off Decision</span>
                      </h4>
                      <span className="text-[10px] text-gray-500">
                        Reviewer: <strong>{currentPersona.name}</strong> ({currentPersona.title})
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                        Reviewer Commentary / Decision Rationale (Required for changes or reject)
                      </label>
                      <input
                        value={decisionComment}
                        onChange={(e) => setDecisionComment(e.target.value)}
                        placeholder="e.g. Approved copy meets all FTC and trademark guidelines..."
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleMakeDecision('approve')}
                        disabled={isDeciding || submittedDraft.status === 'approved'}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve Copy</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMakeDecision('request_changes')}
                        disabled={isDeciding}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Request Changes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMakeDecision('reject')}
                        disabled={isDeciding || submittedDraft.status === 'rejected'}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject Copy</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Findings Inspector & 1-Click Fixes (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {reviewResponse && draftContent.trim() ? (
            <div className="space-y-4">
              {/* Compliance Score Header */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Overall Compliance
                    </span>
                    <div
                      className={`text-3xl font-black ${
                        reviewResponse.overall_score >= 80
                          ? 'text-emerald-600'
                          : reviewResponse.overall_score >= 50
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {reviewResponse.overall_score}/100
                    </div>
                  </div>

                  <span
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                      reviewResponse.overall_score === 100 && reviewResponse.overall_passed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : reviewResponse.overall_passed
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {reviewResponse.overall_score === 100 && reviewResponse.overall_passed
                      ? 'Clean Scan'
                      : reviewResponse.overall_passed
                      ? 'Warnings Present'
                      : 'Violations Found'}
                  </span>
                </div>

                {/* Evidence Claim Summary Grid */}
                <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3 border-t border-gray-150 text-center">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <div className="font-bold text-emerald-900 text-xs">
                      {reviewResponse.contextual.claim_summary.supported_claims}
                    </div>
                    <div className="text-[9px] font-semibold text-emerald-700 uppercase">
                      Supported
                    </div>
                  </div>

                  <div className="rounded-lg bg-amber-50 p-2">
                    <div className="font-bold text-amber-900 text-xs">
                      {reviewResponse.contextual.claim_summary.insufficient_evidence_claims}
                    </div>
                    <div className="text-[9px] font-semibold text-amber-700 uppercase">
                      Unverified
                    </div>
                  </div>

                  <div className="rounded-lg bg-red-50 p-2">
                    <div className="font-bold text-red-900 text-xs">
                      {reviewResponse.contextual.claim_summary.conflicting_claims}
                    </div>
                    <div className="text-[9px] font-semibold text-red-700 uppercase">
                      Conflict
                    </div>
                  </div>

                  <div className="rounded-lg bg-purple-50 p-2">
                    <div className="font-bold text-purple-900 text-xs">
                      {reviewResponse.contextual.claim_summary.human_review_claims}
                    </div>
                    <div className="text-[9px] font-semibold text-purple-700 uppercase">
                      Nuance
                    </div>
                  </div>
                </div>

                {/* Honest Provider Status */}
                <div className="mt-3 pt-3 border-t border-gray-150 text-[11px] text-gray-500">
                  {reviewResponse.contextual.is_fallback ? (
                    <div className="flex items-start gap-1.5 text-amber-800 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <strong>Offline Fallback Mode: </strong>
                        <span>{reviewResponse.contextual.fallback_reason}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-blue-800 bg-blue-50/70 p-2 rounded-lg border border-blue-200">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      <span>
                        AI Engine: <strong>Google Gemini ({reviewResponse.contextual.model})</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action banner when user has applied corrections */}
              {appliedFindingIds.length > 0 && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">
                        {appliedFindingIds.length} correction{appliedFindingIds.length > 1 ? 's' : ''} applied to draft!
                      </span>
                      <p className="text-[11px] text-emerald-800">
                        Re-check your updated content with the AI Verifier to confirm all flaws are resolved and achieve 100% compliance.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReviewSubmit()}
                    disabled={isReviewing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>{isReviewing ? 'Scanning...' : 'Re-Check Content with AI'}</span>
                  </button>
                </div>
              )}

              {/* Auto-Fix Banner for Grammar and Spelling */}
              {reviewResponse && (() => {
                const isGrammarFinding = (f: DeterministicFinding) =>
                  f.rule_key.includes('GRAMMAR') ||
                  f.rule_key.includes('SPELLING') ||
                  f.rule_key.includes('MECHANICS') ||
                  f.rule_key.includes('DUPLICATE') ||
                  f.rule_key.includes('CASING');
                const unappliedGrammarCount = reviewResponse.deterministic.findings.filter(
                  (f) => isGrammarFinding(f) && Boolean(f.suggested_replacement) && !appliedFindingIds.includes(f.id)
                ).length;

                if (unappliedGrammarCount === 0) return null;

                return (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-3.5 text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="font-bold">
                          {unappliedGrammarCount} Grammar & Spelling Issue{unappliedGrammarCount > 1 ? 's' : ''} Identified
                        </span>
                        <p className="text-[11px] text-indigo-800">
                          Automatically fix subject-verb disagreement, typos, and phrasing across your draft in 1 click.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyAllGrammarCorrections()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer shrink-0"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>Auto-Fix All Grammar ({unappliedGrammarCount})</span>
                    </button>
                  </div>
                );
              })()}

              {/* Findings Filter Tabs */}
              {(() => {
                const isGrammarFinding = (f: DeterministicFinding) =>
                  f.rule_key.includes('GRAMMAR') ||
                  f.rule_key.includes('SPELLING') ||
                  f.rule_key.includes('MECHANICS') ||
                  f.rule_key.includes('DUPLICATE') ||
                  f.rule_key.includes('CASING');

                const grammarCount = reviewResponse.deterministic.findings.filter(isGrammarFinding).length;
                const rulesCount = reviewResponse.deterministic.findings.filter((f) => !isGrammarFinding(f)).length;
                const contextualCount = reviewResponse.contextual.findings.length;
                const totalCount = grammarCount + rulesCount + contextualCount;

                return (
                  <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      className={`flex-1 rounded-lg py-1.5 font-semibold text-center transition-all ${
                        activeTab === 'all'
                          ? 'bg-white text-gray-900 shadow-2xs font-bold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All ({totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('grammar')}
                      className={`flex-1 rounded-lg py-1.5 font-semibold text-center transition-all ${
                        activeTab === 'grammar'
                          ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Grammar & Typos ({grammarCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('rules')}
                      className={`flex-1 rounded-lg py-1.5 font-semibold text-center transition-all ${
                        activeTab === 'rules'
                          ? 'bg-white text-gray-900 shadow-2xs font-bold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Brand Rules ({rulesCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('contextual')}
                      className={`flex-1 rounded-lg py-1.5 font-semibold text-center transition-all ${
                        activeTab === 'contextual'
                          ? 'bg-white text-gray-900 shadow-2xs font-bold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Tone & Claims ({contextualCount})
                    </button>
                  </div>
                );
              })()}

              {/* Findings List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {/* Deterministic / Grammar / Rule Findings */}
                {reviewResponse.deterministic.findings
                  .filter((f: DeterministicFinding) => {
                    const isGrammar =
                      f.rule_key.includes('GRAMMAR') ||
                      f.rule_key.includes('SPELLING') ||
                      f.rule_key.includes('MECHANICS') ||
                      f.rule_key.includes('DUPLICATE') ||
                      f.rule_key.includes('CASING');

                    if (activeTab === 'all') return true;
                    if (activeTab === 'grammar') return isGrammar;
                    if (activeTab === 'rules') return !isGrammar;
                    return false;
                  })
                  .map((f: DeterministicFinding) => {
                    const isApplied = appliedFindingIds.includes(f.id);
                    const isSelected = selectedFindingId === f.id;
                    const isGrammar =
                      f.rule_key.includes('GRAMMAR') ||
                      f.rule_key.includes('SPELLING') ||
                      f.rule_key.includes('MECHANICS') ||
                      f.rule_key.includes('DUPLICATE') ||
                      f.rule_key.includes('CASING');

                    let badgeLabel = 'Brand rule violation';
                    let badgeBg = 'bg-red-600';
                    if (isGrammar) {
                      badgeLabel = f.rule_key.includes('SPELLING') ? 'Spelling Typo' : 'Grammar & Syntax';
                      badgeBg = 'bg-indigo-600';
                    } else if (f.severity === 'warning') {
                      badgeLabel = 'Trademark Guideline';
                      badgeBg = 'bg-amber-600';
                    } else if (f.severity === 'suggestion') {
                      badgeLabel = 'Style Suggestion';
                      badgeBg = 'bg-blue-600';
                    }

                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFindingId(f.id)}
                        className={`rounded-xl border p-4 text-xs transition-all ${
                          isApplied
                            ? 'border-gray-200 bg-gray-50 opacity-60'
                            : isGrammar
                            ? 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-300'
                            : f.severity === 'violation'
                            ? 'border-red-200 bg-red-50/40 hover:border-red-300'
                            : f.severity === 'warning'
                            ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                            : 'border-blue-200 bg-blue-50/40 hover:border-blue-300'
                        } ${isSelected ? 'ring-2 ring-blue-600' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 pb-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white ${badgeBg}`}
                            >
                              {badgeLabel}
                            </span>
                            <span className="font-mono text-gray-500 font-semibold">{f.rule_key}</span>
                            <span className="text-gray-400">·</span>
                            <span className="font-medium text-gray-600 uppercase text-[10px]">
                              {isGrammar ? 'Linguistic Rule' : f.category}
                            </span>
                          </div>

                          <div className="font-mono text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            [{f.start_index}, {f.end_index}]
                          </div>
                        </div>

                        {/* Flagged & Replacement */}
                        <div className="space-y-1.5 my-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-gray-500 font-semibold text-[11px]">Flagged:</span>
                            <span className="rounded bg-red-100 px-2 py-0.5 font-bold font-mono text-red-900 border border-red-200">
                              &quot;{f.flagged_text}&quot;
                            </span>
                          </div>

                          {f.suggested_replacement && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-gray-500 font-semibold text-[11px]">Suggested:</span>
                              <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold font-mono text-emerald-900 border border-emerald-200">
                                &quot;{f.suggested_replacement}&quot;
                              </span>
                            </div>
                          )}
                        </div>

                        <p className="text-gray-700 bg-white/70 p-2 rounded border border-gray-200/70 text-[11px] leading-relaxed">
                          <strong>Rationale:</strong> {f.rationale}
                        </p>

                        {/* 1-Click Fix Button */}
                        {f.suggested_replacement && (
                          <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                            {isApplied ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <Check className="h-3.5 w-3.5" />
                                <span>Applied to Draft ✓</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyCorrection(
                                    f.id,
                                    f.flagged_text,
                                    f.suggested_replacement,
                                    f.start_index,
                                    f.end_index
                                  );
                                }}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
                              >
                                <Wand2 className="h-3.5 w-3.5" />
                                <span>Apply Replacement</span>
                              </button>
                            )}
                            <span className="text-[10px] text-gray-400">
                              {isGrammar ? 'AI Linguistic Engine' : 'Layer 1: Deterministic'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Contextual Findings */}
                {(activeTab === 'all' || activeTab === 'contextual') &&
                  reviewResponse.contextual.findings.map((f: ContextualFinding) => {
                    const isApplied = appliedFindingIds.includes(f.id);
                    const isSelected = selectedFindingId === f.id;

                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFindingId(f.id)}
                        className={`rounded-xl border p-4 text-xs transition-all ${
                          isApplied
                            ? 'border-gray-200 bg-gray-50 opacity-60'
                            : f.evidence_status === 'potential_conflict'
                            ? 'border-red-200 bg-red-50/40 hover:border-red-300'
                            : f.evidence_status === 'insufficient_evidence'
                            ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                            : f.evidence_status === 'supported'
                            ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                            : 'border-purple-200 bg-purple-50/40 hover:border-purple-300'
                        } ${isSelected ? 'ring-2 ring-blue-600' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 pb-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white ${
                                f.evidence_status === 'supported'
                                  ? 'bg-emerald-600'
                                  : f.evidence_status === 'insufficient_evidence'
                                  ? 'bg-amber-600'
                                  : f.evidence_status === 'potential_conflict'
                                  ? 'bg-red-600'
                                  : 'bg-purple-600'
                              }`}
                            >
                              {f.evidence_status === 'potential_conflict'
                                ? 'Possible conflict with approved information'
                                : f.evidence_status === 'insufficient_evidence'
                                ? 'Unsupported claim — supporting evidence was not found'
                                : f.evidence_status === 'supported'
                                ? 'Supported by evidence'
                                : 'Suggested improvement'}
                            </span>
                            <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] font-semibold text-gray-700 uppercase">
                              {f.category}
                            </span>
                            <span className="text-gray-400">·</span>
                            <span className="text-[10px] text-gray-500">
                              {(f.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>

                          <div className="font-mono text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            [{f.start_index}, {f.end_index}]
                          </div>
                        </div>

                        {/* Flagged & Suggestion */}
                        <div className="space-y-1.5 my-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-gray-500 font-semibold text-[11px]">Claim:</span>
                            <span className="rounded bg-white px-2 py-0.5 font-bold font-mono text-gray-900 border border-gray-300">
                              &quot;{f.flagged_text}&quot;
                            </span>
                          </div>

                          {f.suggested_correction && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-gray-500 font-semibold text-[11px]">
                                Alternative:
                              </span>
                              <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold font-mono text-emerald-900 border border-emerald-200">
                                &quot;{f.suggested_correction}&quot;
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-gray-700 bg-white/70 p-2.5 rounded border border-gray-200/70 text-[11px]">
                          <p>
                            <strong>Assessment:</strong> {f.explanation}
                          </p>
                          {f.relevant_evidence_reference && (
                            <p className="text-gray-600 font-mono text-[10px]">
                              <strong>Citation:</strong> {f.relevant_evidence_reference}
                            </p>
                          )}
                        </div>

                        {/* 1-Click Fix Button for Contextual finding */}
                        {f.suggested_correction && (
                          <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                            {isApplied ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <Check className="h-3.5 w-3.5" />
                                <span>Applied to Draft ✓</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyCorrection(
                                    f.id,
                                    f.flagged_text,
                                    f.suggested_correction,
                                    f.start_index,
                                    f.end_index
                                  );
                                }}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
                              >
                                <Wand2 className="h-3.5 w-3.5" />
                                <span>Apply Alternative</span>
                              </button>
                            )}
                            <span className="text-[10px] text-gray-400">
                              Layer 2 &amp; 3: Contextual
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {reviewResponse.deterministic.findings.length === 0 &&
                  reviewResponse.contextual.findings.length === 0 && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-6 text-center text-xs text-emerald-950 space-y-3">
                      <CheckCircle2 className="h-9 w-9 text-emerald-600 mx-auto" />
                      <div>
                        <div className="font-bold text-base text-emerald-900">100% Clean Copy — Verification Passed!</div>
                        <p className="text-emerald-800 text-xs mt-1 max-w-sm mx-auto">
                          Zero spelling errors, zero grammatical flaws, and zero brand rule violations detected. Your copy is ready to publish or submit for team approval.
                        </p>
                      </div>
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyCopy}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                        >
                          {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          <span>{copySuccess ? 'Copied Clean Copy! ✓' : 'Copy Clean Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 space-y-3">
              <Layers className="h-8 w-8 text-gray-400 mx-auto" />
              <div className="font-bold text-sm text-gray-800">Ready to Check Your Content</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                Paste marketing copy on the left and click <strong>Check My Content</strong> to scan for brand guideline violations and verify claims against approved evidence.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => loadSampleDraft(sampleDrafts[0])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>Try a Sample Draft with Flagged Issues</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Verifier Configuration Modal */}
      {showAiSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-gray-900">AI Verifier Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiSettingsModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              BrandLens AI includes an intelligent <strong>Built-in Linguistic AI Engine</strong> that automatically checks spelling, grammar, syntax, tone, and brand rules across any text without requiring external APIs.
              You can also connect a <strong>Google Gemini API Key</strong> for live multimodal / LLM contextual checking.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Google Gemini API Key (optional)</label>
              <input
                type="password"
                value={geminiApiKeyInput}
                onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-mono focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-[11px] text-gray-500">
                Leave blank to use the built-in zero-config linguistic AI engine.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {savedGeminiApiKey ? (
                <button
                  type="button"
                  onClick={() => handleSaveGeminiKey('')}
                  className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                >
                  Remove Key
                </button>
              ) : <div />}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiSettingsModal(false)}
                  className="rounded-xl border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveGeminiKey(geminiApiKeyInput)}
                  className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-700 cursor-pointer"
                >
                  Save AI Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
