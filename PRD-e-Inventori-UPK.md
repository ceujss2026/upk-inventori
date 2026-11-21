# Product Requirements Document (PRD)
## e-Inventori UPK berasaskan QR Code & Dokumentasi Visual Aset

**Institusi:** Unit Pendidikan Kerjaya (UPK), Jabatan Sekolah-Sekolah  
**Versi Dokumen:** 1.0.0  
**Status:** Draf Akhir / Diluluskan untuk Pembangunan  
**Platform Teknologi:** Google Apps Script (GAS) Web App, Google Sheets Database, Google Drive Storage, HTML5/CSS3/JavaScript SPA  

---

## 1. Ringkasan Eksekutif & Pengenalan Produk

**e-Inventori UPK** adalah sistem pengurusan aset dan inventori digital moden yang direka khusus untuk **Unit Pendidikan Kerjaya (UPK), Jabatan Sekolah-Sekolah**. Sistem ini menggabungkan penjejakan fizikal berasaskan **QR Code unik**, dokumentasi visual bersepadu (**gambar asal vs. gambar kerosakan**), serta rekod kad stok (*stock card*) mengikut bilik dan buku simpanan rasmi.

Dengan sistem ini, UPK beralih daripada proses perekodan manual kepada platform *Single Page Application (SPA)* responsif yang memudahkan semakan pantas di lokasi bilik melalui telefon pintar, memperkemas proses aduan kerosakan, dan mempercepat penyediaan dokumen permohonan pelupusan aset berformat rasmi dengan bukti visual yang kukuh.

---

## 2. Objektif Produk & Nilai Tambah

1. **Pengenalpastian Pantas & Visual:** Membolehkan kakitangan membezakan item fizikal yang serupa dan memastikan kedudukan lokasi penempatan rasminya melalui padanan gambar rujukan resolusi jelas dan imbasan kod QR.
2. **Kawalan Pindahan Aset Tanpa Ketirisan:** Merekodkan sebarang perpindahan perabot atau peralatan dari satu bilik ke bilik lain secara serta-merta dalam *Stock Card* digital.
3. **Penyatuan Buku Simpanan & Kad Stok:** Mengintegrasikan kategori aset kekal (Perabot Pejabat, Peralatan Komputer, Peralatan Elektrik) dan barang guna habis (*consumables*) dengan amaran stok minimum automatik.
4. **Dokumentasi Pelupusan Berintegriti:** Memudahkan jawatankuasa teknikal dan pegawai pengesah membuat keputusan pelupusan dengan menyediakan perbandingan visual bersebelahan (*side-by-side comparison*) antara keadaan awal barang dan keadaan kerosakan semasa dalam format PDF rasmi.

---

## 3. Pengguna Sasaran & Matriks Hak Akses (RBAC)

Sistem menggunakan model kawalan capaian berasaskan peranan (*Role-Based Access Control*):

| Peranan | Pengguna Contoh | Hak Capaian & Tanggungjawab |
| :--- | :--- | :--- |
| **Admin Inventori / Pengurus Aset** | Pegawai Stor / Pengurus Aset UPK | • Akses penuh pendaftaran & kemas kini aset<br>• Muat naik foto aset asal<br>• Penjanaan & cetakan pelekat label QR Code<br>• Pengurusan keluar-masuk stok & perpindahan bilik<br>• Penyediaan draf permohonan pelupusan |
| **Kakitangan / Pengguna Bilik** | Guru / Pegawai / Staf Bilik Kerja | • Imbas QR Code menggunakan telefon pintar<br>• Melihat maklumat, spesifikasi & foto asal aset<br>• Memohon perpindahan atau pengeluaran barang guna habis<br>• Menghantar laporan/aduan kerosakan berserta foto bukti kerosakan |
| **Petugas Teknikal / Pemeriksa** | Juruteknik Komputer / Pemeriksa Aset | • Menerima notifikasi aduan kerosakan<br>• Menjalankan pemeriksaan fizikal & mengemas kini ulasan teknikal<br>• Memuat naik foto terperinci bahagian rosak<br>• Mengesyorkan tindakan (Boleh Dibaiki / Cadang Pelupusan) |
| **Ketua Unit / Pegawai Pengesah** | Ketua Unit Pendidikan Kerjaya | • Dashboard eksekutif & ringkasan statistik<br>• Mengesahkan & meluluskan perpindahan aset bernilai tinggi<br>• Meluluskan permohonan pelupusan aset berdokumen lengkap<br>• Menjana & memuat turun dokumen PDF laporan rasmi |

---

## 4. Arsitektur Data & Integrasi Ekosistem Google Workspace

