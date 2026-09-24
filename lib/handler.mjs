import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { openStore, readCompetitions, checkPassword, hashPassword } from './store.mjs';
import { validateCompetition, todayJakarta } from './domain.mjs';
import {
  isSupabaseConfigured,
  initSupabaseData,
  getSupabaseCategories,
  addSupabaseCategory,
  deleteSupabaseCategory,
  getSupabaseCompetitions,
  getSupabaseCompetitionById,
  saveSupabaseCompetition,
  deleteSupabaseCompetition,
  getSupabaseAdmin,
  hasSupabaseAdmins,
  getSupabaseSession,
  saveSupabaseSession,
  deleteSupabaseSession,
  uploadSupabasePoster
} from './supabase.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR || resolve(ROOT, 'data');

let sqliteDb = null;
function getDb() {
  if (!sqliteDb) {
    sqliteDb = openStore(DATA, process.env.SEED_DEMO !== 'false');
  }
  return sqliteDb;
}

const dummyHash = hashPassword(randomBytes(24).toString('hex'));
const attempts = new Map();
const hash = value => createHash('sha256').update(value).digest('hex');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function reply(res, status, data, headers = {}) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    return res.status(status).json(data);
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(data));
}

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'object') return req.body;
    try { return JSON.parse(req.body); } catch {}
  }
  if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Gunakan format JSON.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw fail(413, 'Ukuran upload terlalu besar. Maksimal 5 MB.');
    chunks.push(chunk);
  }
  try {
    const result = JSON.parse(Buffer.concat(chunks).toString());
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw Error();
    return result;
  } catch {
    throw fail(400, 'Data tidak valid.');
  }
}

async function getSession(req, useSupabase) {
  const token = /(?:^|;\s*)lomba_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
  if (!token) return null;
  const tokenHash = hash(token);
  if (useSupabase) {
    return await getSupabaseSession(tokenHash);
  }
  const db = getDb();
  return db.prepare('SELECT username, tokenHash FROM sessions WHERE tokenHash=? AND expires>?').get(tokenHash, Date.now());
}

async function requireAuth(req, useSupabase) {
  const s = await getSession(req, useSupabase);
  if (!s) throw fail(401, 'Silakan login sebagai admin.');
  return s;
}

