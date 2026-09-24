import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { openStore, hashPassword } from '../lib/store.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const username = process.argv[2] || 'admin';
const password = process.env.ADMIN_PASSWORD || randomBytes(15).toString('base64url');
if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username) || password.length < 12) {
  console.error('Username harus 3–40 karakter (huruf, angka, titik, _ atau -). Password minimal 12 karakter.'); process.exit(1);
}
const db = openStore(process.env.DATA_DIR || resolve(root, 'data'), process.env.SEED_DEMO !== 'false');
db.prepare('INSERT INTO admins VALUES (?,?) ON CONFLICT(username) DO UPDATE SET passwordHash=excluded.passwordHash').run(username, hashPassword(password));
db.prepare('DELETE FROM sessions WHERE username=?').run(username);
db.close();
console.log(`\nAkun admin siap.\nUsername: ${username}\nPassword: ${password}\n\nSimpan password ini. Jalankan ulang perintah ini untuk mereset password.\n`);
