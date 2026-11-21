/**
 * ============================================================================
 * e-Inventori UPK — Backend: Setup.gs
 * Setup Persekitaran Autonomi, Penjanaan Folder Drive & Skema Database
 * Modul Migrasi Idempoten Tanpa Merosakkan Data Lama
 * Sesuai panduan: /gas-rahasia-script-properties & /gas-migrasi-database
 * ============================================================================
 */

function setupAppEnvironment() {
  const t0 = Date.now();
  Logger.log('🚀 Memulakan persediaan persekitaran ' + APP_NAME + '...');

  // 1. Bina Struktur Folder Google Drive
  let rootFolder;
  const existingRootId = prop_('ROOT_FOLDER_ID');
  if (existingRootId) {
    try { rootFolder = DriveApp.getFolderById(existingRootId); } catch (e) {}
  }
  if (!rootFolder) {
    rootFolder = DriveApp.createFolder('📁 e-Inventori UPK (Jabatan Sekolah-Sekolah)');
  }

  function getOrCreateSubfolder(parent, name) {
    const it = parent.getFoldersByName(name);
    return it.hasNext() ? it.next() : parent.createFolder(name);
  }

  const folderFotoAsal = getOrCreateSubfolder(rootFolder, '01_Foto_Aset_Asal');
  const folderFotoRosak = getOrCreateSubfolder(rootFolder, '02_Foto_Bukti_Kerosakan');
  const folderQrCode = getOrCreateSubfolder(rootFolder, '03_Label_QR_Code');
  const folderPdf = getOrCreateSubfolder(rootFolder, '04_Dokumen_PDF_Pelupusan');

  // Kongsi folder gambar agar boleh dilihat oleh kakitangan
  try {
    folderFotoAsal.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    folderFotoRosak.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    folderQrCode.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    folderPdf.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log('Makluman sharing folder: ' + e.message);
  }

  // 2. Bina atau Buka Spreadsheet Pangkalan Data
  let ss;
  const existingSsId = prop_('SPREADSHEET_ID');
  if (existingSsId) {
    try { ss = SpreadsheetApp.openById(existingSsId); } catch (e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.create('🗃️ Pangkalan Data — e-Inventori UPK');
    try { DriveApp.getFileById(ss.getId()).moveTo(rootFolder); } catch (e) {}
  }

  // Helper membuat sheet dengan headers jika belum wujud
  function ensureSheet(name, headers) {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
    }
    if (sh.getLastRow() === 0) {
      sh.appendRow(headers);
      sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E2EEF5');
      sh.setFrozenRows(1);
    }
    return sh;
  }

  // A. Sheet AppConfig
  ensureSheet(SHEETS.CONFIG, ['Kunci', 'Nilai', 'Keterangan']);

  // B. Sheet Aset_Inventori
  ensureSheet(SHEETS.ASET, [
    'ID_Aset',
    'No_Siri_Daftar',
    'Nama_Barang',
    'Buku_Simpanan',
    'Kategori',
    'Lokasi_Bilik',
    'Baki_Stok',
    'Paras_Amaran_Minimum',
    'Status_Aset',
    'URL_Foto_Asal',
    'URL_QR_Code',
    'Tarikh_Daftar',
    'Harga_Asal_BND',
    'Pegawai_Penanggungjawab',
    'Catatan_Spesifikasi'
  ]);

  // C. Sheet Stock_Card
  ensureSheet(SHEETS.STOCK_CARD, [
    'ID_Log',
    'ID_Aset',
    'Tarikh_Transaksi',
    'Jenis_Transaksi',
    'Bilik_Asal',
    'Bilik_Tujuan',
    'Kuantiti_Perubahan',
    'Baki_Selepas_Transaksi',
    'No_Rujukan',
    'Didaftar_Oleh',
    'Catatan'
  ]);

  // D. Sheet Aduan_Kerosakan
  ensureSheet(SHEETS.ADUAN, [
    'ID_Aduan',
    'ID_Aset',
    'Tarikh_Aduan',
    'Nama_Pelapor',
    'Emel_Pelapor',
    'No_Tel_Pelapor',
    'Bahagian_Rosak',
    'Keterangan_Kerosakan',
    'Tahap_Impak',
    'URL_Foto_Rosak',
    'Status_Aduan',
    'Ulasan_Teknikal',
    'Cadangan_Tindakan',
    'Anggaran_Kos_BND',
    'Pegawai_Pemeriksa',
    'Tarikh_Pemeriksaan'
  ]);

  // E. Sheet Permohonan_Pelupusan
  ensureSheet(SHEETS.PELUPUSAN, [
    'ID_Pelupusan',
    'ID_Aset',
    'ID_Aduan',
    'Tarikh_Permohonan',
    'Pegawai_Pemeriksa',
    'Laporan_Teknikal',
    'Justifikasi_Pelupusan',
    'Status_Kelulusan',
    'Tarikh_Kelulusan',
    'Pegawai_Pengesah',
    'Catatan_Kelulusan',
    'URL_PDF_Rasmi',
    'Kod_Verifikasi_HMAC'
  ]);

  // F. Sheet Lokasi_Bilik
  const shBilik = ensureSheet(SHEETS.BILIK, [
    'Kod_Bilik',
    'Nama_Bilik',
    'Aras_Bangunan',
    'Pegawai_Penanggungjawab',
    'Catatan'
  ]);

  // G. Sheet Pengguna_Sistem
  const shPengguna = ensureSheet(SHEETS.PENGGUNA, [
    'Emel',
    'Nama_Penuh',
    'No_Tel_WA',
    'Peranan',
    'Status_Akaun',
    'Tarikh_Daftar'
  ]);

  // H. Sheet Notifikasi & CRM
  ensureSheet(SHEETS.ANTREAN_NOTIF, [
    'AntrianID', 'Kanal', 'Tujuan', 'NamaPenerima', 'Subjek', 'Pesan', 'Event', 'RefID', 'BlastID', 'Status', 'Percobaan', 'Respon', 'DibuatPada', 'DikirimPada'
  ]);
  ensureSheet(SHEETS.BLAST_WA, [
    'BlastID', 'Judul', 'Pesan', 'Sasaran', 'Total', 'Terkirim', 'Gagal', 'UkuranBatch', 'JedaDetik', 'Status', 'DibuatOleh', 'Tanggal', 'SelesaiPada'
  ]);
  ensureSheet(SHEETS.CRM_KONTAK, [
    'KontakID', 'Nama', 'Email', 'NoWA', 'Segmen', 'Sumber', 'RefID', 'Tag', 'StatusWA', 'CekWAAt', 'EmailValid', 'OptOut', 'Catatan', 'JumlahPesan', 'TerakhirDihubungi', 'Info', 'DibuatPada', 'DiperbaruiPada'
  ]);
  ensureSheet(SHEETS.CRM_INTERAKSI, [
    'InteraksiID', 'KontakID', 'Kanal', 'Arah', 'Ringkasan', 'RefID', 'Oleh', 'Tanggal'
  ]);

  // I. Sheet Doc Engine
  ensureSheet(SHEETS.DE_DOKUMEN, [
    'DokumenID', 'TemplateID', 'NomborSurat', 'Perihal', 'TarikhSurat', 'Status', 'DataIsianJson', 'Penandatangan', 'KodVerifikasi', 'HashPdf', 'UrlPdf', 'DibuatPada'
  ]);
  ensureSheet(SHEETS.DE_TEMPLATE, [
    'TemplateID', 'Kod', 'NamaTemplate', 'Jenis', 'FileIdDocs', 'PlaceholderJson', 'Aktif'
  ]);

  // Hapus sheet default kosong "Sheet1" jika ada
  const defSheet = ss.getSheetByName('Sheet1');
  if (defSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defSheet); } catch (e) {}
  }

  // 3. Masukkan Data Benih (Seeding Awal jika Kosong)
  if (shBilik.getLastRow() <= 1) {
    shBilik.appendRow(['BILIK-01', 'Makmal Kerjaya UPK (Bilik Komputer)', 'Aras 1', 'Cikgu Ahmad (Ketua Makmal)', 'Makmal komputer utama murid']);
    shBilik.appendRow(['BILIK-02', 'Bilik Kaunseling & Ujian Kerjaya', 'Aras 1', 'Cikgu Siti (Kaunselor)', 'Bilik bimbingan dan sesi kerjaya']);
    shBilik.appendRow(['BILIK-03', 'Pejabat Pentadbiran Am UPK', 'Aras 2', 'Pegawai Pentadbiran', 'Ruang kerja pegawai dan staf']);
    shBilik.appendRow(['BILIK-04', 'Bilik Mesyuarat Utama UPK', 'Aras 2', 'Ketua Unit UPK', 'Bilik persidangan rasmi unit']);
    shBilik.appendRow(['BILIK-05', 'Stor Inventori & Bekalan Utama', 'Aras Bawah', 'Pegawai Stor', 'Pusat simpanan stok dan alatan']);
  }

  if (shPengguna.getLastRow() <= 1) {
    shPengguna.appendRow(['admin@moe.gov.bn', 'Pegawai Pentadbir Inventori', '6738765432', 'Admin', 'Aktif', new Date().toISOString()]);
    shPengguna.appendRow(['ketua.upk@moe.gov.bn', 'Ketua Unit Pendidikan Kerjaya', '6738991122', 'Pegawai_Pengesah', 'Aktif', new Date().toISOString()]);
    shPengguna.appendRow(['juruteknik@moe.gov.bn', 'Pegawai Pemeriksa Teknikal', '6738123456', 'Pemeriksa', 'Aktif', new Date().toISOString()]);
    shPengguna.appendRow(['staf@moe.gov.bn', 'Kakitangan UPK (Pengguna Bilik)', '6738654321', 'Staf', 'Aktif', new Date().toISOString()]);
  }

  // 4. Daftarkan Kunci Keselamatan & Script Properties
  getSessionSecret_(); // Pastikan SESSION_SECRET wujud

  setProps_({
    SPREADSHEET_ID: ss.getId(),
    ROOT_FOLDER_ID: rootFolder.getId(),
    FOLDER_FOTO_ASAL: folderFotoAsal.getId(),
    FOLDER_FOTO_ROSAK: folderFotoRosak.getId(),
    FOLDER_QR_CODE: folderQrCode.getId(),
    FOLDER_DOKUMEN_PDF: folderPdf.getId(),
    NAMA_INSTITUSI: 'Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah',
    APP_URL: ScriptApp.getService().getUrl() || ''
  });

  // Sandi Akses Darurat (Hanya jika belum wujud)
  if (!prop_('EMERGENCY_PASS_HASH')) {
    const sandiDarurat = acakString_(14);
    const saltDarurat = Utilities.getUuid();
    setProps_({
      EMERGENCY_USER: 'admin.darurat',
      EMERGENCY_SALT: saltDarurat,
      EMERGENCY_PASS_HASH: hashPassword_(sandiDarurat, saltDarurat)
    });
    Logger.log('🔐 [AKSES DARURAT BARU DIJANAKAN]');
    Logger.log('   Username : admin.darurat');
    Logger.log('   Password : ' + sandiDarurat);
    Logger.log('   (Catat maklumat ini untuk kecemasan sekiranya OAuth Google tidak tersedia)');
  }

  // Pasang Trigger Minitan untuk Antrean Notifikasi (Jika belum wujud)
  pasangTriggerNotifikasi_();

  Logger.log('✅ Persediaan e-Inventori UPK berjaya diselesaikan dalam ' + (Date.now() - t0) + ' ms!');
  Logger.log('🔗 Spreadsheet Pangkalan Data: ' + ss.getUrl());
  Logger.log('📂 Google Drive Root Folder: ' + rootFolder.getUrl());
}