function cookie(value, age) {
  return `lomba_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export async function handleRequest(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
  );

  const useSupabase = isSupabaseConfigured;

  try {
    const url = new URL(req.url, 'http://localhost');
    let route = url.pathname;

    const queryRoute = url.searchParams.get('__route') || (req.query && req.query.__route) || (req.query && req.query.route);
    if (queryRoute) {
      const q = Array.isArray(queryRoute) ? queryRoute.join('/') : queryRoute;
      route = `/api/${q.startsWith('/') ? q.slice(1) : q}`;
    } else if (route === '/api/index.js' || route === '/api/index' || route === '/api' || route.startsWith('/api/[...route]')) {
      const orig = req.headers['x-matched-path'] || req.headers['x-vercel-original-url'];
      if (orig) {
        route = new URL(orig, 'http://localhost').pathname;
      }
    }

    if (route.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(req.method)) {
        const origin = req.headers.origin;
        const currentHost = req.headers['x-forwarded-host'] || req.headers.host;
        if (req.headers['x-requested-with'] !== 'info-lomba' || (origin && new URL(origin).host !== currentHost && new URL(origin).host !== req.headers.host)) {
          throw fail(403, 'Permintaan tidak diizinkan.');
        }
      }

      if (route === '/api/session' && req.method === 'GET') {
        const currentSession = await getSession(req, useSupabase);
        const hasAdmins = useSupabase ? await hasSupabaseAdmins() : Boolean(getDb().prepare('SELECT 1 FROM admins LIMIT 1').get());
        return reply(res, 200, {
          username: currentSession?.username || null,
          needsSetup: !hasAdmins
        });
      }

      if (route === '/api/login' && req.method === 'POST') {
        const key = req.socket?.remoteAddress || req.headers['x-forwarded-for'] || 'client';
        const now = Date.now();
        for (const [ip, v] of attempts) if (now > v.until) attempts.delete(ip);
        const record = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
        if (record.count >= 8) throw fail(429, 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.');

        const input = await parseBody(req);
        const username = typeof input.username === 'string' ? input.username.trim() : '';
        const password = typeof input.password === 'string' ? input.password : '';
        if (password.length > 1000 || username.length > 40) throw fail(400, 'Data login tidak valid.');

        let admin = null;
        if (useSupabase) {
          admin = await getSupabaseAdmin(username);
        } else {
          admin = getDb().prepare('SELECT * FROM admins WHERE username=?').get(username);
          if (admin) admin = { username: admin.username, passwordHash: admin.passwordHash };
        }

        const valid = checkPassword(password, admin?.passwordHash || dummyHash);
        if (!valid || !admin) {
          record.count++;
          attempts.set(key, record);
          throw fail(401, 'Username atau password salah.');
        }
        attempts.delete(key);

        const token = randomBytes(32).toString('hex');
        const tokenHash = hash(token);
        if (useSupabase) {
          await saveSupabaseSession(tokenHash, username, now + 8 * 3600000);
        } else {
          const db = getDb();
          db.prepare('DELETE FROM sessions WHERE expires<?').run(now);
          db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(tokenHash, username, now + 8 * 3600000);
        }
        return reply(res, 200, { username }, { 'Set-Cookie': cookie(token, 8 * 3600) });
      }

      if (route === '/api/logout' && req.method === 'POST') {
        const s = await getSession(req, useSupabase);
        if (s) {
          if (useSupabase) {
            await deleteSupabaseSession(s.tokenHash);
          } else {
            getDb().prepare('DELETE FROM sessions WHERE tokenHash=?').run(s.tokenHash);
          }
        }
        return reply(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
      }

      if (route === '/api/categories' && req.method === 'GET') {
        const list = useSupabase ? await getSupabaseCategories() : getDb().prepare('SELECT * FROM categories ORDER BY id').all();
        return reply(res, 200, list);
      }

      if (route === '/api/categories' && req.method === 'POST') {
        await requireAuth(req, useSupabase);
        const input = await parseBody(req);
        const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
        if (!name || name.length > 80) throw fail(400, 'Nama kategori wajib diisi, maksimal 80 karakter.');
        const currentCats = useSupabase ? await getSupabaseCategories() : getDb().prepare('SELECT * FROM categories ORDER BY id').all();
        if (currentCats.some(c => c.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          throw fail(409, 'Kategori ini sudah tersedia.');
        }
        if (useSupabase) {
          const created = await addSupabaseCategory(name);
          return reply(res, 201, { id: Number(created.id), name: created.name });
        } else {
          const result = getDb().prepare('INSERT INTO categories(name) VALUES (?)').run(name);
          return reply(res, 201, { id: Number(result.lastInsertRowid), name });
        }
      }

      if (/^\/api\/categories\/\d+$/.test(route) && req.method === 'DELETE') {
        await requireAuth(req, useSupabase);
        const id = Number(route.split('/').at(-1));
        if (useSupabase) {
          await deleteSupabaseCategory(id);
          return reply(res, 200, { ok: true });
        } else {
          const db = getDb();
          if (db.prepare('SELECT 1 FROM competitions WHERE categoryId=?').get(id)) {
            throw fail(409, 'Kategori masih digunakan oleh lomba. Pindahkan lombanya terlebih dahulu.');
          }
          if (!db.prepare('DELETE FROM categories WHERE id=?').run(id).changes) {
            throw fail(404, 'Kategori tidak ditemukan.');
          }
          return reply(res, 200, { ok: true });
        }
      }

      if (route === '/api/competitions' && req.method === 'GET') {
        const admin = url.searchParams.get('admin') === '1';
        if (admin) await requireAuth(req, useSupabase);
        const comps = useSupabase
          ? await getSupabaseCompetitions(admin)
          : readCompetitions(getDb()).filter(c => admin || c.publication === 'published');
        return reply(res, 200, { competitions: comps, today: todayJakarta() });
      }

      if (route === '/api/upload' && req.method === 'POST') {
        await requireAuth(req, useSupabase);
        const input = await parseBody(req);
        const match = /^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(input.image || '');
        if (!match) throw fail(400, 'Format poster harus JPG, PNG, atau WebP.');
        const bytes = Buffer.from(match[2], 'base64');
        if (bytes.length > 5 * 1024 * 1024) throw fail(413, 'Ukuran poster maksimal 5 MB.');
        const type = match[1];
        const valid =
          type === 'png'
            ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
            : type === 'jpeg'
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
        if (!valid) throw fail(400, 'Isi file tidak cocok dengan format gambar.');

        const mimeType = type === 'jpeg' ? 'image/jpeg' : type === 'png' ? 'image/png' : 'image/webp';
        const filename = `${randomUUID()}.${type === 'jpeg' ? 'jpg' : type}`;

        if (useSupabase) {
          const posterUrl = await uploadSupabasePoster(filename, bytes, mimeType);
          return reply(res, 201, { poster: posterUrl });
        } else {
          await writeFile(resolve(DATA, 'uploads', filename), bytes, { flag: 'wx' });
          return reply(res, 201, { poster: `/uploads/${filename}` });
        }
      }

      if ((route === '/api/competitions' && req.method === 'POST') || (/^\/api\/competitions\/[\w-]+$/.test(route) && req.method === 'PUT')) {
        await requireAuth(req, useSupabase);
        const input = await parseBody(req);
        const currentCats = useSupabase ? await getSupabaseCategories() : getDb().prepare('SELECT * FROM categories ORDER BY id').all();
        const { value, errors } = validateCompetition(input, currentCats);
        if (errors.length) throw fail(400, errors.join(' '));

        if (!value.poster.startsWith('http://') && !value.poster.startsWith('https://')) {
          const posterPath = value.poster.startsWith('/uploads/') ? resolve(DATA, value.poster.slice(1)) : resolve(ROOT, 'public', value.poster.slice(1));
          if (!existsSync(posterPath)) throw fail(400, 'Poster tidak ditemukan. Upload kembali.');
        }

        const existingId = req.method === 'PUT' ? route.split('/').at(-1) : null;
        let existing = null;
        if (req.method === 'PUT') {
          existing = useSupabase ? await getSupabaseCompetitionById(existingId) : getDb().prepare('SELECT * FROM competitions WHERE id=?').get(existingId);
          if (!existing) throw fail(404, 'Lomba tidak ditemukan.');
        }

        value.isDemo = existing ? Boolean(useSupabase ? existing.isDemo : JSON.parse(existing.payload).isDemo) : false;
        const id = existing?.id || randomUUID();
        const now = new Date().toISOString();
        value.id = id;
        value.createdAt = existing?.createdAt || now;
        value.updatedAt = now;

        if (useSupabase) {
          const saved = await saveSupabaseCompetition(value);
          return reply(res, existing ? 200 : 201, saved);
        } else {
          getDb()
            .prepare(
              'INSERT INTO competitions VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET categoryId=excluded.categoryId,payload=excluded.payload,updatedAt=excluded.updatedAt'
            )
            .run(id, value.categoryId, JSON.stringify(value), value.createdAt, now);
          return reply(res, existing ? 200 : 201, { ...value, id });
        }
      }

      if (/^\/api\/competitions\/[\w-]+$/.test(route) && req.method === 'DELETE') {
        await requireAuth(req, useSupabase);
        const id = route.split('/').at(-1);
        const deleted = useSupabase ? await deleteSupabaseCompetition(id) : Boolean(getDb().prepare('DELETE FROM competitions WHERE id=?').run(id).changes);
        if (!deleted) throw fail(404, 'Lomba tidak ditemukan.');
        return reply(res, 200, { ok: true });
      }

      throw fail(404, 'Endpoint tidak ditemukan.');
    }

    // Static files
    if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, 'Metode tidak diizinkan.');
    const base = route.startsWith('/uploads/') ? resolve(DATA, 'uploads') : resolve(ROOT, 'public');
    const relative = route.startsWith('/uploads/') ? route.slice('/uploads/'.length) : route === '/' || route === '/admin' ? 'index.html' : decodeURIComponent(route).slice(1);
    const file = resolve(base, relative);
    if (!file.startsWith(base + sep) || !mime[extname(file)]) throw fail(404, 'Halaman tidak ditemukan.');
    try {
      const info = await stat(file);
      if (!info.isFile()) throw Error();
      res.writeHead(200, {
        'Content-Type': mime[extname(file)],
        'Content-Length': info.size,
        'Cache-Control': route.startsWith('/uploads/') ? 'public, max-age=31536000, immutable' : 'no-cache'
      });
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    } catch {
      if (!res.headersSent) throw fail(404, 'Halaman tidak ditemukan.');
      else res.end();
    }
  } catch (error) {
    if (!res.headersSent) {
      reply(res, error.status || 500, { error: error.status ? error.message : 'Terjadi kesalahan pada server.' });
    }
    if (!error.status) console.error(error);
  }
}
