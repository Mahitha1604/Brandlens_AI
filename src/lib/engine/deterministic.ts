import type { BrandRule, DeterministicFinding, DeterministicResult, BrandWithRules } from '../types';
import { getBrandRules } from '../db.ts';
import { runComprehensiveVerification } from './verifier.ts';

/**
 * Escapes regex special characters in a string.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determines whether a rule requires case-sensitive matching.
 * Trademark casing rules (e.g. 'Apexpay' vs 'ApexPay') require exact casing matches.
 */
export function isCaseSensitiveRule(rule: BrandRule, term: string): boolean {
  if (rule.rule_key.includes('CASING') || rule.rule_key.includes('TRADEMARK')) {
    return true;
  }
  // If term differs from replacement only by case, enforce case-sensitivity
  if (rule.replacement_terms && term.toLowerCase() === rule.replacement_terms.toLowerCase() && term !== rule.replacement_terms) {
    return true;
  }
  return false;
}

/**
 * Constructs a boundary-safe regular expression for a search term.
 * Handles alphanumeric word boundaries as well as special symbols like $, %, and hyphens.
 * Automatically accommodates hyphenation and spacing variations (e.g., 'zero risk' matches 'zero-risk').
 */
export function buildTermRegex(term: string, caseSensitive: boolean = false): RegExp {
  const trimmed = term.trim();
  // Split on hyphens and spaces to allow interchangeable hyphen/space matching
  const parts = trimmed.split(/[-\s]+/).map(escapeRegex);
  const patternBody = parts.join('[-\\s]+');
  const flags = caseSensitive ? 'g' : 'gi';

  // Boundary condition:
  // Preceded by start of string or non-alphanumeric character
  // Followed by end of string or non-alphanumeric character
  return new RegExp(`(^|[^a-zA-Z0-9_])(${patternBody})(?=[^a-zA-Z0-9_]|$)`, flags);
}

/**
 * Resolves overlapping and conflicting match intervals.
 * Prioritizes:
 * 1. Longest match (e.g., '100% secure' beats '100%')
 * 2. Higher severity (violation > warning > suggestion)
 * 3. Earlier starting index in text
 *
 * Then returns accepted matches sorted in natural reading order (startIndex ASC).
 */
export function resolveOverlappingMatches(matches: DeterministicFinding[]): DeterministicFinding[] {
  const severityRank: Record<string, number> = {
    violation: 3,
    warning: 2,
    suggestion: 1,
  };

  // Sort candidate matches by prioritization
  const prioritized = [...matches].sort((a, b) => {
    const lenA = a.end_index - a.start_index;
    const lenB = b.end_index - b.start_index;
    if (lenB !== lenA) return lenB - lenA; // longer match first

    const rankA = severityRank[a.severity] || 0;
    const rankB = severityRank[b.severity] || 0;
    if (rankB !== rankA) return rankB - rankA; // higher severity first

    return a.start_index - b.start_index;
  });

  const accepted: DeterministicFinding[] = [];

  for (const candidate of prioritized) {
    // Check if candidate overlaps with any already-accepted finding
    const hasOverlap = accepted.some(
      (acc) => candidate.start_index < acc.end_index && candidate.end_index > acc.start_index
    );

    if (!hasOverlap) {
      accepted.push(candidate);
    }
  }

  // Sort accepted findings in natural reading order
  accepted.sort((a, b) => a.start_index - b.start_index);
  return accepted;
}

/**
 * Scans text for common writing mechanics, spelling, and grammar issues.
 * Pure deterministic regex checks to guarantee reliable error detection without AI dependency.
 */
