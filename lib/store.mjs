import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DEFAULT_CATEGORIES, todayJakarta } from './domain.mjs';

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function checkPassword(password, hash) {
  const [salt, expected] = hash.split(':');
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(expected, 'hex'), actual);
}
export function openStore(directory, seed = true) {
  mkdirSync(directory, { recursive: true });
  mkdirSync(resolve(directory, 'uploads'), { recursive: true });
  const db = new DatabaseSync(resolve(directory, 'info-lomba.sqlite'));
  db.exec('PRAGMA busy_timeout=5000;');
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE);
    CREATE TABLE IF NOT EXISTS competitions(id TEXT PRIMARY KEY, categoryId INTEGER NOT NULL REFERENCES categories(id), payload TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admins(username TEXT PRIMARY KEY, passwordHash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(tokenHash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES admins(username), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  db.exec('BEGIN IMMEDIATE;');
  if (!db.prepare('SELECT 1 FROM settings WHERE key=?').get('initialized')) {
    DEFAULT_CATEGORIES.forEach(name => db.prepare('INSERT OR IGNORE INTO categories(name) VALUES (?)').run(name));
    if (seed) seedCompetitions(db);
    db.prepare('INSERT INTO settings VALUES (?,?)').run('initialized', '1');
  }
  db.exec('COMMIT;');
  return db;
}
export function readCompetitions(db) {
  return db.prepare('SELECT * FROM competitions ORDER BY createdAt DESC').all().map(row => ({ ...JSON.parse(row.payload), id: row.id, categoryId: row.categoryId, createdAt: row.createdAt, updatedAt: row.updatedAt }));
}
function seedCompetitions(db) {
  const date = offset => { const d = new Date(`${todayJakarta()}T12:00:00+07:00`); d.setDate(d.getDate() + offset); return todayJakarta(d); };
  const rows = [
    ['data', 'Data Science Challenge 2026', 'Komunitas Data Kampus', 1, 0, 4, 'Online', 'Tim · 2–3 mahasiswa', 'Mengubah data menjadi solusi. Eksplorasi dataset, bangun model prediktif, dan ceritakan insight terbaik bersama timmu.'],
    ['business', 'The Next Business Case', 'Forum Bisnis Mahasiswa', 2, 150000, 9, 'Hybrid', 'Tim · 3 mahasiswa', 'Tantang cara berpikirmu melalui studi kasus bisnis. Rancang strategi yang kreatif, terukur, dan menjawab kebutuhan nyata.'],
    ['essay', 'Suara Muda Essay Competition', 'Ruang Gagasan Mahasiswa', 3, 0, 14, 'Online', 'Individu', 'Tuangkan ide untuk masa depan yang lebih berkelanjutan. Sebuah ruang untuk argumen tajam dan gagasan orisinal mahasiswa.'],
    ['poster', 'Design for a Better Tomorrow', 'Kolektif Visual Kampus', 4, 25000, 21, 'Online', 'Individu', 'Sampaikan perubahan lewat bahasa visual. Ciptakan poster yang mengajak kita melihat masa depan dari perspektif baru.'],
    ['analytics', 'Campus Analytics Cup', 'Laboratorium Data Mahasiswa', 1, 75000, 32, 'Online', 'Tim · 2–3 mahasiswa', 'Asah kemampuan analisis dan visualisasi data dalam tantangan kolaboratif antar mahasiswa.'],
    ['innovation', 'Ideas into Impact', 'Forum Inovasi Kampus', 2, 0, -5, 'Offline', 'Tim · 3–4 mahasiswa', 'Arsip kompetisi gagasan bisnis mahasiswa: dari masalah sehari-hari menuju solusi yang dapat diterapkan.']
  ];
  rows.forEach(([slug, title, organizer, categoryId, fee, end, format, team, description], i) => {
    const payload = { title, organizer, registrationUrl: 'https://example.com', startDate: date(i === 4 ? 7 : -25), endDate: date(end), fee, poster: `/posters/${slug}.svg`, description, eligibility: 'Mahasiswa aktif D3, D4, atau S1. Informasi ini merupakan data contoh untuk pratinjau website.', team, format, location: format === 'Online' ? '' : 'Jakarta', prize: 'Informasi hadiah tersedia di panduan lomba.', feeNote: fee ? 'Per tim / peserta sesuai ketentuan penyelenggara' : '', sourceUrl: '', publication: 'published', isDemo: true };
    const now = new Date(Date.now() - i * 1000).toISOString();
    db.prepare('INSERT INTO competitions VALUES (?,?,?,?,?)').run(`demo-${slug}`, categoryId, JSON.stringify(payload), now, now);
  });
}
