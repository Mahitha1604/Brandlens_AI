import { NextRequest, NextResponse } from 'next/server';
import { getBrandById, getDraftById, saveDraftReview } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';
import { runDeterministicChecks } from '@/lib/engine/deterministic';
import { runGeminiContextualReview } from '@/lib/engine/gemini';
import type { UnifiedReviewResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const user = getServerSessionUser(request);
    const body = await request.json();
    const { brand_id, text, draft_id, instructions, api_key } = body;
    const headerKey = request.headers.get('x-gemini-api-key');
    const effectiveApiKey = (api_key || headerKey || process.env.GEMINI_API_KEY || '').trim();

    if (!brand_id || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Draft content cannot be empty. Please enter marketing copy before submitting for review.' },
        { status: 400 }
      );
    }

    // Sanitize optional instructions (max 1000 chars)
    const sanitizedInstructions =
      typeof instructions === 'string' && instructions.trim().length > 0
        ? instructions.trim().slice(0, 1000)
        : undefined;

    let brand = getBrandById(brand_id, user?.id);

    // Support general writing preset if brand is 'general'
    if (!brand && brand_id === 'general') {
      brand = {
        id: 'general',
        name: 'General Advertising & Tone Standards',
        industry: 'Marketing & Digital Media',
        description: 'Standard truth-in-advertising, claim substantiation, and clarity guidelines.',
        tone_guidelines: 'Clear, transparent, credible, and engaging without misleading superlatives.',
        disclaimers: '',
        is_sample: false,
        rules: [],
        counts: { guidelines: 0, terminology: 0, verified_facts: 0, permitted_claims: 0, total: 0 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    if (!brand) {
      return NextResponse.json(
        { success: false, error: `Brand '${brand_id}' not found or access denied` },
        { status: 404 }
      );
    }

    // 1. Run Layer 1: Deterministic checks (Lexicon, Trademarks, Prohibited Terms, Disclaimers)
    const deterministicResult = runDeterministicChecks(text, brand, brand_id);

    // 2. Run Layer 2 & 3: Gemini Contextual Review & Evidence Retrieval
    const contextualResult = await runGeminiContextualReview(
      text,
      brand,
      brand.rules,
      sanitizedInstructions,
      effectiveApiKey
    );

    // 3. Compute unified compliance metrics
    const detViolations = deterministicResult.summary.violations_count;
    const detWarnings = deterministicResult.summary.warnings_count;
    const detSuggestions = deterministicResult.summary.suggestions_count;

    const ctxViolations = contextualResult.findings.filter((f) => f.severity === 'violation').length;
    const ctxWarnings = contextualResult.findings.filter((f) => f.severity === 'warning').length;
    const ctxSuggestions = contextualResult.findings.filter((f) => f.severity === 'suggestion').length;

    const totalViolations = detViolations + ctxViolations;
    const totalWarnings = detWarnings + ctxWarnings;
    const totalSuggestions = detSuggestions + ctxSuggestions;

    // Combined score: starts at 100, penalties for violations (15), warnings (8), suggestions (3)
    const penalty = totalViolations * 15 + totalWarnings * 8 + totalSuggestions * 3;
    const overallScore = Math.max(0, 100 - penalty);
    const overallPassed = totalViolations === 0 && totalWarnings === 0;

    // Resolve draft context if provided
    let draftRevisionNumber = 1;
    if (draft_id) {
      const draft = getDraftById(draft_id, user?.id);
      if (draft) {
        draftRevisionNumber = draft.current_revision;
      }
    }

    const unifiedResponse: UnifiedReviewResponse = {
      draft_id,
      brand_id,
      deterministic: deterministicResult,
      contextual: contextualResult,
      overall_score: overallScore,
      overall_passed: overallPassed,
      reviewed_text: text,
      reviewed_revision: draftRevisionNumber,
      evaluated_at: new Date().toISOString(),
    };

    // If linked to a saved draft, persist review record in SQLite
    if (draft_id) {
      try {
        saveDraftReview(draft_id, draftRevisionNumber, unifiedResponse, user?.role || 'copywriter');
      } catch (err) {
        console.warn('Failed to persist review record:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: unifiedResponse,
    });
  } catch (error) {
    console.error('Failed to run full brand review:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while evaluating review' },
      { status: 500 }
    );
  }
}
