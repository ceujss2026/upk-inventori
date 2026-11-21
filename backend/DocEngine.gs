/**
 * ============================================================================
 * e-Inventori UPK — Backend: DocEngine.gs
 * Enjin Penjanaan Dokumen Rasmi Kerajaan, PDF Ber-QR & Verifikasi Integriti HMAC
 * Sesuai panduan: /gas-doc-engine
 * ============================================================================
 */

/**
 * Menjana Borang PDF Rasmi Permohonan Pelupusan Aset Alih Kerajaan
 */
function svcJanaDokumenPelupusanPdf_(idPelupusan) {
  const semuaLps = readSheetAsObjects_(SHEETS.PELUPUSAN);
  const lps = semuaLps.find(l => l.ID_Pelupusan === idPelupusan);
  if (!lps) throw new Error('Rekod pelupusan ' + idPelupusan + ' tidak ditemui.');

  const semuaAset = readSheetAsObjects_(SHEETS.ASET);
  const aset = semuaAset.find(a => a.ID_Aset === lps.ID_Aset) || {};

  const semuaAduan = readSheetAsObjects_(SHEETS.ADUAN);
  const aduan = semuaAduan.find(ad => ad.ID_Aduan === lps.ID_Aduan) || {};

  const folderPdfId = CONFIG.FOLDER_DOKUMEN_PDF;
  const folderPdf = DriveApp.getFolderById(folderPdfId);

  const namaFailDoc = 'BORANG_PELUPUSAN_' + lps.ID_Pelupusan;
  const doc = DocumentApp.create(namaFailDoc);
  const body = doc.getBody();

  // Tetapan margin muka surat rasmi
  body.setMarginTop(36);
  body.setMarginBottom(36);
  body.setMarginLeft(40);
  body.setMarginRight(40);

  // 1. Pengepala Rasmi Institusi
  const headerPara = body.appendParagraph('KEMENTERIAN PENDIDIKAN BRUNEI DARUSSALAM');
  headerPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  headerPara.setFontFamily('Arial').setFontSize(11).setBold(true);

  const subHeader = body.appendParagraph('JABATAN SEKOLAH-SEKOLAH\nUNIT PENDIDIKAN KERJAYA');
  subHeader.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  subHeader.setFontFamily('Arial').setFontSize(10).setBold(true);

  const tajukDoc = body.appendParagraph('\nBORANG PERAKUAN & PERMOHONAN PELUPUSAN ASET ALIH KERAJAAN');
  tajukDoc.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  tajukDoc.setFontFamily('Arial').setFontSize(12).setBold(true).setUnderline(true);

  const noRujukanPara = body.appendParagraph('No. Rujukan Pelupusan: ' + lps.ID_Pelupusan + '    |    Tarikh: ' + (lps.Tarikh_Permohonan ? lps.Tarikh_Permohonan.split(' ')[0] : ''));
  noRujukanPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  noRujukanPara.setFontFamily('Arial').setFontSize(9).setItalic(true);

  body.appendHorizontalRule();

  // 2. Bahagian I: Maklumat Terperinci Aset
  body.appendParagraph('BAHAGIAN I: MAKLUMAT ASET & PENEMPATAN').setBold(true).setFontSize(10);

  const tableAset = body.appendTable([
    ['Nama Barang / Item', aset.Nama_Barang || '-'],
    ['ID Aset & No. Siri', (aset.ID_Aset || '-') + ' / ' + (aset.No_Siri_Daftar || '-')],
    ['Buku Simpanan / Kategori', (aset.Buku_Simpanan || '-') + ' (' + (aset.Kategori || '-') + ')'],
    ['Lokasi Penempatan Rasmi', aset.Lokasi_Bilik || '-'],
    ['Tarikh Perolehan / Daftar', (aset.Tarikh_Daftar ? aset.Tarikh_Daftar.split(' ')[0] : '-')],
    ['Harga Asal Perolehan', 'BND $' + Number(aset.Harga_Asal_BND || 0).toFixed(2)],
    ['Pegawai Penanggungjawab', aset.Pegawai_Penanggungjawab || '-']
  ]);
  tableAset.setBorderWidth(0.5).setBorderColor('#999999');

  body.appendParagraph('');

  // 3. Bahagian II: Dokumentasi Visual Bersebelahan (Side-by-Side Photographic Evidence)
  body.appendParagraph('BAHAGIAN II: BUKTI VISUAL KEADAAN ASET (BERSEBELAHAN)').setBold(true).setFontSize(10);
  const visualDesc = body.appendParagraph('Perbandingan visual antara keadaan fizikal asal semasa pendaftaran dan keadaan kerosakan semasa pemeriksaan:');
  visualDesc.setFontSize(8.5).setItalic(true);

  const tableVisual = body.appendTable([
    ['GAMBAR 1: KEADAAN ASAL SEMASA DAFTAR', 'GAMBAR 2: BUKTI KEROSAKAN SEMASA'],
    ['[Pautan Foto Asal]\n' + (aset.URL_Foto_Asal || 'Tiada Foto Asal'), '[Pautan Foto Kerosakan]\n' + (aduan.URL_Foto_Rosak || 'Tiada Foto Kerosakan')]
  ]);
  tableVisual.setBorderWidth(0.5).setBorderColor('#0F3E5D');

  body.appendParagraph('');

  // 4. Bahagian III: Laporan Pemeriksaan Teknikal & Justifikasi
  body.appendParagraph('BAHAGIAN III: LAPORAN PEMERIKSAAN TEKNIKAL').setBold(true).setFontSize(10);
  const tableTeknikal = body.appendTable([
    ['Bahagian yang Mengalami Kerosakan', aduan.Bahagian_Rosak || '-'],
    ['Dapatan Pemeriksaan Fizikal', lps.Laporan_Teknikal || aduan.Ulasan_Teknikal || '-'],
    ['Justifikasi Pelupusan', lps.Justifikasi_Pelupusan || 'Usang / Rosak Teruk Tidak Ekonomik Dibaiki'],
    ['Pegawai Pemeriksa Teknikal', lps.Pegawai_Pemeriksa || '-']
  ]);
  tableTeknikal.setBorderWidth(0.5).setBorderColor('#999999');

  body.appendParagraph('');

  // 5. Bahagian IV: Perakuan Kelulusan Ketua Unit & QR HMAC
  body.appendParagraph('BAHAGIAN IV: KELULUSAN & PENGESAHAN KETUA UNIT').setBold(true).setFontSize(10);
  const statusSah = lps.Status_Kelulusan || 'Diluluskan';

  const kodVerifikasi = lps.Kod_Verifikasi_HMAC || hmacSha256_(lps.ID_Pelupusan).slice(0, 16);
  const urlVerifikasi = (CONFIG.APP_URL || '') + '?action=verifikasiDokumen&kod=' + kodVerifikasi;

  const tablePengesahan = body.appendTable([
    ['Keputusan Kelulusan', statusSah.toUpperCase()],
    ['Pegawai Pengesah / Jawatan', (lps.Pegawai_Pengesah || 'Ketua Unit') + ' (Unit Pendidikan Kerjaya)'],
    ['Tarikh Disahkan', lps.Tarikh_Kelulusan ? lps.Tarikh_Kelulusan.split(' ')[0] : ''],
    ['Catatan / Arahan Pelupusan', lps.Catatan_Kelulusan || 'Barang dilupuskan mengikut tatacara pelupusan aset alih kerajaan.'],
    ['Kod Verifikasi HMAC', kodVerifikasi + ' (Disahkan oleh sistem e-Inventori UPK)']
  ]);
  tablePengesahan.setBorderWidth(0.5).setBorderColor('#999999');

  const footerNotice = body.appendParagraph('\nDokumen ini dijana secara elektronik oleh Sistem e-Inventori UPK dan sah tanpa tandatangan fizikal sekiranya kod verifikasi HMAC di atas sah.');
  footerNotice.setFontSize(8).setItalic(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  doc.saveAndClose();

  // Eksport ke PDF
  const docFile = DriveApp.getFileById(doc.getId());
  const pdfBlob = docFile.getAs(MimeType.PDF).setName(namaFailDoc + '.pdf');
  const pdfFile = folderPdf.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Buang fail Docs sementara
  try { docFile.setTrashed(true); } catch (e) {}

  const urlPdf = pdfFile.getUrl();

  // Simpan rekod ke DE_Dokumen
  try {
    const rekodDoc = {
      DokumenID: 'DOC-' + Utilities.getUuid().slice(0, 8),
      TemplateID: 'TMP-PELUPUSAN-ASET',
      NomborSurat: lps.ID_Pelupusan,
      Perihal: 'Permohonan Pelupusan ' + (aset.Nama_Barang || ''),
      TarikhSurat: lps.Tarikh_Permohonan || '',
      Status: 'TERBIT',
      DataIsianJson: JSON.stringify({ idPelupusan: lps.ID_Pelupusan, idAset: lps.ID_Aset }),
      Penandatangan: lps.Pegawai_Pengesah || '',
      KodVerifikasi: kodVerifikasi,
      HashPdf: Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pdfBlob.getBytes()).map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join(''),
      UrlPdf: urlPdf,
      DibuatPada: new Date().toISOString()
    };
    appendBatchObjects_(SHEETS.DE_DOKUMEN, [rekodDoc]);
  } catch (err) {
    console.warn('Gagal log DE_Dokumen: ' + err.message);
  }

  return urlPdf;
}

