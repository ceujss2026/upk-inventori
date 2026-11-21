/**
 * ============================================================================
 * e-Inventori UPK — Backend: AsetService.gs
 * Perkhidmatan Pengurusan Aset, Kad Stok, Pindahan Bilik & Storan Gambar Drive
 * ============================================================================
 */

/**
 * Mengambil katalog aset penuh dengan sokongan caching pantas berpartisi
 */
function svcGetKatalogAset(kategoriBuku, kodBilik, status) {
  const cacheKey = makeCacheKey_('aset', (kategoriBuku || 'ALL') + '_' + (kodBilik || 'ALL') + '_' + (status || 'ALL'));
  const cached = TurboCache.get(cacheKey);
  if (cached) return cached;

  const semuaAset = readSheetAsObjects_(SHEETS.ASET);

  let filtered = semuaAset;
  if (kategoriBuku && kategoriBuku !== 'Semua') {
    filtered = filtered.filter(a => String(a.Buku_Simpanan).toLowerCase() === String(kategoriBuku).toLowerCase());
  }
  if (kodBilik && kodBilik !== 'Semua') {
    filtered = filtered.filter(a => String(a.Lokasi_Bilik).toLowerCase().includes(String(kodBilik).toLowerCase()));
  }
  if (status && status !== 'Semua') {
    filtered = filtered.filter(a => String(a.Status_Aset).toLowerCase() === String(status).toLowerCase());
  }

  // Susun terkini di atas
  filtered.sort((a, b) => new Date(b.Tarikh_Daftar || 0) - new Date(a.Tarikh_Daftar || 0));

  TurboCache.put(cacheKey, filtered, 1800); // 30 minit
  return filtered;
}

/**
 * Mengambil ringkasan statistik papan pemuka (Dashboard KPI)
 */
function svcGetDashboardStats() {
  const cacheKey = makeCacheKey_('stats');
  const cached = TurboCache.get(cacheKey);
  if (cached) return cached;

  const semuaAset = readSheetAsObjects_(SHEETS.ASET);
  const semuaAduan = readSheetAsObjects_(SHEETS.ADUAN);
  const semuaBilik = readSheetAsObjects_(SHEETS.BILIK);

  const stats = {
    totalAset: semuaAset.length,
    beroperasiBaik: semuaAset.filter(a => a.Status_Aset === STATUS_ASET.BAIK).length,
    dalamPembaikan: semuaAset.filter(a => a.Status_Aset === STATUS_ASET.PENYELENGGARAAN).length,
    cadanganPelupusan: semuaAset.filter(a => a.Status_Aset === STATUS_ASET.CADANG_PELUPUSAN).length,
    dilupuskan: semuaAset.filter(a => a.Status_Aset === STATUS_ASET.DILUPUSKAN).length,
    stokKurang: semuaAset.filter(a => a.Kategori === 'Barang Guna Habis' && Number(a.Baki_Stok) <= Number(a.Paras_Amaran_Minimum)).length,
    agihanBilik: {},
    aduanTerkini: semuaAduan.slice(-5).reverse(),
    stokAmaranSenarai: semuaAset.filter(a => a.Kategori === 'Barang Guna Habis' && Number(a.Baki_Stok) <= Number(a.Paras_Amaran_Minimum))
  };

  // Kira agihan bilik
  semuaBilik.forEach(b => {
    stats.agihanBilik[b.Nama_Bilik] = 0;
  });
  semuaAset.forEach(a => {
    const loc = a.Lokasi_Bilik || 'Lain-lain';
    stats.agihanBilik[loc] = (stats.agihanBilik[loc] || 0) + 1;
  });

  TurboCache.put(cacheKey, stats, 900); // 15 minit
  return stats;
}

/**
 * Pendaftaran Aset Baharu berserta Foto Manual dan Penjanaan Kod QR
 */
