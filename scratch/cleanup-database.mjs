import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.join(process.cwd(), '.data', 'brandlens.db');
const db = new DatabaseSync(dbPath);

console.log('Auditing and cleaning temporary test clutter from SQLite database...');

// 1. Clean test drafts and their revisions
const testDrafts = db.prepare(`
  SELECT id, title FROM drafts 
  WHERE title LIKE '%Test Draft%' 
     OR title LIKE '%Stage 4 Integration%' 
     OR title LIKE '%Treasury Overhaul%' 
     OR title LIKE '%Approved Launch Campaign%'
`).all();

console.log(`Found ${testDrafts.length} temporary test drafts to remove.`);

for (const d of testDrafts) {
  db.prepare('DELETE FROM audit_logs WHERE draft_id = ?').run(d.id);
  db.prepare('DELETE FROM draft_revisions WHERE draft_id = ?').run(d.id);
  db.prepare('DELETE FROM drafts WHERE id = ?').run(d.id);
  console.log(`  - Removed test draft: ${d.id} ("${d.title}")`);
}

// 2. Clean test brands
const testBrands = db.prepare(`
  SELECT id, name FROM brands 
  WHERE id IN ('cybershield-ai', 'cybershield-ai-mvl78r4y', 'horizon-health')
`).all();

console.log(`Found ${testBrands.length} temporary test brands to remove.`);

for (const b of testBrands) {
  db.prepare('DELETE FROM audit_logs WHERE brand_id = ?').run(b.id);
  db.prepare('DELETE FROM brand_rules WHERE brand_id = ?').run(b.id);
  db.prepare('DELETE FROM brands WHERE id = ?').run(b.id);
  console.log(`  - Removed test brand: ${b.id} ("${b.name}")`);
}

// 3. Ensure intentional sample draft is clearly titled DEMO SAMPLE
db.prepare(`
  UPDATE drafts 
  SET title = '[DEMO SAMPLE] Enterprise Payments Overview (Flagged Copy)'
  WHERE id = 'draft-sample-1'
`).run();

db.prepare(`
  UPDATE draft_revisions 
  SET change_summary = 'Initial demonstration sample copy with intentional compliance issues'
  WHERE id = 'rev-sample-1'
`).run();

// 4. Ensure sample brands have is_sample = 1
db.prepare(`
  UPDATE brands SET is_sample = 1 WHERE id IN ('apexpay', 'verdant-aura')
`).run();

console.log('\nAudit and cleanup complete.');
const remainingBrands = db.prepare('SELECT id, name, is_sample FROM brands').all();
const remainingDrafts = db.prepare('SELECT id, title, status FROM drafts').all();
const remainingRevs = db.prepare('SELECT id, draft_id, version FROM draft_revisions').all();

console.log('Remaining Brands:', remainingBrands);
console.log('Remaining Drafts:', remainingDrafts);
console.log('Remaining Revisions count:', remainingRevs.length);
