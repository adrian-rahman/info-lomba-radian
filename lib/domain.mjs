export const DEFAULT_CATEGORIES = ['Data Science Competition', 'Business Case Competition', 'Essay Competition', 'Poster Competition'];
export function todayJakarta(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function registrationStatus(item, today = todayJakarta()) {
  if (today < item.startDate) return 'upcoming';
  if (today > item.endDate) return 'closed';
  return 'open';
}
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateCompetition(input, categories) {
  const errors = [];
  const text = (key, label, required = false, max = 4000) => {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if (required && !value) errors.push(`${label} wajib diisi.`);
    if (value.length > max) errors.push(`${label} maksimal ${max} karakter.`);
    return value;
  };
  const value = {
    title: text('title', 'Judul lomba', true, 160),
    organizer: text('organizer', 'Penyelenggara', true, 160),
    categoryId: Number(input.categoryId),
    registrationUrl: text('registrationUrl', 'Link pendaftaran', true, 2000),
    startDate: text('startDate', 'Tanggal mulai', true, 10),
    endDate: text('endDate', 'Tanggal akhir', true, 10),
    fee: input.fee === '' || input.fee == null ? NaN : Number(input.fee),
    poster: text('poster', 'Poster', true, 250),
    description: text('description', 'Deskripsi'),
    eligibility: text('eligibility', 'Syarat peserta'),
    team: text('team', 'Sistem peserta', false, 160),
    format: text('format', 'Pelaksanaan', false, 80),
    location: text('location', 'Lokasi', false, 200),
    prize: text('prize', 'Hadiah', false, 500),
    feeNote: text('feeNote', 'Catatan biaya', false, 200),
    sourceUrl: text('sourceUrl', 'Link panduan', false, 2000),
    publication: input.publication === 'draft' ? 'draft' : 'published'
  };
  if (!categories.some(c => c.id === value.categoryId)) errors.push('Pilih kategori yang tersedia.');
  for (const [key, label] of [['registrationUrl', 'Link pendaftaran'], ['sourceUrl', 'Link panduan']]) {
    if (value[key]) {
      try { if (!['http:', 'https:'].includes(new URL(value[key]).protocol)) throw Error(); }
      catch { errors.push(`${label} harus berupa URL http atau https yang valid.`); }
    }
  }
  if (!validDate(value.startDate) || !validDate(value.endDate)) errors.push('Tanggal pendaftaran tidak valid.');
  else if (value.endDate < value.startDate) errors.push('Tanggal akhir tidak boleh sebelum tanggal mulai.');
  if (!Number.isSafeInteger(value.fee) || value.fee < 0 || value.fee > 1000000000) errors.push('Biaya harus berupa rupiah bulat antara 0 dan 1.000.000.000.');
  if (!['Online', 'Offline', 'Hybrid', ''].includes(value.format)) errors.push('Pilihan pelaksanaan tidak valid.');
  const validPoster = /^(https?:\/\/.+|\/uploads\/[a-f0-9-]+\.(png|jpg|webp)|\/posters\/[a-z-]+\.svg)$/.test(value.poster);
  if (!validPoster) errors.push('Upload poster JPG, PNG, atau WebP.');
  return { value, errors };
}
