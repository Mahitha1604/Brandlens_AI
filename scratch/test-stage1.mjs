import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

// Load the compiled DB module from Next.js server build or test directly against sqlite DB
const dbPath = path.join(process.cwd(), '.data', 'brandlens.db');
console.log('Testing Stage 1 SQLite Database at:', dbPath);

const db = new DatabaseSync(dbPath);
const brands = db.prepare('SELECT id, name, industry FROM brands ORDER BY name ASC').all();
console.log('✔ Brands found:', brands);

if (brands.length !== 2) {
  throw new Error(`Expected 2 pre-seeded brands, found ${brands.length}`);
}

const apexRules = db.prepare('SELECT COUNT(*) as count FROM brand_rules WHERE brand_id = ?').get('apexpay');
console.log('✔ ApexPay rules count:', apexRules.count);
if (apexRules.count < 8) {
  throw new Error(`Expected at least 8 rules for ApexPay, got ${apexRules.count}`);
}

const drafts = db.prepare('SELECT * FROM drafts').all();
console.log('✔ Drafts found in SQLite:', drafts.length);

const revisions = db.prepare('SELECT * FROM draft_revisions').all();
console.log('✔ Draft revisions logged:', revisions.length);

console.log('🎉 All Stage 1 DB and data integrity tests PASSED!');
db.close();
