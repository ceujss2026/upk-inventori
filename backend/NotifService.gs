/**
 * ============================================================================
 * e-Inventori UPK — Backend: NotifService.gs
 * Modul Notifikasi WhatsApp (Fonnte), Emel (MailApp) & CRM Pengurusan Kontak UPK
 * Sesuai panduan: /gas-notifikasi-wa-crm
 * ============================================================================
 */

/**
 * Pemicu Cepat Antrean Notifikasi (Non-blocking)
 * Mengisi antrean dalam sheet AntrianNotif tanpa memperlahankan respons pengguna
 */
function svcKirimNotifikasiCepat_(eventKey, params, refId) {
  try {
    const eventConfig = NOTIF_EVENTS[eventKey];
    if (!eventConfig) return;

    const waAktif = CONFIG.NOTIF_WA_AKTIF;
    const emailAktif = CONFIG.NOTIF_EMAIL_AKTIF;
    if (!waAktif && !emailAktif) return;

    // Ambil senarai penerima berdasarkan event
    const penerimaList = tentukanPenerimaNotif_(eventKey, params);
    if (!penerimaList || !penerimaList.length) return;

    const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss');
    const antreanRows = [];

    penerimaList.forEach(p => {
      // 1. WhatsApp
      if (waAktif && eventConfig.wa && p.noTel) {
        const telNorm = normalisasiNoTel_(p.noTel);
        if (telNorm) {
          const pesanWa = formatTemplatePesan_(eventConfig.pesan, params, p.nama);
          antreanRows.push({
            AntrianID: 'ANT-WA-' + Utilities.getUuid().slice(0, 8),
            Kanal: 'WA',
            Tujuan: telNorm,
            NamaPenerima: p.nama || 'Kakitangan UPK',
            Subjek: '',
            Pesan: pesanWa,
            Event: eventKey,
            RefID: refId || '',
            BlastID: '',
            Status: 'Antri',
            Percobaan: 0,
            Respon: '',
            DibuatPada: nowStr,
            DikirimPada: ''
          });
        }
      }

      // 2. Email
      if (emailAktif && eventConfig.email && p.emel && p.emel.includes('@')) {
        const subjekEmail = formatTemplatePesan_(eventConfig.subjek, params, p.nama);
        const pesanEmail = formatTemplatePesan_(eventConfig.pesan, params, p.nama);
        antreanRows.push({
          AntrianID: 'ANT-EM-' + Utilities.getUuid().slice(0, 8),
          Kanal: 'EMAIL',
          Tujuan: p.emel.trim().toLowerCase(),
          NamaPenerima: p.nama || 'Kakitangan UPK',
          Subjek: subjekEmail,
          Pesan: pesanEmail,
          Event: eventKey,
          RefID: refId || '',
          BlastID: '',
          Status: 'Antri',
          Percobaan: 0,
          Respon: '',
          DibuatPada: nowStr,
          DikirimPada: ''
        });
      }
    });

    if (antreanRows.length > 0) {
      appendBatchObjects_(SHEETS.ANTREAN_NOTIF, antreanRows);
      setProp_('ANTRIAN_ADA', '1');
    }
  } catch (err) {
    console.error('Ralat memasukkan antrean notifikasi: ' + err.message);
  }
}

/**
 * Pemprosesan Antrean Notifikasi (Dijalankan secara berkala oleh Trigger Minitan)
 */