### A. Struktur Pangkalan Data (Google Sheets)

1. **Jadual `Aset_Inventori` (Data Induk Aset & Inventori)**
   - `ID_Aset` (PK - Cth: `UPK-AST-001`, `UPK-GNH-042`)
   - `No_Siri_Daftar` (Nombor siri rasmi kerajaan/UPK)
   - `Nama_Barang`
   - `Buku_Simpanan` (Pilihan: *Perabot Pejabat*, *Peralatan Komputer*, *Peralatan Elektrik*, *Barang Guna Habis*)
   - `Kategori` (*Aset Kekal* / *Guna Habis*)
   - `Lokasi_Bilik` (FK ke `Lokasi_Bilik`)
   - `Baki_Stok` (Kuantiti semasa)
   - `Paras_Amaran_Minimum` (Untuk barang guna habis)
   - `Status_Aset` (*Aktif*, *Penyelenggaraan*, *Cadangan Pelupusan*, *Dihapuskan*)
   - `URL_Foto_Asal` (Pautan fail imej Google Drive)
   - `URL_QR_Code` (Pautan imej kod QR)
   - `Tarikh_Daftar`
   - `Catatan_Spesifikasi`

2. **Jadual `Stock_Card` (Log Transaksi Keluar-Masuk & Pindahan)**
   - `ID_Log` (PK)
   - `ID_Aset` (FK)
   - `Tarikh_Transaksi`
   - `Jenis_Transaksi` (*Masuk Baharu*, *Keluar/Guna*, *Pindah Bilik*, *Pelarasan*)
   - `Bilik_Asal`
   - `Bilik_Tujuan`
   - `Kuantiti_Perubahan`
   - `Baki_Selepas_Transaksi`
   - `No_Rujukan_Dokumen`
   - `Didaftar_Oleh` (Emel pengguna)
   - `Catatan`

3. **Jadual `Aduan_Kerosakan` (Rekod Aduan & Laporan Kerosakan)**
   - `ID_Aduan` (PK - Cth: `ADU-2026-001`)
   - `ID_Aset` (FK)
   - `Tarikh_Aduan`
   - `Nama_Pelapor`
   - `Emel_Pelapor`
   - `Bahagian_Rosak`
   - `Keterangan_Kerosakan`
   - `URL_Foto_Kerosakan` (Pautan foto Drive)
   - `Status_Aduan` (*Baharu*, *Dalam Tindakan Teknikal*, *Selesai Dibaiki*, *Diusulkan Pelupusan*)
   - `Tarikh_Tindakan`

4. **Jadual `Permohonan_Pelupusan` (Dokumentasi Pelupusan Aset)**
   - `ID_Pelupusan` (PK - Cth: `LPS-2026-001`)
   - `ID_Aset` (FK)
   - `ID_Aduan` (FK)
   - `Tarikh_Pemeriksaan`
   - `Pegawai_Pemeriksa`
   - `Laporan_Keadaan_Teknikal`
   - `Justifikasi_Pelupusan` (Cth: *Usang & Tidak Ekonomik Dibaiki*)
   - `Status_Kelulusan` (*Draf*, *Menunggu Kelulusan*, *Diluluskan*, *Ditolak*)
   - `Tarikh_Kelulusan`
   - `Pegawai_Pengesah`
   - `URL_PDF_Rasmi`

5. **Jadual Rujukan & Keselamatan**
   - `Lokasi_Bilik`: `Kod_Bilik`, `Nama_Bilik`, `Pengurus_Bilik`
   - `Pengguna_Sistem`: `Emel`, `Nama_Penuh`, `Peranan`, `Status_Akaun`

---

### B. Struktur Storan Google Drive

Sistem mengasingkan penyimpanan imej dan dokumen dalam struktur folder yang teratur:
```text
Root Folder: [e-Inventori UPK System]
 ├── 📁 01_Foto_Aset_Asal/          (Foto rasmi item semasa pendaftaran)
 ├── 📁 02_Foto_Bukti_Kerosakan/    (Foto kerosakan dari pengadu/pemeriksa)
 ├── 📁 03_Label_QR_Code/           (Fail imej kod QR sedia cetak)
 └── 📁 04_Dokumen_PDF_Pelupusan/   (Fail PDF rasmi permohonan pelupusan)
```

---

## 5. Keperluan Fungsional (Functional Requirements)

