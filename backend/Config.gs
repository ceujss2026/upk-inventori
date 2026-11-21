/**
 * ============================================================================
 * e-Inventori UPK — Backend: Config.gs
 * Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah, Kementerian Pendidikan Brunei
 * Modul Konfigurasi, Keselamatan Script Properties & Pengendali Sesi HMAC
 * Sesuai panduan: /gas-rahasia-script-properties & /gas-scale-turbo
 * ============================================================================
 */

// Versi Aplikasi & Telemetri
const APP_VERSION = '1.0.0-PRO-TURBO';
const APP_NAME = 'e-Inventori UPK (Brunei Darussalam)';

// Registry Nama Sheet Rasmi
const SHEETS = {
  CONFIG: 'AppConfig',
  ASET: 'Aset_Inventori',
  STOCK_CARD: 'Stock_Card',
  ADUAN: 'Aduan_Kerosakan',
  PELUPUSAN: 'Permohonan_Pelupusan',
  BILIK: 'Lokasi_Bilik',
  PENGGUNA: 'Pengguna_Sistem',
  ANTREAN_NOTIF: 'AntrianNotif',
  BLAST_WA: 'BlastWA',
  CRM_KONTAK: 'CRM_Kontak',
  CRM_INTERAKSI: 'CRM_Interaksi',
  DE_DOKUMEN: 'DE_Dokumen',
  DE_TEMPLATE: 'DE_Template'
};

// Kategori Buku Simpanan Rasmi Kerajaan
const BUKU_SIMPANAN_LIST = [
  'Perabot Pejabat',
  'Peralatan Komputer & IT',
  'Peralatan Elektrik',
  'Barang Guna Habis'
];

// Status Aset Rasmi
const STATUS_ASET = {
  BAIK: 'Beroperasi Baik',
  PENYELENGGARAAN: 'Dalam Penyelenggaraan',
  CADANG_PELUPUSAN: 'Cadangan Pelupusan',
  DILUPUSKAN: 'Dilupuskan'
};

// Registry Kejadian Notifikasi (WhatsApp & Email)
const NOTIF_EVENTS = {
  ADUAN_BARU: {
    label: 'Aduan Kerosakan Baharu Diterima',
    wa: true, email: true,
    subjek: 'Aduan Kerosakan: {namaBarang} ({idAset})',
    pesan: 'Makluman Rasmi UPK:\nAduan kerosakan bagi *{namaBarang}* ({idAset}) di *{bilik}* telah didaftarkan oleh *{pelapor}*.\nBahagian rosak: {bahagianRosak}.\nSila semak sistem e-Inventori UPK untuk tindakan teknikal.'
  },
  SEMAKAN_TEKNIKAL_SELESAI: {
    label: 'Pemeriksaan Teknikal Selesai',
    wa: true, email: true,
    subjek: 'Hasil Pemeriksaan Teknikal: {idAset}',
    pesan: 'Makluman UPK:\nPemeriksaan teknikal bagi aset *{idAset}* telah selesai dijalankan oleh *{pemeriksa}*.\nPerakuan: *{perakuan}*.\nCatatan: {ulasan}'
  },
  PERMOHONAN_PELUPUSAN_TERBIT: {
    label: 'Permohonan Pelupusan Menunggu Sokongan',
    wa: true, email: true,
    subjek: 'Permohonan Pelupusan Aset: {idAset}',
    pesan: 'Makluman kepada Ketua Unit UPK:\nDraf permohonan pelupusan aset bagi *{namaBarang}* ({idAset}) sedia untuk disemak dan disokong.\nSila buka papan pemuka e-Inventori UPK untuk pengesahan bersebelahan.'
  },
  PELUPUSAN_DISAHKAN: {
    label: 'Pelupusan Aset Diluluskan',
    wa: true, email: true,
    subjek: 'Status Pelupusan: {idAset} - {status}',
    pesan: 'Makluman UPK:\nPermohonan pelupusan aset *{idAset}* telah *{status}* oleh Ketua Unit UPK.\nDokumen rasmi pelupusan ber-QR kini sedia dimuat turun.'
  },
  AMARAN_STOK_MINIMUM: {
    label: 'Amaran Baki Stok Minimum Barang Guna Habis',
    wa: true, email: true,
    subjek: 'Peringatan Baki Stok Rendah: {namaBarang}',
    pesan: 'Peringatan e-Inventori UPK:\nBaki stok bagi barang guna habis *{namaBarang}* kini tinggal *{baki} Unit* (di bawah paras minimum {parasMin}). Sila buat pesanan bekalan baharu.'
  }
};

// ============================================================================
// AKSES SATU PINTU SCRIPT PROPERTIES (Zero Literal Secrets)
// ============================================================================
const PROPS = PropertiesService.getScriptProperties();
let _PROP_MEMO = null;

function prop_(key, def) {
  if (!_PROP_MEMO) {
    try {
      _PROP_MEMO = PROPS.getProperties() || {};
    } catch (e) {
      _PROP_MEMO = {};
    }
  }
  const v = _PROP_MEMO[key];
  return (v === undefined || v === null || v === '') ? (def === undefined ? '' : def) : v;
}

function setProp_(key, val) {
  PROPS.setProperty(key, String(val));
  if (!_PROP_MEMO) _PROP_MEMO = {};
  _PROP_MEMO[key] = String(val);
}