function svcDaftarAsetBaharu(data, sesiUser) {
  if (!data.Nama_Barang) throw new Error('Nama barang adalah wajib diisi.');

  const prefix = data.Kategori === 'Barang Guna Habis' ? 'UPK-GNH-' : 'UPK-AST-';
  const idAset = data.ID_Aset || (prefix + Utilities.formatDate(new Date(), 'GMT+8', 'yyMM') + '-' + acakString_(4, '0123456789'));

  // 1. Simpan Foto Asal jika dimuat naik
  let urlFotoAsal = '';
  if (data.fotoBase64) {
    urlFotoAsal = simpanFotoDrive_(data.fotoBase64, 'FOTO_ASAL_' + idAset, CONFIG.FOLDER_FOTO_ASAL);
  } else if (data.URL_Foto_Asal) {
    urlFotoAsal = data.URL_Foto_Asal;
  }

  // 2. Jana Pautan Kod QR Unik
  // URL imbasan boleh membuka carian aset secara langsung
  const qrDataUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(idAset);

  const bakiAwal = Number(data.Baki_Stok !== undefined ? data.Baki_Stok : 1);
  const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss');

  const rekodAset = {
    ID_Aset: idAset,
    No_Siri_Daftar: data.No_Siri_Daftar || ('BRU/' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyy') + '/' + acakString_(4, '0123456789')),
    Nama_Barang: data.Nama_Barang,
    Buku_Simpanan: data.Buku_Simpanan || 'Peralatan Komputer & IT',
    Kategori: data.Kategori || 'Aset Alih',
    Lokasi_Bilik: data.Lokasi_Bilik || 'Pejabat Pentadbiran Am UPK',
    Baki_Stok: bakiAwal,
    Paras_Amaran_Minimum: Number(data.Paras_Amaran_Minimum || 0),
    Status_Aset: STATUS_ASET.BAIK,
    URL_Foto_Asal: urlFotoAsal,
    URL_QR_Code: qrDataUrl,
    Tarikh_Daftar: nowStr,
    Harga_Asal_BND: Number(data.Harga_Asal_BND || 0),
    Pegawai_Penanggungjawab: data.Pegawai_Penanggungjawab || (sesiUser ? sesiUser.nama : ''),
    Catatan_Spesifikasi: data.Catatan_Spesifikasi || ''
  };

  appendBatchObjects_(SHEETS.ASET, [rekodAset]);

  // Log ke Stock_Card
  const logStock = {
    ID_Log: 'LOG-' + Utilities.getUuid().slice(0, 8),
    ID_Aset: idAset,
    Tarikh_Transaksi: nowStr,
    Jenis_Transaksi: 'Pendaftaran Awal',
    Bilik_Asal: 'Pembekal / Perolehan Baharu',
    Bilik_Tujuan: rekodAset.Lokasi_Bilik,
    Kuantiti_Perubahan: bakiAwal,
    Baki_Selepas_Transaksi: bakiAwal,
    No_Rujukan: 'DAFTAR-' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd'),
    Didaftar_Oleh: sesiUser ? sesiUser.nama : 'Admin',
    Catatan: 'Kemasukan aset baharu ke dalam sistem inventori'
  };
  appendBatchObjects_(SHEETS.STOCK_CARD, [logStock]);

  invalidateCache_('aset');
  invalidateCache_('stats');

  return {
    success: true,
    message: 'Aset ' + rekodAset.Nama_Barang + ' (' + idAset + ') berjaya didaftarkan!',
    data: rekodAset
  };
}

/**
 * Pindahan Aset Antara Bilik
 */
function svcPindahBilik(idAset, bilikTujuan, catatan, sesiUser) {
  if (!idAset || !bilikTujuan) throw new Error('ID Aset dan Bilik Tujuan diperlukan.');

  const semuaAset = readSheetAsObjects_(SHEETS.ASET);
  const aset = semuaAset.find(a => a.ID_Aset === idAset);
  if (!aset) throw new Error('Aset dengan ID ' + idAset + ' tidak ditemui.');

  const bilikAsal = aset.Lokasi_Bilik;
  if (bilikAsal === bilikTujuan) throw new Error('Bilik tujuan sama dengan bilik asal semasa.');

  const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss');

  // Kemaskini bilik di Aset_Inventori
  const patches = {};
  patches[idAset] = {
    Lokasi_Bilik: bilikTujuan
  };
  updateRowsWhere_(SHEETS.ASET, 'ID_Aset', patches);

  // Catat lejar Stock Card
  const log = {
    ID_Log: 'LOG-' + Utilities.getUuid().slice(0, 8),
    ID_Aset: idAset,
    Tarikh_Transaksi: nowStr,
    Jenis_Transaksi: 'Pindah Bilik',
    Bilik_Asal: bilikAsal,
    Bilik_Tujuan: bilikTujuan,
    Kuantiti_Perubahan: 0,
    Baki_Selepas_Transaksi: aset.Baki_Stok,
    No_Rujukan: 'PND-' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd'),
    Didaftar_Oleh: sesiUser ? sesiUser.nama : 'Staf UPK',
    Catatan: catatan || ('Perpindahan lokasi daripada ' + bilikAsal + ' ke ' + bilikTujuan)
  };
  appendBatchObjects_(SHEETS.STOCK_CARD, [log]);

  invalidateCache_('aset');
  invalidateCache_('stats');

  return {
    success: true,
    message: 'Aset berjaya dipindahkan ke ' + bilikTujuan
  };
}

/**
 * Transaksi Keluar/Masuk Stok Barang Guna Habis
 */
function svcTransaksiStok(idAset, jenis, kuantiti, noRujukan, catatan, sesiUser) {
  kuantiti = Number(kuantiti);
  if (isNaN(kuantiti) || kuantiti <= 0) throw new Error('Kuantiti transaksi mestilah angka positif.');

  const semuaAset = readSheetAsObjects_(SHEETS.ASET);
  const aset = semuaAset.find(a => a.ID_Aset === idAset);
  if (!aset) throw new Error('Aset tidak ditemui.');

  const bakiSemasa = Number(aset.Baki_Stok || 0);
  let bakiBaru = bakiSemasa;

  if (jenis === 'Keluar') {
    if (bakiSemasa < kuantiti) throw new Error('Baki stok tidak mencukupi (Baki semasa: ' + bakiSemasa + ').');
    bakiBaru = bakiSemasa - kuantiti;
  } else if (jenis === 'Masuk') {
    bakiBaru = bakiSemasa + kuantiti;
  } else {
    throw new Error('Jenis transaksi tidak sah (Gunakan "Masuk" atau "Keluar").');
  }

  const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss');

  // Kemaskini baki
  const patches = {};
  patches[idAset] = { Baki_Stok: bakiBaru };
  updateRowsWhere_(SHEETS.ASET, 'ID_Aset', patches);

  // Rekod Stock Card
  const log = {
    ID_Log: 'LOG-' + Utilities.getUuid().slice(0, 8),
    ID_Aset: idAset,
    Tarikh_Transaksi: nowStr,
    Jenis_Transaksi: jenis === 'Masuk' ? 'Stok Masuk' : 'Pengeluaran/Guna',
    Bilik_Asal: jenis === 'Masuk' ? 'Pembekal' : aset.Lokasi_Bilik,
    Bilik_Tujuan: jenis === 'Masuk' ? aset.Lokasi_Bilik : 'Pengguna/Pemohon',
    Kuantiti_Perubahan: jenis === 'Masuk' ? kuantiti : -kuantiti,
    Baki_Selepas_Transaksi: bakiBaru,
    No_Rujukan: noRujukan || ('TRX-' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd')),
    Didaftar_Oleh: sesiUser ? sesiUser.nama : 'Admin Stor',
    Catatan: catatan || ''
  };
  appendBatchObjects_(SHEETS.STOCK_CARD, [log]);

  // Semak jika perlu amaran stok minimum
  if (aset.Kategori === 'Barang Guna Habis' && bakiBaru <= Number(aset.Paras_Amaran_Minimum)) {
    svcKirimNotifikasiCepat_('AMARAN_STOK_MINIMUM', {
      namaBarang: aset.Nama_Barang,
      baki: bakiBaru,
      parasMin: aset.Paras_Amaran_Minimum
    }, idAset);
  }

  invalidateCache_('aset');
  invalidateCache_('stats');

  return {
    success: true,
    message: 'Transaksi stok berjaya direkodkan. Baki terkini: ' + bakiBaru,
    bakiBaru: bakiBaru
  };
}

/**
 * Mengambil lejar kad stok (Stock Card) mengikut penapis
 */
function svcGetStockCard(idAset, kodBilik) {
  const semuaLog = readSheetAsObjects_(SHEETS.STOCK_CARD);
  let hasil = semuaLog;

  if (idAset && idAset !== 'Semua') {
    hasil = hasil.filter(l => l.ID_Aset === idAset);
  }
  if (kodBilik && kodBilik !== 'Semua') {
    hasil = hasil.filter(l => String(l.Bilik_Asal).includes(kodBilik) || String(l.Bilik_Tujuan).includes(kodBilik));
  }

  hasil.sort((a, b) => new Date(b.Tarikh_Transaksi || 0) - new Date(a.Tarikh_Transaksi || 0));
  return hasil;
}

/**
 * Menyimpan gambar Base64 ke dalam folder Google Drive dan menjana URL tontonan
 */
function simpanFotoDrive_(base64Str, namaFail, folderId) {
  try {
    if (!folderId) folderId = CONFIG.FOLDER_FOTO_ASAL;
    const folder = DriveApp.getFolderById(folderId);

    // Bersihkan data header jika ada (cth: data:image/jpeg;base64,...)
    let contentType = 'image/jpeg';
    let cleanBase64 = base64Str;
    const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contentType = match[1];
      cleanBase64 = match[2];
    }

    const decoded = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decoded, contentType, namaFail + '.jpg');
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Gunakan URL thumbnail langsung yang pantas
    return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000';
  } catch (err) {
    console.error('Ralat simpan foto: ' + err.message);
    return '';
  }
}