export function checkWritingMechanics(text: string): DeterministicFinding[] {
  const findings: DeterministicFinding[] = [];
  if (!text || text.trim().length === 0) return findings;

  // Run comprehensive linguistic, spelling, and grammar verifier
  const dummyBrand: BrandWithRules = {
    id: 'general',
    name: 'General Brand',
    industry: 'Marketing',
    description: '',
    tone_guidelines: '',
    disclaimers: '',
    rules: [],
    counts: { guidelines: 0, terminology: 0, verified_facts: 0, permitted_claims: 0, total: 0 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const verifierOutput = runComprehensiveVerification(text, dummyBrand, []);
  findings.push(...verifierOutput.deterministicFindings);

  return findings;
}

/**
 * Evaluates draft text against an array of active BrandRules or BrandWithRules.
 * Pure function: deterministic, side-effect free, and testable in isolation.
 */
export function runDeterministicChecks(
  text: string,
  rulesOrBrand: BrandRule[] | BrandWithRules,
  brandId?: string
): DeterministicResult {
  const rules: BrandRule[] = Array.isArray(rulesOrBrand)
    ? rulesOrBrand
    : Array.isArray((rulesOrBrand as BrandWithRules)?.rules)
    ? (rulesOrBrand as BrandWithRules).rules
    : [];

  const resolvedBrandId =
    brandId ||
    (!Array.isArray(rulesOrBrand) && (rulesOrBrand as BrandWithRules)?.id) ||
    'unknown';

  if (!text || text.trim().length === 0) {
    return {
      brand_id: resolvedBrandId,
      total_rules_evaluated: rules.length,
      findings: [],
      summary: {
        violations_count: 0,
        warnings_count: 0,
        suggestions_count: 0,
        total_findings: 0,
        passed: false,
        cleanliness_score: 0,
      },
      evaluated_at: new Date().toISOString(),
    };
  }

  const rawFindings: DeterministicFinding[] = [];

  // Run writing mechanics and grammar heuristics
  const mechanicsFindings = checkWritingMechanics(text);
  rawFindings.push(...mechanicsFindings);

  for (const rule of rules) {
    // 1. Scan explicit forbidden terms (Terminology, Facts, Guidelines)
    if (rule.category !== 'permitted_claim' && rule.forbidden_terms && rule.forbidden_terms.length > 0) {
      for (const forbidden of rule.forbidden_terms) {
        if (!forbidden || !forbidden.trim()) continue;

        const caseSensitive = isCaseSensitiveRule(rule, forbidden);
        const regex = buildTermRegex(forbidden, caseSensitive);

        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const matchedText = match[2];
          const startIndex = match.index + match[1].length;
          const endIndex = startIndex + matchedText.length;

          // Double check slice alignment to guarantee index precision
          if (text.slice(startIndex, endIndex) === matchedText) {
            rawFindings.push({
              id: `det-${rule.id}-${startIndex}-${endIndex}`,
              rule_id: rule.id,
              rule_key: rule.rule_key,
              category: rule.category,
              severity: rule.severity,
              source: 'deterministic',
              flagged_text: matchedText,
              suggested_replacement: rule.replacement_terms || '',
              rationale: rule.rationale || rule.content,
              evidence_snippet: `Rule [${rule.rule_key}]: "${rule.title}". ${rule.rationale ? `Evidence: ${rule.rationale}` : ''}`,
              start_index: startIndex,
              end_index: endIndex,
              confidence: 1.0,
              requires_human_review: rule.severity !== 'suggestion',
            });
          }

          // Advance regex pointer if match is 0-length
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
      }
    }

    // 2. Scan permitted claims requiring mandatory qualifications
    if (rule.category === 'permitted_claim' && rule.replacement_terms) {
      // Build claim trigger keywords dynamically from rule.forbidden_terms or title
      const claimKeywords: string[] = [];
      if (rule.forbidden_terms && Array.isArray(rule.forbidden_terms) && rule.forbidden_terms.length > 0) {
        claimKeywords.push(...rule.forbidden_terms.filter(Boolean));
      }
      if (rule.title && !claimKeywords.some((k) => k.toLowerCase() === rule.title.toLowerCase())) {
        claimKeywords.push(rule.title);
      }
      if (rule.rule_key === 'APEX_CLAIM_ZERO_MAINTENANCE') {
        claimKeywords.push('zero monthly account fee', 'zero monthly fee', 'no monthly fee');
      } else if (rule.rule_key === 'VA_CLAIM_CARBON_NEUTRAL') {
        claimKeywords.push('carbon-neutral', 'carbon neutral');
      }

      for (const kw of claimKeywords) {
        if (!kw || !kw.trim()) continue;
        const kwRegex = buildTermRegex(kw, false);
        let kwMatch: RegExpExecArray | null;

        while ((kwMatch = kwRegex.exec(text)) !== null) {
          const matchedText = kwMatch[2];
          const startIndex = kwMatch.index + kwMatch[1].length;
          const endIndex = startIndex + matchedText.length;

          // Check if the required qualification is missing in the text
          let isQualified = false;
          if (rule.rule_key === 'APEX_CLAIM_ZERO_MAINTENANCE') {
            isQualified = /interchange|per-transaction/i.test(text);
          } else if (rule.rule_key === 'VA_CLAIM_CARBON_NEUTRAL') {
            isQualified = /pachama|reforestation/i.test(text);
          } else {
            const reqWords = rule.replacement_terms
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .split(/\s+/)
              .filter((w) => w.length > 3 && !['with', 'that', 'this', 'from', 'have', 'more', 'your', 'requires', 'applies'].includes(w));
            if (reqWords.length > 0) {
              isQualified = reqWords.some((w) => new RegExp(`\\b${escapeRegex(w)}\\b`, 'i').test(text));
            } else {
              isQualified = text.toLowerCase().includes(rule.replacement_terms.toLowerCase());
            }
          }

          if (!isQualified && text.slice(startIndex, endIndex) === matchedText) {
            rawFindings.push({
              id: `det-claim-${rule.id}-${startIndex}-${endIndex}`,
              rule_id: rule.id,
              rule_key: rule.rule_key,
              category: 'permitted_claim',
              severity: 'warning',
              source: 'deterministic',
              flagged_text: matchedText,
              suggested_replacement: `${matchedText} (${rule.replacement_terms})`,
              rationale: `Permitted claim requires mandatory qualification: ${rule.replacement_terms}`,
              evidence_snippet: `Permitted Claim Policy [${rule.rule_key}]: ${rule.content}`,
              start_index: startIndex,
              end_index: endIndex,
              confidence: 1.0,
              requires_human_review: true,
            });
          }

          if (kwMatch.index === kwRegex.lastIndex) {
            kwRegex.lastIndex++;
          }
        }
      }
    }
  }

  // 3. Scan Brand Trademark Casing and Mandatory Disclaimers
  const brandObj = !Array.isArray(rulesOrBrand) ? (rulesOrBrand as BrandWithRules) : null;
  if (brandObj?.name && brandObj.name.length > 2) {
    const commonDictionaryWords = ['health', 'school', 'general', 'service', 'company', 'platform', 'app'];
    const isCommonWord = commonDictionaryWords.includes(brandObj.name.toLowerCase());

    const escaped = escapeRegex(brandObj.name);
    const regex = new RegExp(`(^|[^a-zA-Z0-9_])(${escaped})(?=[^a-zA-Z0-9_]|$)`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const found = m[2];
      const startIndex = m.index + m[1].length;
      const endIndex = startIndex + found.length;

      if (found !== brandObj.name) {
        let shouldFlag = true;
        if (isCommonWord) {
          const beforeSpan = text.slice(Math.max(0, startIndex - 15), startIndex).toLowerCase();
          const afterSpan = text.slice(endIndex, Math.min(text.length, endIndex + 15)).toLowerCase();
          const isBrandContext =
            /\b(at|from|with|by|for|the)\s+$/i.test(beforeSpan) ||
            /^('s|\s+app|\s+platform|\s+team|\s+solution|\s+system|\s+group)/i.test(afterSpan);
          shouldFlag = isBrandContext;
        }

        if (shouldFlag) {
          rawFindings.push({
            id: `det-casing-${startIndex}-${endIndex}`,
            rule_id: 'rule-brand-casing',
            rule_key: 'BRAND_NAME_CASING',
            category: 'terminology',
            severity: 'warning',
            source: 'deterministic',
            flagged_text: found,
            suggested_replacement: brandObj.name,
            rationale: `Brand name styling: Official casing is "${brandObj.name}", not "${found}".`,
            evidence_snippet: `Brand Identity Standards: "${brandObj.name}"`,
            start_index: startIndex,
            end_index: endIndex,
            confidence: 1.0,
            requires_human_review: false,
          });
        }
      }
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
  }

  // 4. Resolve overlaps and conflicting matches
  const resolvedFindings = resolveOverlappingMatches(rawFindings);

  // 4. Calculate metrics and cleanliness score
  const violations = resolvedFindings.filter((f) => f.severity === 'violation').length;
  const warnings = resolvedFindings.filter((f) => f.severity === 'warning').length;
  const suggestions = resolvedFindings.filter((f) => f.severity === 'suggestion').length;

  // Cleanliness score formula: 100 - (violations * 20 + warnings * 10 + suggestions * 5), min 0
  const penalty = violations * 20 + warnings * 10 + suggestions * 5;
  const cleanliness_score = Math.max(0, 100 - penalty);

  return {
    brand_id: resolvedBrandId,
    total_rules_evaluated: rules.length,
    findings: resolvedFindings,
    summary: {
      violations_count: violations,
      warnings_count: warnings,
      suggestions_count: suggestions,
      total_findings: resolvedFindings.length,
      passed: violations === 0,
      cleanliness_score,
    },
    evaluated_at: new Date().toISOString(),
  };
}

/**
 * Loads active brand rules from the database and runs deterministic checks.
 */
export function runDeterministicChecksForBrand(text: string, brandId: string): DeterministicResult {
  const rules = getBrandRules(brandId);
  return runDeterministicChecks(text, rules, brandId);
}
