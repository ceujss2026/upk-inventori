/**
 * ============================================================================
 * e-Inventori UPK — Backend: AduanService.gs
 * Modul Laporan Kerosakan, Semakan Teknikal Bersebelahan & Kelulusan Pelupusan
 * ============================================================================
 */

/**
 * Hantar Aduan Kerosakan Baharu oleh Kakitangan
 */
function svcHantarAduan(data, sesiUser) {
  if (!data.ID_Aset) throw new Error('ID Aset diperlukan untuk membuat aduan.');
  if (!data.Keterangan_Kerosakan) throw new Error('Keterangan kerosakan wajib diisi.');

  const semuaAset = readSheetAsObjects_(SHEETS.ASET);
  const aset = semuaAset.find(a => a.ID_Aset === data.ID_Aset);
  if (!aset) throw new Error('Aset tidak ditemui.');

  const idAduan = 'ADU-' + Utilities.formatDate(new Date(), 'GMT+8', 'yyMM') + '-' + acakString_(4, '0123456789');

  // Simpan gambar bukti kerosakan jika dimuat naik
  let urlFotoRosak = '';
  if (data.fotoBase64) {
    urlFotoRosak = simpanFotoDrive_(data.fotoBase64, 'BUKTI_ROSAK_' + idAduan, CONFIG.FOLDER_FOTO_ROSAK);
  } else if (data.URL_Foto_Rosak) {
    urlFotoRosak = data.URL_Foto_Rosak;
  }

  const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss');
  const namaPelapor = data.Nama_Pelapor || (sesiUser ? sesiUser.nama : 'Kakitangan UPK');
  const emelPelapor = data.Emel_Pelapor || (sesiUser ? sesiUser.email : '');
  const noTelPelapor = normalisasiNoTel_(data.No_Tel_Pelapor || '');

  const rekodAduan = {
    ID_Aduan: idAduan,
    ID_Aset: data.ID_Aset,
    Tarikh_Aduan: nowStr,
    Nama_Pelapor: namaPelapor,
    Emel_Pelapor: emelPelapor,
    No_Tel_Pelapor: noTelPelapor,
    Bahagian_Rosak: data.Bahagian_Rosak || 'Struktur Fizikal',
    Keterangan_Kerosakan: data.Keterangan_Kerosakan,
    Tahap_Impak: data.Tahap_Impak || 'Sederhana',
    URL_Foto_Rosak: urlFotoRosak,
    Status_Aduan: 'Menunggu Semakan Teknikal',
    Ulasan_Teknikal: '',
    Cadangan_Tindakan: '',
    Anggaran_Kos_BND: 0,
    Pegawai_Pemeriksa: '',
    Tarikh_Pemeriksaan: ''
  };

  appendBatchObjects_(SHEETS.ADUAN, [rekodAduan]);

  // Kemas kini status aset menjadi 'Dalam Penyelenggaraan'
  const patches = {};
  patches[data.ID_Aset] = {
    Status_Aset: STATUS_ASET.PENYELENGGARAAN
  };
  updateRowsWhere_(SHEETS.ASET, 'ID_Aset', patches);

  // Memicu notifikasi WhatsApp & Emel
  svcKirimNotifikasiCepat_('ADUAN_BARU', {
    namaBarang: aset.Nama_Barang,
    idAset: data.ID_Aset,
    bilik: aset.Lokasi_Bilik,
    pelapor: namaPelapor,
    bahagianRosak: rekodAduan.Bahagian_Rosak
  }, idAduan);

  invalidateCache_('aset');
  invalidateCache_('stats');
  invalidateCache_('aduan');

  return {
    success: true,
    message: 'Aduan kerosakan (' + idAduan + ') berjaya dihantar dan status aset telah dikemaskini.',
    idAduan: idAduan
  };
}

/**
 * Mengambil Senarai Aduan Kerosakan
 */
