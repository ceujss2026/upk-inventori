/**
 * ============================================================================
 * e-Inventori UPK — Backend: Kode.gs
 * REST API JSON Murni Google Apps Script (Tanpa iFrame, Bebas CORS)
 * Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah, Kementerian Pendidikan Brunei
 * Sesuai panduan: /gas-pro-api, /gas-rahasia-script-properties, /gas-scale-turbo
 * ============================================================================
 */

/**
 * Endpoint Utama GET (Membaca Data Awam & Booting SWR)
 */
function doGet(e) {
  const t0 = Date.now();
  let result = {};

  try {
    const action = (e && e.parameter && e.parameter.action) || 'boot';

    switch (action) {
      case 'boot':
        result = handleBoot_(e.parameter);
        break;

      case 'getKatalogAset':
        result = {
          success: true,
          data: svcGetKatalogAset(e.parameter.kategori, e.parameter.bilik, e.parameter.status)
        };
        break;

      case 'getDashboardStats':
        result = {
          success: true,
          data: svcGetDashboardStats()
        };
        break;

      case 'getStockCard':
        result = {
          success: true,
          data: svcGetStockCard(e.parameter.idAset, e.parameter.bilik)
        };
        break;

      case 'getSenaraiAduan':
        result = {
          success: true,
          data: svcGetSenaraiAduan(e.parameter.status)
        };
        break;

      case 'getSenaraiPelupusan':
        result = {
          success: true,
          data: svcGetSenaraiPelupusan()
        };
        break;

      case 'getBilik':
        result = {
          success: true,
          data: readSheetAsObjects_(SHEETS.BILIK)
        };
        break;

      case 'verifikasiDokumen':
        result = svcVerifikasiDokumen(e.parameter.kod);
        break;

      case 'getCrmKontak':
        result = {
          success: true,
          data: svcGetCrmKontak()
        };
        break;

      case 'ping':
        result = {
          success: true,
          status: 'online',
          app: APP_NAME,
          version: APP_VERSION,
          serverTime: new Date().toISOString()
        };
        break;

      default:
        result = {
          success: false,
          message: 'Tindakan (action) GET "' + action + '" tidak dikenali.'
        };
    }
  } catch (err) {
    result = {
      success: false,
      message: err.message || String(err)
    };
  }

  result.ms = Date.now() - t0;
  result.v = APP_VERSION;
  return buildJsonResponse_(result);
}

/**
 * Endpoint Utama POST (Menerima Transaksi Tulis & Mengurus Sesi)
 */
function doPost(e) {
  const t0 = Date.now();
  let result = {};

  try {
    let rawContent = (e && e.postData && e.postData.contents) || '{}';
    let payload = {};
    try {
      payload = JSON.parse(rawContent);
    } catch (parseErr) {
      throw new Error('Format muatan POST tidak sah (Gunakan JSON string).');
    }

    const action = payload.action || '';
    const data = payload.data || {};
    const token = payload.token || '';

    // Pengesahan Token Sesi bagi tindakan terlindung
    let sesiUser = null;
    if (token) {
      sesiUser = sahkanTokenSesi_(token);
    }

    // Tindakan Terbuka (Tanpa perlu token)
    if (action === 'login') {
      result = handleLogin_(data);
    } else if (action === 'hantarAduanAwam') {
      // Kakitangan boleh hantar aduan pantas dari imbasan QR bilik
      result = svcHantarAduan(data, sesiUser);
    } else if (action === 'verifikasiDokumen') {
      result = svcVerifikasiDokumen(data.kod);
    } else {
      // Tindakan Terlindung (Perlukan token sah)
      if (!sesiUser && action !== 'setup') {
        // Fallback mesra jika sesi belum wujud untuk pendaftaran staf
        if (action === 'daftarPenggunaBaru') {
          result = handleDaftarPengguna_(data);
        } else {
          return buildJsonResponse_({
            success: false,
            sesiTamat: true,
            message: 'Sesi anda telah tamat atau tidak sah. Sila log masuk semula.'
          });
        }
      } else {
        // Router Tindakan Berautentikasi
        switch (action) {
          case 'daftarAset':
            result = svcDaftarAsetBaharu(data, sesiUser);
            break;

          case 'pindahBilik':
            result = svcPindahBilik(data.idAset, data.bilikTujuan, data.catatan, sesiUser);
            break;

          case 'transaksiStok':
            result = svcTransaksiStok(data.idAset, data.jenis, data.kuantiti, data.noRujukan, data.catatan, sesiUser);
            break;

          case 'hantarAduan':
            result = svcHantarAduan(data, sesiUser);
            break;

          case 'selesaiSemakanTeknikal':
            result = svcSelesaiSemakanTeknikal(data.idAduan, data, sesiUser);
            break;

          case 'luluskanPelupusan':
            result = svcLuluskanPelupusan(data.idPelupusan, data.statusKeputusan, data.catatan, sesiUser);
            break;

          case 'simpanRahasia':
            result = handleSimpanRahasia_(data, sesiUser);
            break;

          case 'crmSync':
            result = svcCrmSync();
            break;

          case 'migrasiData':
            result = migrasiDatabaseLama(data.spreadsheetId, { dryRun: !!data.dryRun });
            break;

          case 'logout':
            if (sesiUser && sesiUser.email) cabutSesi_(sesiUser.email);
            result = { success: true, message: 'Log keluar berjaya.' };
            break;

          default:
            result = {
              success: false,
              message: 'Tindakan POST "' + action + '" tidak dibenarkan.'
            };
        }
      }
    }
  } catch (err) {
    result = {
      success: false,
      message: err.message || String(err)
    };
  }

  result.ms = Date.now() - t0;
  result.v = APP_VERSION;
  return buildJsonResponse_(result);
}

