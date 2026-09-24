const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const paths = {
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>', external:'<path d="M14 4h6v6m0-6-10 10M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon:'<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3"/>',
  trophy:'<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v5m-5 3h10m-9 0v-3h8v3"/>',
  school:'<path d="m2 9 10-5 10 5-10 5-10-5Zm4 3v5c3 3 9 3 12 0v-5m4-3v8"/>',
  building:'<path d="M4 21V5l8-3v19m0-13h8v13M2 21h20M7 7v1m0 3v1m0 3v1m9-4h1m-1 4h1"/>',
  archive:'<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v12h14V8m-10 5h6"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  money:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 12h.1M19 12h.1"/>',
  users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m2-17a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v3"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14l-1 7Zm9-16 5 5"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  link:'<path d="m10 14 4-4m-6 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 -1)"/>',
  logout:'<path d="M9 4H4v16h5m5-12 4 4-4 4M8 12h13"/>', check:'<path d="m5 12 4 4L19 6"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
const fmtDate = value => new Intl.DateTimeFormat('id-ID', { day:'numeric', month:'short', year:'numeric' }).format(new Date(`${value}T12:00:00`));
const rupiah = value => value === 0 ? 'Gratis' : new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(value);
const getToday = () => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Jakarta', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
const state = { categories:[], items:[], adminItems:[], today:getToday(), username:null, needsSetup:false, page:'jelajahi', filters:{ search:'', category:'all', status:'open', fee:'all', sort:'deadline' }, adminSearch:'', adminPublication:'all', returnPage:'jelajahi', editorId:null, editorPoster:'', uploading:false };
function status(item) { return state.today < item.startDate ? 'upcoming' : state.today > item.endDate ? 'closed' : 'open'; }
const statusText = { open:'Dibuka', upcoming:'Segera dibuka', closed:'Ditutup' };
const categoryName = id => state.categories.find(c => c.id === id)?.name || 'Lainnya';
const shortCategory = name => name.replace(/ Competition$/, '');
const badge = item => `<span class="status-label ${status(item)}">${statusText[status(item)]}</span>`;
function deadline(item) {
  const days = Math.round((Date.parse(item.endDate) - Date.parse(state.today)) / 86400000);
  if (status(item) === 'upcoming') return `Buka ${fmtDate(item.startDate)}`;
  if (days === 0) return 'Tutup hari ini';
  if (days > 0 && days <= 7) return `Tutup ${days} hari lagi`;
  return fmtDate(item.endDate);
}
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers:{ 'Content-Type':'application/json', 'X-Requested-With':'info-lomba', ...options.headers } });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Permintaan gagal.'); error.status = response.status; throw error; }
  return data;
}
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200); }
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  $('#theme-toggle').setAttribute('aria-label', `Ganti ke mode ${theme === 'dark' ? 'terang' : 'gelap'}`);
  try { localStorage.setItem('info-lomba-theme', theme); } catch {}
}
try { setTheme(localStorage.getItem('info-lomba-theme') || 'dark'); } catch { setTheme('dark'); }
$('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
$('#admin-icon').innerHTML = icon('lock');
$('.skip-link').addEventListener('click', e => { e.preventDefault(); $('#main').focus(); $('#main').scrollIntoView(); });
function closeButton(id) { return `<button type="button" class="icon-button" data-action="close" data-dialog="${id}" aria-label="Tutup">${icon('close')}</button>`; }
function openDialog(id) { const dialog = $(`#${id}`); if (!dialog.open) dialog.showModal(); return dialog; }
async function loadData() {
  const [cats, data] = await Promise.all([api('/categories'), api('/competitions')]);
  state.categories = cats; state.items = data.competitions; state.today = data.today;
  if (state.username) { try { state.adminItems = (await api('/competitions?admin=1')).competitions; } catch (error) { if (error.status === 401) state.username = null; else throw error; } }
}
function navActive(page) { $$('[data-nav]').forEach(a => { const active = a.dataset.nav === page; a.classList.toggle('active', active); if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); }); }
function renderCatalog() {
  const archive = state.page === 'arsip'; navActive(state.page);
  document.title = archive ? 'Arsip Lomba — Info Lomba (by Radian)' : 'Info Lomba (by Radian) — Ruang untuk berprestasi';
  const openCount = state.items.filter(item => status(item) === 'open').length;
  $('#main').innerHTML = `<section class="hero"><div class="container hero-inner"><div>
    <div class="eyebrow"><span class="dot"></span>${archive ? 'Jejak ide. Bekal untuk esok.' : 'Ruang untuk mahasiswa berprestasi'}</div>
    <h1>${archive ? 'Setiap kompetisi,<br>sebuah <em>inspirasi.</em>' : 'Temukan peluang,<br>raih <em>prestasi.</em>'}</h1>
    <p class="hero-description">${archive ? 'Telusuri kompetisi yang telah berlalu. Temukan referensi dan persiapkan langkahmu untuk kesempatan berikutnya.' : 'Dari ide pertama sampai podium juara. Temukan lomba yang tepat untuk mengembangkan potensi dan mewujudkan ambisimu.'}</p>
    <div class="hero-bottom"><span>${icon(archive ? 'archive' : 'trophy')}<strong>${archive ? state.items.filter(c => status(c) === 'closed').length : openCount}</strong> lomba ${archive ? 'diarsipkan' : 'sedang dibuka'}</span><span class="mini-separator"></span><span>${icon('school')}Khusus mahasiswa</span></div>
    </div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><img class="hero-logo" src="/assets/radian-logo.png" alt="" width="150" height="150"><div class="float-note note-top">${icon('trophy')}<div><strong>Langkah kecil, mimpi besar.</strong><small>Kesempatanmu dimulai di sini</small></div></div><div class="float-note note-bottom">${icon('school')}<div><strong>Learn. Compete. Grow.</strong><small>Jadi versi terbaik dirimu</small></div></div><span class="art-caption">Your next chapter starts here</span></div></div></section>
    <section class="catalog container" aria-labelledby="catalog-title"><div class="catalog-heading"><div><h2 id="catalog-title">${archive ? 'Arsip kompetisi' : 'Jelajahi kompetisi'}<span class="brand-dot">.</span></h2><p>${archive ? 'Kesempatan boleh berlalu, inspirasinya tetap di sini.' : 'Pilih tantanganmu. Mulai perjalananmu.'}</p></div><span class="quiet-label">${icon('grid')} Satu tempat, banyak peluang</span></div>
    <div class="search-row"><div class="search-box">${icon('search')}<input id="search" type="search" placeholder="Cari judul lomba yang kamu inginkan…" aria-label="Cari judul lomba" value="${escape(state.filters.search)}"></div><select id="sort" class="sort-select" aria-label="Urutkan lomba"><option value="deadline">Deadline terdekat</option><option value="newest">Terbaru ditambahkan</option><option value="title">Judul A–Z</option></select></div>
    <div class="filter-row"><div class="category-chips" aria-label="Filter kategori"><button class="chip ${state.filters.category === 'all' ? 'active' : ''}" data-action="category" data-id="all" aria-pressed="${state.filters.category === 'all'}">Semua kategori</button>${state.categories.map(c => `<button class="chip ${String(c.id) === state.filters.category ? 'active' : ''}" data-action="category" data-id="${c.id}" aria-pressed="${String(c.id) === state.filters.category}">${escape(shortCategory(c.name))}</button>`).join('')}</div><div class="secondary-filters">${archive ? '' : '<select id="status-filter" aria-label="Status pendaftaran"><option value="open">Sedang dibuka</option><option value="upcoming">Segera dibuka</option><option value="closed">Sudah ditutup</option><option value="all">Semua status</option></select>'}<select id="fee-filter" aria-label="Biaya pendaftaran"><option value="all">Semua biaya</option><option value="free">Gratis</option><option value="paid">Berbayar</option></select></div></div>
    <div class="results-line"><span id="result-count" role="status" aria-live="polite"></span><span class="demo-note">${state.items.some(c => c.isDemo) ? `${icon('info')}Label “Contoh” adalah data demonstrasi` : 'Tanggal menggunakan WIB'}</span></div><div class="cards" id="cards"></div><div class="catalog-end" id="catalog-end">Kesempatan berikutnya menantimu</div>
    <div class="archive-cta"><div><h3>${archive ? 'Siap untuk tantangan berikutnya?' : 'Cari inspirasi dari kompetisi sebelumnya?'}</h3><p>${archive ? 'Temukan kompetisi yang pendaftarannya masih terbuka.' : 'Telusuri arsip lomba untuk mempersiapkan langkah berikutnya.'}</p></div><a class="btn btn-small" href="#${archive ? 'jelajahi' : 'arsip'}">${icon(archive ? 'trophy' : 'archive')}${archive ? 'Jelajahi Lomba' : 'Lihat Arsip'}${icon('arrow')}</a></div></section>`;
  if (archive) $('#sort option[value="deadline"]').textContent = 'Terakhir ditutup';
  $('#sort').value = state.filters.sort; $('#fee-filter').value = state.filters.fee;
  if ($('#status-filter')) $('#status-filter').value = state.filters.status;
  $('#search').addEventListener('input', e => { state.filters.search = e.target.value; renderCards(); });
  $('#sort').addEventListener('change', e => { state.filters.sort = e.target.value; renderCards(); });
  $('#fee-filter').addEventListener('change', e => { state.filters.fee = e.target.value; renderCards(); });
  $('#status-filter')?.addEventListener('change', e => { state.filters.status = e.target.value; renderCards(); });
  renderCards();
}
function renderCards() {
  const f = state.filters; const wanted = state.page === 'arsip' ? 'closed' : f.status;
  const available = state.items.filter(c => wanted === 'all' || status(c) === wanted);
  let items = available.filter(c => c.title.toLocaleLowerCase('id-ID').includes(f.search.trim().toLocaleLowerCase('id-ID')) && (f.category === 'all' || c.categoryId === Number(f.category)) && (f.fee === 'all' || (f.fee === 'free' ? c.fee === 0 : c.fee > 0)));
  items.sort((a,b) => f.sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : f.sort === 'title' ? a.title.localeCompare(b.title, 'id') : state.page === 'arsip' ? b.endDate.localeCompare(a.endDate) : a.endDate.localeCompare(b.endDate));
  $('#result-count').innerHTML = `Menampilkan <strong>${items.length}</strong> dari ${available.length} lomba`;
  $('#cards').innerHTML = items.length ? items.map(c => `<article class="competition-card"><a class="card-poster" href="#lomba/${c.id}" aria-label="Lihat detail ${escape(c.title)}"><img src="${escape(c.poster)}" alt="Poster ${escape(c.title)}" loading="lazy" width="640" height="480">${c.isDemo ? '<span class="demo-ribbon">Contoh</span>' : ''}</a><div class="card-body"><div class="card-kicker"><span class="category-label">${escape(categoryName(c.categoryId))}</span>${badge(c)}</div><h3><a href="#lomba/${c.id}">${escape(c.title)}</a></h3><p class="organizer">${icon('building')}${escape(c.organizer)}</p><div class="card-meta"><span class="${status(c) === 'open' && (Date.parse(c.endDate) - Date.parse(state.today)) / 86400000 <= 7 ? 'deadline-soon' : ''}">${icon('calendar')}${deadline(c)}</span><span class="card-fee ${c.fee === 0 ? 'free' : ''}">${rupiah(c.fee)}</span></div><div class="card-footer"><span>${escape(c.format || 'Mahasiswa')}${c.format && c.team ? ` · ${escape(c.team.split('·')[0].trim())}` : ''}</span><a class="detail-link" href="#lomba/${c.id}">Lihat detail ${icon('arrow')}</a></div></div></article>`).join('') : `<div class="empty-state">${icon('search')}<h3>Belum menemukan yang cocok?</h3><p>Coba kata kunci lain atau ubah filter pencarianmu.</p><button class="btn btn-small" data-action="reset-filters">Reset filter</button></div>`;
  $('#catalog-end').hidden = !items.length;
}
function showDetail(id) {
  const item = state.items.find(c => c.id === id);
  if (!item) { toast('Lomba tidak ditemukan atau belum dipublikasikan.'); history.replaceState(null,'',`#${state.returnPage}`); return; }
  document.title = `${item.title} — Info Lomba (by Radian)`;
  const fact = (symbol, label, value, small = '') => `<div class="fact"><span class="fact-label">${icon(symbol)}${label}</span>${escape(value)}${small ? `<small>${escape(small)}</small>` : ''}</div>`;
  $('#detail-dialog').innerHTML = `<div class="dialog-header"><div><span class="eyebrow">Detail kompetisi</span></div>${closeButton('detail-dialog')}</div><div class="dialog-content detail-grid"><div><button class="detail-poster-button" data-action="poster" data-id="${item.id}" aria-label="Perbesar poster ${escape(item.title)}"><img src="${escape(item.poster)}" alt="Poster ${escape(item.title)}"></button><p class="poster-hint">Klik poster untuk memperbesar</p>${item.isDemo ? '<p class="detail-demo">Data contoh untuk pratinjau website. Lomba, penyelenggara, dan jadwal ini bukan informasi pendaftaran yang sebenarnya.</p>' : ''}</div><div class="detail-info"><div class="card-kicker"><span class="category-label">${escape(categoryName(item.categoryId))}</span>${badge(item)}</div><h2>${escape(item.title)}</h2><p class="organizer">${icon('building')}${escape(item.organizer)}</p><p class="detail-description">${escape(item.description || 'Informasi lebih lanjut dapat dilihat pada poster atau panduan resmi penyelenggara.')}</p><div class="detail-facts">${fact('calendar','Periode pendaftaran',`${fmtDate(item.startDate)} – ${fmtDate(item.endDate)}`,'Batas akhir pukul 23.59 WIB')}${fact('money','Biaya pendaftaran',rupiah(item.fee),item.feeNote)}${fact('users','Peserta',item.team || 'Mahasiswa')}${fact('pin','Pelaksanaan',item.format || 'Lihat panduan',item.location)}</div>${item.eligibility ? `<div class="detail-section"><h3>Ketentuan peserta</h3><p>${escape(item.eligibility)}</p></div>` : ''}${item.prize ? `<div class="detail-section"><h3>Hadiah & apresiasi</h3><p>${escape(item.prize)}</p></div>` : ''}<div class="detail-actions">${item.isDemo ? '<div class="notice">Pendaftaran tidak tersedia untuk data contoh.</div>' : status(item) === 'open' ? `<a class="btn btn-primary" href="${escape(item.registrationUrl)}" target="_blank" rel="noopener noreferrer">Daftar di Website Penyelenggara ${icon('external')}</a>` : `<div class="notice">${status(item) === 'closed' ? 'Pendaftaran telah ditutup. Informasi ini disimpan sebagai arsip.' : `Pendaftaran dibuka pada ${fmtDate(item.startDate)}.`}</div>`}${item.sourceUrl ? `<a class="btn" href="${escape(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Lihat sumber / panduan ${icon('external')}</a>` : ''}<button class="btn" data-action="share" data-id="${item.id}">${icon('link')}Salin link lomba</button></div></div></div>`;
  openDialog('detail-dialog');
}
function renderLogin() {
  navActive('admin'); document.title = 'Login Admin — Info Lomba (by Radian)';
  $('#main').innerHTML = `<section class="login-wrap"><div class="login-card">${icon('lock')}<h1>Selamat datang kembali<span class="brand-dot">.</span></h1><p>Masuk untuk mengelola informasi dan kesempatan baru bagi mahasiswa.</p>${state.needsSetup ? '<div class="notice">Akun admin belum dibuat. Buka terminal di folder proyek, lalu jalankan <code>npm run admin -- admin</code>. Username dan password akan muncul di terminal.</div>' : ''}<form id="login-form" class="spaced"><div class="form-field"><label for="username">Username</label><input id="username" name="username" autocomplete="username" placeholder="Masukkan username" required maxlength="40"></div><div class="form-field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Masukkan password" required></div><p class="form-error" id="login-error" role="alert"></p><button type="submit" class="btn btn-primary full-width">Masuk ke Dashboard ${icon('arrow')}</button></form><a href="#jelajahi" class="login-back">← Kembali ke katalog lomba</a></div></section>`;
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault(); const button = $('button[type=submit]',e.target); button.disabled = true; $('#login-error').textContent = '';
    try { const result = await api('/login',{ method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target))) }); state.username = result.username; state.needsSetup = false; await loadData(); renderAdmin(); toast('Berhasil masuk. Selamat bekerja!'); }
    catch (error) { $('#login-error').textContent = error.message; button.disabled = false; }
  });
}
function renderAdmin() {
  if (!state.username) return renderLogin();
  navActive('admin'); document.title = 'Dashboard Admin — Info Lomba (by Radian)';
  const published = state.adminItems.filter(c => c.publication === 'published');
  $('#main').innerHTML = `<section class="container admin-page"><div class="page-heading"><div><div class="eyebrow">Ruang pengelolaan · ${escape(state.username)}</div><h1>Kelola kesempatan<span class="brand-dot">.</span></h1><p>Informasi yang rapi, peluang yang lebih mudah ditemukan.</p></div><div class="page-actions"><button class="btn btn-small" data-action="logout">${icon('logout')}Keluar</button><button class="btn btn-primary" data-action="add">${icon('plus')}Tambah Lomba</button></div></div><div class="stats">${[['grid','Total lomba',state.adminItems.length],['trophy','Pendaftaran dibuka',published.filter(c => status(c) === 'open').length],['edit','Draft',state.adminItems.filter(c => c.publication === 'draft').length],['archive','Diarsipkan',published.filter(c => status(c) === 'closed').length]].map(([symbol,label,n]) => `<div class="stat-box">${icon(symbol)}<span>${label}</span><strong>${n}</strong></div>`).join('')}</div><div class="admin-tools"><div class="search-box">${icon('search')}<input id="admin-search" type="search" placeholder="Cari lomba di dashboard…" aria-label="Cari lomba di dashboard" value="${escape(state.adminSearch)}"></div><select id="admin-publication" aria-label="Filter publikasi"><option value="all">Semua publikasi</option><option value="published">Dipublikasikan</option><option value="draft">Draft</option></select><button class="btn" data-action="categories">${icon('grid')}Kelola Kategori</button></div><div class="table-wrap"><table><thead><tr><th>Lomba</th><th>Kategori</th><th>Deadline</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="admin-rows"></tbody></table></div><p class="hint spaced">Lomba yang melewati tanggal akhir otomatis masuk arsip. Data berlabel “Contoh” dapat dihapus setelah selesai mencoba.</p></section>`;
  $('#admin-publication').value = state.adminPublication;
  $('#admin-search').addEventListener('input',e => { state.adminSearch=e.target.value; renderAdminRows(); });
  $('#admin-publication').addEventListener('change',e => { state.adminPublication=e.target.value; renderAdminRows(); });
  renderAdminRows();
}
function renderAdminRows() {
  const rows = state.adminItems.filter(c => c.title.toLowerCase().includes(state.adminSearch.toLowerCase()) && (state.adminPublication === 'all' || c.publication === state.adminPublication));
  $('#admin-rows').innerHTML = rows.length ? rows.map(c => `<tr><td><div class="table-title"><img src="${escape(c.poster)}" alt=""><div><strong>${escape(c.title)}</strong><small>${escape(c.organizer)}${c.isDemo ? ' · Contoh' : ''}</small></div></div></td><td>${escape(shortCategory(categoryName(c.categoryId)))}</td><td>${fmtDate(c.endDate)}</td><td>${badge(c)}<br><span class="badge ${c.publication}">${c.publication === 'draft' ? 'Draft' : 'Dipublikasikan'}</span></td><td><div class="row-actions"><button class="icon-button" data-action="edit" data-id="${c.id}" aria-label="Edit ${escape(c.title)}">${icon('edit')}</button><button class="icon-button" data-action="delete" data-id="${c.id}" aria-label="Hapus ${escape(c.title)}">${icon('trash')}</button></div></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty-state"><h3>Belum ada lomba</h3><p>Tambahkan lomba atau ubah pencarianmu.</p></div></td></tr>';
}
function categoryOptions(selected = '') { return `<option value="">Pilih kategori lomba</option>${state.categories.map(c => `<option value="${c.id}" ${String(c.id) === String(selected) ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}<option value="__new">+ Tambahkan kategori baru</option>`; }
function showEditor(id = null) {
  const c = state.adminItems.find(x => x.id === id) || {};
  state.editorId = id; state.editorPoster = c.poster || ''; state.uploading = false;
  const field = (name,label,type='text',required=false,placeholder='') => `<div class="form-field"><label for="f-${name}">${label}${required ? ' <span>*</span>' : ''}</label><input id="f-${name}" name="${name}" type="${type}" value="${escape(c[name] ?? '')}" ${required ? 'required' : ''} ${name === 'fee' ? 'min="0" max="1000000000" step="1"' : ''} ${['title','organizer'].includes(name) ? 'maxlength="160"' : ''} placeholder="${escape(placeholder)}"></div>`;
  $('#editor-dialog').innerHTML = `<form id="competition-form"><div class="dialog-header"><div><h2>${id ? 'Edit' : 'Tambah'} lomba<span class="brand-dot">.</span></h2><p>Bagikan kesempatan baru untuk mahasiswa.</p></div>${closeButton('editor-dialog')}</div><div class="dialog-content"><div class="editor-layout"><div><h3 class="form-section-title">01 / Informasi lomba</h3>${field('title','Judul lomba','text',true,'Contoh: National Data Science Competition')}<div class="form-field"><label for="f-categoryId">Kategori <span>*</span></label><select id="f-categoryId" name="categoryId" required>${categoryOptions(c.categoryId)}</select></div>${field('organizer','Penyelenggara','text',true,'Nama organisasi atau kampus')}<div class="form-field"><label for="f-description">Deskripsi singkat</label><textarea id="f-description" name="description" maxlength="4000" placeholder="Tema, tantangan, dan gambaran singkat lomba…">${escape(c.description || '')}</textarea></div><h3 class="form-section-title">02 / Pendaftaran & biaya</h3>${field('registrationUrl','Link pendaftaran','url',true,'https://…')}<div class="form-grid">${field('startDate','Tanggal mulai','date',true)}${field('endDate','Tanggal akhir','date',true)}</div><p class="hint">Periode dihitung dalam WIB, sampai pukul 23.59 pada tanggal akhir.</p><div class="form-grid spaced">${field('fee','Biaya pendaftaran (Rp)','number',true,'0 untuk gratis')}${field('feeNote','Catatan biaya','text',false,'Per tim / per peserta')}</div></div><div class="editor-poster"><h3 class="form-section-title">03 / Poster lomba</h3><label class="upload-box"><span id="upload-preview">${c.poster ? `<img src="${escape(c.poster)}" alt="Preview poster">` : `${icon('upload')}<strong>Pilih poster lomba</strong><small>Klik atau letakkan gambar di sini</small>`}</span><input id="poster-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload poster lomba"></label><p class="hint">JPG, PNG, atau WebP. Maksimal 5 MB.<br>Poster ditampilkan utuh tanpa dipotong.</p><p id="upload-status" role="status" class="hint spaced"></p>${c.isDemo ? '<div class="notice spaced">Ini data contoh. Untuk lomba sungguhan, gunakan Tambah Lomba agar label contoh tidak ikut tersimpan.</div>' : ''}</div></div><details class="optional-section"><summary>Informasi tambahan <span class="hint">· opsional</span></summary><div class="form-grid">${field('team','Sistem peserta','text',false,'Individu / Tim 2–3 mahasiswa')}<div class="form-field"><label for="f-format">Pelaksanaan</label><select id="f-format" name="format"><option value="">Pilih pelaksanaan</option>${['Online','Offline','Hybrid'].map(x => `<option ${x === c.format ? 'selected' : ''}>${x}</option>`).join('')}</select></div>${field('location','Lokasi','text',false,'Kota / tempat pelaksanaan')}${field('prize','Hadiah','text',false,'Hadiah, sertifikat, atau apresiasi lainnya')}</div><div class="form-field"><label for="f-eligibility">Syarat peserta mahasiswa</label><textarea id="f-eligibility" name="eligibility" maxlength="4000" placeholder="Jenjang, jurusan, status mahasiswa, atau ketentuan khusus…">${escape(c.eligibility || '')}</textarea></div>${field('sourceUrl','Link sumber / buku panduan','url',false,'https://…')}</details><p id="editor-error" class="form-error" role="alert"></p></div><div class="dialog-footer"><button type="button" class="btn" data-action="close" data-dialog="editor-dialog">Batal</button><button type="submit" name="publication" value="draft" class="btn">Simpan Draft</button><button type="submit" name="publication" value="published" class="btn btn-primary">${icon('check')}${c.publication === 'published' ? 'Simpan Perubahan' : 'Publikasikan'}</button></div></form>`;
  $('#f-categoryId').addEventListener('change',e => { if (e.target.value === '__new') { e.target.value=''; showCategories(true); } });
  $('#poster-file').addEventListener('change', handleUpload);
  $('#f-startDate').addEventListener('change',e => { $('#f-endDate').min=e.target.value; });
  if (c.startDate) $('#f-endDate').min = c.startDate;
  $('#competition-form').addEventListener('submit', saveCompetition);
  openDialog('editor-dialog');
}
async function handleUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) { $('#editor-error').textContent='Pilih JPG, PNG, atau WebP berukuran maksimal 5 MB.'; e.target.value=''; return; }
  const form = $('#competition-form'); const fileInput = e.target; fileInput.disabled = true; state.uploading = true; $('#editor-error').textContent=''; $('#upload-status').textContent='Mengupload poster…'; $$('button[type=submit]',form).forEach(b => b.disabled=true);
  try {
    const image = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    await new Promise((resolve,reject) => { const test = new Image(); test.onload=resolve; test.onerror=() => reject(new Error('File gambar rusak atau tidak dapat dibaca.')); test.src=image; });
    const result = await api('/upload',{method:'POST',body:JSON.stringify({ image })});
    if ($('#competition-form') !== form) return;
    state.editorPoster=result.poster; $('#upload-preview').innerHTML=`<img src="${escape(result.poster)}" alt="Preview poster">`; $('#upload-status').textContent='Poster berhasil diupload. Pilih gambar lagi untuk menggantinya.';
  } catch(error) { if ($('#competition-form') === form) { $('#editor-error').textContent=error.message || 'Upload gagal.'; $('#upload-status').textContent=''; } }
  finally { if ($('#competition-form') === form) { fileInput.disabled=false; state.uploading=false; $$('button[type=submit]',form).forEach(b => b.disabled=false); } }
}
async function saveCompetition(e) {
  e.preventDefault(); if (state.uploading) return;
  if (!state.editorPoster) { $('#editor-error').textContent='Upload poster lomba terlebih dahulu.'; return; }
  const input={...Object.fromEntries(new FormData(e.target)),poster:state.editorPoster,publication:e.submitter?.value || 'draft'};
  if (input.endDate < input.startDate) { $('#editor-error').textContent='Tanggal akhir tidak boleh sebelum tanggal mulai.'; return; }
  const buttons=$$('button[type=submit]',e.target); buttons.forEach(b => b.disabled=true); $('#editor-error').textContent='';
  try { await api(`/competitions${state.editorId ? `/${state.editorId}` : ''}`,{method:state.editorId ? 'PUT' : 'POST',body:JSON.stringify(input)}); $('#editor-dialog').close(); await loadData(); renderAdmin(); toast(input.publication === 'draft' ? 'Draft berhasil disimpan.' : 'Lomba berhasil dipublikasikan.'); }
  catch(error) { $('#editor-error').textContent=error.message; buttons.forEach(b => b.disabled=false); }
}
function showCategories(fromEditor = false) {
  $('#category-dialog').innerHTML=`<div class="dialog-header"><div><h2>Kelola kategori</h2><p>Kelompokkan lomba agar mudah ditemukan.</p></div>${closeButton('category-dialog')}</div><div class="dialog-content"><form id="category-form" class="inline-form"><input name="name" aria-label="Nama kategori baru" placeholder="Nama kategori baru" maxlength="80" required><button class="btn btn-primary" type="submit">Tambah</button></form><p id="category-error" class="form-error" role="alert"></p><ul id="category-list" class="category-list"></ul></div>`;
  renderCategoryList();
  $('#category-form').addEventListener('submit',async e => { e.preventDefault(); const button=$('button',e.target); button.disabled=true; $('#category-error').textContent='';
    try { const result=await api('/categories',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))}); state.categories=await api('/categories');
      if ($('#editor-dialog').open) $('#f-categoryId').innerHTML=categoryOptions(result.id);
      if (fromEditor) $('#category-dialog').close(); else { renderCategoryList(); e.target.reset(); }
      toast('Kategori baru berhasil ditambahkan.');
    } catch(error) { $('#category-error').textContent=error.message; } finally { button.disabled=false; }
  });
  openDialog('category-dialog');
}
function renderCategoryList() { $('#category-list').innerHTML=state.categories.map(c => `<li><span>${escape(c.name)}</span><button class="icon-button" data-action="delete-category" data-id="${c.id}" aria-label="Hapus kategori ${escape(c.name)}">${icon('trash')}</button></li>`).join(''); }
function confirmDelete(id, isCategory = false) {
  const item=isCategory ? state.categories.find(c => c.id === Number(id)) : state.adminItems.find(c => c.id === id); if (!item) return;
  $('#confirm-dialog').innerHTML=`<div class="dialog-header"><h2>Hapus ${isCategory ? 'kategori' : 'lomba'}?</h2>${closeButton('confirm-dialog')}</div><div class="dialog-content"><p>“${escape(item.title || item.name)}” akan dihapus.</p><p class="hint spaced">${isCategory ? 'Kategori yang masih digunakan tidak dapat dihapus.' : 'Lomba tidak akan tampil lagi di katalog maupun arsip. Tindakan ini tidak dapat dibatalkan.'}</p><p id="delete-error" class="form-error" role="alert"></p></div><div class="dialog-footer"><button class="btn" data-action="close" data-dialog="confirm-dialog">Batal</button><button id="confirm-delete" class="btn btn-danger">${icon('trash')}Ya, hapus</button></div>`;
  $('#confirm-delete').addEventListener('click',async e => { e.currentTarget.disabled=true;
    try { await api(`/${isCategory ? 'categories' : 'competitions'}/${id}`,{method:'DELETE'}); await loadData(); $('#confirm-dialog').close();
      if (isCategory) { renderCategoryList(); if ($('#editor-dialog').open) $('#f-categoryId').innerHTML=categoryOptions($('#f-categoryId').value); } renderAdmin(); toast(`${isCategory ? 'Kategori' : 'Lomba'} berhasil dihapus.`);
    } catch(error) { $('#delete-error').textContent=error.message; $('#confirm-delete').disabled=false; }
  });
  openDialog('confirm-dialog');
}
document.addEventListener('click', async e => {
  const button=e.target.closest('[data-action]'); if (!button) return;
  const action=button.dataset.action;
  if (action==='close') $(`#${button.dataset.dialog}`).close();
  if (action==='category') { state.filters.category=button.dataset.id; $$('.category-chips .chip').forEach(c => { const active=c.dataset.id === state.filters.category; c.classList.toggle('active',active); c.setAttribute('aria-pressed',String(active)); }); renderCards(); }
  if (action==='reset-filters') { state.filters={search:'',category:'all',status:state.page === 'arsip' ? 'closed' : 'all',fee:'all',sort:'deadline'}; renderCatalog(); }
  if (action==='add') showEditor();
  if (action==='edit') showEditor(button.dataset.id);
  if (action==='categories') showCategories();
  if (action==='delete') confirmDelete(button.dataset.id);
  if (action==='delete-category') confirmDelete(button.dataset.id,true);
  if (action==='poster') { const item=state.items.find(c => c.id===button.dataset.id); $('#poster-dialog').innerHTML=`<div class="dialog-header">Poster lomba ${closeButton('poster-dialog')}</div><img src="${escape(item.poster)}" alt="Poster ${escape(item.title)}">`; openDialog('poster-dialog'); }
  if (action==='share') { try { await navigator.clipboard.writeText(`${location.origin}/#lomba/${button.dataset.id}`); toast('Link lomba berhasil disalin.'); } catch { toast('Salin link dari bilah alamat browser.'); } }
  if (action==='logout') { try { await api('/logout',{method:'POST'}); state.username=null; state.adminItems=[]; renderLogin(); toast('Kamu telah keluar.'); } catch(error) { toast(error.message); } }
});
$$('dialog').forEach(dialog => { dialog.addEventListener('click',e => { if (e.target === dialog) { const r=dialog.getBoundingClientRect(); if (e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) dialog.close(); } }); });
$('#detail-dialog').addEventListener('close',() => { if (location.hash.startsWith('#lomba/')) { history.replaceState(null,'',`#${state.returnPage}`); document.title=state.returnPage === 'arsip' ? 'Arsip Lomba — Info Lomba (by Radian)' : 'Info Lomba (by Radian) — Ruang untuk berprestasi'; } });
let routing=0;
async function route() {
  const routeToken=++routing; const hash=location.hash.slice(1) || (location.pathname === '/admin' ? 'admin' : 'jelajahi');
  if (hash.startsWith('lomba/')) { if (!$('#cards')) { state.page='jelajahi'; renderCatalog(); } showDetail(hash.slice(6)); return; }
  $$('dialog[open]').forEach(d => d.close());
  const next=['arsip','admin'].includes(hash) ? hash : 'jelajahi';
  if (state.page!==next && next!=='admin') { state.filters={search:'',category:'all',status:'open',fee:'all',sort:next==='arsip' ? 'newest' : 'deadline'}; }
  state.page=next;
  if (next==='admin') { if (state.username) { await loadData(); if (routeToken!==routing) return; } renderAdmin(); }
  else { state.returnPage=next; renderCatalog(); }
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',() => route().catch(error => toast(error.message)));
async function init() {
  try { const session=await api('/session'); state.username=session.username; state.needsSetup=session.needsSetup; await loadData(); await route(); }
  catch(error) { $('#main').innerHTML=`<div class="container loading-state"><h2>Website belum bisa dimuat</h2><p>${escape(error.message)}</p><p>Pastikan server berjalan, lalu muat ulang halaman.</p><button class="btn spaced" id="retry">Coba lagi</button></div>`; $('#retry').addEventListener('click',init); }
}
setInterval(() => { const today=getToday(); if (today !== state.today) { state.today=today; if ($('#cards')) renderCards(); if ($('#admin-rows')) renderAdminRows(); } },60000);
init();
