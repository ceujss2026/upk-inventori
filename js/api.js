/**
 * ============================================================================
 * e-Inventori UPK — Frontend: js/api.js
 * Klien API Berkelajuan Tinggi, Anti-CORS, Deduplikasi In-Flight & Cache SWR
 * Sesuai panduan: /gas-scale-turbo & /gas-pro-api
 * ============================================================================
 */

const API = (function () {
  const _inflight = {};
  let _writeEpoch = 0;
  const _memCache = {};

  // Token sesi aktif disimpan dalam localStorage
  function getToken() {
    return localStorage.getItem('upk_session_token') || '';
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem('upk_session_token', token);
    } else {
      localStorage.removeItem('upk_session_token');
    }
  }

  function getUser() {
    try {
      const u = localStorage.getItem('upk_user_profile');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  function setUser(u) {
    if (u) {
      localStorage.setItem('upk_user_profile', JSON.stringify(u));
    } else {
      localStorage.removeItem('upk_user_profile');
    }
  }

  /**
   * Panggilan API Utama (GET & POST) dengan perlindungan Anti-CORS dan Deduplikasi
   */
  async function call(action, data = {}, isPost = false) {
    const isMock = !CONFIG.GAS_URL || CONFIG.GAS_URL.includes('YOUR_DEPLOYED_GAS_ID');

    // Jika belum bersambung ke GAS sebenar, gunakan simulasi Mock Data yang lancar
    if (isMock) {
      return mockApiHandler(action, data, isPost);
    }

    // Deduplikasi Permintaan Bacaan (In-Flight Sharing)
    if (!isPost && /^(get|boot|list|fetch|read)/i.test(action)) {
      const cacheKey = _writeEpoch + '|' + action + '|' + JSON.stringify(data);
      if (_inflight[cacheKey]) {
        return _inflight[cacheKey];
      }

      // Semak Memory Cache SWR
      const now = Date.now();
      if (_memCache[cacheKey] && (now - _memCache[cacheKey].time < CONFIG.CACHE_TTL_MS)) {
        return _memCache[cacheKey].data;
      }

      const promise = (async () => {
        try {
          const params = new URLSearchParams(Object.assign({ action }, data));
          const res = await fetch(`${CONFIG.GAS_URL}?${params.toString()}`);
          const json = await res.json();
          if (json && json.success) {
            _memCache[cacheKey] = { time: Date.now(), data: json.data };
          }
          return json;
        } finally {
          delete _inflight[cacheKey];
        }
      })();

      _inflight[cacheKey] = promise;
      return promise;
    }

    // Operasi Tulis (POST) — Menaikkan Epoch Tulis untuk Menghanguskan Cache
    if (isPost) {
      _writeEpoch++;
      try {
        const payload = {
          action: action,
          token: getToken(),
          data: data
        };

        // KRUSIAL CORS: Wajib gunakan 'Content-Type': 'text/plain;charset=utf-8'
        const res = await fetch(CONFIG.GAS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (json && json.sesiTamat) {
          setToken('');
          setUser(null);
          window.location.reload();
        }
        return json;
      } catch (err) {
        console.error('API POST Error:', err);
        return { success: false, message: 'Gagal menghubungi pelayan: ' + err.message };
      }
    }

    // Permintaan GET Biasa
    try {
      const params = new URLSearchParams(Object.assign({ action }, data));
      const res = await fetch(`${CONFIG.GAS_URL}?${params.toString()}`);
      return await res.json();
    } catch (err) {
      console.error('API GET Error:', err);
      return { success: false, message: 'Gagal memuat turun data: ' + err.message };
    }
  }

  // ==========================================================================
  // PENGENDALI MOCK DATA (Untuk Pratonton Segera Tanpa Kelewatan)
  // ==========================================================================
  async function mockApiHandler(action, data, isPost) {
    await new Promise(r => setTimeout(r, 60)); // Simulasi pantas 60ms

    // Dapatkan data setempat dari localStorage atau data awal
    let mockAset = JSON.parse(localStorage.getItem('upk_mock_aset') || 'null');
    if (!mockAset) {
      mockAset = [
        {
          ID_Aset: 'UPK-AST-001',
          No_Siri_Daftar: 'BRU/2024/0014',
          Nama_Barang: 'Komputer Riba Dell Latitude 3420',
          Buku_Simpanan: 'Peralatan Komputer & IT',
          Kategori: 'Aset Alih',
          Lokasi_Bilik: 'Makmal Kerjaya UPK (Bilik Komputer)',
          Baki_Stok: 1,
          Paras_Amaran_Minimum: 0,
          Status_Aset: 'Beroperasi Baik',
          URL_Foto_Asal: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
          URL_QR_Code: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-AST-001',
          Tarikh_Daftar: '2024-01-15 08:30:00',
          Harga_Asal_BND: 1250.00,
          Pegawai_Penanggungjawab: 'Cikgu Ahmad (Ketua Makmal)',
          Catatan_Spesifikasi: 'Intel Core i5 11th Gen, 16GB RAM, 512GB SSD'
        },
        {
          ID_Aset: 'UPK-AST-002',
          No_Siri_Daftar: 'BRU/2024/0088',
          Nama_Barang: 'Kerusi Pejabat Ergonomik Beroda',
          Buku_Simpanan: 'Perabot Pejabat',
          Kategori: 'Aset Alih',
          Lokasi_Bilik: 'Bilik Kaunseling & Ujian Kerjaya',
          Baki_Stok: 1,
          Paras_Amaran_Minimum: 0,
          Status_Aset: 'Beroperasi Baik',
          URL_Foto_Asal: 'https://images.unsplash.com/photo-1580481077194-c7448a0fd77d?auto=format&fit=crop&w=800&q=80',
          URL_QR_Code: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-AST-002',
          Tarikh_Daftar: '2024-02-10 10:15:00',
          Harga_Asal_BND: 185.00,
          Pegawai_Penanggungjawab: 'Cikgu Siti (Kaunselor)',
          Catatan_Spesifikasi: 'Fabrik mesh hitam dengan penyandar kepala boleh laras'
        },
        {
          ID_Aset: 'UPK-AST-003',
          No_Siri_Daftar: 'BRU/2023/0412',
          Nama_Barang: 'Pencetak HP LaserJet Pro M404dn',
          Buku_Simpanan: 'Peralatan Komputer & IT',
          Kategori: 'Aset Alih',
          Lokasi_Bilik: 'Pejabat Pentadbiran Am UPK',
          Baki_Stok: 1,
          Paras_Amaran_Minimum: 0,
          Status_Aset: 'Dalam Penyelenggaraan',
          URL_Foto_Asal: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=800&q=80',
          URL_QR_Code: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-AST-003',
          Tarikh_Daftar: '2023-08-20 11:00:00',
          Harga_Asal_BND: 420.00,
          Pegawai_Penanggungjawab: 'Pegawai Pentadbiran',
          Catatan_Spesifikasi: 'Pencetak laser monokrom rangkaian'
        },
        {
          ID_Aset: 'UPK-AST-004',
          No_Siri_Daftar: 'BRU/2022/0199',
          Nama_Barang: 'Projektor Epson EB-X06',
          Buku_Simpanan: 'Peralatan Elektrik',
          Kategori: 'Aset Alih',
          Lokasi_Bilik: 'Bilik Mesyuarat Utama UPK',
          Baki_Stok: 1,
          Paras_Amaran_Minimum: 0,
          Status_Aset: 'Cadangan Pelupusan',
          URL_Foto_Asal: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
          URL_QR_Code: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-AST-004',
          Tarikh_Daftar: '2022-04-14 09:00:00',
          Harga_Asal_BND: 680.00,
          Pegawai_Penanggungjawab: 'Ketua Unit UPK',
          Catatan_Spesifikasi: '3600 Lumens XGA, lampu projektor terbakar dan motherboard litar pintas'
        },
        {
          ID_Aset: 'UPK-GNH-001',
          No_Siri_Daftar: 'GNH/2026/001',
          Nama_Barang: 'Kertas A4 80gsm (Double A)',
          Buku_Simpanan: 'Barang Guna Habis',
          Kategori: 'Barang Guna Habis',
          Lokasi_Bilik: 'Stor Inventori & Bekalan Utama',
          Baki_Stok: 4,
          Paras_Amaran_Minimum: 5,
          Status_Aset: 'Beroperasi Baik',
          URL_Foto_Asal: 'https://images.unsplash.com/photo-1589330694653-dad6ef0140be?auto=format&fit=crop&w=800&q=80',
          URL_QR_Code: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-GNH-001',
          Tarikh_Daftar: '2026-01-05 14:00:00',
          Harga_Asal_BND: 4.80,
          Pegawai_Penanggungjawab: 'Pegawai Stor',
          Catatan_Spesifikasi: '1 Rim = 500 keping'
        }
      ];
      localStorage.setItem('upk_mock_aset', JSON.stringify(mockAset));
    }

    let mockAduan = JSON.parse(localStorage.getItem('upk_mock_aduan') || '[]');
    if (!mockAduan.length) {
      mockAduan = [
        {
          ID_Aduan: 'ADU-2611-001',
          ID_Aset: 'UPK-AST-004',
          Tarikh_Aduan: '2026-11-19 14:20:00',
          Nama_Pelapor: 'Cikgu Ahmad',
          Emel_Pelapor: 'ahmad@moe.gov.bn',
          No_Tel_Pelapor: '6738123456',
          Bahagian_Rosak: 'Lampu Projektor & Papan Litar',
          Keterangan_Kerosakan: 'Projektor mengeluarkan asap kecil dan berbau hangit semasa mesyuarat unit. Tidak dapat dihidupkan lagi.',
          Tahap_Impak: 'Kritikal - Tidak Boleh Digunakan',
          URL_Foto_Rosak: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80',
          Status_Aduan: 'Menunggu Sokongan Pelupusan',
          Ulasan_Teknikal: 'Motherboard rosak teruk terbakar akibat litar pintas, kos gantian dianggarkan BND $490 (melebihi 70% harga pembelian asal). Tidak ekonomik dibaiki.',
          Cadangan_Tindakan: 'Cadangan Pelupusan',
          Anggaran_Kos_BND: 490,
          Pegawai_Pemeriksa: 'Hj Ramli (Juruteknik Kanan)',
          Tarikh_Pemeriksaan: '2026-11-20 10:00:00',
          Nama_Barang: 'Projektor Epson EB-X06',
          Lokasi_Bilik: 'Bilik Mesyuarat Utama UPK',
          URL_Foto_Asal: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80'
        }
      ];
      localStorage.setItem('upk_mock_aduan', JSON.stringify(mockAduan));
    }

    let mockPelupusan = JSON.parse(localStorage.getItem('upk_mock_lps') || '[]');
    if (!mockPelupusan.length) {
      mockPelupusan = [
        {
          ID_Pelupusan: 'LPS-2611-001',
          ID_Aset: 'UPK-AST-004',
          ID_Aduan: 'ADU-2611-001',
          Tarikh_Permohonan: '2026-11-20 10:30:00',
          Pegawai_Pemeriksa: 'Hj Ramli (Juruteknik Kanan)',
          Laporan_Teknikal: 'Motherboard rosak teruk terbakar akibat litar pintas. Tidak ekonomik dibaiki.',
          Justifikasi_Pelupusan: 'Rosak Teruk & Tidak Ekonomik Dibaiki',
          Status_Kelulusan: 'Menunggu Sokongan Ketua Unit',
          Tarikh_Kelulusan: '',
          Pegawai_Pengesah: '',
          Catatan_Kelulusan: '',
          URL_PDF_Rasmi: '',
          Kod_Verifikasi_HMAC: 'HMAC-UPK-983210',
          Nama_Barang: 'Projektor Epson EB-X06',
          Lokasi_Bilik: 'Bilik Mesyuarat Utama UPK',
          Harga_Asal_BND: 680.00,
          URL_Foto_Asal: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
          URL_Foto_Rosak: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80',
          Bahagian_Rosak: 'Lampu Projektor & Papan Litar'
        }
      ];
      localStorage.setItem('upk_mock_lps', JSON.stringify(mockPelupusan));
    }

    switch (action) {
      case 'boot':
        return {
          success: true,
          data: {
            namaAplikasi: CONFIG.APP_NAME,
            versi: CONFIG.VERSION,
            institusi: CONFIG.INSTITUSI,
            kementerian: CONFIG.KEMENTERIAN,
            bukuSimpanan: ['Perabot Pejabat', 'Peralatan Komputer & IT', 'Peralatan Elektrik', 'Barang Guna Habis'],
            statusAsetList: ['Beroperasi Baik', 'Dalam Penyelenggaraan', 'Cadangan Pelupusan', 'Dilupuskan'],
            senaraiBilik: [
              { Kod_Bilik: 'BILIK-01', Nama_Bilik: 'Makmal Kerjaya UPK (Bilik Komputer)' },
              { Kod_Bilik: 'BILIK-02', Nama_Bilik: 'Bilik Kaunseling & Ujian Kerjaya' },
              { Kod_Bilik: 'BILIK-03', Nama_Bilik: 'Pejabat Pentadbiran Am UPK' },
              { Kod_Bilik: 'BILIK-04', Nama_Bilik: 'Bilik Mesyuarat Utama UPK' },
              { Kod_Bilik: 'BILIK-05', Nama_Bilik: 'Stor Inventori & Bekalan Utama' }
            ],
            notifConfig: { waAktif: true, emailAktif: true, fonnteTokenTersamar: 'FNT••••••789' }
          }
        };

      case 'getKatalogAset':
        let hasilAset = mockAset;
        if (data.kategori && data.kategori !== 'Semua') {
          hasilAset = hasilAset.filter(a => a.Buku_Simpanan === data.kategori);
        }
        if (data.bilik && data.bilik !== 'Semua') {
          hasilAset = hasilAset.filter(a => String(a.Lokasi_Bilik).includes(data.bilik));
        }
        if (data.status && data.status !== 'Semua') {
          hasilAset = hasilAset.filter(a => a.Status_Aset === data.status);
        }
        return { success: true, data: hasilAset };

      case 'getDashboardStats':
        const agihan = {};
        mockAset.forEach(a => {
          agihan[a.Lokasi_Bilik] = (agihan[a.Lokasi_Bilik] || 0) + 1;
        });
        return {
          success: true,
          data: {
            totalAset: mockAset.length,
            beroperasiBaik: mockAset.filter(a => a.Status_Aset === 'Beroperasi Baik').length,
            dalamPembaikan: mockAset.filter(a => a.Status_Aset === 'Dalam Penyelenggaraan').length,
            cadanganPelupusan: mockAset.filter(a => a.Status_Aset === 'Cadangan Pelupusan').length,
            dilupuskan: mockAset.filter(a => a.Status_Aset === 'Dilupuskan').length,
            stokKurang: mockAset.filter(a => a.Kategori === 'Barang Guna Habis' && Number(a.Baki_Stok) <= Number(a.Paras_Amaran_Minimum)).length,
            agihanBilik: agihan,
            aduanTerkini: mockAduan.slice(0, 5),
            stokAmaranSenarai: mockAset.filter(a => a.Kategori === 'Barang Guna Habis' && Number(a.Baki_Stok) <= Number(a.Paras_Amaran_Minimum))
          }
        };

      case 'getSenaraiAduan':
        return { success: true, data: mockAduan };

      case 'getSenaraiPelupusan':
        return { success: true, data: mockPelupusan };

      case 'daftarAset':
        const newId = 'UPK-AST-' + String(mockAset.length + 1).padStart(3, '0');
        const itemBaru = Object.assign({
          ID_Aset: newId,
          Status_Aset: 'Beroperasi Baik',
          Tarikh_Daftar: new Date().toISOString().replace('T', ' ').slice(0, 19),
          URL_Foto_Asal: data.fotoBase64 || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
          URL_QR_Code: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + newId
        }, data);
        mockAset.unshift(itemBaru);
        localStorage.setItem('upk_mock_aset', JSON.stringify(mockAset));
        return { success: true, message: 'Aset berjaya didaftarkan!', data: itemBaru };

      case 'pindahBilik':
        const targetAset = mockAset.find(a => a.ID_Aset === data.idAset);
        if (targetAset) {
          targetAset.Lokasi_Bilik = data.bilikTujuan;
          localStorage.setItem('upk_mock_aset', JSON.stringify(mockAset));
        }
        return { success: true, message: 'Aset berjaya dipindahkan ke ' + data.bilikTujuan };

      case 'hantarAduan':
        const aduanId = 'ADU-2611-' + String(mockAduan.length + 1).padStart(3, '0');
        const ast = mockAset.find(a => a.ID_Aset === data.ID_Aset);
        if (ast) ast.Status_Aset = 'Dalam Penyelenggaraan';
        const aduanBaru = Object.assign({
          ID_Aduan: aduanId,
          Tarikh_Aduan: new Date().toISOString().replace('T', ' ').slice(0, 19),
          Status_Aduan: 'Menunggu Semakan Teknikal',
          URL_Foto_Rosak: data.fotoBase64 || 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80',
          Nama_Barang: ast ? ast.Nama_Barang : '',
          Lokasi_Bilik: ast ? ast.Lokasi_Bilik : '',
          URL_Foto_Asal: ast ? ast.URL_Foto_Asal : ''
        }, data);
        mockAduan.unshift(aduanBaru);
        localStorage.setItem('upk_mock_aduan', JSON.stringify(mockAduan));
        localStorage.setItem('upk_mock_aset', JSON.stringify(mockAset));
        return { success: true, message: 'Aduan kerosakan berjaya dihantar!', idAduan: aduanId };

      case 'luluskanPelupusan':
        const lps = mockPelupusan.find(l => l.ID_Pelupusan === data.idPelupusan);
        if (lps) {
          lps.Status_Kelulusan = data.statusKeputusan === 'Disokong & Diluluskan' ? 'Diluluskan' : 'Ditolak';
          lps.Tarikh_Kelulusan = new Date().toISOString().replace('T', ' ').slice(0, 19);
          lps.Pegawai_Pengesah = 'Ketua Unit Pendidikan Kerjaya';
        }
        const astLps = mockAset.find(a => a.ID_Aset === (lps ? lps.ID_Aset : ''));
        if (astLps && data.statusKeputusan === 'Disokong & Diluluskan') {
          astLps.Status_Aset = 'Dilupuskan';
          astLps.Baki_Stok = 0;
        }
        localStorage.setItem('upk_mock_lps', JSON.stringify(mockPelupusan));
        localStorage.setItem('upk_mock_aset', JSON.stringify(mockAset));
        return { success: true, message: 'Status pelupusan berjaya dikemaskini!' };

      case 'login':
        return {
          success: true,
          message: 'Log masuk berjaya.',
          token: 'MOCK_TOKEN_' + Date.now(),
          user: {
            email: data.email || 'admin@moe.gov.bn',
            nama: data.email && data.email.includes('ketua') ? 'Ketua Unit UPK' : 'Pentadbir Inventori UPK',
            peranan: data.email && data.email.includes('ketua') ? 'Pegawai_Pengesah' : 'Admin'
          }
        };

      case 'verifikasiDokumen':
        return {
          sah: true,
          mesej: 'Dokumen Sah dan Tulen Dikeluarkan oleh Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah.',
          data: {
            noPelupusan: data.kod || 'LPS-2611-001',
            namaBarang: 'Projektor Epson EB-X06',
            idAset: 'UPK-AST-004',
            statusKelulusan: 'Diluluskan',
            pegawaiPengesah: 'Ketua Unit Pendidikan Kerjaya',
            tarikhKelulusan: '2026-11-20'
          }
        };

      default:
        return { success: true, data: [] };
    }
  }

  return {
    call,
    getToken,
    setToken,
    getUser,
    setUser
  };
})();
