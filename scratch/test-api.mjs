// Test API route handlers
import { getBrands, getBrandById, createOrUpdateBrandRule, deleteBrandRule, saveDraft } from '../src/lib/db.ts';

console.log('Running Stage 1 API Logic Tests...');

// 1. Get brands
const brands = getBrands();
console.log('1. getBrands():', brands.map(b => `${b.name} (${b.counts.total} rules)`));
if (brands.length < 2) throw new Error('Expected at least 2 brands');

// 2. Get specific brand
const apex = getBrandById('apexpay');
if (!apex) throw new Error('ApexPay brand not found');
console.log('2. getBrandById(apexpay):', apex.name, 'with', apex.rules.length, 'rules');

// 3. Create a custom rule
const testRule = createOrUpdateBrandRule({
  brand_id: 'apexpay',
  category: 'terminology',
  rule_key: 'TEST_FORBIDDEN_HYPE',
  title: 'Test Prohibited Hype',
  content: 'Never use the term revolutionary',
  forbidden_terms: ['revolutionary', 'game-changing'],
  replacement_terms: 'high-throughput',
  rationale: 'Regulatory neutrality policy',
  severity: 'warning',
});
console.log('3. createOrUpdateBrandRule(): Created rule with ID:', testRule.id);

// Verify rule exists
const updatedApex = getBrandById('apexpay');
const found = updatedApex.rules.find(r => r.id === testRule.id);
if (!found) throw new Error('New rule was not found in brand rules!');
console.log('   Rule verified in database:', found.title);

// 4. Delete the custom rule
const deleted = deleteBrandRule(testRule.id);
console.log('4. deleteBrandRule():', deleted ? 'Success' : 'Failed');
if (!deleted) throw new Error('Failed to delete rule');

// 5. Test saving a draft
const draft = saveDraft({
  brand_id: 'apexpay',
  title: 'API Test Campaign',
  content: 'Testing draft saving logic in Stage 1.',
  channel: 'email',
  target_audience: 'Engineers',
  created_by: 'Marcus (Compliance)',
});
console.log('5. saveDraft(): Created draft ID:', draft.id, 'Revision:', draft.current_revision);
if (!draft.id || draft.current_revision < 1) throw new Error('Draft saving failed');

// 6. Test updating the same draft (should increment revision)
const draftV2 = saveDraft({
  id: draft.id,
  brand_id: 'apexpay',
  title: 'API Test Campaign Updated',
  content: 'Testing draft revision increment in Stage 1.',
  created_by: 'Marcus (Compliance)',
});
console.log('6. saveDraft(v2): Updated draft revision to:', draftV2.current_revision);
if (draftV2.current_revision !== 2) throw new Error('Expected draft revision to be 2');

console.log('🎉 ALL STAGE 1 API AND DATABASE TESTS PASSED WITH 100% SUCCESS!');