/**
 * Fungsi Booting (Mengumpulkan maklumat awal sistem dalam 1 request sahaja)
 */
function handleBoot_(params) {
  const cacheKey = makeCacheKey_('boot');
  const cached = TurboCache.get(cacheKey);
  if (cached) return { success: true, data: cached };

  const bilikList = readSheetAsObjects_(SHEETS.BILIK);

  const bootData = {
    namaAplikasi: APP_NAME,
    versi: APP_VERSION,
    institusi: CONFIG.NAMA_INSTITUSI,
    emelAdmin: CONFIG.EMEL_ADMIN,
    bukuSimpanan: BUKU_SIMPANAN_LIST,
    statusAsetList: Object.values(STATUS_ASET),
    senaraiBilik: bilikList,
    notifConfig: {
      waAktif: CONFIG.NOTIF_WA_AKTIF,
      emailAktif: CONFIG.NOTIF_EMAIL_AKTIF,
      fonnteTokenTersamar: samarkanRahasia_(CONFIG.FONNTE_TOKEN)
    }
  };

  TurboCache.put(cacheKey, bootData, 1800);
  return { success: true, data: bootData };
}

/**
 * Log Masuk Pengguna (Email Whitelist / Sandi Darurat)
 */
function handleLogin_(data) {
  const emel = String(data.email || '').toLowerCase().trim();
  const pass = String(data.password || '').trim();

  // 1. Semakan Akses Darurat (Jika kata laluan dibekalkan)
  if (emel === 'darurat' || emel === 'admin.darurat') {
    const salt = prop_('EMERGENCY_SALT');
    const hash = prop_('EMERGENCY_PASS_HASH');
    const kunciSampai = Number(prop_('DARURAT_KUNCI_SAMPAI') || 0);

    if (kunciSampai > Date.now()) {
      const bakiMinit = Math.ceil((kunciSampai - Date.now()) / 60000);
      throw new Error('Akses darurat disekat sementara. Sila cuba lagi dalam ' + bakiMinit + ' minit.');
    }

    if (hash && salt && samaWaktuKonstan_(hashPassword_(pass, salt), hash)) {
      delProp_('DARURAT_PERCOBAAN');
      const token = buatTokenSesi_('admin.darurat', 'Admin', 'Pentadbir Darurat UPK', true);
      return {
        success: true,
        message: 'Log masuk akses darurat berjaya.',
        token: token,
        user: { email: 'admin.darurat', nama: 'Pentadbir Darurat UPK', peranan: 'Admin' }
      };
    } else {
      let perc = Number(prop_('DARURAT_PERCOBAAN') || 0) + 1;
      setProp_('DARURAT_PERCOBAAN', perc);
      if (perc >= 5) {
        setProp_('DARURAT_KUNCI_SAMPAI', Date.now() + 15 * 60000);
      }
      throw new Error('Kata laluan akses darurat salah.');
    }
  }

  // 2. Semakan Pengguna Berdaftar dalam Sheet Pengguna_Sistem
  const penggunaList = readSheetAsObjects_(SHEETS.PENGGUNA);
  const user = penggunaList.find(u => String(u.Emel).toLowerCase().trim() === emel);

  if (!user) {
    // Jika senarai masih kosong, benarkan pendaftaran admin pertama
    if (penggunaList.length === 0) {
      const token = buatTokenSesi_(emel, 'Admin', 'Pentadbir Awal', false);
      return {
        success: true,
        message: 'Selamat datang Pentadbir Awal.',
        token: token,
        user: { email: emel, nama: 'Pentadbir Utama', peranan: 'Admin' }
      };
    }
    throw new Error('Emel ' + emel + ' tidak berdaftar dalam sistem e-Inventori UPK. Sila hubungi Pentadbir.');
  }

  if (user.Status_Akaun && user.Status_Akaun !== 'Aktif') {
    throw new Error('Akaun anda berstatus "' + user.Status_Akaun + '". Sila hubungi Pentadbir.');
  }

  const token = buatTokenSesi_(user.Emel, user.Peranan || 'Staf', user.Nama_Penuh, false);
  return {
    success: true,
    message: 'Log masuk berjaya.',
    token: token,
    user: {
      email: user.Emel,
      nama: user.Nama_Penuh,
      peranan: user.Peranan,
      noTel: user.No_Tel_WA
    }
  };
}

