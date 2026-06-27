// Reads old_database/profile_emails-export-*.csv and outputs UPDATE SQL for profiles.email
// Usage: node scripts/generate_email_migration.mjs
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const CSV = join(ROOT, 'old_database', 'profile_emails-export-2026-05-19_20-42-22.csv');
const content = readFileSync(CSV, 'utf8');
const lines = content.trim().split('\n');
// header: user_id;email;created_at;updated_at
const rows = lines.slice(1).map(l => {
  const parts = l.split(';');
  return { user_id: parts[0].trim(), email: parts[1].trim() };
}).filter(r => r.user_id && r.email);

const sql = rows.map(r =>
  `UPDATE public.profiles SET email = '${r.email.replace(/'/g, "''")}' WHERE user_id = '${r.user_id}';`
).join('\n');

process.stdout.write(sql + '\n');
process.stderr.write(`Generated ${rows.length} UPDATE statements\n`);