function setProps_(obj) {
  PROPS.setProperties(obj);
  if (!_PROP_MEMO) _PROP_MEMO = {};
  Object.keys(obj).forEach(k => { _PROP_MEMO[k] = String(obj[k]); });
}

function delProp_(key) {
  PROPS.deleteProperty(key);
  if (_PROP_MEMO) delete _PROP_MEMO[key];
}

// Konfigurasi Pangkalan Data Dinamik
const CONFIG = {
  get SPREADSHEET_ID() { return prop_('SPREADSHEET_ID'); },
  get ROOT_FOLDER_ID() { return prop_('ROOT_FOLDER_ID'); },
  get FOLDER_FOTO_ASAL() { return prop_('FOLDER_FOTO_ASAL'); },
  get FOLDER_FOTO_ROSAK() { return prop_('FOLDER_FOTO_ROSAK'); },
  get FOLDER_QR_CODE() { return prop_('FOLDER_QR_CODE'); },
  get FOLDER_DOKUMEN_PDF() { return prop_('FOLDER_DOKUMEN_PDF'); },
  get FONNTE_TOKEN() { return prop_('FONNTE_TOKEN'); },
  get NOTIF_WA_AKTIF() { return prop_('NOTIF_WA_AKTIF', '0') === '1'; },
  get NOTIF_EMAIL_AKTIF() { return prop_('NOTIF_EMAIL_AKTIF', '1') === '1'; },
  get NAMA_INSTITUSI() { return prop_('NAMA_INSTITUSI', 'Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah'); },
  get EMEL_ADMIN() { return prop_('EMEL_ADMIN', 'upk.inventori@moe.gov.bn'); }
};

// ============================================================================
// KRIPTOGRAFI, HASH & SESI HMAC STATELESS
// ============================================================================
const SESI_JAM = 12;

function acakString_(n, huruf) {
  huruf = huruf || 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  while (s.length < n) {
    const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Math.random());
    for (let i = 0; i < raw.length && s.length < n; i++) {
      s += huruf[(raw[i] & 0xff) % huruf.length];
    }
  }
  return s;
}

function getSessionSecret_() {
  let s = prop_('SESSION_SECRET');
  if (!s) {
    s = acakString_(64);
    setProp_('SESSION_SECRET', s);
  }
  return s;
}

function hmacSha256_(s) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(s, getSessionSecret_())
  ).replace(/=+$/, '');
}

function samaWaktuKonstan_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) {
    r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return r === 0;
}

function buatTokenSesi_(email, peranan, nama, darurat) {
  const now = Date.now();
  const payload = {
    e: String(email).toLowerCase().trim(),
    r: peranan,
    n: nama || '',
    i: now,
    x: now + SESI_JAM * 3600000,
    d: darurat ? 1 : 0
  };
  const body = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '');
  return body + '.' + hmacSha256_(body);
}

function sahkanTokenSesi_(token) {
  try {
    if (!token) return null;
    const parts = String(token).split('.');
    if (parts.length !== 2) return null;
    if (!samaWaktuKonstan_(hmacSha256_(parts[0]), parts[1])) return null;

    let b = parts[0];
    while (b.length % 4) b += '=';
    const jsonStr = Utilities.newBlob(Utilities.base64DecodeWebSafe(b)).getDataAsString();
    const payload = JSON.parse(jsonStr);

    if (!payload.x || payload.x < Date.now()) return null;

    // Semak revocation
    const rev = Number(CacheService.getScriptCache().get('rev_' + payload.e) || prop_('REV_' + payload.e) || 0);
    if (payload.i < rev) return null;

    return {
      email: payload.e,
      peranan: payload.r,
      nama: payload.n || '',
      exp: payload.x,
      darurat: !!payload.d
    };
  } catch (e) {
    return null;
  }
}

function cabutSesi_(email) {
  const t = String(Date.now());
  setProp_('REV_' + email.toLowerCase(), t);
  CacheService.getScriptCache().put('rev_' + email.toLowerCase(), t, 21600);
}

function hashPassword_(pass, salt) {
  let h = String(pass);
  for (let i = 0; i < 300; i++) {
    h = Utilities.base64Encode(Utilities.computeHmacSha256Signature(h + salt, salt));
  }
  return h;
}

function samarkanRahasia_(v) {
  v = String(v || '');
  if (!v) return '';
  if (v.length <= 8) return '••••••';
  return v.slice(0, 4) + '••••••' + v.slice(-3);
}

// Bantuan normalisasi nombor telefon Brunei Darussalam & antarabangsa
function normalisasiNoTel_(hp) {
  let s = String(hp || '').replace(/[^0-9]/g, '');
  if (!s) return '';
  // Format tempatan Brunei (7 digit bermula 8 atau 7) -> 6738xxxxxx
  if (s.length === 7 && (s.startsWith('8') || s.startsWith('7'))) {
    return '673' + s;
  }
  // Format bermula 08... (Malaysia/Indonesia/lain-lain)
  if (s.startsWith('0')) {
    s = s.substring(1);
    // jika 7 digit seterusnya bermula 8 atau 7 di Brunei
    if (s.length === 7) return '673' + s;
    return '60' + s; // fallback lazim
  }
  // Sudah ada kod negara 673
  if (s.startsWith('673')) return s;
  if (s.startsWith('62') || s.startsWith('60')) return s;
  return s;
}
