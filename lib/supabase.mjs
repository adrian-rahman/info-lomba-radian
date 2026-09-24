import { createClient } from '@supabase/supabase-js';
import { DEFAULT_CATEGORIES, todayJakarta } from './domain.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ppkhwilnezrbkqxxpugt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_lIpIjR2R_6Fwig8894uFrQ_hLEBnjj-';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    })
  : null;

export async function initSupabaseData(seed = true) {
  if (!supabase) return;
  // Pastikan kategori default ada
  const { data: cats } = await supabase.from('categories').select('id, name');
  if (!cats || cats.length === 0) {
    for (const name of DEFAULT_CATEGORIES) {
      await supabase.from('categories').insert({ name });
    }
  }

  // Jika tabel competitions masih kosong dan seed=true, tambahkan demo data
  if (seed) {
    const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true });
    if (count === 0) {
      const { data: existingCats } = await supabase.from('categories').select('id, name').order('id');
      const catMap = (existingCats || []).reduce((acc, c) => ({ ...acc, [c.name]: c.id }), {});
      const date = offset => {
        const d = new Date(`${todayJakarta()}T12:00:00+07:00`);
        d.setDate(d.getDate() + offset);
        return todayJakarta(d);
      };
      const demos = [
        ['data', 'Data Science Challenge 2026', 'Komunitas Data Kampus', catMap['Data Science Competition'] || 1, 0, 4, 'Online', 'Tim · 2–3 mahasiswa', 'Mengubah data menjadi solusi. Eksplorasi dataset, bangun model prediktif, dan ceritakan insight terbaik bersama timmu.'],
        ['business', 'The Next Business Case', 'Forum Bisnis Mahasiswa', catMap['Business Case Competition'] || 2, 150000, 9, 'Hybrid', 'Tim · 3 mahasiswa', 'Tantang cara berpikirmu melalui studi kasus bisnis. Rancang strategi yang kreatif, terukur, dan menjawab kebutuhan nyata.'],
        ['essay', 'Suara Muda Essay Competition', 'Ruang Gagasan Mahasiswa', catMap['Essay Competition'] || 3, 0, 14, 'Online', 'Individu', 'Tuangkan ide untuk masa depan yang lebih berkelanjutan. Sebuah ruang untuk argumen tajam dan gagasan orisinal mahasiswa.'],
        ['poster', 'Design for a Better Tomorrow', 'Kolektif Visual Kampus', catMap['Poster Competition'] || 4, 25000, 21, 'Online', 'Individu', 'Sampaikan perubahan lewat bahasa visual. Ciptakan poster yang mengajak kita melihat masa depan dari perspektif baru.'],
        ['analytics', 'Campus Analytics Cup', 'Laboratorium Data Mahasiswa', catMap['Data Science Competition'] || 1, 75000, 32, 'Online', 'Tim · 2–3 mahasiswa', 'Asah kemampuan analisis dan visualisasi data dalam tantangan kolaboratif antar mahasiswa.'],
        ['innovation', 'Ideas into Impact', 'Forum Inovasi Kampus', catMap['Business Case Competition'] || 2, 0, -5, 'Offline', 'Tim · 3–4 mahasiswa', 'Arsip kompetisi gagasan bisnis mahasiswa: dari masalah sehari-hari menuju solusi yang dapat diterapkan.']
      ];
      for (let i = 0; i < demos.length; i++) {
        const [slug, title, organizer, categoryId, fee, end, format, team, description] = demos[i];
        const payload = {
          title,
          organizer,
          registrationUrl: 'https://example.com',
          startDate: date(i === 4 ? 7 : -25),
          endDate: date(end),
          fee,
          poster: `/posters/${slug}.svg`,
          description,
          eligibility: 'Mahasiswa aktif D3, D4, atau S1. Informasi ini merupakan data contoh untuk pratinjau website.',
          team,
          format,
          location: format === 'Online' ? '' : 'Jakarta',
          prize: 'Informasi hadiah tersedia di panduan lomba.',
          feeNote: fee ? 'Per tim / peserta sesuai ketentuan penyelenggara' : '',
          sourceUrl: '',
          publication: 'published',
          isDemo: true
        };
        const now = new Date(Date.now() - i * 1000).toISOString();
        await supabase.from('competitions').insert({
          id: `demo-${slug}`,
          category_id: categoryId,
          payload,
          created_at: now,
          updated_at: now
        });
      }
    }
  }
}