### A. Modul Pendaftaran & Pengurusan Aset
- **Muat Naik Foto Manual:** Medan muat naik imej manual yang membolehkan pengguna memilih fail dari galeri atau merakam foto terus menggunakan kamera peranti.
- **Pemampatan Imej Automatik di Pelanggan (Client-side Compression):** Sebelum dihantar ke pelayan Google Apps Script, imej diproses melalui Canvas HTML5 untuk mengecilkan resolusi ke tahap optimum (maksimum 1280px lebar, saiz < 600 KB) bagi menjimatkan storan dan mengelakkan kegagalan had penghantaran data (*POST payload limit*).
- **Penjanaan Kod QR Dinamik:** Menggunakan pustaka *qrcode.js* atau API Google Charts untuk menjana kod QR unik mengandungi pautan carian terus ke rekod aset.

### B. Modul Imbasan QR Pantas (Mobile Camera Scanner)
- Penyepaduan pengimbas kod QR berasaskan web (**Html5-QRCode**) yang boleh mengakses kamera belakang telefon pintar secara terus tanpa memerlukan aplikasi pihak ketiga.
- Sebaik kod QR diimbas, sistem serta-merta membuka **Kad Maklumat Aset** memaparkan:
  - Foto asal barang untuk dipadankan dengan item fizikal di bilik.
  - Nombor inventori, spesifikasi, dan bilik penempatan rasmi.
  - Butang tindakan pantas: **[Laporkan Kerosakan]** atau **[Rekod Pindahan Bilik]**.

### C. Modul Rekod Stok Mengikut Bilik (*Stock Card & Buku Simpanan*)
- Penapis dinamik mengikut Bilik dan Kategori Buku Simpanan:
  1. Perabot Pejabat
  2. Peralatan Komputer
  3. Peralatan Elektrik
  4. Barang Guna Habis
- Log lejar stok berformat rasmi: Rekod tarikh, kuantiti masuk, kuantiti keluar, baki stok, dan pegawai bertanggungjawab.
- Fungsi muat turun data ke format **Excel / CSV** dan cetakan **PDF Kad Stok**.

### D. Modul Aduan Kerosakan & Dokumentasi Pelupusan Visual
- Borang aduan kerosakan ringkas dengan medan muat naik foto keadaan kerosakan sebenar.
- **Paparan Perbandingan Visual Side-by-Side:**
  - Panel semakan teknikal memaparkan **Foto Asal Item** bersanding dengan **Foto Kerosakan Terkini** untuk memudahkan penilaian kerosakan.
- **Penjanaan PDF Borang Pelupusan Aset Rasmi:**
  - Menjana dokumen PDF yang menyertakan butiran aset, ulasan teknikal, foto perbandingan bersebelahan, dan kod QR verifikasi dokumen.

---

## 6. Spesifikasi Tampilan & Antaramuka (UI/UX)

### A. Konsep Reka Bentuk & Identiti Visual (UPK Corporate)
Mengikut identiti rasmi logo **Unit Pendidikan Kerjaya (UPK), Jabatan Sekolah-Sekolah**:
- **Warna Utama (Primary Brand):**
  - UPK Deep Navy / Slate Blue: `#0F3E5D`
  - UPK Cerulean / Peacock Blue: `#16719A`
  - UPK Light Accent Blue: `#80C2E6`
- **Warna Aksen & Elemen Khas:**
  - UPK Gold / Ochre (Teks Logo): `#C18C3B` / `#D4A359`
  - Warning / Rosak Red: `#D62828`
  - Status Aktif Green: `#2A9D8F`
- **Latar Belakang & Permukaan:**
  - Background Neutral: `#F8FAFC` (Slate lembut bersih)
  - Card Surface: `#FFFFFF` dengan bayang lembut (*subtle soft shadow*) dan garisan tepi `#E2E8F0`.

### B. Komponen Antaramuka Utama
1. **Navigasi Atas Horizontal Berserta Mega Menu (Tanpa Sidebar):**
   - **Bilah Atas Utama (Top Navy Bar `#0F3E5D`):** Memaparkan logo rasmi UPK, tajuk sistem "e-Inventori UPK", penunjuk notifikasi aduan kerosakan aktif, serta profil pengguna dan peranan.
   - **Bilah Menu Mendatar (Horizontal Navbar Putih Bersih):** Terletak tepat di bawah bilah atas, menampilkan menu-menu utama berikon:
     - 🏠 *Dashboard*
     - 📦 *Katalog & Aset* (Dropdown Mega Menu: Katalog Kad Bergambar, Daftar Aset Baharu, Cetak Label QR Pukal)
     - 📋 *Buku Simpanan & Kad Stok* (Dropdown Mega Menu: Perabot Pejabat, Peralatan Komputer, Peralatan Elektrik, Barang Guna Habis, Lejar Pindah Bilik)
     - 📷 *Imbas & Aduan* (Dropdown Mega Menu: Pengimbas QR Kamera Telefon, Hantar Aduan Kerosakan, Senarai Aduan Aktif)
     - ⚖️ *Pemeriksaan & Pelupusan* (Dropdown Mega Menu: Semakan Teknikal Side-by-Side, Kelulusan Pelupusan Aset, Laporan PDF Rasmi)
     - ⚙️ *Pentadbiran* (Pengurusan Bilik, Akses Pengguna, Eksport Data)
   - **Panel Mega Menu Dropdown Berkolum:** Panel putih berbayang halus yang meluncur turun secara mendatar apabila menu diklik/di-hover, membahagikan sub-menu kepada lajur-lajur kemas berikon dan berlabel jelas (berinspirasikan reka bentuk ZARE Dashboard).
   - **Paparan Telefon Pintar:** Bilah navigasi mendatar ini bertukar secara responsif kepada menu atas (*hamburger bar*) dipadankan dengan *Bottom Navigation Bar* melekat di bahagian bawah untuk akses pantas imbasan QR dan aduan.

