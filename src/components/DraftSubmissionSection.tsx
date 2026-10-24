"use client";

import React, { useState } from 'react';
import {
  Send,
  FileText,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import type { BrandWithRules, Draft, DraftChannel, UserPersona, UnifiedReviewResponse } from '@/lib/types';

interface DraftSubmissionSectionProps {
  activeBrand: BrandWithRules;
  currentPersona: UserPersona;
  onDraftSubmitted?: (draft: Draft) => void;
}

export function DraftSubmissionSection({
  activeBrand,
  currentPersona,
  onDraftSubmitted,
}: DraftSubmissionSectionProps) {
  const [draftTitle, setDraftTitle] = useState('New Marketing Draft');
  const [channel, setChannel] = useState<DraftChannel>('landing_page');
  const [targetAudience, setTargetAudience] = useState('Enterprise Buyers');
  const [draftContent, setDraftContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDraft, setSubmittedDraft] = useState<Draft | null>(null);
  const [reviewResponse, setReviewResponse] = useState<UnifiedReviewResponse | null>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<'all' | 'deterministic' | 'contextual'>('all');

  // Sample presets for quick testing
  const sampleDrafts = [
    {
      label: '🚩 Flawed Sample Draft',
      desc: 'Contains multiple prohibited terms, false superlatives, and unverified volume',
      title: 'Enterprise Q4 Growth Campaign (Unvetted)',
      channel: 'landing_page' as DraftChannel,
      audience: 'Corporate Treasurers',
      content:
        activeBrand.id === 'apexpay'
          ? `Welcome to apex pay, the bulletproof payments solution for modern business. Our zero-risk treasury engine delivers 100% uptime with instantaneous cross-border wire transfers. Act now before it is too late to lock in completely free platform access and over $50B in processed volume!`
          : `Introducing our miraculous formula that cures acne and is 100% natural and chemical-free. Enjoy zero emission shipping!`,
    },
    {
      label: '✅ Compliant Sample Draft',
      desc: 'Accurate terminology, verified statistics, and proper qualification disclosures',
      title: 'Institutional Payment Infrastructure Overview',
      channel: 'landing_page' as DraftChannel,
      audience: 'Chief Financial Officers',
      content:
        activeBrand.id === 'apexpay'
          ? `Welcome to ApexPay, the defense-in-depth payments platform for modern enterprises. Our risk-mitigated treasury architecture provides 99.97% audited availability with near real-time settlement across 38 global currencies ($14.2B processed volume in FY2025). Enjoy zero monthly account maintenance fees (standard per-transaction interchange applies).`
          : `Discover Verdant Aura botanical skincare. Formulated with 98.4% plant-derived ingredients and safe clean preservatives, our serum helps visibly diminish the appearance of fine lines. Packaged in 100% post-consumer recycled aluminum, with carbon-neutral delivery verified through Pachama reforestation credits.`,
    },
  ];

  function loadSample(sample: typeof sampleDrafts[0]) {
    setDraftTitle(sample.title);
    setChannel(sample.channel);
    setTargetAudience(sample.audience);
    setDraftContent(sample.content);
    setSubmittedDraft(null);
    setReviewResponse(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draftContent.trim() || draftContent.length < 5) return;

    setIsSubmitting(true);
    try {
      // Preserve localStorage for backward compatibility
      try {
        localStorage.setItem('brandDraft', draftContent);
      } catch {
        // ignore localStorage errors
      }

      // 1. Save to persistent SQLite DB via API route
      const resDraft = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: activeBrand.id,
          title: draftTitle,
          content: draftContent,
          channel,
          target_audience: targetAudience,
          created_by: `${currentPersona.name} (${currentPersona.title})`,
        }),
      });

      if (resDraft.ok) {
        const jsonDraft = await resDraft.json();
        const saved: Draft = jsonDraft.data;
        setSubmittedDraft(saved);
        if (onDraftSubmitted) onDraftSubmitted(saved);

        // 2. Execute full unified brand review (Layer 1 Deterministic + Layer 2/3 Contextual & Evidence)
        const resReview = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand_id: activeBrand.id,
            text: draftContent,
            draft_id: saved.id,
          }),
        });

        if (resReview.ok) {
          const jsonReview = await resReview.json();
          if (jsonReview.success) {
            setReviewResponse(jsonReview.data);
          }
        }
      } else {
        alert('Could not submit draft to server.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting draft for review.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              2. Content Submission & Automated Review
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Submit copy to run Layer 1 (Deterministic checks) and Layer 2 & 3 (Contextual AI & Evidence Review).
          </p>
        </div>

        {/* Quick Demo Pre-fill Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Quick Test Drafts:</span>
          {sampleDrafts.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadSample(sample)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              title={sample.desc}
            >
              <span>{sample.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label htmlFor="draftTitleInput" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Draft Campaign Title
            </label>
            <input
              id="draftTitleInput"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="channelSelect" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Channel / Medium
            </label>
            <select
              id="channelSelect"
              value={channel}
              onChange={(e) => setChannel(e.target.value as DraftChannel)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="landing_page">Landing Page / Web Copy</option>
              <option value="social_ad">Paid Social Advertisement</option>
              <option value="press_release">Press Release / Regulatory Filing</option>
              <option value="email">Marketing Email / Newsletter</option>
              <option value="blog_post">Thought Leadership Blog</option>
              <option value="other">Other Brand Collateral</option>
            </select>
          </div>

          <div>
            <label htmlFor="audienceInput" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Target Audience
            </label>
            <input
              id="audienceInput"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="draft" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Draft Content * (min 5 characters)
            </label>
            <span className="text-xs text-gray-500">
              {draftContent.length} characters | {draftContent.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>

          <textarea
            id="draft"
            value={draftContent}
            onChange={(e) => {
              setDraftContent(e.target.value);
              setSubmittedDraft(null);
              setReviewResponse(null);
            }}
            required
            minLength={5}
            rows={6}
            placeholder={`Paste an advertisement, social post, or marketing draft for ${activeBrand.name}...`}
            className="w-full rounded-xl border border-gray-300 p-4 text-sm font-sans focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={isSubmitting || draftContent.length < 5}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{isSubmitting ? 'Running Unified Review (Layers 1, 2, 3)...' : 'Submit Draft & Run Full Governance Review'}</span>
          </button>

          <span className="text-xs text-gray-500">
            Submitter: <strong>{currentPersona.name}</strong> ({currentPersona.role})
          </span>
        </div>
      </form>

      {/* Submission Status Confirmation */}
      {submittedDraft && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Draft Stored in SQLite: <strong className="font-mono text-gray-900">{submittedDraft.id}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-800">
                Revision #{submittedDraft.current_revision}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <Clock className="h-3 w-3" />
                {new Date(submittedDraft.updated_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Unified Review Results Card */}
          {reviewResponse && (
            <div className="mt-4 space-y-4">
              {/* Overall Score Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 border border-gray-200 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={`h-5 w-5 ${
                        reviewResponse.overall_passed ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    />
                    <h3 className="font-bold text-gray-900 text-sm">
                      BrandLens AI Multi-Layer Governance Report
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Evaluated against {activeBrand.name}&apos;s rules using Layer 1 (Deterministic) and Layers 2 &amp; 3 (Contextual &amp; Evidence Review).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs uppercase font-semibold text-gray-500">Overall Compliance</div>
                    <div
                      className={`text-2xl font-black ${
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
                      reviewResponse.overall_passed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {reviewResponse.overall_passed ? 'Passed' : 'Action Required'}
                  </span>
                </div>
              </div>

              {/* Provider & Fallback Transparency Banner */}
              {reviewResponse.contextual.is_fallback ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Offline Fallback Mode Active: </span>
                    <span>
                      {reviewResponse.contextual.fallback_reason ||
                        'GEMINI_API_KEY is not configured on the server. Displaying transparent rule-grounded heuristic analysis.'}
                    </span>
                    <p className="text-[11px] text-amber-800 mt-1 italic">
                      Notice: BrandLens AI never fabricates evidence or presents fallback results as genuine AI analysis.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span>
                      AI Provider: <strong>Google Gemini ({reviewResponse.contextual.model})</strong> with verified source grounding.
                    </span>
                  </div>
                  <span className="font-semibold text-blue-700">Genuine LLM Contextual Review</span>
                </div>
              )}

              {/* Evidence Status Summary Bar (Layer 3) */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                  <div className="font-bold text-emerald-900 text-sm">
                    {reviewResponse.contextual.claim_summary.supported_claims}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium">Supported Claims</div>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-center">
                  <div className="font-bold text-amber-900 text-sm">
                    {reviewResponse.contextual.claim_summary.insufficient_evidence_claims}
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium">Insufficient Evidence</div>
                </div>

                <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-center">
                  <div className="font-bold text-red-900 text-sm">
                    {reviewResponse.contextual.claim_summary.conflicting_claims}
                  </div>
                  <div className="text-[11px] text-red-700 font-medium">Potential Conflicts</div>
                </div>

                <div className="rounded-lg bg-purple-50 border border-purple-200 p-2.5 text-center">
                  <div className="font-bold text-purple-900 text-sm">
                    {reviewResponse.contextual.claim_summary.human_review_claims}
                  </div>
                  <div className="text-[11px] text-purple-700 font-medium">Human Review Needed</div>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex border-b border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveReviewTab('all')}
                  className={`px-3 py-2 font-medium border-b-2 transition-colors ${
                    activeReviewTab === 'all'
                      ? 'border-blue-600 text-blue-700 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  All Findings (
                  {reviewResponse.deterministic.findings.length + reviewResponse.contextual.findings.length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewTab('deterministic')}
                  className={`px-3 py-2 font-medium border-b-2 transition-colors ${
                    activeReviewTab === 'deterministic'
                      ? 'border-blue-600 text-blue-700 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Layer 1: Deterministic ({reviewResponse.deterministic.findings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewTab('contextual')}
                  className={`px-3 py-2 font-medium border-b-2 transition-colors ${
                    activeReviewTab === 'contextual'
                      ? 'border-blue-600 text-blue-700 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Layers 2 &amp; 3: Contextual &amp; Evidence ({reviewResponse.contextual.findings.length})
                </button>
              </div>

              {/* Layer 1: Deterministic Findings */}
              {(activeReviewTab === 'all' || activeReviewTab === 'deterministic') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Layer 1: Deterministic Rule Scan ({reviewResponse.deterministic.findings.length} matches)
                    </h4>
                    <span className="text-[11px] text-gray-500">
                      Cleanliness: {reviewResponse.deterministic.summary.cleanliness_score}/100
                    </span>
                  </div>

                  {reviewResponse.deterministic.findings.length > 0 ? (
                    <div className="grid gap-2.5">
                      {reviewResponse.deterministic.findings.map((f) => (
                        <div
                          key={f.id}
                          className={`rounded-xl border p-3.5 text-xs ${
                            f.severity === 'violation'
                              ? 'border-red-200 bg-red-50/40'
                              : f.severity === 'warning'
                              ? 'border-amber-200 bg-amber-50/40'
                              : 'border-blue-200 bg-blue-50/40'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/60 pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                  f.severity === 'violation'
                                    ? 'bg-red-600 text-white'
                                    : f.severity === 'warning'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-blue-600 text-white'
                                }`}
                              >
                                {f.severity}
                              </span>
                              <span className="font-mono text-gray-500 font-semibold">{f.rule_key}</span>
                              <span className="text-gray-400">·</span>
                              <span className="font-medium text-gray-600 uppercase">{f.category}</span>
                            </div>

                            <div className="font-mono text-[11px] text-gray-600 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                              Offset: <strong>[{f.start_index}, {f.end_index}]</strong>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 my-1.5 text-xs">
                            <span className="text-gray-500 font-semibold">Flagged:</span>
                            <span className="rounded bg-red-100 px-2 py-0.5 font-bold font-mono text-red-900 border border-red-300">
                              &quot;{f.flagged_text}&quot;
                            </span>
                            {f.suggested_replacement && (
                              <>
                                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-gray-500 font-semibold">Suggested:</span>
                                <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold font-mono text-emerald-900 border border-emerald-300">
                                  &quot;{f.suggested_replacement}&quot;
                                </span>
                              </>
                            )}
                          </div>

                          <p className="mt-1.5 text-gray-700 bg-white/70 p-2 rounded border border-gray-200/60">
                            <strong>Policy Rationale:</strong> {f.rationale}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Zero explicit rule violations detected by Layer 1.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Layers 2 & 3: Contextual & Evidence Findings */}
              {(activeReviewTab === 'all' || activeReviewTab === 'contextual') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Layers 2 &amp; 3: Contextual &amp; Evidence Review ({reviewResponse.contextual.findings.length} findings)
                    </h4>
                    <span className="text-[11px] text-gray-500">
                      Source: {reviewResponse.contextual.provider}
                    </span>
                  </div>

                  {reviewResponse.contextual.findings.length > 0 ? (
                    <div className="grid gap-2.5">
                      {reviewResponse.contextual.findings.map((f) => (
                        <div
                          key={f.id}
                          className={`rounded-xl border p-3.5 text-xs ${
                            f.evidence_status === 'potential_conflict'
                              ? 'border-red-200 bg-red-50/40'
                              : f.evidence_status === 'insufficient_evidence'
                              ? 'border-amber-200 bg-amber-50/40'
                              : f.evidence_status === 'supported'
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : 'border-purple-200 bg-purple-50/40'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/60 pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              {/* Evidence status pill */}
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  f.evidence_status === 'supported'
                                    ? 'bg-emerald-600 text-white'
                                    : f.evidence_status === 'insufficient_evidence'
                                    ? 'bg-amber-600 text-white'
                                    : f.evidence_status === 'potential_conflict'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-purple-600 text-white'
                                }`}
                              >
                                {f.evidence_status.replace('_', ' ')}
                              </span>

                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 uppercase">
                                {f.category}
                              </span>

                              <span className="text-gray-400">·</span>
                              <span className="text-[11px] text-gray-500">Confidence: {(f.confidence * 100).toFixed(0)}%</span>
                            </div>

                            <div className="font-mono text-[11px] text-gray-600 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                              Offset: <strong>[{f.start_index}, {f.end_index}]</strong>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 my-1.5 text-xs">
                            <span className="text-gray-500 font-semibold">Analyzed Claim:</span>
                            <span className="rounded bg-white px-2 py-0.5 font-bold font-mono text-gray-900 border border-gray-300">
                              &quot;{f.flagged_text}&quot;
                            </span>
                            {f.suggested_correction && (
                              <>
                                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-gray-500 font-semibold">Suggested Alternative:</span>
                                <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold font-mono text-emerald-900 border border-emerald-300">
                                  &quot;{f.suggested_correction}&quot;
                                </span>
                              </>
                            )}
                          </div>

                          <div className="mt-2 text-gray-700 bg-white/70 p-2.5 rounded border border-gray-200/60 space-y-1">
                            <p>
                              <strong>Contextual Assessment:</strong> {f.explanation}
                            </p>
                            {f.relevant_evidence_reference ? (
                              <p className="text-[11px] text-gray-600 flex items-center gap-1 font-mono">
                                <strong>Supporting Citation:</strong> {f.relevant_evidence_reference}
                              </p>
                            ) : (
                              f.evidence_status === 'insufficient_evidence' && (
                                <p className="text-[11px] text-amber-700 italic">
                                  No supporting corporate fact found in active brand knowledge base.
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>All claims supported or no contextual violations identified.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
