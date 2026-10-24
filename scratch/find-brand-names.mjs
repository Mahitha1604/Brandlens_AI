import fs from 'fs';
import path from 'path';

function search(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f === '.next' || f === '.git' || f === '.data') continue;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) search(full);
    else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        if (/health|school/i.test(l)) {
          // exclude sample brand 'horizon-health'
          if (!l.includes('horizon-health') && !l.includes('Digital Therapeutics') && !l.includes('school of thought')) {
            console.log(`${full}:${i+1}: ${l.trim()}`);
          }
        }
      });
    }
  }
}
search('src');