export async function getSupabaseCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('id');
  if (error) throw error;
  return data || [];
}

export async function addSupabaseCategory(name) {
  const { data, error } = await supabase.from('categories').insert({ name }).select().single();
  if (error) {
    if (error.code === '23505') {
      const err = new Error('Kategori ini sudah tersedia.');
      err.status = 409;
      throw err;
    }
    throw error;
  }
  return data;
}

export async function deleteSupabaseCategory(id) {
  const { data: used } = await supabase.from('competitions').select('id').eq('category_id', id).limit(1);
  if (used && used.length > 0) {
    const err = new Error('Kategori masih digunakan oleh lomba. Pindahkan lombanya terlebih dahulu.');
    err.status = 409;
    throw err;
  }
  const { data, error } = await supabase.from('categories').delete().eq('id', id).select();
  if (error) throw error;
  return Boolean(data && data.length > 0);
}

export async function getSupabaseCompetitions(admin = false) {
  const { data, error } = await supabase.from('competitions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const list = (data || []).map(r => ({
    ...r.payload,
    id: r.id,
    categoryId: Number(r.category_id),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
  return admin ? list : list.filter(c => c.publication === 'published');
}

export async function getSupabaseCompetitionById(id) {
  const { data, error } = await supabase.from('competitions').select('*').eq('id', id).single();
  if (error || !data) return null;
  return {
    ...data.payload,
    id: data.id,
    categoryId: Number(data.category_id),
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function saveSupabaseCompetition(item) {
  const { id, categoryId, createdAt, updatedAt, ...rest } = item;
  const payload = { ...rest, categoryId };
  const { error } = await supabase.from('competitions').upsert({
    id,
    category_id: categoryId,
    payload,
    created_at: createdAt,
    updated_at: updatedAt
  });
  if (error) throw error;
  return { ...payload, id, categoryId, createdAt, updatedAt };
}

export async function deleteSupabaseCompetition(id) {
  const { data, error } = await supabase.from('competitions').delete().eq('id', id).select();
  if (error) throw error;
  return Boolean(data && data.length > 0);
}

export async function getSupabaseAdmin(username) {
  const { data, error } = await supabase.from('admins').select('*').eq('username', username).single();
  if (error || !data) return null;
  return {
    username: data.username,
    passwordHash: data.password_hash
  };
}

export async function hasSupabaseAdmins() {
  const { data } = await supabase.from('admins').select('username').limit(1);
  return Boolean(data && data.length > 0);
}

export async function getSupabaseSession(tokenHash, now = Date.now()) {
  const { data, error } = await supabase.from('sessions').select('*').eq('token_hash', tokenHash).gt('expires', now).single();
  if (error || !data) return null;
  return {
    username: data.username,
    tokenHash: data.token_hash
  };
}

export async function saveSupabaseSession(tokenHash, username, expires) {
  await supabase.from('sessions').delete().lt('expires', Date.now());
  const { error } = await supabase.from('sessions').insert({
    token_hash: tokenHash,
    username,
    expires
  });
  if (error) throw error;
}

export async function deleteSupabaseSession(tokenHash) {
  await supabase.from('sessions').delete().eq('token_hash', tokenHash);
}

export async function uploadSupabasePoster(filename, bytes, mimeType) {
  const { error } = await supabase.storage.from('posters').upload(filename, bytes, {
    contentType: mimeType,
    upsert: true
  });
  if (error) {
    const err = new Error(`Gagal upload poster ke Supabase Storage: ${error.message}`);
    err.status = 500;
    throw err;
  }
  const { data } = supabase.storage.from('posters').getPublicUrl(filename);
  return data.publicUrl;
}