function svcGetSenaraiAduan(status) {
  const cacheKey = makeCacheKey_('aduan', status || 'ALL');
  const cached = TurboCache.get(cacheKey);
  if (cached) return cached;

  const semuaAduan = readSheetAsObjects_(SHEETS.ADUAN);
  const semuaAset = readSheetAsObjects_(SHEETS.ASET);

  // Padankan dengan maklumat aset (termasuk Foto Asal untuk semakan Side-by-Side)
  const asetMap = {};
  semuaAset.forEach(a => { asetMap[a.ID_Aset] = a; });

  const enriched = semuaAduan.map(aduan => {
    const aset = asetMap[aduan.ID_Aset] || {};
    return Object.assign({}, aduan, {
      Nama_Barang: aset.Nama_Barang || '',
      No_Siri_Daftar: aset.No_Siri_Daftar || '',
      Lokasi_Bilik: aset.Lokasi_Bilik || '',
      Buku_Simpanan: aset.Buku_Simpanan || '',
      URL_Foto_Asal: aset.URL_Foto_Asal || ''
    });
  });

  let hasil = enriched;
  if (status && status !== 'Semua') {
    hasil = hasil.filter(a => String(a.Status_Aduan).toLowerCase() === String(status).toLowerCase());
  }

  hasil.sort((a, b) => new Date(b.Tarikh_Aduan || 0) - new Date(a.Tarikh_Aduan || 0));
  TurboCache.put(cacheKey, hasil, 900);
  return hasil;
}

/**
 * Semakan Teknikal Bersebelahan (Side-by-Side Inspection) oleh Juruteknik/Pemeriksa
 */
function svcSelesaiSemakanTeknikal(idAduan, data, sesiUser) {
  const semuaAduan = readSheetAsObjects_(SHEETS.ADUAN);
  const aduan = semuaAduan.find(a => a.ID_Aduan === idAduan);
  if (!aduan) throw new Error('Aduan tidak ditemui.');

  const semuaAset = readSheetAsObjects_(SHEETS.ASET);
  const aset = semuaAset.find(a => a.ID_Aset === aduan.ID_Aset);
  if (!aset) throw new Error('Aset aduan tidak ditemui.');

  const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss');
  const namaPemeriksa = data.Pegawai_Pemeriksa || (sesiUser ? sesiUser.nama : 'Pemeriksa Teknikal UPK');
  const cadangan = data.Cadangan_Tindakan; // 'Boleh Dibaiki' atau 'Cadangan Pelupusan'

  // Kemas kini rekod Aduan_Kerosakan
  const patchesAduan = {};
  patchesAduan[idAduan] = {
    Ulasan_Teknikal: data.Ulasan_Teknikal || '',
    Cadangan_Tindakan: cadangan,
    Anggaran_Kos_BND: Number(data.Anggaran_Kos_BND || 0),
    Pegawai_Pemeriksa: namaPemeriksa,
    Tarikh_Pemeriksaan: nowStr,
    Status_Aduan: cadangan === 'Cadangan Pelupusan' ? 'Menunggu Sokongan Pelupusan' : 'Selesai Disemak (Boleh Dibaiki)'
  };
  updateRowsWhere_(SHEETS.ADUAN, 'ID_Aduan', patchesAduan);

  // Jika disyorkan untuk pelupusan, cipta rekod dalam Permohonan_Pelupusan
  if (cadangan === 'Cadangan Pelupusan') {
    const idPelupusan = 'LPS-' + Utilities.formatDate(new Date(), 'GMT+8', 'yyMM') + '-' + acakString_(4, '0123456789');
    const verifikasiHmac = hmacSha256_(idPelupusan + '|' + aset.ID_Aset + '|' + nowStr).slice(0, 16);

    const rekodPelupusan = {
      ID_Pelupusan: idPelupusan,
      ID_Aset: aset.ID_Aset,
      ID_Aduan: idAduan,
      Tarikh_Permohonan: nowStr,
      Pegawai_Pemeriksa: namaPemeriksa,
      Laporan_Teknikal: data.Ulasan_Teknikal || '',
      Justifikasi_Pelupusan: data.Justifikasi_Pelupusan || 'Rosak Teruk & Tidak Ekonomik Dibaiki',
      Status_Kelulusan: 'Menunggu Sokongan Ketua Unit',
      Tarikh_Kelulusan: '',
      Pegawai_Pengesah: '',
      Catatan_Kelulusan: '',
      URL_PDF_Rasmi: '',
      Kod_Verifikasi_HMAC: verifikasiHmac
    };
    appendBatchObjects_(SHEETS.PELUPUSAN, [rekodPelupusan]);

    // Kemaskini status aset menjadi 'Cadangan Pelupusan'
    const patchAset = {};
    patchAset[aset.ID_Aset] = { Status_Aset: STATUS_ASET.CADANG_PELUPUSAN };
    updateRowsWhere_(SHEETS.ASET, 'ID_Aset', patchAset);

    // Notifikasi ke Ketua Unit
    svcKirimNotifikasiCepat_('PERMOHONAN_PELUPUSAN_TERBIT', {
      namaBarang: aset.Nama_Barang,
      idAset: aset.ID_Aset
    }, idPelupusan);
  } else if (cadangan === 'Boleh Dibaiki') {
    // Status aset kembali beroperasi atau kekal penyelenggaraan
    const patchAset = {};
    patchAset[aset.ID_Aset] = { Status_Aset: STATUS_ASET.PENYELENGGARAAN };
    updateRowsWhere_(SHEETS.ASET, 'ID_Aset', patchAset);
  }

  svcKirimNotifikasiCepat_('SEMAKAN_TEKNIKAL_SELESAI', {
    idAset: aset.ID_Aset,
    pemeriksa: namaPemeriksa,
    perakuan: cadangan,
    ulasan: data.Ulasan_Teknikal || ''
  }, idAduan);

  invalidateCache_('aset');
  invalidateCache_('stats');
  invalidateCache_('aduan');
  invalidateCache_('pelupusan');

  return {
    success: true,
    message: 'Semakan teknikal berjaya disahkan dan disimpan.'
  };
}