/**
 * Memasang trigger automatik setiap minit untuk pemprosesan antrean WhatsApp/Email
 */
function pasangTriggerNotifikasi_() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let ada = false;
    triggers.forEach(t => {
      if (t.getHandlerFunction() === 'prosesAntrianNotif') ada = true;
    });
    if (!ada) {
      ScriptApp.newTrigger('prosesAntrianNotif')
        .timeBased()
        .everyMinutes(1)
        .create();
      Logger.log('⚡ Trigger minitan prosesAntrianNotif berjaya dipasang.');
    }
  } catch (e) {
    Logger.log('Makluman pemasangan trigger: ' + e.message);
  }
}

/**
 * Modul Migrasi Idempoten (/gas-migrasi-database)
 * Mengimport data daripada spreadsheet lama tanpa mengubah fail lama tersebut
 */
function migrasiDatabaseLama(spreadsheetLamaId, options) {
  options = options || {};
  const dryRun = !!options.dryRun;
  const ssLama = SpreadsheetApp.openById(spreadsheetLamaId);
  const ringkasan = { status: 'success', dryRun: dryRun, data: {} };

  // Migrasi Aset
  const shAsetLama = ssLama.getSheetByName('Aset_Inventori') || ssLama.getSheetByName('Data_Aset') || ssLama.getSheetByName('Sheet1');
  if (shAsetLama) {
    const raw = shAsetLama.getDataRange().getValues();
    if (raw.length > 1) {
      const hLama = raw[0].map(h => String(h).trim());
      const barisLama = raw.slice(1).map(r => {
        const o = {};
        hLama.forEach((k, i) => { if (k) o[k] = r[i]; });
        return o;
      });

      const patchPlan = {
        target: SHEETS.ASET,
        key: row => String(row.ID_Aset || row.Kod_Aset || row.No_Siri || '').trim(),
        rows: barisLama.map(item => ({
          ID_Aset: item.ID_Aset || item.Kod_Aset || ('UPK-MIG-' + Utilities.getUuid().slice(0, 5)),
          No_Siri_Daftar: item.No_Siri_Daftar || item.No_Siri || '',
          Nama_Barang: item.Nama_Barang || item.Nama_Aset || item.Perihal || '',
          Buku_Simpanan: item.Buku_Simpanan || 'Peralatan Komputer & IT',
          Kategori: item.Kategori || 'Aset Alih',
          Lokasi_Bilik: item.Lokasi_Bilik || item.Bilik || 'Pejabat Pentadbiran Am UPK',
          Baki_Stok: Number(item.Baki_Stok || item.Kuantiti || 1),
          Paras_Amaran_Minimum: Number(item.Paras_Amaran_Minimum || 0),
          Status_Aset: item.Status_Aset || item.Status || STATUS_ASET.BAIK,
          URL_Foto_Asal: item.URL_Foto_Asal || item.Foto || '',
          URL_QR_Code: item.URL_QR_Code || '',
          Tarikh_Daftar: item.Tarikh_Daftar || new Date().toISOString(),
          Harga_Asal_BND: Number(item.Harga_Asal_BND || item.Harga || 0),
          Pegawai_Penanggungjawab: item.Pegawai_Penanggungjawab || '',
          Catatan_Spesifikasi: item.Catatan_Spesifikasi || item.Catatan || ''
        }))
      };

      ringkasan.data.aset = laksanaUpsertMigrasi_(patchPlan, dryRun);
    }
  }

  return ringkasan;
}

function laksanaUpsertMigrasi_(plan, dryRun) {
  const shTarget = getSheetByName_(plan.target);
  const targetData = shTarget.getDataRange().getValues();
  const headers = targetData[0].map(h => String(h).trim());
  const indexKey = {};

  for (let r = 1; r < targetData.length; r++) {
    const o = {};
    headers.forEach((k, colIdx) => { o[k] = targetData[r][colIdx]; });
    const k = plan.key(o);
    if (k) indexKey[k] = r;
  }

  const hasil = { ditambah: 0, dikemaskini: 0, diabaikan: 0 };
  const barisBaru = [];

  plan.rows.forEach(src => {
    const k = plan.key(src);
    if (!k) { hasil.diabaikan++; return; }

    if (indexKey[k] !== undefined) {
      hasil.diabaikan++;
    } else {
      barisBaru.push(headers.map(col => src[col] !== undefined ? src[col] : ''));
      hasil.ditambah++;
    }
  });

  if (!dryRun && barisBaru.length > 0) {
    const startRow = shTarget.getLastRow() + 1;
    shTarget.getRange(startRow, 1, barisBaru.length, headers.length).setValues(barisBaru);
    invalidateCache_('aset');
  }

  return hasil;
}
