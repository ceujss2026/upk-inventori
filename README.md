# e-Inventori UPK — Sistem Pengurusan Aset & Inventori Berasaskan Kod QR

**Unit Pendidikan Kerjaya (UPK), Jabatan Sekolah-Sekolah**  
**Kementerian Pendidikan Brunei Darussalam**  
**Versi:** 1.0.0-PRO-TURBO (Arsitektur Terpisah: GitHub Pages Frontend + GAS REST API Backend)

---

## 🏛️ Gambaran Keseluruhan & Ciri-Ciri Utama

Aplikasi web **e-Inventori UPK** dibangunkan khusus bagi mendigitalkan urusan inventori alih kerajaan dengan piawaian keselamatan, kepantasan, dan dokumentasi visual yang tinggi:
1. **Navigasi Atas Mendatar & Menu Mega ZARE (Tanpa Sidebar):** 100% ruang kerja penuh skrin yang luas dan responsif.
2. **Katalog Aset Bergambar (Gaya Oakory):** Kad produk moden dengan gambar resolusi jelas, lencana status berwarna, dan paparan mudah alih 2 lajur.
3. **Pengimbas Kod QR Kamera Langsung:** Mengimbas kod QR pelekat barang terus menggunakan kamera telefon tanpa aplikasi tambahan (*Html5-QRCode*).
4. **Buku Simpanan & Kad Stok Rasmi:** Lejar rekod pergerakan keluar-masuk barang guna habis dan perpindahan bilik berserta eksport fail CSV/Excel dan PDF.
5. **Aduan Kerosakan & Rakaman Foto Manual:** Membolehkan kakitangan merakam foto keadaan rosak terus di bilik kerja dengan pemampatan Canvas di pelayar (<600 KB).
6. **Pemeriksaan Visual Bersebelahan (*Side-by-Side Proof*):** Membandingkan gambar asal semasa pendaftaran dan gambar kerosakan semasa bagi tujuan sokongan pelupusan aset.
7. **Kelulusan Pelupusan Aset & PDF Ber-QR HMAC:** Menjana borang permohonan pelupusan rasmi kerajaan lengkap dengan kod verifikasi elektronik.
8. **Notifikasi WhatsApp & Emel Non-Blocking:** Notifikasi automatik melalui Fonnte Gateway & Google MailApp tanpa memperlahankan respons aplikasi pengguna.

---

## 📁 Struktur Direktori Projek

```text
UPK Inventori/
├── index.html                   # Laman utama Frontend (Sedia untuk GitHub Pages)
├── css/
│   └── style.css               # Gaya reka bentuk Korporat UPK, ZARE Menu & Cetakan A4
├── js/
│   ├── config.js               # Konfigurasi frontend (URL backend GAS & tetapan)
│   ├── api.js                  # Klien API anti-CORS, deduplikasi in-flight & cache SWR
│   └── app.js                  # Logik interaktiviti SPA, pengimbas QR, & modul modal
├── assets/
│   └── logo-upk.png            # Logo rasmi Unit Pendidikan Kerjaya UPK
├── backend/                     # Kod Sumber Google Apps Script (REST API)
│   ├── Kode.gs                 # Router utama doGet & doPost (CORS-safe REST API)
│   ├── Config.gs               # Konfigurasi Script Properties, rahasia & sesi HMAC
│   ├── Setup.gs                # Setup automatik folder Drive, Spreadsheet, & Migrasi
│   ├── AsetService.gs          # Perkhidmatan CRUD aset, kad stok, & storan Drive
│   ├── AduanService.gs         # Pengurusan aduan kerosakan & kelulusan pelupusan
│   ├── DocEngine.gs            # Penjanaan PDF rasmi kerajaan & verifikasi HMAC
│   ├── NotifService.gs         # Antrean notifikasi WhatsApp Fonnte & CRM Kontak
│   └── TurboCache.gs           # Caching CacheX (>50KB) & manipulasi batch kontigu
├── PRD-e-Inventori-UPK.md       # Dokumen PRD Lengkap
├── Wireframe-Prompt-e-Inventori-UPK.md # Prompt Wireframe
└── UIUX-Design-Prompt-e-Inventori-UPK.md # Panduan Reka Bentuk UI/UX
```

---

## 🚀 Panduan Pelaksanaan Langkah demi Langkah

### Langkah 1: Persediaan Backend Google Apps Script (GAS)