/**
 * Kelulusan / Sokongan Pelupusan Aset oleh Ketua Unit (1-Click Approve / Reject)
 */
function svcLuluskanPelupusan(idPelupusan, statusKeputusan, ulasan, sesiUser) {
  const semuaLps = readSheetAsObjects_(SHEETS.PELUPUSAN);
  const lps = semuaLps.find(l => l.ID_Pelupusan === idPelupusan);
  if (!lps) throw new Error('Rekod permohonan pelupusan tidak ditemui.');

  const semuaAset = readSheetAsObjects_(SHEETS.ASET);
  const aset = semuaAset.find(a => a.ID_Aset === lps.ID_Aset);
  if (!aset) throw new Error('Aset berkaitan tidak ditemui.');

  const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss');
  const namaPengesah = sesiUser ? sesiUser.nama : 'Ketua Unit Pendidikan Kerjaya';

  const isLulus = statusKeputusan === 'Disokong & Diluluskan';

  // Kemaskini rekod Permohonan_Pelupusan
  const patchesLps = {};
  patchesLps[idPelupusan] = {
    Status_Kelulusan: isLulus ? 'Diluluskan' : 'Ditolak',
    Tarikh_Kelulusan: nowStr,
    Pegawai_Pengesah: namaPengesah,
    Catatan_Kelulusan: ulasan || ''
  };

  // Kemaskini status aset
  const patchesAset = {};
  if (isLulus) {
    patchesAset[aset.ID_Aset] = {
      Status_Aset: STATUS_ASET.DILUPUSKAN,
      Baki_Stok: 0
    };

    // Catat log pelupusan dalam Stock Card
    const log = {
      ID_Log: 'LOG-' + Utilities.getUuid().slice(0, 8),
      ID_Aset: aset.ID_Aset,
      Tarikh_Transaksi: nowStr,
      Jenis_Transaksi: 'Pelupusan / Penghapusan',
      Bilik_Asal: aset.Lokasi_Bilik,
      Bilik_Tujuan: 'Pelupusan Rasmi Kerajaan',
      Kuantiti_Perubahan: -Number(aset.Baki_Stok || 1),
      Baki_Selepas_Transaksi: 0,
      No_Rujukan: idPelupusan,
      Didaftar_Oleh: namaPengesah,
      Catatan: 'Aset telah dilupuskan secara rasmi atas perakuan teknikal'
    };
    appendBatchObjects_(SHEETS.STOCK_CARD, [log]);
  } else {
    // Jika ditolak, kembalikan status aset kepada asal
    patchesAset[aset.ID_Aset] = {
      Status_Aset: STATUS_ASET.BAIK
    };
  }
  updateRowsWhere_(SHEETS.ASET, 'ID_Aset', patchesAset);
  updateRowsWhere_(SHEETS.PELUPUSAN, 'ID_Pelupusan', patchesLps);

  // Memicu DocEngine untuk menerbitkan fail PDF rasmi jika diluluskan
  let urlPdf = '';
  if (isLulus) {
    try {
      urlPdf = svcJanaDokumenPelupusanPdf_(idPelupusan);
      const patchPdf = {};
      patchPdf[idPelupusan] = { URL_PDF_Rasmi: urlPdf };
      updateRowsWhere_(SHEETS.PELUPUSAN, 'ID_Pelupusan', patchPdf);
    } catch (e) {
      console.error('Ralat jana PDF pelupusan: ' + e.message);
    }
  }

  // Notifikasi
  svcKirimNotifikasiCepat_('PELUPUSAN_DISAHKAN', {
    idAset: aset.ID_Aset,
    status: isLulus ? 'DILULUSKAN' : 'DITOLAK'
  }, idPelupusan);

  invalidateCache_('aset');
  invalidateCache_('stats');
  invalidateCache_('pelupusan');

  return {
    success: true,
    message: 'Permohonan pelupusan ' + idPelupusan + ' berjaya ' + (isLulus ? 'diluluskan' : 'ditolak') + '.',
    urlPdf: urlPdf
  };
}

