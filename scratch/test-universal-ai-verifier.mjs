import { runDeterministicChecks } from '../src/lib/engine/deterministic.ts';
import { runComprehensiveVerification } from '../src/lib/engine/verifier.ts';
import { runOfflineContextualFallback } from '../src/lib/engine/fallback.ts';

console.log('======================================================');
console.log('🧪 Starting Universal AI Verifier & Brand Rules Suite');
console.log('======================================================\n');

// -------------------------------------------------------------------
// TEST 1: Universal Grammar & Trustworthiness across Tech / SaaS
// -------------------------------------------------------------------
console.log('Test 1: Tech / SaaS content with grammar, trust & FOMO flaws...');
const techCopy = 'Our cloud platform are very powerful, and each of the features are fastly developed. We can able to guarantee 100% uptime! Act now before it is too late.';
const techBrand = {
  id: 'saas-cloud',
  name: 'Nexus Cloud',
  industry: 'Enterprise Software',
  description: 'Scalable cloud infrastructure',
  tone_guidelines: 'Professional, reliable, enterprise-grade',
  disclaimers: '',
  rules: [],
  counts: { guidelines: 0, terminology: 0, verified_facts: 0, permitted_claims: 0, total: 0 },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const techDet = runDeterministicChecks(techCopy, techBrand, techBrand.id);
const techCtx = runOfflineContextualFallback(techCopy, techBrand, []);

console.log(`   Deterministic findings: ${techDet.findings.length}`);
techDet.findings.forEach((f) => console.log(`   - [${f.severity}] "${f.flagged_text}" -> "${f.suggested_replacement}" (${f.rationale})`));
console.log(`   Contextual findings: ${techCtx.findings.length}`);
techCtx.findings.forEach((f) => console.log(`   - [${f.severity}] "${f.flagged_text}" -> "${f.suggested_correction}" (${f.explanation})`));

const foundPlatformAre = techDet.findings.some((f) => f.flagged_text.toLowerCase().includes('platform are'));
const foundEachAre = techDet.findings.some((f) => f.flagged_text.toLowerCase().includes('features are'));
const foundFastly = techDet.findings.some((f) => f.flagged_text.toLowerCase().includes('fastly'));
const foundCanAble = techDet.findings.some((f) => f.flagged_text.toLowerCase().includes('can able to'));
const foundUptime = techDet.findings.some((f) => f.flagged_text.toLowerCase().includes('100% uptime')) || techCtx.findings.some((f) => f.flagged_text.toLowerCase().includes('100% uptime'));
const foundFomo = techCtx.findings.some((f) => f.flagged_text.toLowerCase().includes('act now before it is too late'));

if (!foundPlatformAre || !foundFastly || !foundCanAble || !foundUptime || !foundFomo) {
  console.error('❌ Test 1 Failed: Expected flaws were not all caught!');
  process.exit(1);
}
console.log('✔ Test 1 Passed: Tech / SaaS flaws accurately flagged.\n');

// -------------------------------------------------------------------
// TEST 2: Universal Grammar, Homophones & Trust across Finance / FinTech
// -------------------------------------------------------------------
console.log('Test 2: Finance / FinTech copy with homophones and double negatives...');
const financeCopy = 'This company have a positive affect on your portfolio, and we advice you to lock in guaranteed profit with zero risk.';
const financeBrand = {
  id: 'fin-invest',
  name: 'Veritas Wealth',
  industry: 'Wealth Management',
  description: 'Audited fiduciary advisory',
  tone_guidelines: 'Prudent, analytical, transparent',
  disclaimers: '',
  rules: [],
  counts: { guidelines: 0, terminology: 0, verified_facts: 0, permitted_claims: 0, total: 0 },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const finDet = runDeterministicChecks(financeCopy, financeBrand, financeBrand.id);
const finCtx = runOfflineContextualFallback(financeCopy, financeBrand, []);

console.log(`   Deterministic findings: ${finDet.findings.length}`);
finDet.findings.forEach((f) => console.log(`   - [${f.severity}] "${f.flagged_text}" -> "${f.suggested_replacement}" (${f.rationale})`));
console.log(`   Contextual findings: ${finCtx.findings.length}`);
finCtx.findings.forEach((f) => console.log(`   - [${f.severity}] "${f.flagged_text}" -> "${f.suggested_correction}" (${f.explanation})`));

const foundCompanyHave = finDet.findings.some((f) => f.flagged_text.toLowerCase().includes('company have'));
const foundPositiveAffect = finDet.findings.some((f) => f.flagged_text.toLowerCase().includes('positive affect'));
const foundWeAdvice = finDet.findings.some((f) => f.flagged_text.toLowerCase().includes('advice you'));
const foundGuaranteedProfit = finCtx.findings.some((f) => f.flagged_text.toLowerCase().includes('guaranteed profit'));
const foundZeroRisk = finCtx.findings.some((f) => f.flagged_text.toLowerCase().includes('zero risk'));

if (!foundCompanyHave || !foundPositiveAffect || !foundWeAdvice || !foundGuaranteedProfit || !foundZeroRisk) {
  console.error('❌ Test 2 Failed: Expected finance flaws were not all caught!');
  process.exit(1);
}
console.log('✔ Test 2 Passed: Finance / FinTech flaws accurately flagged.\n');

// -------------------------------------------------------------------
// TEST 3: Dynamic Brand Rules Enforcement (Any Custom Brand)
// -------------------------------------------------------------------
console.log('Test 3: Dynamic Brand Rules (Custom Brand with Terminology & Permitted Claims)...');
const customBrand = {
  id: 'custom-retail-brand',
  name: 'Aura Living',
  industry: 'Home & Lifestyle',
  description: 'Sustainable furniture & home goods',
  tone_guidelines: 'Calm, thoughtful, honest',
  disclaimers: 'Shipping delivery dates subject to local carrier schedules.',
  rules: [
    {
      id: 'rule-1',
      brand_id: 'custom-retail-brand',
      category: 'terminology',
      rule_key: 'AURA_NO_CHEAP',
      title: 'Do not use "cheap" or "discount"',
      content: 'Never refer to our sustainable goods as cheap or discount. Use accessible or cost-effective.',
      forbidden_terms: ['cheap', 'discount'],
      replacement_terms: 'cost-effective',
      rationale: 'Protects brand prestige and craftsmanship value.',
      severity: 'violation',
      created_at: new Date().toISOString(),
    },
    {
      id: 'rule-2',
      brand_id: 'custom-retail-brand',
      category: 'permitted_claim',
      rule_key: 'AURA_CLAIM_LIFETIME_WARRANTY',
      title: 'Lifetime Craftsmanship Warranty',
      content: 'May only claim lifetime warranty if disclosing standard normal wear and tear exclusions.',
      forbidden_terms: ['lifetime warranty', 'lifetime guarantee'],
      replacement_terms: 'excludes normal wear and tear',
      rationale: 'Consumer protection compliance.',
      severity: 'warning',
      created_at: new Date().toISOString(),
    },
  ],
  counts: { guidelines: 0, terminology: 1, verified_facts: 0, permitted_claims: 1, total: 2 },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const customCopy = 'Our cheap furniture comes with a lifetime warranty for all customers.';
const customDet = runDeterministicChecks(customCopy, customBrand, customBrand.id);

console.log(`   Brand Rules evaluated: ${customDet.total_rules_evaluated}`);
console.log(`   Deterministic findings count: ${customDet.findings.length}`);
customDet.findings.forEach((f) => console.log(`   - [${f.severity}] "${f.flagged_text}" -> "${f.suggested_replacement}" (${f.rationale})`));

const caughtCheap = customDet.findings.some((f) => f.flagged_text.toLowerCase() === 'cheap' && f.rule_key === 'AURA_NO_CHEAP');
const caughtWarranty = customDet.findings.some((f) => f.flagged_text.toLowerCase().includes('lifetime warranty') && f.category === 'permitted_claim');

if (!caughtCheap || !caughtWarranty) {
  console.error('❌ Test 3 Failed: Dynamic brand rules were not enforced!');
  process.exit(1);
}
console.log('✔ Test 3 Passed: Custom brand terminology & permitted claims dynamically caught.\n');

// -------------------------------------------------------------------
// TEST 4: Re-checking Clean Content Returns High/Perfect Score
// -------------------------------------------------------------------
console.log('Test 4: Re-checking fixed compliant copy...');
const cleanCopy = 'Our cost-effective furniture comes with a lifetime warranty (excludes normal wear and tear) for all customers.';
const cleanDet = runDeterministicChecks(cleanCopy, customBrand, customBrand.id);

console.log(`   Clean copy findings: ${cleanDet.findings.length}`);
console.log(`   Cleanliness score: ${cleanDet.summary.cleanliness_score}/100`);
console.log(`   Passed: ${cleanDet.summary.passed}`);

if (cleanDet.findings.length > 0 || cleanDet.summary.cleanliness_score !== 100) {
  console.error('❌ Test 4 Failed: Fixed copy did not pass cleanly!');
  process.exit(1);
}
console.log('✔ Test 4 Passed: Clean copy scored 100% with 0 findings.\n');

console.log('======================================================');
console.log('🎉 ALL 4/4 UNIVERSAL AI VERIFIER TESTS PASSED (100%)');
console.log('======================================================');