/**
 * Pendaftaran Pengguna Baharu oleh Admin
 */
function handleDaftarPengguna_(data) {
  if (!data.emel) throw new Error('Emel pengguna adalah wajib.');

  const emel = String(data.emel).toLowerCase().trim();
  const semuaPengguna = readSheetAsObjects_(SHEETS.PENGGUNA);
  if (semuaPengguna.some(u => String(u.Emel).toLowerCase().trim() === emel)) {
    throw new Error('Pengguna dengan emel ini sudah wujud.');
  }

  const rekod = {
    Emel: emel,
    Nama_Penuh: data.nama || 'Kakitangan UPK',
    No_Tel_WA: normalisasiNoTel_(data.noTel || ''),
    Peranan: data.peranan || 'Staf',
    Status_Akaun: 'Aktif',
    Tarikh_Daftar: Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss')
  };

  appendBatchObjects_(SHEETS.PENGGUNA, [rekod]);
  svcCrmSync();

  return {
    success: true,
    message: 'Pengguna ' + emel + ' berjaya didaftarkan sebagai ' + rekod.Peranan
  };
}

/**
 * Pengurusan Kunci Rahsia & Tetapan via Script Properties (Allowlist Terkawal)
 */
function handleSimpanRahasia_(data, sesiUser) {
  if (!sesiUser || sesiUser.peranan !== 'Admin') {
    throw new Error('Hanya Pentadbir (Admin) dibenarkan mengemas kini tetapan rahasia sistem.');
  }

  const ALLOWLIST = [
    'FONNTE_TOKEN',
    'NOTIF_WA_AKTIF',
    'NOTIF_EMAIL_AKTIF',
    'NAMA_INSTITUSI',
    'EMEL_ADMIN'
  ];

  const dikemaskini = [];
  ALLOWLIST.forEach(kunci => {
    if (data[kunci] !== undefined) {
      let val = String(data[kunci]).trim();
      if (val === '__HAPUS__') {
        delProp_(kunci);
        dikemaskini.push(kunci + ' (dibuang)');
      } else if (val !== '') {
        setProp_(kunci, val);
        dikemaskini.push(kunci);
      }
    }
  });

  invalidateCache_('boot');
  return {
    success: true,
    message: 'Tetapan berjaya dikemaskini: ' + dikemaskini.join(', ')
  };
}

/**
 * Bantuan Pembinaan Respons JSON Standard Bebas CORS
 */
function buildJsonResponse_(data) {
  const jsonStr = JSON.stringify(data);
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}
