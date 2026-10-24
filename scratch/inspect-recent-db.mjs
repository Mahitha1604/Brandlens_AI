import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('.data/brandlens.db');

console.log('=== RECENT DRAFTS ===');
const drafts = db.prepare('SELECT id, title, content, updated_at FROM drafts ORDER BY updated_at DESC LIMIT 5').all();
for (const d of drafts) {
  console.log(`\n--- Draft ID: ${d.id} | Title: "${d.title}" | Updated: ${d.updated_at} ---`);
  console.log(`Content:\n${d.content}\n`);
}

console.log('=== RECENT REVIEWS ===');
const reviews = db.prepare('SELECT id, draft_id, review_data, created_at FROM draft_reviews ORDER BY created_at DESC LIMIT 5').all();
for (const r of reviews) {
  console.log(`\n--- Review ID: ${r.id} | Draft ID: ${r.draft_id} | Created: ${r.created_at} ---`);
  try {
    const data = JSON.parse(r.review_data);
    console.log('Reviewed text:\n', data.reviewed_text);
    console.log('Deterministic findings count:', data.deterministic?.findings?.length);
    for (const f of data.deterministic?.findings || []) {
      console.log(`   - [${f.rule_key}] Flagged: "${f.flagged_text}" -> Suggested: "${f.suggested_replacement}"`);
    }
    console.log('Contextual findings count:', data.contextual?.findings?.length);
    for (const f of data.contextual?.findings || []) {
      console.log(`   - [${f.category}] Flagged: "${f.flagged_text}" -> Suggested: "${f.suggested_correction}"`);
    }
  } catch (e) {
    console.log('Error parsing review_data:', e);
  }
}
