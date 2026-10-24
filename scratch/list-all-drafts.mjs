import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('.data/brandlens.db');
const drafts = db.prepare('SELECT id, title, content, updated_at FROM drafts ORDER BY updated_at DESC').all();

console.log(`Found ${drafts.length} drafts in total:`);
for (let i = 0; i < drafts.length; i++) {
  const d = drafts[i];
  console.log(`\n[${i + 1}] ID: ${d.id} | Title: "${d.title}" | Updated: ${d.updated_at}`);
  console.log(`Content:\n${d.content}`);
}