function prosesAntrianNotif(opsi) {
  opsi = opsi || {};
  if (!opsi.paksa && prop_('ANTRIAN_ADA') !== '1') return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return;

  try {
    const shAntrean = getSheetByName_(SHEETS.ANTREAN_NOTIF);
    const data = shAntrean.getDataRange().getValues();
    if (data.length <= 1) {
      setProp_('ANTRIAN_ADA', '0');
      return;
    }

    const headers = data[0].map(h => String(h).trim());
    const idxStatus = headers.indexOf('Status');
    const idxKanal = headers.indexOf('Kanal');
    const idxTujuan = headers.indexOf('Tujuan');
    const idxPesan = headers.indexOf('Pesan');
    const idxSubjek = headers.indexOf('Subjek');
    const idxPercobaan = headers.indexOf('Percobaan');
    const idxRespon = headers.indexOf('Respon');
    const idxDikirim = headers.indexOf('DikirimPada');

    let adaBaki = false;
    let diproses = 0;
    const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss');
    const fonnteToken = CONFIG.FONNTE_TOKEN;

    for (let r = 1; r < data.length && diproses < 15; r++) {
      const row = data[r];
      if (row[idxStatus] === 'Antri') {
        diproses++;
        const kanal = row[idxKanal];
        const tujuan = String(row[idxTujuan]);
        const pesan = String(row[idxPesan]);
        const subjek = String(row[idxSubjek]);
        let perc = Number(row[idxPercobaan] || 0) + 1;
        let berjaya = false;
        let responseMsg = '';

        if (kanal === 'EMAIL') {
          try {
            MailApp.sendEmail({
              to: tujuan,
              subject: subjek || 'Makluman Rasmi e-Inventori UPK',
              body: pesan
            });
            berjaya = true;
            responseMsg = 'Emel terhantar melalui MailApp';
          } catch (e) {
            responseMsg = e.message;
          }
        } else if (kanal === 'WA') {
          if (!fonnteToken) {
            responseMsg = 'FONNTE_TOKEN belum diset di Script Properties';
          } else {
            try {
              const res = UrlFetchApp.fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: { 'Authorization': fonnteToken },
                payload: {
                  target: tujuan,
                  message: pesan,
                  countryCode: '673'
                },
                muteHttpExceptions: true
              });
              const json = JSON.parse(res.getContentText());
              if (json && json.status) {
                berjaya = true;
                responseMsg = 'WhatsApp terhantar via Fonnte ID: ' + (json.id || '');
              } else {
                responseMsg = json.reason || 'Ditolak Fonnte API';
              }
            } catch (e) {
              responseMsg = e.message;
            }
          }
        }

        // Kemaskini baris dalam memori
        row[idxPercobaan] = perc;
        row[idxRespon] = responseMsg;
        if (berjaya) {
          row[idxStatus] = 'Terkirim';
          row[idxDikirim] = nowStr;
        } else if (perc >= 3) {
          row[idxStatus] = 'Gagal';
        } else {
          adaBaki = true;
        }

        // Tulis terus kemas kini ke sel baris berkenaan
        shAntrean.getRange(r + 1, 1, 1, headers.length).setValues([row]);
      }
    }

    if (!adaBaki && diproses === 0) {
      setProp_('ANTRIAN_ADA', '0');
    }
  } catch (err) {
    console.error('Ralat prosesAntrianNotif: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Menentukan penerima notifikasi mengikut jenis peristiwa
 */
function tentukanPenerimaNotif_(eventKey, params) {
  const penerima = [];
  const semuaPengguna = readSheetAsObjects_(SHEETS.PENGGUNA);

  if (eventKey === 'ADUAN_BARU') {
    // Beritahu Juruteknik / Pemeriksa & Admin
    semuaPengguna.filter(u => u.Peranan === 'Pemeriksa' || u.Peranan === 'Admin').forEach(u => {
      penerima.push({ nama: u.Nama_Penuh, emel: u.Emel, noTel: u.No_Tel_WA });
    });
  } else if (eventKey === 'PERMOHONAN_PELUPUSAN_TERBIT') {
    // Beritahu Ketua Unit / Pegawai Pengesah
    semuaPengguna.filter(u => u.Peranan === 'Pegawai_Pengesah' || u.Peranan === 'Admin').forEach(u => {
      penerima.push({ nama: u.Nama_Penuh, emel: u.Emel, noTel: u.No_Tel_WA });
    });
  } else if (eventKey === 'PELUPUSAN_DISAHKAN' || eventKey === 'SEMAKAN_TEKNIKAL_SELESAI') {
    // Beritahu Admin Stor & Kakitangan
    semuaPengguna.filter(u => u.Peranan === 'Admin').forEach(u => {
      penerima.push({ nama: u.Nama_Penuh, emel: u.Emel, noTel: u.No_Tel_WA });
    });
  } else if (eventKey === 'AMARAN_STOK_MINIMUM') {
    // Beritahu Pegawai Stor & Admin
    semuaPengguna.filter(u => u.Peranan === 'Admin').forEach(u => {
      penerima.push({ nama: u.Nama_Penuh, emel: u.Emel, noTel: u.No_Tel_WA });
    });
  }

  return penerima;
}

function formatTemplatePesan_(template, params, namaPenerima) {
  let s = String(template || '');
  s = s.replace(/{nama}/g, namaPenerima || 'Kakitangan');
  Object.keys(params || {}).forEach(k => {
    const reg = new RegExp('{' + k + '}', 'g');
    s = s.replace(reg, String(params[k]));
  });
  return s;
}

/**
 * Modul CRM: Penyelarasan Kontak Pengguna & Penanggungjawab Bilik
 */
function svcCrmSync() {
  const semuaPengguna = readSheetAsObjects_(SHEETS.PENGGUNA);
  const semuaBilik = readSheetAsObjects_(SHEETS.BILIK);
  const crmKontak = readSheetAsObjects_(SHEETS.CRM_KONTAK);

  const existingMap = {};
  crmKontak.forEach(k => {
    if (k.Email) existingMap[k.Email.toLowerCase()] = k;
  });

  const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm:ss');
  const barisBaru = [];

  semuaPengguna.forEach(p => {
    const emel = String(p.Emel || '').toLowerCase().trim();
    if (!emel) return;

    if (!existingMap[emel]) {
      barisBaru.push({
        KontakID: 'KTK-' + Utilities.getUuid().slice(0, 8),
        Nama: p.Nama_Penuh || '',
        Email: emel,
        NoWA: normalisasiNoTel_(p.No_Tel_WA || ''),
        Segmen: p.Peranan || 'Staf',
        Sumber: 'Pengguna_Sistem',
        RefID: p.Emel,
        Tag: p.Peranan,
        StatusWA: 'Belum Dicek',
        CekWAAt: '',
        EmailValid: 'YA',
        OptOut: 'TIDAK',
        Catatan: 'Kakitangan rasmi sistem e-Inventori UPK',
        JumlahPesan: 0,
        TerakhirDihubungi: '',
        Info: '',
        DibuatPada: nowStr,
        DiperbaruiPada: nowStr
      });
    }
  });

  if (barisBaru.length > 0) {
    appendBatchObjects_(SHEETS.CRM_KONTAK, barisBaru);
  }

  return {
    success: true,
    ditambah: barisBaru.length,
    jumlahKontak: crmKontak.length + barisBaru.length
  };
}

/**
 * Mengambil senarai kontak CRM
 */
function svcGetCrmKontak() {
  return readSheetAsObjects_(SHEETS.CRM_KONTAK);
}
