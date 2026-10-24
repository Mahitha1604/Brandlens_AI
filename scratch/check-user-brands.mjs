import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('.data/brandlens.db');
const rows = db.prepare(`SELECT id, name, user_id FROM brands WHERE name LIKE '%health%' OR name LIKE '%school%'`).all();
console.log('Health & School brands in DB:');
console.log(JSON.stringify(rows, null, 2));
