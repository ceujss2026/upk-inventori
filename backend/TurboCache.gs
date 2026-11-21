/**
 * ============================================================================
 * e-Inventori UPK — Backend: TurboCache.gs
 * Enjin Penskalaan Tinggi, Caching Berlapis (CacheX), dan Manipulasi Memori Batch
 * Sesuai panduan: /gas-scale-turbo
 * ============================================================================
 */

const TurboCache = {
  // Saiz selamat bagi setiap pecahan cache (50,000 karakter)
  PARTITION_SIZE: 50000,

  cache: function () {
    return CacheService.getScriptCache();
  },

  /**
   * Mengambil data dari CacheService dengan sokongan auto-reassembly pecahan (chunks)
   */
  get: function (key) {
    try {
      const c = this.cache();
      const head = c.get(key);
      if (head == null) return null;

      // Jika data tidak dipecah
      if (head.indexOf('__chunks:') !== 0) {
        return JSON.parse(head);
      }

      // Jika data dipecah menjadi beberapa chunk
      const count = parseInt(head.slice(9), 10);
      const keys = [];
      for (let i = 0; i < count; i++) {
        keys.push(key + '#' + i);
      }

      const parts = c.getAll(keys);
      let fullStr = '';
      for (let i = 0; i < count; i++) {
        if (parts[keys[i]] == null) return null; // Ada serpihan yang hilang/tamat tempoh
        fullStr += parts[keys[i]];
      }

      return JSON.parse(fullStr);
    } catch (e) {
      console.warn('TurboCache.get fail for ' + key + ': ' + e.message);
      return null;
    }
  },

  /**
   * Menyimpan objek JSON ke CacheService dengan pemecahan automatik jika melebihi had
   * @param {string} key Kunci cache
   * @param {*} value Data yang akan disimpan (objek/array)
   * @param {number} ttl Tempoh sah dalam saat (maksimum 21600 saat / 6 jam)
   */
  put: function (key, value, ttl) {
    ttl = ttl || 3600; // Default 1 jam
    try {
      const s = JSON.stringify(value);
      const c = this.cache();

      // Jika saiz kecil muat dalam satu kunci
      if (s.length <= this.PARTITION_SIZE) {
        c.put(key, s, ttl);
        return true;
      }

      // Pecah menjadi beberapa bahagian
      const n = Math.ceil(s.length / this.PARTITION_SIZE);
      if (n > 20) {
        console.warn('TurboCache: Saiz data terlalu besar (>1MB), batal cache untuk ' + key);
        return false;
      }

      const map = {};
      for (let i = 0; i < n; i++) {
        map[key + '#' + i] = s.substr(i * this.PARTITION_SIZE, this.PARTITION_SIZE);
      }

      c.putAll(map, ttl);
      c.put(key, '__chunks:' + n, ttl); // Tulis penunjuk kepala selepas serpihan tersimpan
      return true;
    } catch (e) {
      console.warn('TurboCache.put fail for ' + key + ': ' + e.message);
      return false;
    }
  },

  /**
   * Menghapuskan kunci cache tertentu
   */
  remove: function (key) {
    try {
      const c = this.cache();
      const head = c.get(key);
      if (head && head.indexOf('__chunks:') === 0) {
        const count = parseInt(head.slice(9), 10);
        const keys = [key];
        for (let i = 0; i < count; i++) keys.push(key + '#' + i);
        c.removeAll(keys);
      } else {
        c.remove(key);
      }
    } catch (e) {
      // Ignore
    }
  }
};

// ============================================================================
// VERSI CACHE & INVALIDASI TERARAH (Zero Stale Data)
// ============================================================================
function bumpVersion_(scope) {
  const now = String(Date.now());
  CacheService.getScriptCache().put('ver_' + scope, now, 21600);
  return now;
}

function getVersion_(scope) {
  return CacheService.getScriptCache().get('ver_' + scope) || '0';
}

function makeCacheKey_(scope, subkey) {
  const vGlobal = getVersion_('global');
  const vScope = getVersion_(scope);
  return 'upk_' + scope + '_' + vGlobal + '_' + vScope + (subkey ? '_' + subkey : '');
}

// Invalidate semua cache bila ada transaksi tulis
function invalidateCache_(scope) {
  bumpVersion_(scope || 'global');
  bumpVersion_('global');
}

// ============================================================================
// MANIPULASI BATCH SPREADSHEET BERKELAJUAN TINGGI
// ============================================================================
function getSpreadsheet_() {
  const id = CONFIG.SPREADSHEET_ID;
  if (!id) throw new Error('ID Spreadsheet belum dikonfigurasikan. Sila jalankan setupAppEnvironment().');
  return SpreadsheetApp.openById(id);
}

function getSheetByName_(name) {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" tidak ditemui dalam Spreadsheet pangkalan data.');
  return sh;
}

/**
 * Membaca keseluruhan data sheet ke dalam bentuk Array of Objects berasaskan nama Header
 */
function readSheetAsObjects_(sheetName) {
  const sh = getSheetByName_(sheetName);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim());
  const rows = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    // Abaikan baris kosong
    if (row.every(cell => cell === '' || cell === null)) continue;

    const obj = {};
    headers.forEach((h, colIdx) => {
      if (h) {
        let val = row[colIdx];
        // Format tarikh ke ISO string jika Date object
        if (val instanceof Date) {
          val = Utilities.formatDate(val, 'GMT+8', 'yyyy-MM-dd HH:mm:ss');
        }
        obj[h] = val;
      }
    });
    rows.push(obj);
  }

  return rows;
}

/**
 * Menulis kemas kini blok baris kontigu mengikut kekunci padanan (updateWhere)
 * Memangkas operasi tulis daripada puluhan ribu sel kepada satu blok kawasan sahaja.
 */
function updateRowsWhere_(sheetName, keyColumn, patchesByKey) {
  const sh = getSheetByName_(sheetName);
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return 0;

  const headers = values[0].map(h => String(h).trim());
  const keyIdx = headers.indexOf(keyColumn);
  if (keyIdx === -1) throw new Error('Kolom kekunci "' + keyColumn + '" tidak dijumpai pada ' + sheetName);

  let minRow = Infinity;
  let maxRow = -1;
  let updatedCount = 0;

  for (let r = 1; r < values.length; r++) {
    const rowKey = String(values[r][keyIdx]).trim();
    const patch = patchesByKey[rowKey];
    if (!patch) continue;

    let hasChange = false;
    Object.keys(patch).forEach(colName => {
      const colIdx = headers.indexOf(colName);
      if (colIdx > -1) {
        values[r][colIdx] = patch[colName];
        hasChange = true;
      }
    });

    if (hasChange) {
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
      updatedCount++;
    }
  }

  if (updatedCount > 0 && maxRow >= minRow) {
    const rangeHeight = maxRow - minRow + 1;
    const sliceToUpdate = values.slice(minRow, maxRow + 1);
    sh.getRange(minRow + 1, 1, rangeHeight, headers.length).setValues(sliceToUpdate);
  }

  return updatedCount;
}

/**
 * Menambah berbilang baris baharu serentak dalam 1 operasi batch
 */
function appendBatchObjects_(sheetName, objectsArray) {
  if (!objectsArray || !objectsArray.length) return 0;
  const sh = getSheetByName_(sheetName);
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());

  const newRows = objectsArray.map(obj => {
    return headers.map(h => {
      const v = obj[h];
      return v !== undefined && v !== null ? v : '';
    });
  });

  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1, newRows.length, headers.length).setValues(newRows);
  return newRows.length;
}
