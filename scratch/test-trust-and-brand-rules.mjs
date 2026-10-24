import { runComprehensiveVerification } from '../src/lib/engine/verifier.ts';
import { runDeterministicChecks } from '../src/lib/engine/deterministic.ts';

console.log('=== TEST 1: User Text with Grammar + Trust + Tone Analysis ===');
const userText = `Eating healthy are very important for your body and mind because without proper nutrition you will feel tired all the time, many people thinks that skipping breakfast help them lose weight fastly but it actually lowers your metabolism and makes you overeat later in the day. If a person wants to improve their health they should drink more water, exercising daily, and avoids sugary drinks which causes inflammation and weight gain. Doctors always says to get eight hours of sleep every night but who has time for that?`;

const result = runComprehensiveVerification(userText, { name: 'BrandLens' });
console.log('Deterministic findings:', result.deterministicFindings.length);
console.log('Contextual findings:', result.contextualFindings.length);
const all = [...result.deterministicFindings, ...result.contextualFindings];

for (const f of all) {
  const slice = userText.slice(f.start_index, f.end_index);
  console.log(`- [${f.category.toUpperCase()}] "${f.flagged_text}" -> "${f.suggested_replacement || f.suggested_correction}"`);
  console.log(`    Rationale: ${f.rationale || f.explanation}`);
}

console.log('\n=== TEST 2: Brand Rules & Trustworthiness on ApexPay Brand ===');
const apexDraft = `Welcome to apex pay. Our completely bulletproof payment system offers 100% uptime guaranteed. Act now before it is too late to lock in zero-risk treasury with zero maintenance fees!`;

const apexResult = runComprehensiveVerification(apexDraft, {
  name: 'ApexPay',
  rules: [
    {
      id: 'rule-apex-casing',
      brand_id: 'brand-1',
      rule_key: 'APEX_TRADEMARK_CASING',
      category: 'terminology',
      severity: 'violation',
      title: 'ApexPay Casing',
      content: 'Brand name must always be capitalized as "ApexPay", never "apex pay" or "Apexpay".',
      forbidden_terms: ['apex pay', 'Apexpay'],
      replacement_terms: 'ApexPay',
      rationale: 'Trademark casing consistency.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'rule-bulletproof',
      brand_id: 'brand-1',
      rule_key: 'APEX_TERM_BULLETPROOF',
      category: 'terminology',
      severity: 'violation',
      title: 'Prohibited Superlative: Bulletproof',
      content: 'Do not use "bulletproof". Use "resilient" or "defense-in-depth".',
      forbidden_terms: ['bulletproof'],
      replacement_terms: 'resilient',
      rationale: 'Absolute claims violate compliance.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
});

console.log('ApexPay deterministic findings:', apexResult.deterministicFindings.length);
for (const f of apexResult.deterministicFindings) {
  console.log(`- [${f.category.toUpperCase()}] "${f.flagged_text}" -> "${f.suggested_replacement}" (${f.rule_key})`);
}
