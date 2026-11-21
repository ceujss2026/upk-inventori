Create detailed wireframes for e-Inventori UPK (Asset & Inventory Management System with QR Code & Visual Documentation).
Use grayscale/black-and-white wireframe style only — no colors, no images, just layout structure, placeholder boxes, labels, and navigation flow.

## Application Context
e-Inventori UPK is a responsive web application designed for the Career Education Unit (UPK - Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah). It manages permanent capital assets and consumable inventory through unique QR codes, manual item photo verification, room-based digital stock cards, and automated side-by-side visual damage comparison for asset disposal approval.
Has 4 main sections:
1. Executive Dashboard & Visual Inventory Catalog (Card Grid View & Interactive Room Stock Ledger)
2. Mobile QR Code Camera Scanner & Instant Verification
3. Forms & Workflows (Asset Registration with Manual Photo Upload, Room Movement & Damage Reporting)
4. Technical Inspection & Disposal Approval (Side-by-side visual comparison & official printable documents)

## Wireframe Pages Required

--- PAGE W-01: Executive Dashboard & Statistics ---
Layout: Full-width Dual-Tier Top Navbar (NO sidebar) + Interactive Mega Menu Dropdown + Main dashboard content grid
- Top Bar (Deep Navy #0F3E5D): Application title "e-Inventori UPK", Room selector dropdown [All Rooms], Notification bell [icon: bell with count 3], Message bell [icon: mail with count 5], User profile widget [icon: user | Jessica / Admin Inventori v]
- Horizontal Navbar (White):
  * Menu Tabs: [icon: home | Dashboard] (active), [icon: box | Katalog Aset v], [icon: clipboard | Buku Simpanan & Kad Stok v], [icon: camera | Imbas & Aduan v], [icon: scale | Pemeriksaan & Pelupusan v], [icon: settings | Pentadbiran v]
  * Mega Menu Panel (Active when hover/click "Katalog Aset v" or "Buku Simpanan v"):
    - Floating full-width white panel with 4 organized columns:
      * Column 1 ("Katalog & Perekodan"): [icon: grid] Paparan Kad Bergambar, [icon: plus-circle] Daftar Aset Baharu, [icon: printer] Cetak Pelekat QR Pukal
      * Column 2 ("Buku Simpanan"): [icon: arm-chair] Perabot Pejabat, [icon: laptop] Peralatan Komputer, [icon: zap] Peralatan Elektrik, [icon: package] Barang Guna Habis
      * Column 3 ("Aduan & Teknikal"): [icon: qr-code] Pengimbas QR Telefon, [icon: alert-triangle] Hantar Aduan Kerosakan, [icon: tool] Semakan Teknikal Side-by-Side
      * Column 4 ("Kelulusan & Laporan"): [icon: check-square] Kelulusan Pelupusan Aset, [icon: file-text] Cetak Kad Stok PDF, [icon: download] Eksport Excel/CSV
- Row 1 - KPI Summary Cards (4 columns):
  * Total Assets: "1,248 Items" [icon: box]
  * Active & In Use: "1,180 Items" [status badge: Active]
  * Damaged / In Repair: "42 Items" [status badge: Attention]
  * Pending Disposal: "26 Items" [status badge: Disposal]
  * Low Stock Alert (Consumables): "5 Items below min limit" [icon: alert]
- Row 2 - Visual Analytics:
  * Left Box (60%): Asset Distribution by Room [placeholder horizontal bar chart with room labels: Bilik Kaunseling, Bilik Mesyuarat, Makmal Kerjaya, Stor Utama]
  * Right Box (40%): Asset Status Ratio [placeholder donut chart with legend: Active, In Repair, Pending Disposal]
- Row 3 - Recent Activity & Pending Actions Table:
  * Table columns: Date, Asset ID, Item Name, Event (Damage Report / Room Transfer), Reporter, Quick Action [View Details]

--- PAGE W-02: Asset Catalog & Card Grid View (Desktop) ---
Layout: Full-width Dual-Tier Top Navbar (NO sidebar) + Main content area with multi-filter bar and responsive grid cards
- Header: Page Title "Katalog Aset & Inventori", [+ Tambah Aset Baharu] primary button, [Cetak Label QR Pukal] secondary button
- Filter & Search Bar:
  * Search input field [icon: search | "Cari nama barang, nombor siri, atau ID aset..."]
  * Category Pill Tabs: [Semua Aset] (active) | [Perabot Pejabat] | [Peralatan Komputer] | [Peralatan Elektrik] | [Barang Guna Habis]
  * Filter Dropdowns: [Pilih Bilik / Lokasi v] | [Pilih Status v] | [Susun: Terkini v]
  * View Switcher buttons: [icon: grid (active)] [icon: table list]
- Asset Grid Area (4 Columns Grid):
  * Card Component (Repeated x8):
    - Top card image container: Placeholder photo box with X (ratio 4:3) with status badge overlay on top-right [badge: Aktif / Rosak / Pelupusan]
    - Card Body:
      * Asset ID & Tag: "UPK-AST-014" | Category: "Peralatan Komputer"
      * Item Title: "Komputer Riba Dell Latitude 3420"
      * Serial No: "S/N: DL-8839201"
      * Location: [icon: map-pin] "Makmal Kerjaya UPK (Bilik 2)"
      * Stock / Quantity: "Kuantiti: 1 Unit"
    - Card Footer:
      * Left: Mini QR code thumbnail placeholder
      * Right action buttons: [icon: eye | Butiran] [icon: qr | Kod QR]

--- PAGE W-03: Mobile View: Asset Card Grid & Navigation (Mobile Breakpoint) ---
Layout: Mobile viewport (390px width) with sticky top header and bottom navigation bar
- Sticky Mobile Header:
  * Top row: UPK Logo placeholder, "e-Inventori", [icon: qr-scan] quick scan button, [icon: bell]
  * Search Bar: Full-width search input with filter icon button
  * Horizontal scrolling pill tabs: [Semua] (active) | [Perabot] | [Komputer] | [Elektrik] | [Guna Habis]
- Mobile Asset Grid (2 Columns):
  * Card 1 & 2:
    - Photo placeholder with X (ratio 4:3), status pill badge on top right
    - Item name (bold 2-line clamp): "Kerusi Pejabat Ergonomik"
    - Serial ID: "UPK-PBT-005"
    - Room badge: "Bilik Kaunseling"
    - Action button: [Lihat Butiran] (full-width button)
- Sticky Bottom Navigation Bar:
  * 4 Tab items: [icon: home | Utama], [icon: grid | Katalog], [icon: camera | Imbas QR (floating center pill)], [icon: alert | Aduan], [icon: file-text | Kad Stok]

--- PAGE W-04: Asset Detail & QR Modal View ---
Layout: Centered modal dialog / split-view detail card
- Modal Header: "Maklumat Terperinci Aset - UPK-AST-014", [x] Close button
- Content Columns (Split 50% - 50%):
  * Left Column:
    - Large Asset Photo: Box with X "Foto Rasmi Pendaftaran Aset"
    - Photo metadata: "Tarikh Foto: 12/03/2024 | Didaftar oleh: Pegawai Stor"
    - Official QR Code Box: Large QR placeholder box with UPK label under it
    - Button below QR: [Cetak Pelekat QR Code] (outlined)
  * Right Column:
    - Status Badge: [Aktif - Beroperasi Baik]
    - Data Key-Value List:
      * Nombor Siri Pendaftaran: "UPK/AST/2024/089"
      * Buku Simpanan: "Peralatan Komputer & Elektronik"
      * Lokasi Semasa: "Makmal Kerjaya UPK (Bilik 2)"
      * Pegawai Bertanggungjawab: "Cikgu Ahmad (Ketua Makmal)"
      * Kuantiti / Baki Stok: "1 Unit"
      * Tarikh Pembelian / Daftar: "15 Januari 2024"
      * Spesifikasi: "Intel i5 11th Gen, 16GB RAM, 512GB SSD"
- Modal Footer Action Buttons:
  * [Kemaskini Maklumat] (secondary outlined)
  * [Pindah Lokasi Bilik] (secondary outlined)
  * [Laporkan Kerosakan] (primary dark filled)

--- PAGE W-05: QR Code Mobile Scanner & Verification View ---
Layout: Full-screen mobile camera overlay view
- Top Header: Back arrow button [<], Title "Imbas Kod QR Aset", [icon: flash-toggle]
- Camera Viewfinder:
  * Large square camera viewfinder frame with 4 corner targeting brackets
  * Animated scan line placeholder across viewfinder
  * Helper instruction label below frame: "Arahkan kamera tepat pada label QR Code di atas barang inventori"
- Bottom Slide-up Sheet (Scanned Result Preview Card):
  * Thumbnail photo with X
  * Matched Item: "Pencetak HP LaserJet Pro M404dn"
  * Serial: "UPK-ELK-029" | Room: "Bilik Pentadbiran UPK"
  * Verification Check: [icon: check-circle] "Lokasi Fizikal Sepadan dengan Rekod"
  * Two Primary Action Buttons:
    - Button 1: [Buka Kad Maklumat Lengkap]
    - Button 2: [Hantar Aduan Kerosakan Pantas]

--- PAGE W-06: Stock Card & Room Ledger (Interactive Table View) ---
Layout: Full-width Dual-Tier Top Navbar (NO sidebar) + Main data table view
- Header: Title "Buku Simpanan & Kad Stok (Stock Card)", Room selector: [Bilik Mesyuarat Utama v], [Eksport Excel/CSV], [Cetak PDF Kad Stok]
- Category Selector Tabs: [Perabot Pejabat] | [Peralatan Komputer] | [Peralatan Elektrik] | [Barang Guna Habis]
- Filter Bar: Date Range picker [01/01/2026 - 21/11/2026], Search field, [Tapis Transaksi: Semua v]
- Data Table:
  * Columns: Tarikh | ID Aset | Perihal Barang | Jenis Transaksi | Bilik Asal | Bilik Tujuan | Masuk | Keluar | Baki | Pegawai | Tindakan
  * Row 1 (Guna Habis): 10/11/2026 | UPK-GNH-012 | Kertas A4 80gsm | Masuk Baharu | Pembekal | Stor Utama | +20 | - | 45 | Admin Stor | [Lihat Log]
  * Row 2 (Pindah Aset): 14/11/2026 | UPK-PBT-033 | Meja Pejabat Kayu | Pindah Bilik | Bilik 1 | Bilik 3 | - | - | 1 | Staf Ali | [Lihat Log]
  * Row 3 (Kerosakan): 18/11/2026 | UPK-AST-008 | Projektor Epson EB-X06 | Penyelenggaraan | Makmal | Bengkel | - | 1 | 0 | Juruteknik | [Lihat Log]
- Table Footer: Pagination controls [Menunjukkan 1-10 daripada 142 rekod] [< 1 2 3 4 >]

--- PAGE W-07: Add / Edit Asset Form (Manual Photo Upload) ---
Layout: Centered form container with breadcrumb [< Kembali ke Katalog Aset]
- Form Title: "Pendaftaran Aset / Inventori Baharu"
- Section 1: Maklumat Utama Aset
  * Field: Nama Barang (Text Input: "Cth: Kerusi Eksekutif Beroda")
  * Field: Nombor Siri / No. Pendaftaran (Text Input)
  * Field (2 cols): Buku Simpanan (Dropdown) | Kategori (Radio: Aset Kekal / Barang Guna Habis)
  * Field (2 cols): Bilik / Lokasi Penempatan (Dropdown) | Pegawai Penanggungjawab Bilik (Text)
  * Field (2 cols): Kuantiti / Baki Stok Awal (Number Input) | Paras Amaran Minimum (Number Input)
- Section 2: Dokumentasi Visual (Manual Photo Upload)
  * Drag & Drop / File Picker Container:
    - Box with dashed border and camera icon [icon: camera]
    - Text: "Pilih foto dari galeri atau tangkap terus menggunakan kamera"
    - Subtext: "Format JPG/PNG. Imej akan dimampatkan secara automatik di bawah 600 KB"
    - [Pilih Fail Foto] button
  * Photo Preview Box: Box with X showing selected image thumbnail with [Padam Foto] link
- Section 3: Catatan & Spesifikasi
  * Field: Catatan Tambahan / Spesifikasi Teknikal (Textarea)
- Sticky Action Bar:
  * [Batal] (outlined secondary) | [Simpan Sebagai Draf] (text link) | [Simpan & Jana Label QR Code] (primary dark filled)

--- PAGE W-08: Damage Report & Incident Submission Form ---
Layout: Mobile-friendly centered form container with progress indicator
- Form Title: "Borang Aduan Kerosakan Barang / Aset"
- Step 1: Pengenalpastian Item
  * Scanned Asset Summary Box (Auto-populated from QR scan or dropdown search):
    - Thumbnail box with X, "Komputer Riba Acer Aspire 5 (UPK-AST-022)", Room: "Makmal Kerjaya"
- Step 2: Perincian Kerosakan
  * Field: Nama Pelapor & Emel (Auto-filled)
  * Field: Tarikh Kerosakan Disedari (Date picker)
  * Field: Bahagian yang Mengalami Kerosakan (Dropdown + Text: Skrin / Papan Kekunci / Kuasa / Enjin / Struktur Fizikal)
  * Field: Keterangan Gejala Kerosakan (Textarea: "Skrin paparan berkelip dan tidak dapat dihidupkan selepas berlaku litar pintas...")
- Step 3: Bukti Visual Kerosakan (Manual Damage Photo Capture)
  * Upload Box with camera icon: "Muat naik gambar berwarna yang jelas memperlihatkan bahagian kerosakan"
  * Image Preview Slot: Box with X showing close-up photo of damaged part with caption field
- Action Bar:
  * [Batal] | [Hantar Laporan Kerosakan] (primary dark filled with confirmation prompt)

--- PAGE W-09: Technical Inspection & Side-by-Side Visual Review ---
Layout: Split Screen Review Layout (Two main comparison columns)
- Top Bar: Case ID: "ADU-2026-018", Asset: "Pencetak Warna Canon G2010 (UPK-ELK-041)", Status Badge: [Menunggu Semakan Teknikal]
- Main Comparison Section (Side-by-Side Visual Proof):
  * Left Panel (50%): "DOKUMENTASI FOTO ASAL (Semasa Daftar)"
    - Photo Box with X (Original condition image)
    - Metadata: Tarikh Daftar: 10/02/2023 | Keadaan: Baru 100% | Lokasi Asal: Pejabat Am
  * Right Panel (50%): "DOKUMENTASI FOTO KEROSAKAN (Aduan Semasa)"
    - Photo Box with X (Damaged condition image from reporter/technician)
    - Metadata: Tarikh Lapor: 19/11/2026 | Bahagian: Printhead & Motherboard terbakar
- Bottom Section: Penilaian & Ulasan Pemeriksa Teknikal
  * Field: Nama Pegawai Pemeriksa Teknikal (Text)
  * Field: Laporan Pemeriksaan Fizikal & Teknikal (Textarea: "Motherboard litar pintas, kos alat ganti melebihi 70% harga pembelian asal...")
  * Field: Cadangan Tindakan Teknikal (Radio options):
    ( ) Boleh Dibaiki (Anggaran Kos RM ____)
    (*) Disyorkan untuk Pelupusan / Penghapusan Aset
  * Field: Justifikasi Pelupusan (Dropdown: Usang / Rosak Teruk & Tidak Ekonomik Dibaiki / Hilang Upaya)
- Action Bar:
  * [Simpan Catatan Pemeriksaan] | [Hantar Perakuan ke Pegawai Pengesah] (primary dark filled)

--- PAGE W-10: Asset Disposal Approval & Official PDF Preview ---
Layout: Approval Split Layout (Document preview on left 60%, Approval decision card on right 40%)
- Left Panel (60%): "Pratonton Borang Permohonan Pelupusan Aset (PDF)"
  * Official Document Frame:
    - Official Header: UPK Logo placeholder, "UNIT PENDIDIKAN KERJAYA, JABATAN SEKOLAH-SEKOLAH"
    - Document Title: "PERMOHONAN PELUPUSAN ASET ALIH KERAJAAN"
    - Table of Asset Details: No. Siri, Nama Item, Tarikh Beli, Harga Asal, Nilai Semasa
    - Visual Evidence Section: Dual Photo boxes side-by-side (Foto Asal vs Foto Kerosakan)
    - Technical Report Summary: Ulasan Juruteknik
    - Verification QR placeholder box on document footer
- Right Panel (40%): "Panel Keputusan Pegawai Pengesah / Ketua Unit"
  * Approver Info: "Ketua Unit Pendidikan Kerjaya"
  * Verification Checklist:
    [x] Gambar kerosakan visual telah disemak
    [x] Ulasan teknikal memenuhi syarat pelupusan aset
    [x] Rekod penempatan fizikal disahkan
  * Input: Catatan / Syarat Kelulusan (Textarea)
  * Decision Buttons:
    - [Tolak Permohonan] (outlined red/dark)
    - [Luluskan Pelupusan Aset] (primary dark filled)
  * Export options: [Muat Turun Dokumen PDF Rasmi] | [Cetak Dokumen]

--- PAGE W-11: Printable QR Sticker Sheet & Card Print Preview ---
Layout: Centered printable sheet layout (A4 grid format)
- Top Bar: Sheet Controls: [Pilih Saiz Pelekat: 50mm x 30mm v], [Pilih Bilik: Makmal Kerjaya v], [icon: printer | Cetak Semua Label], [Muat Turun PDF]
- Printable Sheet Area (Grid of 3 x 7 stickers per page):
  * Sticker Card Unit (Repeated):
    - Border: Thin dashed cutting guide
    - Header: UPK Logo mini placeholder + "UNIT PENDIDIKAN KERJAYA"
    - Middle:
      * Left: High-contrast QR code placeholder box
      * Right:
        - Asset ID: "UPK-AST-014"
        - Item Name (truncated): "Dell Latitude 3420"
        - Room: "Makmal Kerjaya"
    - Footer: "HAK MILIK KERAJAAN - JANGAN ALIShKAN"

--- PAGE W-12: Navigation Flow Map & System Linkages ---
Layout: Diagrammatic flowchart representation connecting all 11 pages
- Flow 1 (Asset Life-cycle): W-07 (Add Asset) → Generates QR & Photo → W-02 (Catalog) & W-11 (Print QR Label)
- Flow 2 (Routine Scanning & Inventory): Physical Item QR → W-05 (Mobile Scanner) → W-04 (Asset Detail Modal) → W-06 (Update Stock Card)
- Flow 3 (Damage & Disposal Pipeline): W-04 (Asset Detail) → W-08 (Damage Report + Photo) → W-09 (Technical Inspection & Side-by-side Review) → W-10 (Disposal Approval by Ketua Unit) → Status updated to "Dihapuskan" & Official PDF Generated

## Wireframe Style Notes
- Use only grayscale: white, light gray (#EEEEEE), medium gray (#AAAAAA), dark gray (#333333), black
- Text placeholders: Use actual representative labels, not "Lorem Ipsum"
- Buttons: Show shape and label clearly — primary buttons filled dark, secondary outlined
- Images/covers: Show as plain box with X through it (standard wireframe placeholder)
- Charts: Show as empty chart frames with axis labels and chart type label inside
- Icons: Show as simple labeled squares [icon: name]
- Number badges: Show on nav items where relevant (pending counts, notifications)
- Show mobile breakpoint for at least the HOME page as additional frame (represented in PAGE W-03 & W-05)
- Add flow arrows between key pages (Login → Dashboard, Upload → Pending → Admin Review → Published, represented in PAGE W-12)
