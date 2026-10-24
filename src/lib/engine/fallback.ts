import type {
  BrandWithRules,
  BrandRule,
  ContextualFinding,
  ContextualReviewResult,
  EvidenceStatus,
} from '../types';
import { runComprehensiveVerification } from './verifier.ts';

/**
 * Honest, rule-grounded offline contextual review engine.
 * Used when GEMINI_API_KEY is not configured or when the external API call fails.
 *
 * GUARANTEES:
 * 1. Explicitly marks source as 'offline_fallback' (never claims to be genuine LLM AI).
 * 2. Never fabricates citations; references only real DB rules or marks null.
 * 3. Distinguishes 'supported', 'insufficient_evidence', 'potential_conflict', and 'human_review_required'.
 * 4. Ensures exact character offsets text.slice(start, end) === flagged_text.
 */
export function runOfflineContextualFallback(
  text: string,
  brand: BrandWithRules,
  rules: BrandRule[],
  reason: string = 'GEMINI_API_KEY environment variable not configured',
  _instructions?: string
): ContextualReviewResult {
  const findings: ContextualFinding[] = [];
  void _instructions;

  const verifiedFacts = rules.filter((r) => r.category === 'verified_fact');
  const permittedClaims = rules.filter((r) => r.category === 'permitted_claim');

  // Helper to find slice offsets safely
  function registerFinding(
    targetText: string,
    findingData: {
      category: 'tone' | 'claim' | 'messaging' | 'readability';
      severity: 'violation' | 'warning' | 'suggestion';
      explanation: string;
      evidence_status: EvidenceStatus;
      relevant_evidence_id: string | null;
      relevant_evidence_reference: string | null;
      suggested_correction: string;
      confidence: number;
    }
  ) {
    let searchStart = 0;
    const lowerText = text.toLowerCase();
    const lowerTarget = targetText.toLowerCase();

    while (searchStart < text.length) {
      const matchIndex = lowerText.indexOf(lowerTarget, searchStart);
      if (matchIndex === -1) break;

      const exactSlice = text.slice(matchIndex, matchIndex + targetText.length);
      const id = `fallback-${matchIndex}-${matchIndex + exactSlice.length}`;

      // Avoid duplicate span registration
      if (!findings.some((f) => f.start_index === matchIndex && f.end_index === matchIndex + exactSlice.length)) {
        findings.push({
          id,
          source: 'offline_fallback',
          category: findingData.category,
          severity: findingData.severity,
          flagged_text: exactSlice,
          start_index: matchIndex,
          end_index: matchIndex + exactSlice.length,
          explanation: `[Offline Heuristic] ${findingData.explanation}`,
          evidence_status: findingData.evidence_status,
          relevant_evidence_id: findingData.relevant_evidence_id,
          relevant_evidence_reference: findingData.relevant_evidence_reference,
          suggested_correction: findingData.suggested_correction,
          confidence: findingData.confidence,
          requires_human_review: true,
        });
      }

      searchStart = matchIndex + exactSlice.length;
    }
  }

  // -------------------------------------------------------------
  // 1. Tone & Promotional Urgency Analysis (Contextual Tone Drift)
  // -------------------------------------------------------------
  const urgencyPatterns = [
    {
      phrase: 'Act now before it is too late',
      correction: 'Schedule a consultation with an institutional specialist',
      explanation: 'High-pressure urgency phrasing conflicts with sober, evidence-led tone directives.',
    },
    {
      phrase: 'hurry before rates expire',
      correction: 'Current terms available through official schedule',
      explanation: 'Promotional countdown/FOMO language undermines brand credibility.',
    },
    {
      phrase: 'lock in completely free',
      correction: 'explore fee schedule for qualified accounts',
      explanation: 'Promotional urgency combined with unverified pricing claims.',
    },
    {
      phrase: 'miraculous formula',
      correction: 'clinically formulated botanical complex',
      explanation: 'Hyperbolic or miracle adjectives violate scientific skincare guidelines.',
    },
    {
      phrase: 'cures acne',
      correction: 'helps visibly reduce the appearance of blemishes',
      explanation: 'Medical disease treatment claims exceed cosmetic regulatory boundaries.',
    },
  ];

  for (const item of urgencyPatterns) {
    if (text.toLowerCase().includes(item.phrase.toLowerCase())) {
      registerFinding(item.phrase, {
        category: 'tone',
        severity: 'warning',
        explanation: item.explanation,
        evidence_status: 'human_review_required',
        relevant_evidence_id: null,
        relevant_evidence_reference: null,
        suggested_correction: item.correction,
        confidence: 0.88,
      });
    }
  }

  // -------------------------------------------------------------
  // 2. Factual Conflict Analysis Against Verified Facts (Layer 3)
  // -------------------------------------------------------------
  for (const fact of verifiedFacts) {
    // Check if draft contains unverified exaggerations mentioned in rule
    for (const forbidden of fact.forbidden_terms) {
      if (text.toLowerCase().includes(forbidden.toLowerCase())) {
        registerFinding(forbidden, {
          category: 'claim',
          severity: 'violation',
          explanation: `Claim directly conflicts with verified brand fact "${fact.title}".`,
          evidence_status: 'potential_conflict',
          relevant_evidence_id: fact.id,
          relevant_evidence_reference: fact.rationale || fact.content,
          suggested_correction: fact.replacement_terms || fact.content,
          confidence: 0.95,
        });
      }
    }

    // Check for supported positive citations
    if (fact.rule_key === 'APEX_FACT_AUDITED_VOLUME' && text.includes('$14.2B')) {
      registerFinding('$14.2B', {
        category: 'claim',
        severity: 'suggestion',
        explanation: 'Factual statement is supported by audited corporate records.',
        evidence_status: 'supported',
        relevant_evidence_id: fact.id,
        relevant_evidence_reference: fact.rationale || fact.content,
        suggested_correction: '$14.2B processed volume in FY2025 (audited)',
        confidence: 0.99,
      });
    }

    if (fact.rule_key === 'VA_FACT_PCR_PACKAGING' && text.toLowerCase().includes('100% post-consumer recycled')) {
      registerFinding('100% post-consumer recycled', {
        category: 'claim',
        severity: 'suggestion',
        explanation: 'Sustainable packaging claim is supported by EarthCert audit verification.',
        evidence_status: 'supported',
        relevant_evidence_id: fact.id,
        relevant_evidence_reference: fact.rationale || fact.content,
        suggested_correction: '100% post-consumer recycled (PCR) aluminum and glass',
        confidence: 0.98,
      });
    }
  }

  // -------------------------------------------------------------
  // 3. Permitted Claims & Qualification Verification (Layer 3)
  // -------------------------------------------------------------
  for (const claim of permittedClaims) {
    // Check if permitted claim is mentioned without qualification
    if (claim.rule_key === 'APEX_CLAIM_ZERO_MAINTENANCE') {
      const matchKey = 'zero monthly account maintenance fee';
      const shortKey = 'zero monthly fee';
      const target = text.toLowerCase().includes(matchKey) ? matchKey : text.toLowerCase().includes(shortKey) ? shortKey : null;

      if (target) {
        const hasInterchange = /interchange|per-transaction/i.test(text);
        if (!hasInterchange) {
          registerFinding(target, {
            category: 'claim',
            severity: 'warning',
            explanation: 'Permitted claim requires mandatory disclosure of transaction interchange fees.',
            evidence_status: 'potential_conflict',
            relevant_evidence_id: claim.id,
            relevant_evidence_reference: claim.content,
            suggested_correction: `${target} (standard per-transaction interchange applies)`,
            confidence: 0.92,
          });
        }
      }
    }

    if (claim.rule_key === 'VA_CLAIM_CARBON_NEUTRAL') {
      const target = 'carbon-neutral';
      if (text.toLowerCase().includes(target)) {
        const hasPachama = /pachama|reforestation/i.test(text);
        if (!hasPachama) {
          registerFinding(target, {
            category: 'claim',
            severity: 'warning',
            explanation: 'Environmental claim requires mandatory attribution of Pachama reforestation offset credits.',
            evidence_status: 'potential_conflict',
            relevant_evidence_id: claim.id,
            relevant_evidence_reference: claim.content,
            suggested_correction: 'carbon-neutral delivery verified through Pachama reforestation credits',
            confidence: 0.91,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Insufficient Evidence Scans (Unsupported Absolute Claims)
  // -------------------------------------------------------------
  const unverifiedAbsolutes = [
    {
      phrase: 'trusted by every company',
      explanation: 'Broad market adoption claim lacks supporting documentation or customer survey in active knowledge base.',
    },
    {
      phrase: 'saves the planet from plastic',
      explanation: 'Absolute ecological claim is unsubstantiated by supplier environmental audit records.',
    },
    {
      phrase: 'permanently erases wrinkles',
      explanation: 'Permanent biological reversal claim lacks clinical trial verification in active knowledge base.',
    },
  ];

  for (const abs of unverifiedAbsolutes) {
    if (text.toLowerCase().includes(abs.phrase.toLowerCase())) {
      registerFinding(abs.phrase, {
        category: 'claim',
        severity: 'warning',
        explanation: `${abs.explanation} (Missing evidence is not treated as false, but requires human verification before publication).`,
        evidence_status: 'insufficient_evidence',
        relevant_evidence_id: null,
        relevant_evidence_reference: null,
        suggested_correction: 'helps visibly reduce the appearance of fine lines',
        confidence: 0.85,
      });
    }
  }

  // Incorporate comprehensive AI verifier contextual findings (Tone, Claims, FOMO, Superlatives)
  const verifierResult = runComprehensiveVerification(text, brand, rules);
  for (const cf of verifierResult.contextualFindings) {
    if (!findings.some((f) => Math.max(f.start_index, cf.start_index) < Math.min(f.end_index, cf.end_index))) {
      findings.push({
        ...cf,
        source: 'offline_fallback',
        explanation: `[AI Verifier] ${cf.explanation}`,
      });
    }
  }

  // Sort findings by start index
  findings.sort((a, b) => a.start_index - b.start_index);

  // Compute claim summary
  const supported = findings.filter((f) => f.evidence_status === 'supported').length;
  const insufficient = findings.filter((f) => f.evidence_status === 'insufficient_evidence').length;
  const conflicting = findings.filter((f) => f.evidence_status === 'potential_conflict').length;
  const humanReview = findings.filter((f) => f.evidence_status === 'human_review_required').length;

  return {
    brand_id: brand.id,
    is_fallback: true,
    provider: 'offline_fallback_engine',
    model: 'brandlens-heuristic-fallback-v1',
    fallback_reason: reason,
    findings,
    claim_summary: {
      total_claims_evaluated: findings.length,
      supported_claims: supported,
      insufficient_evidence_claims: insufficient,
      conflicting_claims: conflicting,
      human_review_claims: humanReview,
    },
    evaluated_at: new Date().toISOString(),
  };
}