2. **Jadual Interaktif & Buku Simpanan:**
   - Bar carian teks pantas (*instant filter*).
   - Bar tab kapsul (*pill tabs*) untuk penukaran kategori buku simpanan secara pantas.
   - Paginasi atau tatalan lancar (*smooth scrolling*).

3. **Dashboard Statistik & Carta:**
   - 4 Kad KPI Utama: Jumlah Keseluruhan Aset, Jumlah Aset Aktif, Bilangan Kerosakan Dalam Tindakan, Amaran Stok Kurang.
   - Carta Nisbah Status Aset (Donut Chart).
   - Carta Agihan Aset Mengikut Bilik (Bar Chart).

---

## 7. Batasan Teknis & Mitigasi Kuota Google Apps Script

| Cabaran Platform GAS | Strategi Mitigasi Teknikal |
| :--- | :--- |
| **Had Saiz Muat Naik (POST Payload ~50MB / transmisi ~10MB)** | Semua imej dipadatkan di pelayar pengguna (*client-side canvas resize*) menjadi < 600 KB sebelum dihantar ke pelayan melalui Base64 chunking. |
| **Had Masa Eksekusi GAS (Maksimum 6 Minit)** | Seluruh pemprosesan carian dilakukan secara *batch* (`Range.getValues()`) dalam satu pusingan ke dalam memori JavaScript, mengurangkan masa tindak balas di bawah 1.5 saat. |
| **Kelajuan Pemuatan Gambar** | Pautan imej Google Drive menggunakan mod paparan thumbnail langsung (*direct webContentLink / uc?export=view*) dengan sokongan *lazy loading* pada kad visual. |
| **Keselamatan & Akses Data** | Aplikasi di-deploy di bawah mod *Execute as: Me*, manakala capaian pengguna ditapis di peringkat sistem menggunakan semakan emel sesi aktif Google. |

---

## 8. Rencana Deployment & Fasa Pelaksanaan

1. **Fasa 1: Penyediaan Pangkalan Data & Enjin Storan**
   - Menghasilkan templat Google Sheets dengan 5 jadual piawai.
   - Menetapkan hierarki folder Google Drive dan kebenaran perkongsian fail.
2. **Fasa 2: Pembangunan Backend Google Apps Script**
   - Modul CRUD (Create, Read, Update, Delete) aset dan kad stok.
   - Modul penerimaan fail imej dan penjanaan fail PDF.
3. **Fasa 3: Pembangunan Antaramuka Pengguna (SPA)**
   - Reka bentuk antaramuka bertaraf korporat berpandukan logo UPK.
   - Integrasi pengimbas kamera QR berasaskan web.
4. **Fasa 4: Pengujian & Latihan Pengguna**
   - Ujian imbasan di bilik kerja sebenar menggunakan pelbagai model telefon pintar.
   - Ujian aliran aduan kerosakan sehingga penerbitan PDF permohonan pelupusan.

---

🎨 **Tahapan Khusus: Penentuan Visual UI/UX**
1. Unggah Referensi: Silakan unggah referensi tangkapan layar, warna, dan gaya antarmuka yang diinginkan. *(Telah disediakan: Logo UPK, susun atur kad visual bergambar mesra telefon, dan contoh kad produk responsif).*
2. Jika Belum Ada Referensi Visual Tambahan:
   - Salin seluruh teks dokumen PRD Final di atas.
   - Buka Google Stitch, lalu tempelkan teks PRD ke dalamnya.
   - Unduh hasil pratinjau desain visual yang dihasilkan oleh Google Stitch.
   - Unggah gambar hasil desain tersebut ke percakapan ini untuk diimplementasikan ke dalam kode HTML/CSS.
