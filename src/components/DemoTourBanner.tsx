"use client";

import React, { useState } from 'react';
import { ChevronRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export function DemoTourBanner() {
  const [isExpanded, setIsExpanded] = useState(false);

  const pillars = [
    {
      title: 'Brand Knowledge Foundation',
      desc: 'Centralized guidelines, terminology dictionaries, verified corporate facts, and permitted claims cataloged per entity.',
    },
    {
      title: 'Deterministic Rule Engine',
      desc: 'Sub-millisecond lexicon and regex scanning with exact character span offsets, interval scheduling overlap resolution, and case-sensitive trademark checks.',
    },
    {
      title: 'Contextual AI & Evidence Verification',
      desc: 'Server-side Gemini 2.5 analysis with Zod schema validation, strictly bounded prompt injection barriers, and honest evidence labels (supported, insufficient, conflict).',
    },
    {
      title: 'Review Studio & 1-Click Fixes',
      desc: 'Split-pane interactive highlighter, natural language review instructions, offset-shifting 1-click suggestion replacements, and persistent revision audit trail.',
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 p-5 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-950">
              BrandLens AI Governance Framework
            </h3>
            <p className="text-xs text-blue-800">
              Multi-layer brand compliance: Deterministic scanning + Contextual AI + Approved evidence verification.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 self-start rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-2xs hover:bg-blue-50 transition-colors sm:self-auto cursor-pointer"
        >
          <span>{isExpanded ? 'Hide Architecture Guide' : 'View Architecture Guide'}</span>
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-blue-200/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-blue-150 bg-white/80 p-3 shadow-2xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                <h4 className="font-bold text-gray-900 text-xs">{pillar.title}</h4>
              </div>
              <p className="text-gray-600 leading-relaxed text-[11px] pl-6">{pillar.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
