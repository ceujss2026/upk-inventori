/**
 * ============================================================================
 * e-Inventori UPK — Frontend: js/app.js
 * Logik Antaramuka SPA, Menu Mega ZARE, Pengimbas QR, & Pemampatan Gambar
 * Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah, Kementerian Pendidikan Brunei
 * ============================================================================
 */

const App = (function () {
  // Keadaan Sistem (State)
  let _currentView = 'dashboard';
  let _currentKategori = 'Semua';
  let _currentBilik = 'Semua';
  let _searchQuery = '';
  let _megaMenuOpen = false;

  let _katalogData = [];
  let _aduanData = [];
  let _pelupusanData = [];
  let _stockData = [];
  let _bilikData = [];
  let _statsData = null;

  let _chartBilikInstance = null;
  let _chartStatusInstance = null;
  let _html5QrScanner = null;
  let _selectedAsetDetail = null;

  /**
   * Permulaan Aplikasi (App Init)
   */
  async function init() {
    initUser();
    setupEventListeners();
    await bootSystem();
    await loadDashboardData();
    navigate('dashboard');
  }

  function initUser() {
    const user = API.getUser();
    if (user) {
      updateUserUI(user);
    } else {
      // Default Tetamu / Kakitangan
      updateUserUI({
        email: 'tetamu@moe.gov.bn',
        nama: 'Kakitangan UPK',
        peranan: 'Staf'
      });
    }
  }

  function updateUserUI(user) {
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    const menuName = document.getElementById('user-menu-name');
    const menuEmail = document.getElementById('user-menu-email');
    const initialsEl = document.getElementById('user-avatar-initials');

    if (nameEl) nameEl.textContent = user.nama || 'Kakitangan';
    if (roleEl) roleEl.textContent = user.peranan || 'Staf';
    if (menuName) menuName.textContent = user.nama || 'Kakitangan';
    if (menuEmail) menuEmail.textContent = user.email || '';
    if (initialsEl) {
      const parts = (user.nama || 'UPK').split(' ');
      initialsEl.textContent = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    }
  }

  /**
   * Booting Awal Sistem (/gas-pro-api)
   */
  async function bootSystem() {
    try {
      const res = await API.call('boot');
      if (res && res.success && res.data) {
        _bilikData = res.data.senaraiBilik || [];
        populateBilikDropdowns(_bilikData);
      }
    } catch (e) {
      console.warn('Boot system error:', e);
    }
  }

  function populateBilikDropdowns(bilikList) {
    const globalSelect = document.getElementById('global-room-select');
    const daftarSelect = document.getElementById('daftar-bilik-select');
    const stockSelect = document.getElementById('stock-bilik-filter');

    if (globalSelect) {
      globalSelect.innerHTML = '<option value="Semua">Semua Bilik UPK</option>';
      bilikList.forEach(b => {
        globalSelect.innerHTML += `<option value="${b.Nama_Bilik}">${b.Nama_Bilik}</option>`;
      });
    }

    if (daftarSelect) {
      daftarSelect.innerHTML = '';
      bilikList.forEach(b => {
        daftarSelect.innerHTML += `<option value="${b.Nama_Bilik}">${b.Nama_Bilik}</option>`;
      });
    }

    if (stockSelect) {
      stockSelect.innerHTML = '<option value="Semua">Semua Lokasi Bilik</option>';
      bilikList.forEach(b => {
        stockSelect.innerHTML += `<option value="${b.Nama_Bilik}">${b.Nama_Bilik}</option>`;
      });
    }
  }

  function setupEventListeners() {
    // Tutup mega menu jika klik luar
    document.addEventListener('click', function (e) {
      const panel = document.getElementById('mega-menu-panel');
      const tabs = document.getElementById('nav-tabs-container');
      if (panel && !panel.contains(e.target) && tabs && !tabs.contains(e.target)) {
        closeMegaMenu();
      }

      const userWidget = document.getElementById('user-profile-widget');
      const userDropdown = document.getElementById('user-dropdown-menu');
      if (userDropdown && userWidget && !userWidget.contains(e.target)) {
        userDropdown.classList.add('hidden');
      }
    });

    // Pintasan papan kekunci (Ctrl + K untuk carian)
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('katalog');
        const searchInput = document.getElementById('katalog-search-input');
        if (searchInput) searchInput.focus();
      }
    });
  }

  // ==========================================================================
  // LOGIK NAVIGASI PANTAS & ZARE MEGA MENU
  // ==========================================================================
  function navigate(viewId) {
    _currentView = viewId;
    closeMegaMenu();

    // Sembunyikan semua views
    const views = ['dashboard', 'katalog', 'stockcard', 'aduan', 'pelupusan', 'cetak-qr'];
    views.forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.classList.add('hidden');
    });

    // Paparkan view yang dipilih
    const activeEl = document.getElementById('view-' + viewId);
    if (activeEl) activeEl.classList.remove('hidden');

    // Kemas kini tab aktif di bilah navigasi atas
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-nav') === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Panggil pemuat data spesifik
    if (viewId === 'dashboard') loadDashboardData();
    if (viewId === 'katalog') loadKatalogData();
    if (viewId === 'stockcard') loadStockCardData();
    if (viewId === 'aduan') loadAduanData();
    if (viewId === 'pelupusan') loadPelupusanData();
    if (viewId === 'cetak-qr') renderPrintStickers();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleMegaMenu(menuType) {
    const panel = document.getElementById('mega-menu-panel');
    if (!panel) return;

    if (_megaMenuOpen) {
      closeMegaMenu();
    } else {
      panel.classList.add('open');
      _megaMenuOpen = true;
    }
  }

  function closeMegaMenu() {
    const panel = document.getElementById('mega-menu-panel');
    if (panel) panel.classList.remove('open');
    _megaMenuOpen = false;
  }

  function toggleUserDropdown() {
    const dd = document.getElementById('user-dropdown-menu');
    if (dd) dd.classList.toggle('hidden');
  }

  // ==========================================================================
  // MODUL 1: PAPAN PEMUKA & CARTA STATISTIK
  // ==========================================================================
  async function loadDashboardData() {
    try {
      const res = await API.call('getDashboardStats');
      if (res && res.success && res.data) {
        _statsData = res.data;
        renderDashboard(res.data);
      }
    } catch (e) {
      console.warn('Dashboard load error:', e);
    }
  }

  function renderDashboard(data) {
    document.getElementById('stat-total-aset').textContent = data.totalAset || 0;
    document.getElementById('stat-baik').textContent = data.beroperasiBaik || 0;
    document.getElementById('stat-pembaikan').textContent = data.dalamPembaikan || 0;
    document.getElementById('stat-pelupusan').textContent = data.cadanganPelupusan || 0;

    const pctBaik = data.totalAset ? Math.round((data.beroperasiBaik / data.totalAset) * 100) : 0;
    document.getElementById('stat-baik-pct').textContent = pctBaik + '%';

    // Banner amaran stok minimum
    const banner = document.getElementById('low-stock-banner');
    if (data.stokKurang > 0) {
      banner.classList.remove('hidden');
      document.getElementById('low-stock-desc').textContent = `${data.stokKurang} item barang guna habis berada di bawah paras keselamatan. Sila buat pesanan bekalan baharu.`;
    } else {
      banner.classList.add('hidden');
    }

    // Carta Agihan Bilik (Chart.js Bar Chart)
    renderChartBilik(data.agihanBilik || {});

    // Carta Status (Chart.js Donut Chart)
    renderChartStatus(data);

    // Jadual Aduan Terkini
    renderRecentTable(data.aduanTerkini || []);
  }

  function renderChartBilik(agihanMap) {
    const ctx = document.getElementById('chart-bilik');
    if (!ctx) return;

    const labels = Object.keys(agihanMap);
    const counts = Object.values(agihanMap);

    if (_chartBilikInstance) _chartBilikInstance.destroy();

    _chartBilikInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map(l => l.replace('Makmal Kerjaya UPK (Bilik Komputer)', 'Makmal Kerjaya').replace('Stor Inventori & Bekalan Utama', 'Stor Utama')),
        datasets: [{
          label: 'Jumlah Unit',
          data: counts,
          backgroundColor: '#16719A',
          hoverBackgroundColor: '#0F3E5D',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }

  function renderChartStatus(data) {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;

    if (_chartStatusInstance) _chartStatusInstance.destroy();

    _chartStatusInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Beroperasi Baik', 'Penyelenggaraan', 'Cadangan Pelupusan'],
        datasets: [{
          data: [data.beroperasiBaik || 0, data.dalamPembaikan || 0, data.cadanganPelupusan || 0],
          backgroundColor: ['#2A9D8F', '#E9C46A', '#E63946'],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 10 } }
          }
        },
        cutout: '68%'
      }
    });
  }

  function renderRecentTable(aduanList) {
    const tbody = document.getElementById('dashboard-recent-table-body');
    if (!tbody) return;

    if (!aduanList.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">Tiada aduan kerosakan aktif pada masa ini.</td></tr>`;
      return;
    }

    tbody.innerHTML = aduanList.map(a => `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-2.5 px-3 text-slate-500 whitespace-nowrap">${(a.Tarikh_Aduan || '').split(' ')[0]}</td>
        <td class="py-2.5 px-3 font-mono font-bold text-slate-800">${a.ID_Aduan || a.ID_Aset}</td>
        <td class="py-2.5 px-3 font-semibold text-slate-800">${a.Nama_Barang || a.Bahagian_Rosak || 'Aset UPK'}</td>
        <td class="py-2.5 px-3 text-slate-600">${a.Lokasi_Bilik || '-'}</td>
        <td class="py-2.5 px-3 text-slate-600">${a.Nama_Pelapor || '-'}</td>
        <td class="py-2.5 px-3">${getStatusBadgeHtml(a.Status_Aduan)}</td>
        <td class="py-2.5 px-3 text-right">
          <button onclick="App.openSemakanModal('${a.ID_Aduan}')" class="px-2.5 py-1 bg-sky-50 text-upk-cerulean font-bold rounded-lg hover:bg-sky-100 transition text-[11px]">
            Semak
          </button>
        </td>
      </tr>
    `).join('');
  }

  // ==========================================================================
  // MODUL 2: KATALOG ASET BERGAMBAR (GAYA OAKORY & WOOCOMMERCE)
  // ==========================================================================
  async function loadKatalogData() {
    const container = document.getElementById('katalog-grid-container');
    const emptyState = document.getElementById('katalog-empty-state');
    if (!container) return;

    container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><p>Memuatkan katalog aset...</p></div>';

    try {
      const res = await API.call('getKatalogAset', {
        kategori: _currentKategori,
        bilik: _currentBilik
      });

      if (res && res.success && res.data) {
        _katalogData = res.data;
        document.getElementById('count-semua').textContent = res.data.length;
        renderKatalogGrid(filterKatalogList(_katalogData));
      }
    } catch (e) {
      console.warn('Katalog load error:', e);
    }
  }

  function filterKatalogList(items) {
    let result = items;

    if (_currentKategori && _currentKategori !== 'Semua') {
      result = result.filter(a => a.Buku_Simpanan === _currentKategori);
    }
    if (_currentBilik && _currentBilik !== 'Semua') {
      result = result.filter(a => String(a.Lokasi_Bilik).includes(_currentBilik));
    }
    if (_searchQuery) {
      const q = _searchQuery.toLowerCase();
      result = result.filter(a =>
        String(a.Nama_Barang || '').toLowerCase().includes(q) ||
        String(a.No_Siri_Daftar || '').toLowerCase().includes(q) ||
        String(a.ID_Aset || '').toLowerCase().includes(q) ||
        String(a.Lokasi_Bilik || '').toLowerCase().includes(q)
      );
    }
    return result;
  }

  function renderKatalogGrid(items) {
    const container = document.getElementById('katalog-grid-container');
    const emptyState = document.getElementById('katalog-empty-state');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    container.innerHTML = items.map(item => `
      <div class="upk-card flex flex-col justify-between group cursor-pointer" onclick="App.openDetailModal('${item.ID_Aset}')">
        <!-- Bekas Gambar & Lencana Status -->
        <div class="relative bg-slate-100 overflow-hidden">
          <img src="${item.URL_Foto_Asal || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80'}" alt="${item.Nama_Barang}" class="img-4-3 group-hover:scale-105 transition duration-300">
          <span class="absolute top-2 right-2 ${getStatusBadgeClass(item.Status_Aset)}">
            ${item.Status_Aset || 'Beroperasi Baik'}
          </span>
        </div>

        <!-- Kandungan Kad -->
        <div class="p-3.5 flex-1 flex flex-col justify-between">
          <div>
            <span class="text-[9px] font-bold uppercase tracking-wider text-upk-cerulean block mb-1">
              ${item.Buku_Simpanan || 'Inventori'}
            </span>
            <h4 class="font-extrabold text-xs text-slate-900 line-clamp-2 leading-tight group-hover:text-upk-cerulean transition">
              ${item.Nama_Barang}
            </h4>
            <p class="text-[10px] font-mono text-slate-500 mt-1">
              ${item.ID_Aset}
            </p>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span class="truncate max-w-[120px] flex items-center gap-1">
              <i class="fa-solid fa-map-pin text-amber-500 text-[10px]"></i>
              ${(item.Lokasi_Bilik || '').replace('Makmal Kerjaya UPK (Bilik Komputer)', 'Makmal Kerjaya')}
            </span>
            <span class="font-bold text-slate-800">
              ${item.Baki_Stok !== undefined ? item.Baki_Stok : 1} Unit
            </span>
          </div>
        </div>

        <!-- Butang Tindakan Bawah Kad -->
        <div class="px-3.5 pb-3 pt-0">
          <button class="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-upk-cerulean hover:text-white text-slate-700 font-semibold text-[11px] transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-eye text-[10px]"></i> Butiran Lengkap
          </button>
        </div>
      </div>
    `).join('');
  }

  function filterKategori(kat, btn) {
    _currentKategori = kat;
    document.querySelectorAll('#kategori-pill-tabs button').forEach(b => {
      b.className = 'px-3.5 py-1.5 rounded-full font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition whitespace-nowrap';
    });
    if (btn) {
      btn.className = 'px-3.5 py-1.5 rounded-full font-bold bg-upk-cerulean text-white transition whitespace-nowrap';
    }
    renderKatalogGrid(filterKatalogList(_katalogData));
  }

  function filterBukuSimpanan(buku) {
    navigate('katalog');
    filterKategori(buku);
  }

  function filterKatalogBilik(kodBilik) {
    _currentBilik = kodBilik;
    navigate('katalog');
    renderKatalogGrid(filterKatalogList(_katalogData));
  }

  function onKatalogSearch(q) {
    _searchQuery = q;
    renderKatalogGrid(filterKatalogList(_katalogData));
  }

  function onGlobalRoomChange(bilik) {
    _currentBilik = bilik;
    if (_currentView === 'katalog') {
      renderKatalogGrid(filterKatalogList(_katalogData));
    }
  }

  // ==========================================================================
  // MODUL 3: BUKU SIMPANAN & LEJAR KAD STOK
  // ==========================================================================
  async function loadStockCardData() {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Memuatkan lejar kad stok...</td></tr>';

    try {
      const bilikFilter = document.getElementById('stock-bilik-filter');
      const bilik = bilikFilter ? bilikFilter.value : 'Semua';
      const res = await API.call('getStockCard', { bilik: bilik });

      if (res && res.success && res.data) {
        _stockData = res.data;
        document.getElementById('stock-log-count').textContent = res.data.length;
        renderStockTable(res.data);
      }
    } catch (e) {
      console.warn('StockCard load error:', e);
    }
  }

  function renderStockTable(logs) {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;

    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="py-8 text-center text-slate-400">Tiada transaksi lejar stok direkodkan.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const change = Number(l.Kuantiti_Perubahan || 0);
      const isPlus = change > 0;
      const isMinus = change < 0;

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-2.5 px-3 text-slate-500 whitespace-nowrap">${(l.Tarikh_Transaksi || '').split(' ')[0]}</td>
          <td class="py-2.5 px-3 font-mono font-bold text-slate-800">${l.ID_Aset}</td>
          <td class="py-2.5 px-3 font-semibold text-slate-800">${l.Jenis_Transaksi}</td>
          <td class="py-2.5 px-3 text-slate-600">${l.Bilik_Asal || '-'}</td>
          <td class="py-2.5 px-3 text-slate-600">${l.Bilik_Tujuan || '-'}</td>
          <td class="py-2.5 px-3 text-center font-bold text-emerald-600">${isPlus ? '+' + change : '-'}</td>
          <td class="py-2.5 px-3 text-center font-bold text-red-600">${isMinus ? Math.abs(change) : '-'}</td>
          <td class="py-2.5 px-3 text-center font-extrabold text-slate-900 bg-slate-50">${l.Baki_Selepas_Transaksi}</td>
          <td class="py-2.5 px-3 text-slate-500 text-[11px]">${l.Didaftar_Oleh || 'Admin'} ${l.Catatan ? '(' + l.Catatan + ')' : ''}</td>
        </tr>
      `;
    }).join('');
  }

  function onStockFilterChange() {
    loadStockCardData();
  }

  // ==========================================================================
  // MODUL 4: ADUAN KEROSAKAN & TINDAKAN TEKNIKAL
  // ==========================================================================
  async function loadAduanData() {
    const container = document.getElementById('aduan-cards-container');
    if (!container) return;

    container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><p>Memuatkan aduan...</p></div>';

    try {
      const res = await API.call('getSenaraiAduan');
      if (res && res.success && res.data) {
        _aduanData = res.data;
        document.getElementById('notif-badge-count').textContent = res.data.filter(a => a.Status_Aduan.includes('Menunggu')).length;
        renderAduanCards(res.data);
      }
    } catch (e) {
      console.warn('Aduan load error:', e);
    }
  }

  function renderAduanCards(aduanList) {
    const container = document.getElementById('aduan-cards-container');
    if (!container) return;

    if (!aduanList.length) {
      container.innerHTML = '<div class="col-span-full upk-card p-12 text-center text-slate-400"><p>Tiada aduan kerosakan pada masa ini.</p></div>';
      return;
    }

    container.innerHTML = aduanList.map(a => `
      <div class="upk-card p-4 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-xs font-bold text-slate-500">${a.ID_Aduan}</span>
            <span class="${getStatusBadgeClass(a.Status_Aduan)}">${a.Status_Aduan}</span>
          </div>

          <div class="flex gap-3">
            <img src="${a.URL_Foto_Rosak || 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=400&q=80'}" class="w-20 h-20 object-cover rounded-xl border border-red-200">
            <div class="text-xs space-y-1">
              <h4 class="font-extrabold text-slate-900">${a.Nama_Barang || a.ID_Aset}</h4>
              <p class="text-slate-500 text-[11px]"><i class="fa-solid fa-map-pin text-amber-500 mr-1"></i>${a.Lokasi_Bilik || '-'}</p>
              <p class="text-red-700 font-semibold text-[11px]"><i class="fa-solid fa-circle-exclamation mr-1"></i>${a.Bahagian_Rosak}</p>
            </div>
          </div>

          <p class="mt-2.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            "${a.Keterangan_Kerosakan}"
          </p>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-[11px] text-slate-400">${(a.Tarikh_Aduan || '').split(' ')[0]}</span>
          <button onclick="App.openSemakanModal('${a.ID_Aduan}')" class="px-3 py-1.5 bg-upk-cerulean hover:bg-upk-navy text-white text-xs font-bold rounded-lg shadow-sm transition">
            Semakan Side-by-Side
          </button>
        </div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // MODUL 5: PELUPUSAN ASET (SIDE-BY-SIDE PROOF & 1-CLICK APPROVAL)
  // ==========================================================================
  async function loadPelupusanData() {
    const container = document.getElementById('pelupusan-list-container');
    if (!container) return;

    container.innerHTML = '<div class="py-12 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><p>Memuatkan permohonan pelupusan...</p></div>';

    try {
      const res = await API.call('getSenaraiPelupusan');
      if (res && res.success && res.data) {
        _pelupusanData = res.data;
        renderPelupusanList(res.data);
      }
    } catch (e) {
      console.warn('Pelupusan load error:', e);
    }
  }

  function renderPelupusanList(lpsList) {
    const container = document.getElementById('pelupusan-list-container');
    if (!container) return;

    if (!lpsList.length) {
      container.innerHTML = '<div class="upk-card p-12 text-center text-slate-400"><p>Tiada permohonan pelupusan yang aktif pada masa ini.</p></div>';
      return;
    }

    container.innerHTML = lpsList.map(l => `
      <div class="upk-card p-5 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span class="font-mono text-xs font-bold text-slate-500">${l.ID_Pelupusan}</span>
            <h3 class="font-extrabold text-base text-slate-900">${l.Nama_Barang} (${l.ID_Aset})</h3>
            <p class="text-xs text-slate-500">Lokasi Penempatan: <strong>${l.Lokasi_Bilik}</strong> | Harga Perolehan: <strong>BND $${Number(l.Harga_Asal_BND || 0).toFixed(2)}</strong></p>
          </div>
          <span class="${getStatusBadgeClass(l.Status_Kelulusan)} text-xs px-3 py-1">
            ${l.Status_Kelulusan}
          </span>
        </div>

        <!-- Bukti Visual Bersebelahan (Side-by-Side Proof) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="side-by-side-box">
            <div class="side-by-side-header bg-sky-50 text-sky-900">
              <i class="fa-solid fa-image text-sky-600 mr-1.5"></i> 1. Gambar Asal Semasa Daftar
            </div>
            <div class="p-2">
              <img src="${l.URL_Foto_Asal || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80'}" class="img-4-3 rounded-lg object-cover">
            </div>
          </div>

          <div class="side-by-side-box">
            <div class="side-by-side-header bg-red-50 text-red-900">
              <i class="fa-solid fa-triangle-exclamation text-red-600 mr-1.5"></i> 2. Gambar Bukti Kerosakan Semasa
            </div>
            <div class="p-2">
              <img src="${l.URL_Foto_Rosak || 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80'}" class="img-4-3 rounded-lg object-cover">
            </div>
          </div>
        </div>

        <!-- Perakuan & Justifikasi -->
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
          <p><strong>Dapatan Pemeriksaan Teknikal:</strong> ${l.Laporan_Teknikal}</p>
          <p><strong>Justifikasi Pelupusan:</strong> ${l.Justifikasi_Pelupusan}</p>
          <p class="text-slate-500 text-[11px]">Pemeriksa: ${l.Pegawai_Pemeriksa} (${(l.Tarikh_Permohonan || '').split(' ')[0]})</p>
        </div>

        <!-- Tindakan Kelulusan Ketua Unit -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>
            ${l.URL_PDF_Rasmi ? `
              <a href="${l.URL_PDF_Rasmi}" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold text-xs hover:bg-red-100">
                <i class="fa-solid fa-file-pdf"></i> Muat Turun Borang Rasmi PDF
              </a>
            ` : ''}
          </div>

          ${l.Status_Kelulusan.includes('Menunggu') ? `
            <div class="flex items-center gap-2">
              <button onclick="App.keputusanPelupusan('${l.ID_Pelupusan}', 'Ditolak')" class="px-3.5 py-2 border border-red-300 text-red-600 hover:bg-red-50 font-bold text-xs rounded-xl transition">
                Tolak
              </button>
              <button onclick="App.keputusanPelupusan('${l.ID_Pelupusan}', 'Disokong & Diluluskan')" class="px-4 py-2 bg-upk-navy hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition">
                <i class="fa-solid fa-check mr-1.5"></i> Luluskan Pelupusan Aset
              </button>
            </div>
          ` : `
            <span class="text-xs text-slate-500 font-semibold">Disahkan oleh: ${l.Pegawai_Pengesah || 'Ketua Unit'} (${(l.Tarikh_Kelulusan || '').split(' ')[0]})</span>
          `}
        </div>
      </div>
    `).join('');
  }

  async function keputusanPelupusan(idPelupusan, keputusan) {
    if (!confirm('Adakah anda pasti untuk ' + keputusan + ' permohonan pelupusan ' + idPelupusan + '?')) return;

    try {
      const res = await API.call('luluskanPelupusan', {
        idPelupusan: idPelupusan,
        statusKeputusan: keputusan,
        catatan: 'Disahkan oleh Ketua Unit Pendidikan Kerjaya'
      }, true);

      if (res && res.success) {
        showToast(res.message, 'success');
        loadPelupusanData();
      } else {
        showToast(res.message || 'Gagal memproses permohonan', 'error');
      }
    } catch (e) {
      showToast('Ralat sambungan: ' + e.message, 'error');
    }
  }

  // ==========================================================================
  // MODUL 6: PENGIMBAS KOD QR KAMERA TELEFON (HTML5-QRCODE)
  // ==========================================================================
  function openScannerModal() {
    const modal = document.getElementById('modal-scanner');
    if (modal) modal.classList.remove('hidden');

    const resultBox = document.getElementById('scanner-match-result');
    if (resultBox) resultBox.classList.add('hidden');

    try {
      _html5QrScanner = new Html5Qrcode("qr-reader");
      const config = { fps: 10, qrbox: { width: 220, height: 220 } };

      _html5QrScanner.start(
        { facingMode: "environment" },
        config,
        onQrCodeScanned,
        (err) => {}
      ).catch(err => {
        console.warn('Ralat kamera:', err);
        showToast('Kamera tidak dapat diakses atau disekat oleh pelayar.', 'warning');
      });
    } catch (e) {
      console.warn('Html5Qrcode error:', e);
    }
  }

  function closeScannerModal() {
    const modal = document.getElementById('modal-scanner');
    if (modal) modal.classList.add('hidden');

    if (_html5QrScanner) {
      _html5QrScanner.stop().then(() => {
        _html5QrScanner.clear();
        _html5QrScanner = null;
      }).catch(() => {
        _html5QrScanner = null;
      });
    }
  }

  function onQrCodeScanned(decodedText) {
    if (_html5QrScanner) {
      _html5QrScanner.pause();
    }

    // Cari aset sepadan
    const aset = _katalogData.find(a => a.ID_Aset === decodedText || decodedText.includes(a.ID_Aset));
    const resultBox = document.getElementById('scanner-match-result');

    if (aset) {
      resultBox.classList.remove('hidden');
      document.getElementById('scan-res-img').src = aset.URL_Foto_Asal || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=400&q=80';
      document.getElementById('scan-res-title').textContent = aset.Nama_Barang;
      document.getElementById('scan-res-desc').textContent = 'Lokasi Penempatan: ' + aset.Lokasi_Bilik;

      document.getElementById('scan-btn-detail').onclick = () => {
        closeScannerModal();
        openDetailModal(aset.ID_Aset);
      };

      document.getElementById('scan-btn-aduan').onclick = () => {
        closeScannerModal();
        openAduanModal(aset.ID_Aset);
      };
    } else {
      showToast('Kod QR diimbas: ' + decodedText + ' (Tiada dalam pangkalan data)', 'info');
    }
  }

  // ==========================================================================
  // PEMAMPATAN GAMBAR AUTOMATIK DI PELAYAR (CANVAS COMPRESSION)
  // ==========================================================================
  function handleFotoUpload(fileInput, previewContainerId, base64HiddenInputId) {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        // Skalakan imej jika melebihi had maksimum lebar
        const maxW = CONFIG.MAX_IMAGE_WIDTH || 1280;
        let w = img.width;
        let h = img.height;

        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Eksport ke JPEG berkualiti tinggi tapi saiz kecil (<600KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', CONFIG.IMAGE_QUALITY || 0.82);

        // Paparkan thumbnail
        const previewContainer = document.getElementById(previewContainerId);
        const placeholder = fileInput.parentElement.querySelector('div:first-of-type');
        const hiddenInput = document.getElementById(base64HiddenInputId);

        if (previewContainer) {
          previewContainer.classList.remove('hidden');
          previewContainer.querySelector('img').src = compressedBase64;
        }
        if (placeholder) placeholder.classList.add('hidden');
        if (hiddenInput) hiddenInput.value = compressedBase64;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ==========================================================================
  // PENGENDALIAN MODAL & FORMULIR
  // ==========================================================================
  function openDaftarAsetModal() {
    const m = document.getElementById('modal-daftar-aset');
    if (m) m.classList.remove('hidden');
  }

  function closeDaftarAsetModal() {
    const m = document.getElementById('modal-daftar-aset');
    if (m) m.classList.add('hidden');
  }

  async function submitDaftarAset(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {};
    formData.forEach((v, k) => { data[k] = v; });

    const btn = document.getElementById('btn-submit-daftar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';

    try {
      const res = await API.call('daftarAset', data, true);
      if (res && res.success) {
        showToast(res.message, 'success');
        closeDaftarAsetModal();
        form.reset();
        loadKatalogData();
        loadDashboardData();
      } else {
        showToast(res.message || 'Gagal mendaftarkan aset.', 'error');
      }
    } catch (err) {
      showToast('Ralat: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Simpan & Jana Kod QR';
    }
  }

  function openAduanModal(preselectedIdAset) {
    const m = document.getElementById('modal-aduan');
    if (m) m.classList.remove('hidden');

    const select = document.getElementById('aduan-aset-select');
    if (select) {
      select.innerHTML = '<option value="">-- Pilih Aset Rosak --</option>';
      _katalogData.forEach(a => {
        const sel = a.ID_Aset === preselectedIdAset ? 'selected' : '';
        select.innerHTML += `<option value="${a.ID_Aset}" ${sel}>${a.ID_Aset} - ${a.Nama_Barang} (${a.Lokasi_Bilik})</option>`;
      });
    }
  }

  function closeAduanModal() {
    const m = document.getElementById('modal-aduan');
    if (m) m.classList.add('hidden');
  }

  async function submitAduan(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {};
    formData.forEach((v, k) => { data[k] = v; });

    const btn = document.getElementById('btn-submit-aduan');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menghantar...';

    try {
      const res = await API.call('hantarAduan', data, true);
      if (res && res.success) {
        showToast(res.message, 'success');
        closeAduanModal();
        form.reset();
        loadAduanData();
        loadDashboardData();
      } else {
        showToast(res.message || 'Gagal menghantar aduan.', 'error');
      }
    } catch (err) {
      showToast('Ralat: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Hantar Laporan Kerosakan';
    }
  }

  function openSemakanModal(idAduan) {
    const aduan = _aduanData.find(a => a.ID_Aduan === idAduan);
    if (!aduan) return;

    const modal = document.getElementById('modal-semakan-teknikal');
    modal.classList.remove('hidden');

    document.getElementById('modal-side-case-id').textContent = 'Kes Aduan: ' + aduan.ID_Aduan;
    document.getElementById('perakuan-id-aduan').value = aduan.ID_Aduan;
    document.getElementById('side-img-asal').src = aduan.URL_Foto_Asal || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80';
    document.getElementById('side-txt-nama').textContent = aduan.Nama_Barang || aduan.ID_Aset;
    document.getElementById('side-txt-lokasi').textContent = aduan.Lokasi_Bilik || '-';

    document.getElementById('side-img-rosak').src = aduan.URL_Foto_Rosak || 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80';
    document.getElementById('side-txt-bahagian').textContent = aduan.Bahagian_Rosak || '-';
    document.getElementById('side-txt-gejala').textContent = aduan.Keterangan_Kerosakan || '-';

    document.getElementById('perakuan-ulasan').value = aduan.Ulasan_Teknikal || '';
    document.getElementById('perakuan-pemeriksa').value = aduan.Pegawai_Pemeriksa || (API.getUser() ? API.getUser().nama : '');
  }

  function closeSemakanModal() {
    const modal = document.getElementById('modal-semakan-teknikal');
    if (modal) modal.classList.add('hidden');
  }

  async function submitPerakuanTeknikal(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {};
    formData.forEach((v, k) => { data[k] = v; });

    try {
      const res = await API.call('selesaiSemakanTeknikal', data, true);
      if (res && res.success) {
        showToast(res.message, 'success');
        closeSemakanModal();
        loadAduanData();
        loadPelupusanData();
        loadDashboardData();
      } else {
        showToast(res.message || 'Gagal menyimpan perakuan.', 'error');
      }
    } catch (err) {
      showToast('Ralat: ' + err.message, 'error');
    }
  }

  function openDetailModal(idAset) {
    const aset = _katalogData.find(a => a.ID_Aset === idAset);
    if (!aset) return;
    _selectedAsetDetail = aset;

    const m = document.getElementById('modal-detail-aset');
    m.classList.remove('hidden');

    document.getElementById('detail-modal-title').textContent = 'Maklumat Aset: ' + aset.ID_Aset;
    document.getElementById('detail-foto').src = aset.URL_Foto_Asal || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
    document.getElementById('detail-badge').className = 'absolute top-2.5 right-2.5 ' + getStatusBadgeClass(aset.Status_Aset);
    document.getElementById('detail-badge').textContent = aset.Status_Aset;

    document.getElementById('detail-qr-img').src = aset.URL_QR_Code || ('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + aset.ID_Aset);
    document.getElementById('detail-qr-id').textContent = aset.ID_Aset;

    document.getElementById('detail-buku').textContent = aset.Buku_Simpanan || 'Inventori';
    document.getElementById('detail-nama').textContent = aset.Nama_Barang;
    document.getElementById('detail-nosiri').textContent = 'S/N: ' + (aset.No_Siri_Daftar || '-');
    document.getElementById('detail-bilik').textContent = aset.Lokasi_Bilik || '-';
    document.getElementById('detail-stok').textContent = (aset.Baki_Stok !== undefined ? aset.Baki_Stok : 1) + ' Unit';
    document.getElementById('detail-harga').textContent = 'BND $' + Number(aset.Harga_Asal_BND || 0).toFixed(2);
    document.getElementById('detail-tarikh').textContent = (aset.Tarikh_Daftar || '').split(' ')[0];
    document.getElementById('detail-pegawai').textContent = aset.Pegawai_Penanggungjawab || '-';
    document.getElementById('detail-spesifikasi').textContent = aset.Catatan_Spesifikasi || 'Tiada spesifikasi tambahan.';
  }

  function closeDetailModal() {
    const m = document.getElementById('modal-detail-aset');
    if (m) m.classList.add('hidden');
    _selectedAsetDetail = null;
  }

  function bukaAduanDariAset() {
    if (_selectedAsetDetail) {
      const id = _selectedAsetDetail.ID_Aset;
      closeDetailModal();
      openAduanModal(id);
    }
  }

  function bukaPindahBilikModal() {
    if (!_selectedAsetDetail) return;
    const bilikBaru = prompt('Masukkan nama bilik baharu:', _selectedAsetDetail.Lokasi_Bilik);
    if (bilikBaru && bilikBaru !== _selectedAsetDetail.Lokasi_Bilik) {
      API.call('pindahBilik', {
        idAset: _selectedAsetDetail.ID_Aset,
        bilikTujuan: bilikBaru,
        catatan: 'Perpindahan manual melalui kad butiran aset'
      }, true).then(res => {
        if (res && res.success) {
          showToast(res.message, 'success');
          closeDetailModal();
          loadKatalogData();
          loadStockCardData();
        } else {
          showToast(res.message || 'Gagal memindahkan aset', 'error');
        }
      });
    }
  }

  function cetakLabelTunggal() {
    if (!_selectedAsetDetail) return;
    window.print();
  }

  // ==========================================================================
  // MODUL 7: CETAKAN LEMBARAN PELEKAT KOD QR (PRINTABLE A4 SHEET)
  // ==========================================================================
  function renderPrintStickers() {
    const container = document.getElementById('print-stickers-grid');
    if (!container) return;

    const items = _katalogData.slice(0, 21); // Had 21 pelekat per muka surat A4
    if (!items.length) {
      container.innerHTML = '<p class="col-span-full py-8 text-center text-slate-400">Tiada aset sedia cetak.</p>';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="sticker-unit border-2 border-dashed border-slate-300 p-3 rounded-xl bg-white flex flex-col justify-between h-44 shadow-sm">
        <!-- Pengepala Pelekat -->
        <div class="flex items-center gap-2 border-b border-slate-200 pb-1.5">
          <img src="assets/logo-upk.png" class="w-6 h-6 object-contain" onerror="this.src='https://ui-avatars.com/api/?name=UPK&background=16719A&color=fff'">
          <div class="leading-none">
            <span class="text-[9px] font-extrabold text-upk-navy tracking-tight block">UNIT PENDIDIKAN KERJAYA</span>
            <span class="text-[7.5px] text-slate-500 block">JABATAN SEKOLAH-SEKOLAH</span>
          </div>
        </div>

        <!-- Badan Pelekat: Kod QR + Perincian -->
        <div class="flex items-center gap-2.5 py-1.5">
          <img src="${item.URL_QR_Code || ('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + item.ID_Aset)}" class="w-18 h-18 bg-white p-0.5 border border-slate-300 rounded">
          <div class="flex-1 min-w-0 text-left">
            <span class="font-mono font-extrabold text-xs text-slate-900 block">${item.ID_Aset}</span>
            <span class="font-bold text-[10.5px] text-slate-800 line-clamp-2 leading-tight">${item.Nama_Barang}</span>
            <span class="text-[8.5px] text-slate-500 block mt-0.5 truncate">${item.Lokasi_Bilik}</span>
          </div>
        </div>

        <!-- Kaki Pelekat -->
        <div class="border-t border-slate-200 pt-1 text-center">
          <span class="text-[8px] font-extrabold text-red-700 tracking-wider uppercase block">
            HAK MILIK KERAJAAN — JANGAN ALIHKAN
          </span>
        </div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // UTILITI SISTEM, NOTIFIKASI TOAST & EXCEL EXPORT
  // ==========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-red-600 text-white',
      warning: 'bg-amber-500 text-white',
      info: 'bg-upk-cerulean text-white'
    };
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold ${colors[type] || colors.info} transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function getStatusBadgeClass(status) {
    if (!status) return 'badge-status badge-baik';
    if (status.includes('Baik') || status.includes('Aktif')) return 'badge-status badge-baik';
    if (status.includes('Penyelenggaraan') || status.includes('Menunggu') || status.includes('Semakan')) return 'badge-status badge-penyelenggaraan';
    if (status.includes('Pelupusan') || status.includes('Rosak') || status.includes('Ditolak')) return 'badge-status badge-pelupusan';
    return 'badge-status badge-dilupuskan';
  }

  function getStatusBadgeHtml(status) {
    const cls = getStatusBadgeClass(status);
    return `<span class="${cls}">${status || 'Beroperasi'}</span>`;
  }

  function eksportExcelData() {
    if (!_katalogData.length) {
      showToast('Tiada data aset untuk dieksport.', 'warning');
      return;
    }

    const headers = ['ID_Aset', 'No_Siri_Daftar', 'Nama_Barang', 'Buku_Simpanan', 'Kategori', 'Lokasi_Bilik', 'Baki_Stok', 'Status_Aset', 'Harga_Asal_BND', 'Tarikh_Daftar'];
    let csvContent = '\uFEFF' + headers.join(',') + '\n';

    _katalogData.forEach(item => {
      const row = headers.map(h => {
        let val = item[h] !== undefined ? String(item[h]).replace(/"/g, '""') : '';
        return `"${val}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `e-Inventori_UPK_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Fail CSV berjaya dimuat turun.', 'success');
  }

  async function syncCrmKontak() {
    showToast('Menyelaraskan buku kontak CRM UPK...', 'info');
    try {
      const res = await API.call('crmSync', {}, true);
      if (res && res.success) {
        showToast(`CRM berjaya diselaraskan! (${res.jumlahKontak} kontak aktif)`, 'success');
      }
    } catch (e) {
      showToast('Ralat sync CRM: ' + e.message, 'error');
    }
  }

  function refreshData() {
    showToast('Mengemas kini data terkini...', 'info');
    loadDashboardData();
    loadKatalogData();
  }

  // Log masuk & Sesi
  function showLoginModal() {
    const m = document.getElementById('modal-login');
    if (m) m.classList.remove('hidden');
  }

  function closeLoginModal() {
    const m = document.getElementById('modal-login');
    if (m) m.classList.add('hidden');
  }

  async function submitLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await API.call('login', { email, password }, true);
      if (res && res.success) {
        API.setToken(res.token);
        API.setUser(res.user);
        updateUserUI(res.user);
        showToast(res.message, 'success');
        closeLoginModal();
      } else {
        showToast(res.message || 'Log masuk gagal', 'error');
      }
    } catch (err) {
      showToast('Ralat log masuk: ' + err.message, 'error');
    }
  }

  function logout() {
    API.setToken('');
    API.setUser(null);
    showToast('Anda telah log keluar.', 'info');
    setTimeout(() => window.location.reload(), 500);
  }

  function showSettingsModal() {
    const token = prompt('Masukkan FONNTE_TOKEN baharu untuk WhatsApp Gateway (atau kosongkan untuk kekal):');
    if (token) {
      API.call('simpanRahasia', { FONNTE_TOKEN: token }, true).then(res => {
        showToast(res.message || 'Tetapan disimpan.', 'success');
      });
    }
  }

  function showMigrationModal() {
    const ssId = prompt('Masukkan ID Spreadsheet LAMA untuk dimigrasikan ke sistem baharu (Mode Dry-Run simulasi):');
    if (ssId) {
      showToast('Menjalankan simulasi pindai data lama...', 'info');
      API.call('migrasiData', { spreadsheetId: ssId, dryRun: true }, true).then(res => {
        if (res && res.success) {
          alert('Hasil Simulasi Migrasi:\n' + JSON.stringify(res.data, null, 2));
        } else {
          showToast(res.message || 'Gagal menyambung spreadsheet lama', 'error');
        }
      });
    }
  }

  // Mulakan aplikasi apabila DOM siap
  document.addEventListener('DOMContentLoaded', init);

  return {
    navigate,
    toggleMegaMenu,
    closeMegaMenu,
    toggleUserDropdown,
    filterKategori,
    filterBukuSimpanan,
    filterKatalogBilik,
    onKatalogSearch,
    onGlobalRoomChange,
    onStockFilterChange,
    openScannerModal,
    closeScannerModal,
    openDaftarAsetModal,
    closeDaftarAsetModal,
    submitDaftarAset,
    openAduanModal,
    closeAduanModal,
    submitAduan,
    openSemakanModal,
    closeSemakanModal,
    submitPerakuanTeknikal,
    openDetailModal,
    closeDetailModal,
    bukaAduanDariAset,
    bukaPindahBilikModal,
    cetakLabelTunggal,
    keputusanPelupusan,
    handleFotoUpload,
    refreshData,
    eksportExcelData,
    syncCrmKontak,
    showLoginModal,
    closeLoginModal,
    submitLogin,
    logout,
    showSettingsModal,
    showMigrationModal
  };
})();