1. Buka [Google Drive](https://drive.google.com) dan cipta fail **Google Apps Script** baharu (atau buka [script.google.com](https://script.google.com)).
2. Namakan projek skrip anda sebagai **`e-Inventori UPK Backend`**.
3. Di dalam editor Apps Script, cipta fail-fail `.gs` mengikut fail yang ada di folder `backend/`:
   - `Config.gs`
   - `TurboCache.gs`
   - `Setup.gs`
   - `AsetService.gs`
   - `AduanService.gs`
   - `DocEngine.gs`
   - `NotifService.gs`
   - `Kode.gs`
4. Pilih fungsi **`setupAppEnvironment`** di bahagian atas editor, kemudian klik butang **Run (Jalankan)**.
   - Berikan kebenaran capaian (*Review Permissions*) ke akaun Google anda.
   - Skrip akan membina folder Google Drive, Spreadsheet Pangkalan Data, data benih bilik, dan menjana kata laluan akses darurat secara automatik!
   - Buka menu **Execution log** untuk melihat pautan Spreadsheet yang telah siap dijana.

---

### Langkah 2: Deployment Web App Google Apps Script

1. Di editor Apps Script, klik butang biru **Deploy** di penjuru atas kanan → pilih **New deployment**.
2. Klik ikon gear di sebelah kiri → pilih **Web app**.
3. Tetapkan konfigurasi berikut:
   - **Description**: `e-Inventori UPK API v1`
   - **Execute as**: `Me (emel anda)`
   - **Who has access**: `Anyone` (Sangat penting agar frontend GitHub Pages boleh mengakses API).
4. Klik **Deploy** dan salin URL Web App yang terhasil (berakhiran `/exec`).
   - Contoh URL: `https://script.google.com/macros/s/AKfycbx.../exec`

---

### Langkah 3: Sambungkan Frontend dengan URL Backend

1. Buka fail [js/config.js](file:///c:/Users/ACER/Desktop/UPK%20Inventori/js/config.js).
2. Gantikan nilai `GAS_URL` dengan URL `/exec` yang telah anda salin tadi:
   ```javascript
   const CONFIG = {
     GAS_URL: 'https://script.google.com/macros/s/AKfycbx_KOD_SEBENAR_ANDA/exec',
     ...
   };
   ```

---

### Langkah 4: Deploy Frontend ke GitHub Pages (Panduan /github-pages-deploy-guide)

1. Buka perisian Terminal / PowerShell di folder projek `c:\Users\ACER\Desktop\UPK Inventori`:
   ```powershell
   cd "c:\Users\ACER\Desktop\UPK Inventori"
   ```
2. Mulakan repositori Git:
   ```bash
   git init
   git add index.html css/ js/ assets/ README.md
   git commit -m "Pelancaran pertama e-Inventori UPK"
   git branch -M main
   ```
3. Di akaun [GitHub](https://github.com), cipta repositori baharu dengan nama `upk-inventori` (Pilih **Public** dan **JANGAN** tanda kotak Readme).
4. Sambungkan ke GitHub dan tolak kod:
   ```bash
   git remote add origin https://github.com/USERNAME-ANDA/upk-inventori.git
   git push -u origin main
   ```
   *(Gunakan Personal Access Token - PAT anda sekiranya diminta kata laluan).*
5. Di laman GitHub repositori anda:
   - Buka tab **Settings** → menu **Pages** di sebelah kiri.
   - Di bahagian **Build and deployment**, pilih Source: **Deploy from a branch**, Branch: **`main`** dan folder **`/ (root)`**.
   - Klik **Save**.
6. Dalam masa 1–2 minit, laman web anda akan bersiaran secara langsung di:
   `https://USERNAME-ANDA.github.io/upk-inventori/`

---

## 🔒 Keselamatan & Script Properties (/gas-rahasia-script-properties)

- **Tiada Literal Secrets:** Token WhatsApp Fonnte, salt, dan hash sandi darurat disimpan 100% di dalam **Script Properties**.
- **Akses Darurat:** Sekiranya diperlukan, gunakan emel `admin.darurat` dan kata laluan unik yang dijana semasa `setupAppEnvironment()`.
- **Pengurusan Kunci:** Anda boleh menetapkan `FONNTE_TOKEN` terus dari antaramuka sistem melalui menu **Tetapan Sistem & Token** di bawah profil pentadbir.

---

## ⚡ Pengoptimuman Prestasi (/gas-scale-turbo)

- **SWR (Stale-While-Revalidate):** Antaramuka memaparkan data serta-merta tanpa sebarang kelewatan sambil menyegerakan kemas kini di latar belakang.
- **CacheX Berpecah:** Mengendalikan saiz data melebihi had 100KB dengan pemecahan partisi berautonomi.
- **Non-blocking Notifications:** Penghantaran WhatsApp dan Emel dimasukkan ke antrean berasingan agar borang simpan aset dan aduan bertindak balas serta-merta di bawah 1 saat.