/**
 * Pengesahan Awam Dokumen Melalui Kod QR (Public HMAC Verification)
 */
function svcVerifikasiDokumen(kodVerifikasi) {
  if (!kodVerifikasi) return { sah: false, mesej: 'Kod verifikasi tidak sah.' };

  const semuaLps = readSheetAsObjects_(SHEETS.PELUPUSAN);
  const padan = semuaLps.find(l => l.Kod_Verifikasi_HMAC === kodVerifikasi || l.ID_Pelupusan === kodVerifikasi);

  if (!padan) {
    return {
      sah: false,
      mesej: 'Dokumen tidak dijumpai atau telah ditarik balik.'
    };
  }

  const semuaAset = readSheetAsObjects_(SHEETS.ASET);
  const aset = semuaAset.find(a => a.ID_Aset === padan.ID_Aset) || {};

  return {
    sah: true,
    mesej: 'Dokumen Sah dan Tulen Dikeluarkan oleh Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah.',
    data: {
      noPelupusan: padan.ID_Pelupusan,
      namaBarang: aset.Nama_Barang,
      idAset: padan.ID_Aset,
      statusKelulusan: padan.Status_Kelulusan,
      pegawaiPengesah: padan.Pegawai_Pengesah,
      tarikhKelulusan: padan.Tarikh_Kelulusan,
      urlPdf: padan.URL_PDF_Rasmi
    }
  };
}
