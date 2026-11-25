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
    parseHashAndNavigate();
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
    // Navigasi URL hash (cth: #katalog?q=... atau #scan dari laman utama)
    window.addEventListener('hashchange', parseHashAndNavigate);

    // Tutup dropdown jika klik di luar kawasan menu navigasi
    document.addEventListener('click', function (e) {
      const isInsideNavDropdown = e.target.closest('.nav-dropdown-wrapper');
      const isInsideUserWidget = e.target.closest('#user-profile-widget');
      if (!isInsideNavDropdown && !isInsideUserWidget) {
        closeAllNavDropdowns();
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

  function parseHashAndNavigate() {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (!rawHash) {
      navigate('landing');
      return;
    }

    const [routePart, queryPart] = rawHash.split('?');
    const validRoutes = ['landing', 'home', 'dashboard', 'katalog', 'stockcard', 'aduan', 'pelupusan', 'cetak-qr', 'pelan'];

    if (routePart === 'scan') {
      navigate('katalog');
      setTimeout(() => openScannerModal(), 200);
      return;
    }

    if (routePart === 'landing' || routePart === 'home') {
      navigate('landing');
      return;
    }

    if (validRoutes.includes(routePart)) {
      navigate(routePart);
    } else {
      navigate('landing');
    }

    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      const q = params.get('q');
      const bilik = params.get('bilik');
      if (bilik && bilik !== 'Semua') {
        _currentBilik = bilik;
        const globalRoom = document.getElementById('global-room-select');
        if (globalRoom) globalRoom.value = bilik;
      }
      if (q) {
        _searchQuery = q.toLowerCase();
        const searchInput = document.getElementById('katalog-search-input');
        if (searchInput) searchInput.value = q;
      }
      if (routePart === 'katalog' && _katalogData.length > 0) {
        renderKatalogGrid(filterKatalogList(_katalogData));
      }
    }
  }

  // ==========================================================================
  // LOGIK NAVIGASI PANTAS & ZARE MEGA MENU
  // ==========================================================================
  function navigate(viewId) {
    _currentView = viewId;
    closeAllNavDropdowns();

    // Sembunyikan semua views
    const views = ['landing', 'dashboard', 'katalog', 'stockcard', 'aduan', 'pelupusan', 'cetak-qr', 'pelan'];
    views.forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.classList.add('hidden');
    });

    // Paparkan view yang dipilih
    const activeEl = document.getElementById('view-' + viewId);
    if (activeEl) activeEl.classList.remove('hidden');

    // Kemas kini tab aktif di bilah navigasi atas
    document.querySelectorAll('.nav-tab-btn, .nav-home-pill').forEach(btn => {
      if (btn.getAttribute('data-nav') === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Panggil pemuat data spesifik
    if (viewId === 'landing') updateLandingStats();
    if (viewId === 'dashboard') loadDashboardData();
    if (viewId === 'katalog') loadKatalogData();
    if (viewId === 'stockcard') loadStockCardData();
    if (viewId === 'aduan') loadAduanData();
    if (viewId === 'pelupusan') loadPelupusanData();
    if (viewId === 'cetak-qr') renderPrintStickers();
    if (viewId === 'pelan') loadPelanData();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onLandingSearch(e) {
    if (e) e.preventDefault();
    const query = (document.getElementById('landing-quick-search')?.value || '').trim();
    const bilik = document.getElementById('landing-room-select')?.value || 'Semua';
    if (bilik && bilik !== 'Semua') {
      _currentBilik = bilik;
      const globalRoom = document.getElementById('global-room-select');
      if (globalRoom) globalRoom.value = bilik;
    }
    if (query) {
      _searchQuery = query.toLowerCase();
      const searchInput = document.getElementById('katalog-search-input');
      if (searchInput) searchInput.value = query;
    }
    navigate('katalog');
    if (_katalogData.length > 0) {
      renderKatalogGrid(filterKatalogList(_katalogData));
    }
  }

  function filterByRoomLanding(roomName) {
    if (roomName && roomName !== 'Semua') {
      _currentBilik = roomName;
      const globalRoom = document.getElementById('global-room-select');
      if (globalRoom) globalRoom.value = roomName;
      const mapRoomSelect = document.getElementById('map-room-select');
      if (mapRoomSelect) mapRoomSelect.value = roomName;
    }
    navigate('pelan');
    setTimeout(() => {
      selectMapRoom(roomName);
    }, 200);
  }

  async function updateLandingStats() {
    try {
      if (!_statsData) {
        const res = await API.call('getDashboardStats');
        if (res && res.success && res.data) {
          _statsData = res.data;
        }
      }
      if (_statsData) {
        const statTotal = document.getElementById('landing-stat-total');
        const statKondisi = document.getElementById('landing-stat-kondisi');
        if (statTotal && _statsData.totalAset) {
          statTotal.innerText = _statsData.totalAset.toLocaleString() + '+';
        }
        if (statKondisi && _statsData.kadarOperasi) {
          statKondisi.innerText = _statsData.kadarOperasi + '%';
        }
      }
    } catch (e) {
      console.warn('Ralat kemaskini statistik laman utama:', e);
    }
  }

  let _activeNavDropdown = null;

  function toggleNavDropdown(menuKey, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const dropdown = document.getElementById('nav-dropdown-' + menuKey);
    const trigger = document.getElementById('nav-btn-' + menuKey);
    
    // Klik kali kedua pada menu yang sama: Tutup dropdown (On another click: Close the dropdown)
    if (_activeNavDropdown === menuKey) {
      closeAllNavDropdowns();
      return;
    }

    // Tutup sebarang dropdown lain terlebih dahulu
    closeAllNavDropdowns();

    // Buka dropdown kecil khusus langsung di bawah tajuk menu berkenaan
    if (dropdown) {
      dropdown.classList.remove('hidden');
      if (trigger) trigger.classList.add('active');
      _activeNavDropdown = menuKey;
    }
  }

  function closeAllNavDropdowns() {
    document.querySelectorAll('.nav-small-dropdown').forEach(dd => {
      dd.classList.add('hidden');
    });
    document.querySelectorAll('.nav-menu-trigger').forEach(btn => {
      btn.classList.remove('active');
    });
    const userDD = document.getElementById('user-dropdown-menu');
    if (userDD) userDD.classList.add('hidden');
    _activeNavDropdown = null;
    _megaMenuOpen = false;
  }

  function toggleUserDropdown(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const dd = document.getElementById('user-dropdown-menu');
    if (!dd) return;
    const isHidden = dd.classList.contains('hidden');
    closeAllNavDropdowns();
    if (isHidden) {
      dd.classList.remove('hidden');
      _activeNavDropdown = 'user';
    }
  }

  // Alias untuk keserasian fungsi sedia ada
  function toggleMegaMenu(menuType, e) {
    toggleNavDropdown(menuType, e);
  }

  function closeMegaMenu() {
    closeAllNavDropdowns();
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
        <div class="px-3.5 pb-3 pt-0 grid grid-cols-2 gap-1.5">
          <button onclick="event.stopPropagation(); App.locateAssetOnMap('${item.ID_Aset}')" class="py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[10px] transition flex items-center justify-center gap-1 border border-amber-200" title="Tunjuk kedudukan di pelan lantai">
            <i class="fa-solid fa-map-location-dot text-[10px] text-amber-600"></i> Peta
          </button>
          <button class="py-1.5 rounded-lg bg-slate-100 hover:bg-upk-cerulean hover:text-white text-slate-700 font-semibold text-[10px] transition flex items-center justify-center gap-1">
            <i class="fa-solid fa-eye text-[10px]"></i> Butiran
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

  // ==========================================================================
  // MODUL PELAN LANTAI INTERAKTIF & PETA LOKASI ASET (FLOOR PLAN ENGINE)
  // ==========================================================================
  let _pelanMode = '3d';
  let _selectedMapRoom = 'BILIK-MEETING';
  let _selectedMapAsset = null;
  let _mapZoom = 1;

  const ROOM_DIRECTORY = {
    'BILIK-MEETING': {
      nama: 'Bilik Mesyuarat Utama (Meeting Room)',
      kod: 'BILIK-MEETING',
      kategori: 'Dewan / Bilik Utama',
      kapasiti: '25 Orang',
      foto: 'assets/rooms/meeting-room.jpg',
      pegawai: 'Ketua Unit UPK'
    },
    'BILIK-ROOM-C': {
      nama: 'Bilik Kaunseling & Kerjaya C (Room C)',
      kod: 'BILIK-ROOM-C',
      kategori: 'Bilik Kaunseling',
      kapasiti: '10 Orang',
      foto: 'assets/rooms/room-c.jpg',
      pegawai: 'Cikgu Siti (Kaunselor Kanan)'
    },
    'BILIK-ROOM-D': {
      nama: 'Bilik Eksekutif & Sumber D (Room D)',
      kod: 'BILIK-ROOM-D',
      kategori: 'Bilik Eksekutif & Sumber',
      kapasiti: '15 Orang',
      foto: 'assets/rooms/room-d.jpg',
      pegawai: 'Pegawai Sumber UPK'
    },
    'BILIK-ROOM-A': {
      nama: 'Bilik Pegawai A (Room A)',
      kod: 'BILIK-ROOM-A',
      kategori: 'Bilik Pegawai',
      kapasiti: '4 Orang',
      foto: 'assets/rooms/room-a.jpg',
      pegawai: 'Cikgu Ahmad (Pegawai Kerjaya A)'
    },
    'BILIK-ROOM-B': {
      nama: 'Bilik Pegawai B (Room B)',
      kod: 'BILIK-ROOM-B',
      kategori: 'Bilik Pegawai',
      kapasiti: '4 Orang',
      foto: 'assets/rooms/room-b.jpg',
      pegawai: 'Pegawai Kerjaya B'
    },
    'BILIK-KITCHEN': {
      nama: 'Dapur & Pantri (Kitchen)',
      kod: 'BILIK-KITCHEN',
      kategori: 'Pantri Kakitangan',
      kapasiti: '8 Orang',
      foto: 'assets/rooms/kitchen.jpg',
      pegawai: 'Penyelia Pantri UPK'
    },
    'BILIK-STORE': {
      nama: 'Bilik Stor & Suis Elektrik',
      kod: 'BILIK-STORE',
      kategori: 'Stor & Utiliti',
      kapasiti: '3 Orang',
      foto: 'assets/rooms/store.jpg',
      pegawai: 'Pegawai Stor & Aset'
    },
    'BILIK-ROOM-TOP': {
      nama: 'Bilik Arkib & Rekod (Room Top)',
      kod: 'BILIK-ROOM-TOP',
      kategori: 'Arkib Rasmi',
      kapasiti: '4 Orang',
      foto: 'assets/rooms/room-top.jpg',
      pegawai: 'Pegawai Arkib'
    },
    'BILIK-OUTDOOR': {
      nama: 'Ruang Terbuka / Laman Luar (Outdoor)',
      kod: 'BILIK-OUTDOOR',
      kategori: 'Ruang Terbuka',
      kapasiti: '15 Orang',
      foto: 'assets/rooms/outdoor.jpg',
      pegawai: 'Penyelia Bangunan'
    },
    'BILIK-WALKWAY': {
      nama: 'Laluan Koridor Utama (Walkway)',
      kod: 'BILIK-WALKWAY',
      kategori: 'Koridor',
      kapasiti: 'Laluan Pergerakan',
      foto: 'assets/rooms/walkway-center.jpg',
      pegawai: 'Semua Kakitangan'
    },
    'TANDAS-NORTH': {
      nama: 'Tandas Sayap Utara',
      kod: 'TANDAS-NORTH',
      kategori: 'Kemudahan Sanitari',
      kapasiti: '1 Orang',
      foto: 'assets/rooms/walkway-top.jpg',
      pegawai: 'Penyelia Kebersihan'
    },
    'TANDAS-1': {
      nama: 'Tandas Kakitangan 1',
      kod: 'TANDAS-1',
      kategori: 'Kemudahan Sanitari',
      kapasiti: '1 Orang',
      foto: 'assets/rooms/walkway-center.jpg',
      pegawai: 'Penyelia Kebersihan'
    },
    'TANDAS-2': {
      nama: 'Tandas Kakitangan 2',
      kod: 'TANDAS-2',
      kategori: 'Kemudahan Sanitari',
      kapasiti: '1 Orang',
      foto: 'assets/rooms/walkway-center.jpg',
      pegawai: 'Penyelia Kebersihan'
    },
    'TANDAS-3': {
      nama: 'Tandas Tetamu 3',
      kod: 'TANDAS-3',
      kategori: 'Kemudahan Sanitari',
      kapasiti: '1 Orang',
      foto: 'assets/rooms/walkway-center.jpg',
      pegawai: 'Penyelia Kebersihan'
    },
    'TANDAS-4': {
      nama: 'Tandas 4',
      kod: 'TANDAS-4',
      kategori: 'Kemudahan Sanitari',
      kapasiti: '1 Orang',
      foto: 'assets/rooms/walkway-center.jpg',
      pegawai: 'Penyelia Kebersihan'
    },
    'TANDAS-5': {
      nama: 'Tandas 5',
      kod: 'TANDAS-5',
      kategori: 'Kemudahan Sanitari',
      kapasiti: '1 Orang',
      foto: 'assets/rooms/walkway-center.jpg',
      pegawai: 'Penyelia Kebersihan'
    },
    'SUIS-AC': {
      nama: 'Panel Suis Penghawa Dingin',
      kod: 'SUIS-AC',
      kategori: 'Utiliti Elektrik',
      kapasiti: 'Utiliti',
      foto: 'assets/rooms/store.jpg',
      pegawai: 'Juruteknik Elektrik'
    },
    'ALMARI-MASUK': {
      nama: 'Almari Masuk (Walk-in Closet)',
      kod: 'ALMARI-MASUK',
      kategori: 'Stor Simpanan',
      kapasiti: 'Simpanan',
      foto: 'assets/rooms/store.jpg',
      pegawai: 'Pegawai Sumber'
    },
    'ALMARI-STOR': {
      nama: 'Almari Stor Bawah',
      kod: 'ALMARI-STOR',
      kategori: 'Stor Simpanan',
      kapasiti: 'Simpanan',
      foto: 'assets/rooms/store.jpg',
      pegawai: 'Pegawai Stor'
    }
  };

  async function loadPelanData() {
    if (!_katalogData || !_katalogData.length) {
      await loadKatalogData();
    }
    populatePelanBilikFilter();
    renderMapMarkers();
    selectMapRoom(_selectedMapRoom || 'BILIK-MEETING');
  }

  function populatePelanBilikFilter() {
    const select = document.getElementById('pelan-bilik-select');
    if (!select) return;
    select.innerHTML = '<option value="Semua">Semua Bilik UPK</option>';
    Object.keys(ROOM_DIRECTORY).forEach(key => {
      const r = ROOM_DIRECTORY[key];
      select.innerHTML += `<option value="${key}">${r.nama}</option>`;
    });
  }

  function renderMapMarkers(filterKeyword = '') {
    const container2D = document.getElementById('map-asset-markers');
    const container3D = document.getElementById('map3d-asset-markers');

    const kw = (filterKeyword || '').toLowerCase().trim();
    let items = _katalogData.filter(item => (item.map_x && item.map_y) || (item.map3d_x && item.map3d_y));

    if (kw) {
      items = items.filter(item => 
        (item.Nama_Barang || '').toLowerCase().includes(kw) ||
        (item.ID_Aset || '').toLowerCase().includes(kw) ||
        (item.Buku_Simpanan || '').toLowerCase().includes(kw) ||
        (item.Lokasi_Bilik || '').toLowerCase().includes(kw)
      );
    }

    // Render penanda pada 2D SVG Blueprint
    if (container2D) {
      container2D.innerHTML = items.filter(item => item.map_x && item.map_y).map(item => {
        let color = '#10B981'; // Baik
        if (item.Status_Aset === 'Dalam Penyelenggaraan') color = '#F59E0B';
        if (item.Status_Aset === 'Cadangan Pelupusan' || item.Status_Aset === 'Dilupuskan') color = '#EF4444';
        const isActive = _selectedMapAsset === item.ID_Aset;

        return `
          <g class="asset-marker ${isActive ? 'marker-active' : ''}" 
             id="marker-${item.ID_Aset}" 
             data-asset-id="${item.ID_Aset}"
             transform="translate(${item.map_x}, ${item.map_y})" 
             onclick="App.onMarkerClick('${item.ID_Aset}', event)">
            <circle class="radar-pulse" r="10" stroke="${color}" stroke-width="2" fill="${color}" fill-opacity="0.25" />
            <circle r="12" fill="${color}" stroke="#FFFFFF" stroke-width="2.5" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.25))" />
            <rect x="-24" y="-22" width="48" height="12" rx="3" fill="#0F172A" fill-opacity="0.85" />
            <text x="0" y="-13" text-anchor="middle" font-size="7" font-weight="700" fill="#FFFFFF" font-family="monospace">${item.ID_Aset}</text>
          </g>
        `;
      }).join('');
    }

    // Render penanda pada Pelan 3D Isometrik
    if (container3D) {
      container3D.innerHTML = items.map(item => {
        const x3d = item.map3d_x || (item.map_x ? (item.map_x * 1024 / 850) : 512);
        const y3d = item.map3d_y || (item.map_y ? (item.map_y * 683 / 720) : 341);
        let color = '#10B981';
        if (item.Status_Aset === 'Dalam Penyelenggaraan') color = '#F59E0B';
        if (item.Status_Aset === 'Cadangan Pelupusan' || item.Status_Aset === 'Dilupuskan') color = '#EF4444';
        const isActive = _selectedMapAsset === item.ID_Aset;

        return `
          <g class="asset-marker ${isActive ? 'marker-active' : ''}" 
             id="marker3d-${item.ID_Aset}" 
             data-asset-id="${item.ID_Aset}"
             transform="translate(${x3d}, ${y3d})" 
             onclick="App.onMarkerClick('${item.ID_Aset}', event)">
            <circle class="radar-pulse" r="12" stroke="${color}" stroke-width="2.5" fill="${color}" fill-opacity="0.3" />
            <circle r="13" fill="${color}" stroke="#FFFFFF" stroke-width="3" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))" />
            <rect x="-26" y="-24" width="52" height="13" rx="3" fill="#0F172A" fill-opacity="0.9" />
            <text x="0" y="-14" text-anchor="middle" font-size="7.5" font-weight="700" fill="#FFFFFF" font-family="monospace">${item.ID_Aset}</text>
          </g>
        `;
      }).join('');
    }
  }

  function selectMapRoom(roomId) {
    _selectedMapRoom = roomId;

    // Padamkan kelas aktif pada semua bilik (2D dan 3D)
    document.querySelectorAll('.svg-room').forEach(el => el.classList.remove('active-room'));

    // Aktifkan bilik yang dipilih
    const targetEls = document.querySelectorAll(`[data-room-id="${roomId}"]`);
    targetEls.forEach(el => el.classList.add('active-room'));

    // Selaraskan nilai dropdown bilik
    const select = document.getElementById('pelan-bilik-select');
    if (select && select.value !== roomId) select.value = roomId;

    // Ambil metadata bilik
    const rInfo = ROOM_DIRECTORY[roomId] || {
      nama: roomId,
      kod: roomId,
      kategori: 'Ruang UPK',
      kapasiti: 'Fleksibel',
      foto: 'assets/hero-isometric.png',
      pegawai: 'Pentadbiran UPK'
    };

    // Kemas kini panel pemeriksaan bilik
    const imgEl = document.getElementById('inspect-room-img');
    const nameEl = document.getElementById('inspect-room-name');
    const codeEl = document.getElementById('inspect-room-code');
    const catEl = document.getElementById('inspect-room-category-badge');
    const capEl = document.getElementById('inspect-room-capacity');

    if (imgEl) imgEl.src = rInfo.foto;
    if (nameEl) nameEl.textContent = rInfo.nama;
    if (codeEl) codeEl.textContent = rInfo.kod;
    if (catEl) catEl.textContent = rInfo.kategori;
    if (capEl) capEl.textContent = rInfo.kapasiti;

    // Tapis aset di dalam bilik ini
    const roomItems = _katalogData.filter(a => {
      if (a.map_bilik_id === roomId) return true;
      const bStr = (a.Lokasi_Bilik || '').toLowerCase();
      const rStr = (rInfo.nama || '').toLowerCase();
      if (rStr.includes('meeting') && bStr.includes('mesyuarat')) return true;
      if (rStr.includes('kitchen') && (bStr.includes('dapur') || bStr.includes('pantri'))) return true;
      if (rStr.includes('store') && bStr.includes('stor')) return true;
      if (rStr.includes('room a') && bStr.includes('bilik a')) return true;
      if (rStr.includes('room b') && bStr.includes('bilik b')) return true;
      if (rStr.includes('room c') && (bStr.includes('bilik c') || bStr.includes('kaunseling'))) return true;
      if (rStr.includes('room d') && (bStr.includes('bilik d') || bStr.includes('sumber'))) return true;
      if (rStr.includes('room top') && bStr.includes('arkib')) return true;
      return false;
    });

    const totalEl = document.getElementById('inspect-room-total-count');
    if (totalEl) totalEl.textContent = `${roomItems.length} Unit`;

    // Kira pecahan status kesihatan aset
    const baikCount = roomItems.filter(a => a.Status_Aset === 'Beroperasi Baik').length;
    const maintCount = roomItems.filter(a => a.Status_Aset === 'Dalam Penyelenggaraan').length;
    const rosakCount = roomItems.filter(a => a.Status_Aset === 'Cadangan Pelupusan' || a.Status_Aset === 'Dilupuskan').length;
    const total = roomItems.length || 1;

    const pBaik = Math.round((baikCount / total) * 100);
    const pMaint = Math.round((maintCount / total) * 100);
    const pRosak = Math.round((rosakCount / total) * 100);

    const bBaik = document.getElementById('inspect-bar-baik');
    const bMaint = document.getElementById('inspect-bar-maint');
    const bRosak = document.getElementById('inspect-bar-rosak');
    if (bBaik) bBaik.style.width = pBaik + '%';
    if (bMaint) bMaint.style.width = pMaint + '%';
    if (bRosak) bRosak.style.width = pRosak + '%';

    const tBaik = document.getElementById('inspect-txt-baik');
    const tMaint = document.getElementById('inspect-txt-maint');
    const tRosak = document.getElementById('inspect-txt-rosak');
    if (tBaik) tBaik.textContent = `${pBaik}% Baik`;
    if (tMaint) tMaint.textContent = `${pMaint}% Selenggara`;
    if (tRosak) tRosak.textContent = `${pRosak}% Rosak`;

    // Paparkan senarai item di bilik
    const listEl = document.getElementById('inspect-room-items-list');
    if (listEl) {
      if (!roomItems.length) {
        listEl.innerHTML = `
          <div class="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <i class="fa-solid fa-box-open text-2xl text-slate-300 mb-1"></i>
            <p class="text-xs">Tiada aset berdaftar di bilik ini setakat ini.</p>
          </div>
        `;
      } else {
        listEl.innerHTML = roomItems.map(item => `
          <div class="p-2.5 rounded-xl border border-slate-100 hover:border-upk-cerulean bg-slate-50/70 hover:bg-white transition flex items-center justify-between gap-3 cursor-pointer group" onclick="App.locateAssetOnMap('${item.ID_Aset}')">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="${item.URL_Foto_Asal || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=150&q=80'}" class="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0">
              <div class="min-w-0">
                <p class="font-bold text-xs text-slate-800 truncate group-hover:text-upk-cerulean transition">${item.Nama_Barang}</p>
                <div class="flex items-center gap-1.5 mt-0.5 text-[10px]">
                  <span class="font-mono text-slate-500">${item.ID_Aset}</span>
                  <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span class="${getStatusBadgeClass(item.Status_Aset)} !py-0 !px-1.5 !text-[9px]">${item.Status_Aset}</span>
                </div>
              </div>
            </div>
            <button class="w-7 h-7 rounded-lg bg-white border border-slate-200 group-hover:bg-upk-cerulean group-hover:text-white text-slate-400 flex items-center justify-center shrink-0 transition" title="Fokus di Peta">
              <i class="fa-solid fa-crosshairs text-xs"></i>
            </button>
          </div>
        `).join('');
      }
    }
  }

  function onMarkerClick(assetId, event) {
    if (event) event.stopPropagation();
    _selectedMapAsset = assetId;
    const item = _katalogData.find(a => a.ID_Aset === assetId);
    if (!item) return;

    if (item.map_bilik_id) {
      selectMapRoom(item.map_bilik_id);
    }

    renderMapMarkers();
    showAssetPopover(item, event);
  }

  function showAssetPopover(item, event) {
    const popover = document.getElementById('map-asset-popover');
    if (!popover) return;

    const container = document.querySelector('.floor-map-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      let left = 0;
      let top = 0;

      // Cari elemen penanda fizikal di skrin untuk kedudukan pixel-sempurna
      const markerEl = (event && event.currentTarget) || document.getElementById(`marker3d-${item.ID_Aset}`) || document.getElementById(`marker-${item.ID_Aset}`);
      if (markerEl && typeof markerEl.getBoundingClientRect === 'function') {
        const mRect = markerEl.getBoundingClientRect();
        left = (mRect.left - rect.left) + (mRect.width / 2) - 140;
        top = (mRect.bottom - rect.top) + 10;
        if (top + 260 > container.offsetHeight) {
          top = (mRect.top - rect.top) - 265;
        }
      } else if (_pelanMode === '3d' && item.map3d_x && item.map3d_y) {
        const scaleX = rect.width / 1024;
        const scaleY = (rect.width * (683 / 1024)) / 683;
        left = (item.map3d_x * scaleX) - 140;
        top = (item.map3d_y * scaleY) + 20;
      } else if (item.map_x && item.map_y) {
        const scaleX = rect.width / 850;
        const scaleY = (rect.width * (720 / 850)) / 720;
        left = (item.map_x * scaleX) - 140;
        top = (item.map_y * scaleY) + 20;
      }

      if (left < 10) left = 10;
      if (left + 290 > rect.width) left = Math.max(10, rect.width - 295);
      if (top < 10) top = 10;

      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
    }

    popover.innerHTML = `
      <div class="relative">
        <button onclick="App.closeAssetPopover()" class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs z-10">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="flex gap-3">
          <img src="${item.URL_Foto_Asal || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=300&q=80'}" class="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50">
          <div class="min-w-0 flex-1">
            <span class="${getStatusBadgeClass(item.Status_Aset)} !text-[9px] !py-0.5 !px-1.5 mb-1 inline-block">${item.Status_Aset}</span>
            <h4 class="font-bold text-xs text-slate-900 leading-tight truncate">${item.Nama_Barang}</h4>
            <p class="font-mono text-[10px] text-slate-500 mt-0.5">${item.ID_Aset}</p>
            <p class="text-[10px] text-slate-600 mt-1 flex items-center gap-1 truncate">
              <i class="fa-solid fa-map-pin text-amber-500 text-[9px]"></i> ${item.Lokasi_Bilik}
            </p>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-center">
          <button onclick="App.openDetailModal('${item.ID_Aset}')" class="py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition">
            Butiran
          </button>
          <button onclick="App.openAduanModalWithAsset('${item.ID_Aset}')" class="py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-semibold transition border border-amber-200">
            Aduan
          </button>
          <button onclick="App.openPindahBilikModalWithAsset('${item.ID_Aset}')" class="py-1 rounded-lg bg-upk-navy hover:bg-upk-cerulean text-white text-[10px] font-semibold transition">
            Pindah
          </button>
        </div>
      </div>
    `;

    popover.classList.remove('hidden');
  }

  function closeAssetPopover() {
    const popover = document.getElementById('map-asset-popover');
    if (popover) popover.classList.add('hidden');
    _selectedMapAsset = null;
    renderMapMarkers();
  }

  function locateAssetOnMap(assetId) {
    navigate('pelan');
    const item = _katalogData.find(a => a.ID_Aset === assetId);
    if (!item) return;

    if (item.map_bilik_id) {
      selectMapRoom(item.map_bilik_id);
    }

    _selectedMapAsset = assetId;
    renderMapMarkers();

    setTimeout(() => {
      showAssetPopover(item);
    }, 200);
  }

  function locateAssetFromDetailModal() {
    if (_selectedAsetDetail) {
      const id = _selectedAsetDetail.ID_Aset;
      closeDetailModal();
      locateAssetOnMap(id);
    }
  }

  function setPelanMode(mode) {
    _pelanMode = mode;
    const v3d = document.getElementById('pelan-3d-viewport');
    const svgView = document.getElementById('pelan-svg-viewport');
    const srcView = document.getElementById('pelan-source-viewport');
    const btn3d = document.getElementById('btn-pelan-mode-3d');
    const btnSvg = document.getElementById('btn-pelan-mode-svg');
    const btnSrc = document.getElementById('btn-pelan-mode-source');

    [v3d, svgView, srcView].forEach(v => { if (v) v.classList.add('hidden'); });
    [btn3d, btnSvg, btnSrc].forEach(b => { 
      if (b) {
        b.classList.remove('bg-white', 'text-upk-navy', 'shadow-sm');
        b.classList.add('text-slate-600');
      }
    });

    if (mode === '3d') {
      if (v3d) v3d.classList.remove('hidden');
      if (btn3d) {
        btn3d.classList.add('bg-white', 'text-upk-navy', 'shadow-sm');
        btn3d.classList.remove('text-slate-600');
      }
    } else if (mode === 'svg') {
      if (svgView) svgView.classList.remove('hidden');
      if (btnSvg) {
        btnSvg.classList.add('bg-white', 'text-upk-navy', 'shadow-sm');
        btnSvg.classList.remove('text-slate-600');
      }
    } else {
      if (srcView) srcView.classList.remove('hidden');
      if (btnSrc) {
        btnSrc.classList.add('bg-white', 'text-upk-navy', 'shadow-sm');
        btnSrc.classList.remove('text-slate-600');
      }
    }
    closeAssetPopover();
  }

  function zoomMap(factor) {
    _mapZoom = Math.max(0.6, Math.min(2.5, _mapZoom * factor));
    const svg = document.getElementById('svg-upk-floor-plan');
    const box3d = document.querySelector('#pelan-3d-viewport > div');
    if (svg) {
      svg.style.transform = `scale(${_mapZoom})`;
      svg.style.transformOrigin = 'center center';
      svg.style.transition = 'transform 0.25s ease';
    }
    if (box3d) {
      box3d.style.transform = `scale(${_mapZoom})`;
      box3d.style.transformOrigin = 'center center';
      box3d.style.transition = 'transform 0.25s ease';
    }
  }

  function resetMapZoom() {
    _mapZoom = 1;
    const svg = document.getElementById('svg-upk-floor-plan');
    const box3d = document.querySelector('#pelan-3d-viewport > div');
    if (svg) svg.style.transform = 'scale(1)';
    if (box3d) box3d.style.transform = 'scale(1)';
  }

  function onPelanSearch(kw) {
    renderMapMarkers(kw);
    const matched = _katalogData.filter(a => 
      (a.Nama_Barang || '').toLowerCase().includes(kw.toLowerCase()) ||
      (a.ID_Aset || '').toLowerCase().includes(kw.toLowerCase())
    );
    if (matched.length === 1 && matched[0].map_bilik_id) {
      selectMapRoom(matched[0].map_bilik_id);
    }
  }

  function onPelanBilikFilter(roomId) {
    if (roomId === 'Semua') {
      document.querySelectorAll('.svg-room').forEach(el => el.classList.remove('active-room'));
      renderMapMarkers();
    } else {
      selectMapRoom(roomId);
    }
  }

  function openDaftarAsetModalWithRoom() {
    openDaftarAsetModal();
    const select = document.getElementById('daftar-bilik-select');
    if (select && _selectedMapRoom) {
      const rInfo = ROOM_DIRECTORY[_selectedMapRoom];
      if (rInfo) select.value = rInfo.nama;
    }
  }

  function viewRoomStockCard() {
    const rInfo = ROOM_DIRECTORY[_selectedMapRoom];
    navigate('stockcard');
    const filter = document.getElementById('stock-bilik-filter');
    if (filter && rInfo) {
      filter.value = rInfo.nama;
      filterStockCardList();
    }
  }

  function openAduanModalWithAsset(assetId) {
    closeAssetPopover();
    const ast = _katalogData.find(a => a.ID_Aset === assetId);
    if (!ast) return;
    openAduanModal(ast.ID_Aset, ast.Nama_Barang, ast.Lokasi_Bilik);
  }

  function openPindahBilikModalWithAsset(assetId) {
    closeAssetPopover();
    openPindahBilikModal(assetId);
  }

  // --------------------------------------------------------------------------
  // MODUL PEMERIKSA KOORDINAT PELAN (COORDINATE INSPECTOR HUD)
  // --------------------------------------------------------------------------
  let _isCoordInspectorActive = false;
  let _lastInspectedCoords = { x: 512, y: 341, mode: '3d' };
  let _coordInspectorEventsAttached = false;

  function toggleCoordinateInspector() {
    _isCoordInspectorActive = !_isCoordInspectorActive;
    const btn = document.getElementById('btn-toggle-coord-inspector');
    const hud = document.getElementById('coord-inspector-hud');
    const svg3d = document.getElementById('svg-3d-overlay');
    const svg2d = document.getElementById('svg-upk-floor-plan');

    if (_isCoordInspectorActive) {
      if (btn) {
        btn.classList.add('bg-amber-100', 'text-amber-900', 'ring-2', 'ring-amber-400');
        btn.classList.remove('text-slate-700');
      }
      if (hud) hud.classList.remove('hidden');
      if (svg3d) svg3d.style.cursor = 'crosshair';
      if (svg2d) svg2d.style.cursor = 'crosshair';
      showToast('Pemeriksa Koordinat Diaktifkan! Klik mana-mana titik pada pelan.', 'info');
      initCoordinateInspectorEvents();
    } else {
      if (btn) {
        btn.classList.remove('bg-amber-100', 'text-amber-900', 'ring-2', 'ring-amber-400');
        btn.classList.add('text-slate-700');
      }
      if (hud) hud.classList.add('hidden');
      if (svg3d) svg3d.style.cursor = '';
      if (svg2d) svg2d.style.cursor = '';
      clearInspectorMarker();
    }
  }

  function initCoordinateInspectorEvents() {
    if (_coordInspectorEventsAttached) return;
    _coordInspectorEventsAttached = true;

    const svg3d = document.getElementById('svg-3d-overlay');
    const svg2d = document.getElementById('svg-upk-floor-plan');

    [
      { el: svg3d, mode: '3d' },
      { el: svg2d, mode: 'svg' }
    ].forEach(({ el, mode }) => {
      if (!el) return;

      el.addEventListener('mousemove', (e) => {
        if (!_isCoordInspectorActive) return;
        const pt = getSvgCoordinates(el, e);
        if (!pt) return;
        _lastInspectedCoords = { x: pt.x, y: pt.y, mode };
        updateHudDisplay(pt.x, pt.y, mode);
      });

      el.addEventListener('click', (e) => {
        if (!_isCoordInspectorActive) return;
        const pt = getSvgCoordinates(el, e);
        if (!pt) return;
        _lastInspectedCoords = { x: pt.x, y: pt.y, mode };
        updateHudDisplay(pt.x, pt.y, mode);
        renderInspectorTarget(pt.x, pt.y, mode);
        copyCurrentCoordinate();
      });
    });
  }

  function getSvgCoordinates(svgEl, event) {
    try {
      const pt = svgEl.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const ctm = svgEl.getScreenCTM();
      if (!ctm) return null;
      const svgP = pt.matrixTransform(ctm.inverse());
      return {
        x: Math.round(svgP.x),
        y: Math.round(svgP.y)
      };
    } catch (err) {
      return null;
    }
  }

  function updateHudDisplay(x, y, mode) {
    const disp = document.getElementById('hud-coord-display');
    const hint = document.getElementById('hud-room-hint');
    if (disp) {
      disp.textContent = `X: ${x}, Y: ${y} (${mode === '3d' ? '3D' : '2D'})`;
    }
    if (hint) {
      hint.textContent = `Kod: ${mode === '3d' ? 'map3d_x' : 'map_x'}: ${x}, ${mode === '3d' ? 'map3d_y' : 'map_y'}: ${y} (Klik untuk menyalin)`;
    }
  }

  function renderInspectorTarget(x, y, mode) {
    const g3d = document.getElementById('map3d-inspector-marker');
    const g2d = document.getElementById('map-inspector-marker');
    const targetG = mode === '3d' ? g3d : g2d;
    if (!targetG) return;

    targetG.innerHTML = `
      <g transform="translate(${x}, ${y})" class="pointer-events-none">
        <circle r="18" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-dasharray="3,3" opacity="0.95">
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="5s" repeatCount="indefinite"/>
        </circle>
        <circle r="6" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2"/>
        <line x1="-24" y1="0" x2="24" y2="0" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-24" x2="0" y2="24" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
        <rect x="-35" y="-36" width="70" height="16" rx="4" fill="#0F172A" opacity="0.95"/>
        <text x="0" y="-24" text-anchor="middle" font-size="9" font-weight="700" fill="#FDE68A" font-family="monospace">${x}, ${y}</text>
      </g>
    `;
  }

  function clearInspectorMarker() {
    const g3d = document.getElementById('map3d-inspector-marker');
    const g2d = document.getElementById('map-inspector-marker');
    if (g3d) g3d.innerHTML = '';
    if (g2d) g2d.innerHTML = '';
  }

  function copyCurrentCoordinate() {
    const { x, y, mode } = _lastInspectedCoords;
    const snippet = mode === '3d'
      ? `map3d_x: ${x}, map3d_y: ${y}`
      : `map_x: ${x}, map_y: ${y}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(snippet).then(() => {
        showToast(`Koordinat Disalin! (${snippet})`, 'success');
      }).catch(() => {
        prompt('Salin kod koordinat berikut:', snippet);
      });
    } else {
      prompt('Salin kod koordinat berikut:', snippet);
    }
  }

  // Mulakan aplikasi apabila DOM siap
  document.addEventListener('DOMContentLoaded', init);

  return {
    navigate,
    onLandingSearch,
    filterByRoomLanding,
    toggleNavDropdown,
    closeAllNavDropdowns,
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
    showMigrationModal,
    // Modul Pelan Lantai & Peta Aset
    selectMapRoom,
    onMarkerClick,
    showAssetPopover,
    closeAssetPopover,
    locateAssetOnMap,
    locateAssetFromDetailModal,
    setPelanMode,
    zoomMap,
    resetMapZoom,
    onPelanSearch,
    onPelanBilikFilter,
    openDaftarAsetModalWithRoom,
    viewRoomStockCard,
    openAduanModalWithAsset,
    openPindahBilikModalWithAsset,
    // Pemeriksa Koordinat
    toggleCoordinateInspector,
    copyCurrentCoordinate
  };
})();
