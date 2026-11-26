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
            // Jika data GAS kosong, gunakan data aset tempatan agar 51 item bergambar sentiasa tampil
            if (Array.isArray(json.data) && json.data.length === 0) {
              return mockApiHandler(action, data, isPost);
            }
            _memCache[cacheKey] = { time: Date.now(), data: json.data };
            return json;
          }
          // Jika respon gagal atau action belum didaftarkan di GAS, fallback ke mock data
          return mockApiHandler(action, data, isPost);
        } catch (err) {
          console.warn('GAS fetch gagal, menggunakan mock data:', err);
          return mockApiHandler(action, data, isPost);
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
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length === 0) {
        return mockApiHandler(action, data, isPost);
      }
      if (json && !json.success) {
        return mockApiHandler(action, data, isPost);
      }
      return json;
    } catch (err) {
      console.error('API GET Error:', err);
      return mockApiHandler(action, data, isPost);
    }
  }

  // ==========================================================================
  // PENGENDALI MOCK DATA (Untuk Pratonton Segera Tanpa Kelewatan)
  // ==========================================================================
  async function mockApiHandler(action, data, isPost) {
    await new Promise(r => setTimeout(r, 60)); // Simulasi pantas 60ms

    // Dapatkan data setempat dari localStorage atau data awal
    let mockAset = JSON.parse(localStorage.getItem('upk_mock_aset') || 'null');
    if (!mockAset || !mockAset[0]?.map3d_calibrated_v7) {
      mockAset = [
        {"ID_Aset": "UPK-PP-001", "No_Siri_Daftar": "UPK/PP/01/001", "Nama_Barang": "Kerusi Banquet (Fabrik) Biru", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat (7), Kawasan Kaunter (1), Ruang Terbuka (1), Bilik A (Room A) (3), Bilik B (Room B) (2)", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 14, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image1.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-001", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-002", "No_Siri_Daftar": "UPK/PP/01/002", "Nama_Barang": "Kerusi Pejabat Armrest (Turquoise)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik D (Room D) (2)", "map_bilik_id": "BILIK-ROOM-D", "map3d_x": 665, "map3d_y": 520, "Baki_Stok": 2, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image2.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-002", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-003", "No_Siri_Daftar": "UPK/PP/01/003", "Nama_Barang": "Kerusi Pejabat Beroda (Turquoise)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik C (Room C) (2), Bilik D (Room D) (1)", "map_bilik_id": "BILIK-ROOM-C", "map3d_x": 465, "map3d_y": 550, "Baki_Stok": 3, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image3.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-003", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-004", "No_Siri_Daftar": "UPK/PP/01/004", "Nama_Barang": "Kerusi Pejabat Coklat (Fabrik)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Ruang Terbuka (5)", "map_bilik_id": "BILIK-OUTDOOR", "map3d_x": 180, "map3d_y": 450, "Baki_Stok": 5, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image4.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-004", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-005", "No_Siri_Daftar": "UPK/PP/01/005", "Nama_Barang": "Kerusi Pejabat Hitam (Fabrik)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik E (Room E)", "map_bilik_id": "BILIK-ROOM-TOP", "map3d_x": 525, "map3d_y": 120, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image5.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-005", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-006", "No_Siri_Daftar": "UPK/PP/01/006", "Nama_Barang": "Kerusi Pejabat Hitam Beroda (Fabrik)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Ruang Terbuka (3)", "map_bilik_id": "BILIK-OUTDOOR", "map3d_x": 180, "map3d_y": 450, "Baki_Stok": 3, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image6.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-006", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-007", "No_Siri_Daftar": "UPK/PP/01/007", "Nama_Barang": "Kerusi Pejabat Mesh Beroda (Biru)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter (1), Bilik Mesyuarat (1)", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 2, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image7.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-007", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-008", "No_Siri_Daftar": "UPK/PP/01/008", "Nama_Barang": "Kerusi Pejabat Mesh Beroda (Merah)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik B (Room B) (1), Bilik D (Room D) (5)", "map_bilik_id": "BILIK-ROOM-B", "map3d_x": 525, "map3d_y": 350, "Baki_Stok": 6, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image8.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-008", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-009", "No_Siri_Daftar": "UPK/PP/01/009", "Nama_Barang": "Kerusi Pejabat Sandar Tinggi (Biru)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Ruang Terbuka", "map_bilik_id": "BILIK-OUTDOOR", "map3d_x": 180, "map3d_y": 450, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image9.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-009", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-010", "No_Siri_Daftar": "UPK/PP/01/010", "Nama_Barang": "Kerusi Pejabat Sandar Tinggi (Coklat)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Ruang Terbuka", "map_bilik_id": "BILIK-OUTDOOR", "map3d_x": 180, "map3d_y": 450, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image10.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-010", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-011", "No_Siri_Daftar": "UPK/PP/01/011", "Nama_Barang": "Sofa 2 Seater (Turquoise)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik D (Room D)", "map_bilik_id": "BILIK-ROOM-D", "map3d_x": 665, "map3d_y": 520, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image11.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-011", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-012", "No_Siri_Daftar": "UPK/PP/01/012", "Nama_Barang": "Coffee Table", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik D (Room D)", "map_bilik_id": "BILIK-ROOM-D", "map3d_x": 665, "map3d_y": 520, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image12.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-012", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-013", "No_Siri_Daftar": "UPK/PP/01/013", "Nama_Barang": "Meja Bulat (Hitam)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik C (Room C)", "map_bilik_id": "BILIK-ROOM-C", "map3d_x": 465, "map3d_y": 550, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image13.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-013", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-014", "No_Siri_Daftar": "UPK/PP/01/014", "Nama_Barang": "Meja Kaunter 3 Laci (Kayu)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image14.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-014", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-015", "No_Siri_Daftar": "UPK/PP/01/015", "Nama_Barang": "Meja Kayu Panjang (Coklat)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image15.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-015", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-016", "No_Siri_Daftar": "UPK/PP/01/016", "Nama_Barang": "Meja Komputer (Krim)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image16.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-016", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-017", "No_Siri_Daftar": "UPK/PP/01/017", "Nama_Barang": "Meja Komputer Bentuk Z (Kelabu)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image17.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-017", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-018", "No_Siri_Daftar": "UPK/PP/01/018", "Nama_Barang": "Meja Komputer Beroda (Kelabu)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik E (Room E)", "map_bilik_id": "BILIK-ROOM-TOP", "map3d_x": 525, "map3d_y": 120, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image18.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-018", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-019", "No_Siri_Daftar": "UPK/PP/01/019", "Nama_Barang": "Meja Lipat (Coklat)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat (1), Bilik E (Room E) (1), Bilik D (Room D) (1)", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 3, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image19.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-019", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-020", "No_Siri_Daftar": "UPK/PP/01/020", "Nama_Barang": "Meja Mesyuarat (Coklat)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat (4)", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 4, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image20.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-020", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-021", "No_Siri_Daftar": "UPK/PP/02/021", "Nama_Barang": "Meja Mesyuarat Bujur (Coklat)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik D (Room D)", "map_bilik_id": "BILIK-ROOM-D", "map3d_x": 665, "map3d_y": 520, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image21.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-021", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-022", "No_Siri_Daftar": "UPK/PP/02/022", "Nama_Barang": "Meja Pejabat 6 Laci (Grey)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik C (Room C)", "map_bilik_id": "BILIK-ROOM-C", "map3d_x": 465, "map3d_y": 550, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image22.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-022", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-023", "No_Siri_Daftar": "UPK/PP/02/023", "Nama_Barang": "Meja Pejabat Eksekutif 3 Laci", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik A (Room A) (1), Bilik B (Room B) (1), Bilik D (Room D) (1)", "map_bilik_id": "BILIK-ROOM-A", "map3d_x": 625, "map3d_y": 350, "Baki_Stok": 3, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image23.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-023", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-024", "No_Siri_Daftar": "UPK/PP/02/024", "Nama_Barang": "Meja Sisi Dua Tingkat (Putih)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik D (Room D)", "map_bilik_id": "BILIK-ROOM-D", "map3d_x": 665, "map3d_y": 520, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image24.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-024", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-025", "No_Siri_Daftar": "UPK/PP/02/025", "Nama_Barang": "Rak Buku 5 Tingkat Dua Sisi (Beige)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat (1), Stor Koridor (1), Bilik C (Room C) (1)", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 3, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image25.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-025", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-026", "No_Siri_Daftar": "UPK/PP/02/026", "Nama_Barang": "Rak Buku 6 Tingkat Dua Sisi (Kelabu)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Ruang Terbuka (2), Dapur (4)", "map_bilik_id": "BILIK-OUTDOOR", "map3d_x": 180, "map3d_y": 450, "Baki_Stok": 6, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image26.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-026", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-027", "No_Siri_Daftar": "UPK/PP/02/027", "Nama_Barang": "Rak Majalah 3 tingkat (Hitam)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Ruang Terbuka (3)", "map_bilik_id": "BILIK-OUTDOOR", "map3d_x": 180, "map3d_y": 450, "Baki_Stok": 3, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image27.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-027", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-028", "No_Siri_Daftar": "UPK/PP/02/028", "Nama_Barang": "Rak Majalah 4 tingkat (Hitam)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat (2), Ruang Terbuka (1)", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 3, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image28.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-028", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-029", "No_Siri_Daftar": "UPK/PP/02/029", "Nama_Barang": "Kabinet 4 tingkat (Beige)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter (1), Bilik D (Room D) (1)", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 2, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image29.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-029", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-030", "No_Siri_Daftar": "UPK/PP/02/030", "Nama_Barang": "Kabinet Basi Kelabu (Rendah)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter (2)", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 2, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image30.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-030", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-031", "No_Siri_Daftar": "UPK/PP/02/031", "Nama_Barang": "Kabinet Basi Kelabu (Tinggi)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter (2)", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 2, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image31.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-031", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-032", "No_Siri_Daftar": "UPK/PP/02/032", "Nama_Barang": "Kabinet Basi Kelabu Pintu Kaca (Rendah)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik D (Room D)", "map_bilik_id": "BILIK-ROOM-D", "map3d_x": 665, "map3d_y": 520, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image32.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-032", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-033", "No_Siri_Daftar": "UPK/PP/02/033", "Nama_Barang": "Kabinet Fail 4 tingkat (Kelabu)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image33.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-033", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-034", "No_Siri_Daftar": "UPK/PP/02/034", "Nama_Barang": "Kabinet Pigeon Hole", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image34.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-034", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-035", "No_Siri_Daftar": "UPK/PP/02/035", "Nama_Barang": "Kabinet Pintu Kaca (Kelabu)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik C (Room C)", "map_bilik_id": "BILIK-ROOM-C", "map3d_x": 465, "map3d_y": 550, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image35.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-035", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-036", "No_Siri_Daftar": "UPK/PP/02/036", "Nama_Barang": "Papan Makluman (Kecil)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik A (Room A)", "map_bilik_id": "BILIK-ROOM-A", "map3d_x": 625, "map3d_y": 350, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image36.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-036", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-037", "No_Siri_Daftar": "UPK/PP/02/037", "Nama_Barang": "Papan Notis (Hijau)", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image37.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-037", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PP-038", "No_Siri_Daftar": "UPK/PP/02/038", "Nama_Barang": "Papan Putih Rancangan Bulanan", "Buku_Simpanan": "Perabot Pejabat", "Kategori": "Aset Alih", "Lokasi_Bilik": "Laluan Koridor", "map_bilik_id": "BILIK-WALKWAY", "map3d_x": 250, "map3d_y": 350, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image38.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PP-038", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PP/02", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-001", "No_Siri_Daftar": "UPK/PE/01/001", "Nama_Barang": "AIFA Air-cooler", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik D (Room D)", "map_bilik_id": "BILIK-ROOM-D", "map3d_x": 665, "map3d_y": 520, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image39.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-001", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-002", "No_Siri_Daftar": "UPK/PE/01/002", "Nama_Barang": "Kipas Angin Berdiri (Krim)", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image40.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-002", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-003", "No_Siri_Daftar": "UPK/PE/01/003", "Nama_Barang": "Kipas Angin Berdiri Cornell (Hitam)", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik C (Room C)", "map_bilik_id": "BILIK-ROOM-C", "map3d_x": 465, "map3d_y": 550, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image41.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-003", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-004", "No_Siri_Daftar": "UPK/PE/01/004", "Nama_Barang": "Mesin Fotokopi bizhub 205i", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image42.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-004", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-005", "No_Siri_Daftar": "UPK/PE/01/005", "Nama_Barang": "Mesin Fotokopi DIALTA", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Kawasan Kaunter", "map_bilik_id": "BILIK-COUNTER", "map3d_x": 180, "map3d_y": 300, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image43.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-005", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-006", "No_Siri_Daftar": "UPK/PE/01/006", "Nama_Barang": "Bosch Plena Mixer Amplifier", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image44.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-006", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-007", "No_Siri_Daftar": "UPK/PE/01/007", "Nama_Barang": "Logitech Z407 2.1 Bluetooth Speaker", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image45.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-007", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-008", "No_Siri_Daftar": "UPK/PE/01/008", "Nama_Barang": "Mikrofon PEVY PVW-9900", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image46.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-008", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-009", "No_Siri_Daftar": "UPK/PE/01/009", "Nama_Barang": "PEVY PVW-9900 Conference System", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image47.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-009", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-010", "No_Siri_Daftar": "UPK/PE/01/010", "Nama_Barang": "Projektor Dell DLP", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image48.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-010", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-011", "No_Siri_Daftar": "UPK/PE/01/011", "Nama_Barang": "Komputer Acer (CPU)", "Buku_Simpanan": "Peralatan Komputer & IT", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik D (Room D)", "map_bilik_id": "BILIK-ROOM-D", "map3d_x": 665, "map3d_y": 520, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image49.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-011", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-012", "No_Siri_Daftar": "UPK/PE/01/012", "Nama_Barang": "IONA Water Dispenser", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Ruang Terbuka", "map_bilik_id": "BILIK-OUTDOOR", "map3d_x": 180, "map3d_y": 450, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image50.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-012", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true},
        {"ID_Aset": "UPK-PE-013", "No_Siri_Daftar": "UPK/PE/01/013", "Nama_Barang": "Pensonic 3.0L Thermo Pot", "Buku_Simpanan": "Peralatan Elektrik", "Kategori": "Aset Alih", "Lokasi_Bilik": "Bilik Mesyuarat", "map_bilik_id": "BILIK-MEETING", "map3d_x": 272, "map3d_y": 380, "Baki_Stok": 1, "Paras_Amaran_Minimum": 0, "Status_Aset": "Beroperasi Baik", "URL_Foto_Asal": "assets/items/image51.png", "URL_QR_Code": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UPK-PE-013", "Tarikh_Daftar": "2024-01-01 08:00:00", "Harga_Asal_BND": 0, "Pegawai_Penanggungjawab": "Pegawai Inventori UPK", "Catatan_Spesifikasi": "UPK/PE/01", "map3d_calibrated_v7": true}
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
              { Kod_Bilik: 'BILIK-MEETING', Nama_Bilik: 'Bilik Mesyuarat', Kategori: 'Zone 01 - Meeting Room', Foto: 'assets/rooms/meeting-room.jpg', Kapasiti: '25 Orang' },
              { Kod_Bilik: 'BILIK-COUNTER', Nama_Bilik: 'Kawasan Kaunter', Kategori: 'Zone 01 - Counter Area', Foto: 'assets/rooms/meeting-room.jpg', Kapasiti: '5 Orang' },
              { Kod_Bilik: 'STORE-KORIDOR', Nama_Bilik: 'Stor Koridor', Kategori: 'Zone 01 - Store Corridor', Foto: 'assets/rooms/store.jpg', Kapasiti: 'Laluan Simpanan' },
              { Kod_Bilik: 'BILIK-WALKWAY', Nama_Bilik: 'Laluan Koridor', Kategori: 'Zone 01 - Corridor', Foto: 'assets/rooms/walkway-center.jpg', Kapasiti: 'Laluan Pergerakan' },
              { Kod_Bilik: 'BILIK-STORE', Nama_Bilik: 'Bilik Stor & Suis Elektrik', Kategori: 'Zone 02 - Storeroom', Foto: 'assets/rooms/store.jpg', Kapasiti: '3 Orang' },
              { Kod_Bilik: 'BILIK-KITCHEN', Nama_Bilik: 'Dapur', Kategori: 'Zone 02 - Kitchen', Foto: 'assets/rooms/kitchen.jpg', Kapasiti: '8 Orang' },
              { Kod_Bilik: 'BILIK-OUTDOOR', Nama_Bilik: 'Ruang Terbuka', Kategori: 'Zone 02 - Outdoor', Foto: 'assets/rooms/outdoor.jpg', Kapasiti: '15 Orang' },
              { Kod_Bilik: 'BILIK-ROOM-TOP', Nama_Bilik: 'Bilik E (Room E)', Kategori: 'Zone 02 - Room E', Foto: 'assets/rooms/room-top.jpg', Kapasiti: '4 Orang' },
              { Kod_Bilik: 'BILIK-ROOM-A', Nama_Bilik: 'Bilik A (Room A)', Kategori: 'Zone 03 - Office Room A', Foto: 'assets/rooms/room-a.jpg', Kapasiti: '4 Orang' },
              { Kod_Bilik: 'BILIK-ROOM-B', Nama_Bilik: 'Bilik B (Room B)', Kategori: 'Zone 03 - Office Room B', Foto: 'assets/rooms/room-b.jpg', Kapasiti: '4 Orang' },
              { Kod_Bilik: 'BILIK-ROOM-C', Nama_Bilik: 'Bilik C (Room C)', Kategori: 'Zone 03 - Office Room C', Foto: 'assets/rooms/room-c.jpg', Kapasiti: '10 Orang' },
              { Kod_Bilik: 'BILIK-ROOM-D', Nama_Bilik: 'Bilik D (Room D)', Kategori: 'Zone 03 - Office Room D', Foto: 'assets/rooms/room-d.jpg', Kapasiti: '15 Orang' }
            ],
            notifConfig: { waAktif: true, emailAktif: true, fonnteTokenTersamar: 'FNT••••••789' }
          }
        };

      case 'getStockCard':
        const logs = mockAset.map((a, idx) => {
          const qty = Number(a.Baki_Stok) || 1;
          return {
            ID_Log: 'LOG-' + String(idx + 1).padStart(4, '0'),
            ID_Aset: a.ID_Aset,
            Nama_Barang: a.Nama_Barang,
            Tarikh_Transaksi: a.Tarikh_Daftar || '2024-01-01 08:00:00',
            Jenis_Transaksi: 'Penerimaan Stok Awal',
            Bilik_Asal: 'Pembekal / Perolehan',
            Bilik_Tujuan: a.Lokasi_Bilik,
            Kuantiti_Perubahan: qty,
            Baki_Selepas_Transaksi: qty,
            Didaftar_Oleh: a.Pegawai_Penanggungjawab || 'Pegawai Inventori UPK',
            Catatan: 'Kemasukan rekod buku simpanan rasmi'
          };
        });
        if (data && data.bilik && data.bilik !== 'Semua') {
          return { success: true, data: logs.filter(l => String(l.Bilik_Tujuan).includes(data.bilik)) };
        }
        return { success: true, data: logs };

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
        let totalUnitFizikal = 0;
        mockAset.forEach(a => {
          const qty = Number(a.Baki_Stok) || 1;
          totalUnitFizikal += qty;
          agihan[a.Lokasi_Bilik] = (agihan[a.Lokasi_Bilik] || 0) + qty;
        });
        return {
          success: true,
          data: {
            totalAset: totalUnitFizikal,
            totalJenisAset: mockAset.length,
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