/**
 * Mengambil Senarai Permohonan Pelupusan Aset
 */
function svcGetSenaraiPelupusan() {
  const cacheKey = makeCacheKey_('pelupusan');
  const cached = TurboCache.get(cacheKey);
  if (cached) return cached;

  const semuaLps = readSheetAsObjects_(SHEETS.PELUPUSAN);
  const semuaAset = readSheetAsObjects_(SHEETS.ASET);
  const semuaAduan = readSheetAsObjects_(SHEETS.ADUAN);

  const asetMap = {};
  semuaAset.forEach(a => { asetMap[a.ID_Aset] = a; });
  const aduanMap = {};
  semuaAduan.forEach(ad => { aduanMap[ad.ID_Aduan] = ad; });

  const enriched = semuaLps.map(lps => {
    const aset = asetMap[lps.ID_Aset] || {};
    const aduan = aduanMap[lps.ID_Aduan] || {};
    return Object.assign({}, lps, {
      Nama_Barang: aset.Nama_Barang || '',
      No_Siri_Daftar: aset.No_Siri_Daftar || '',
      Lokasi_Bilik: aset.Lokasi_Bilik || '',
      Harga_Asal_BND: aset.Harga_Asal_BND || 0,
      URL_Foto_Asal: aset.URL_Foto_Asal || '',
      URL_Foto_Rosak: aduan.URL_Foto_Rosak || '',
      Bahagian_Rosak: aduan.Bahagian_Rosak || ''
    });
  });

  enriched.sort((a, b) => new Date(b.Tarikh_Permohonan || 0) - new Date(a.Tarikh_Permohonan || 0));
  TurboCache.put(cacheKey, enriched, 900);
  return enriched;
}
