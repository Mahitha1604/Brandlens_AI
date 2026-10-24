"use client";

import React, { useState } from 'react';
import { useBrandSession } from '@/context/BrandSessionContext';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    step: 1,
    title: 'Welcome to BrandLens AI',
    subtitle: 'Enterprise Brand Governance & Evidence-Backed Review',
    description:
      'BrandLens AI safeguards your brand integrity by checking marketing copy against your exact guidelines, terminology, and approved supporting evidence before it goes live.',
    bullets: [
      'Your workspace is completely private and secure.',
      'New accounts start with a clean workspace ready for your brand.',
      'Explore sample data anytime via Demo Mode.',
    ],
    icon: (
      <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    step: 2,
    title: 'Step 1: Set Up Your Brand & Rules',
    subtitle: 'Knowledge Hub & Guidelines',
    description:
      'Begin by creating your brand profile. Add rules covering guidelines, prohibited terminology, and verified factual claims.',
    bullets: [
      'Define required tone, audience expectations, and mandatory disclaimers.',
      'Specify prohibited phrases with one-click replacement terms.',
      'Catalog verified facts and permitted claims with supporting citations.',
    ],
    icon: (
      <svg className="w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    step: 3,
    title: 'Step 2: Check Your Content',
    subtitle: 'Automated Rule Checks & AI Evidence Retrieval',
    description:
      'Paste ad copy, landing pages, or email drafts into the Content Studio. Our dual-layer review engine analyzes the text in seconds.',
    bullets: [
      'Layer 1: Automatic rule checks detect forbidden terminology and calculate character offsets.',
      'Layer 2: AI checks contextual tone and matches claims against approved supporting evidence.',
      'Honest grounding badges show whether claims are Supported, Unsupported, or Extrapolated.',
    ],
    icon: (
      <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    step: 4,
    title: 'Step 3: 1-Click Fixes & Formal Approvals',
    subtitle: 'Full Revision Tracking & Governance',
    description:
      'Accept recommended fixes with single clicks. Compare versions with visual line diffs and submit for formal approval.',
    bullets: [
      '1-Click Fixes automatically swap terms and re-index character offsets.',
      'Visual version diffs highlight exactly what changed between edits.',
      'Role-based approvals: copywriters submit for review, while reviewers and admins approve or request changes.',
    ],
    icon: (
      <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const { completeOnboarding } = useBrandSession();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const currentStep = STEPS[currentStepIdx];
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      completeOnboarding();
      onClose();
    } else {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Top accent glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Guided Tour • Step {currentStep.step} of {STEPS.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip Tour
          </button>
        </div>

        {/* Content */}
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
              {currentStep.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{currentStep.title}</h2>
              <p className="text-xs text-indigo-300 font-medium">{currentStep.subtitle}</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {currentStep.description}
          </p>

          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 space-y-2 mb-6">
            {currentStep.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStepIdx
                    ? 'w-6 bg-indigo-500'
                    : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
            >
              {isLast ? 'Get Started' : 'Next Step'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
