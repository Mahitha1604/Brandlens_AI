import { z } from 'zod';

/**
 * Zod schema for validating raw structured JSON returned by Google Gemini.
 * Enforces adherence to the BrandLens AI Round 1 specification.
 */
export const GeminiFindingItemSchema = z.object({
  flagged_text: z.string().min(1, 'Flagged text must not be empty'),
  category: z.enum(['tone', 'claim', 'messaging', 'readability'], {
    message: 'Category must be tone, claim, messaging, or readability',
  }),
  severity: z.enum(['violation', 'warning', 'suggestion'], {
    message: 'Severity must be violation, warning, or suggestion',
  }),
  explanation: z.string().min(1, 'Explanation is required'),
  evidence_status: z.enum(
    ['supported', 'insufficient_evidence', 'potential_conflict', 'human_review_required'],
    {
      message:
        'Evidence status must be supported, insufficient_evidence, potential_conflict, or human_review_required',
    }
  ),
  relevant_evidence_id: z.string().nullable().optional(),
  relevant_evidence_reference: z.string().nullable().optional(),
  suggested_correction: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0.85),
  requires_human_review: z.boolean().default(true),
});

export const GeminiContextualOutputSchema = z.object({
  findings: z.array(GeminiFindingItemSchema),
  overall_assessment: z.string().optional(),
});

export type GeminiValidatedFinding = z.infer<typeof GeminiFindingItemSchema>;
export type GeminiValidatedOutput = z.infer<typeof GeminiContextualOutputSchema>;

export function validateGeminiOutput(
  rawJson: unknown
): { success: true; data: GeminiValidatedOutput } | { success: false; error: string } {
  const parsed = GeminiContextualOutputSchema.safeParse(rawJson);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  return {
    success: true,
    data: parsed.data,
  };
}
