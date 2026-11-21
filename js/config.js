/**
 * ============================================================================
 * e-Inventori UPK — Frontend: js/config.js
 * Konfigurasi Utama Aplikasi & Endpoint Google Apps Script (REST API)
 * Sesuai panduan: /gas-rahasia-script-properties & /gas-pro-api
 * ============================================================================
 */

const CONFIG = {
  // Masukkan URL Google Apps Script Web App (/exec) selepas deploy
  // Contoh: 'https://script.google.com/macros/s/AKfycbx.../exec'
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwQhzx9yazjkwuWPackuWxkoyf1Gicg-w--OEbiWlyqgbkZ0LmB-Ips-oyKCuSNwLZ5/exec',

  APP_NAME: 'e-Inventori UPK',
  INSTITUSI: 'Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah',
  KEMENTERIAN: 'Kementerian Pendidikan Brunei Darussalam',
  VERSION: '1.0.0-PRO-TURBO',

  // Tempoh simpanan cache SWR di pelayar pengguna (dalam milisaat)
  CACHE_TTL_MS: 300000, // 5 minit

  // Had saiz pemampatan gambar automatik di pelayar (Canvas)
  MAX_IMAGE_WIDTH: 1280,
  IMAGE_QUALITY: 0.82
};
