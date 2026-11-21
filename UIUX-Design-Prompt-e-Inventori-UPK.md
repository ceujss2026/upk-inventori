Design a complete, high-fidelity, production-grade UI/UX for e-Inventori UPK (Asset & Inventory Management System with QR Code & Visual Damage Documentation).
The application is tailored for the Career Education Unit (Unit Pendidikan Kerjaya - UPK, Jabatan Sekolah-Sekolah, Kementerian Pendidikan Brunei Darussalam). It automates government asset tracking via QR codes, manual item photo verification, room-based official storage books (Buku Simpanan & Kad Stok), field damage reporting, and side-by-side visual technical inspections for government asset disposal (Pelupusan Aset Alih Kerajaan).

## Design Identity & Navigation Model
- Navigation Architecture: Dual-Tier Full-Width Horizontal Top Navbar with Expandable Mega Menu Dropdown (NO left sidebar, maximum 100% full-screen workspace).
- Style: Formal Brunei Government Institutional & Modern Clean Product Interface (Inspired by ZARE Mega-Menu layout & Oakory product card grids).
- Aesthetic: Elevated card-based UI, soft crisp shadows, polished rounded borders, institutional authority balanced with mobile-first convenience.
- System Interface Language: Standard Brunei Malay (Bahasa Melayu Standard Brunei) for all UI labels, buttons, tables, badges, and modals.
- Color Palette:
  * Primary Brand (UPK Deep Navy): #0F3E5D (Used for Tier-1 top bar, official header panels, active mega-menu headers)
  * Secondary Brand (UPK Cerulean Blue): #16719A (Used for primary buttons, active pill tabs, interactive accents, focus rings)
  * Accent Brand (UPK Ochre Gold): #C18C3B (Used for official crest highlights, verified tags, star indicators, UPK monogram)
  * Accent Soft (Sky / Ice Blue): #E2EEF5 (Used for table headers, active card borders, mega-menu category highlights)
  * Background Canvas: #F8FAFC (Soft slate-neutral canvas)
  * Surface / Card: #FFFFFF (Pure white card background with subtle border)
  * Text Primary: #0F172A (Deep slate black for high legibility)
  * Text Secondary: #475569 (Muted slate for labels and metadata)
  * Border / Divider: #E2E8F0 (Crisp 1px borders)
  * Status Badges (Lencana Status):
    - Beroperasi Baik / Aktif: Background #DCFCE7, Text #166534, Border #86EFAC
    - Dalam Penyelenggaraan / Pembaikan: Background #FEF9C3, Text #854D0E, Border #FDE047
    - Cadangan Pelupusan / Rosak: Background #FEE2E2, Text #991B1B, Border #FCA5A5
    - Dihapuskan / Dilupuskan: Background #F1F5F9, Text #475569, Border #CBD5E1
- Typography:
  * Font Family: 'Plus Jakarta Sans' or 'Inter' (clean modern sans-serif with excellent numerals and tabular display)
  * Headings: Font-weight 700 / 600, tight letter-spacing (-0.02em)
  * Body: Font-weight 400 / 500, line-height 1.5, size 14px
  * Micro-copy / Badges: Font-weight 600, uppercase 11px, letter-spacing 0.05em
- Icons: Heroicons / Lucide outline style (20px & 24px stroke-width 1.75px)
- Visual Language & Inspiration:
  * Top Navigation: ZARE Dashboard Dual-Tier Header with Multi-Column Floating Mega-Menu.
  * Mobile & Catalog Cards: Oakory clean mobile layout and WooCommerce Modern Product Card UI Kit.
- Corner Radius:
  * Cards, Modals & Mega Menu Panels: 16px (smooth rounded corners)
  * Buttons & Inputs: 10px
  * Status Badges & Pill Tabs: 9999px (fully rounded pill shape)
- Shadows & Elevation:
  * Card Default: 0 1px 3px rgba(15, 62, 93, 0.05), 0 4px 12px rgba(15, 62, 93, 0.03)
  * Card Hover / Floating: 0 10px 25px -3px rgba(15, 62, 93, 0.10), 0 4px 6px -2px rgba(15, 62, 93, 0.05)
  * Mega Menu & Modals: 0 20px 40px rgba(15, 23, 42, 0.15)
- Spacing: 8px base grid system (paddings: 8px, 16px, 24px, 32px)

## Application Overview
The app consists of 12 integrated visual interfaces with 100% full-width screen real estate:
1. Papan Pemuka Pentadbiran (KPI metrics, asset status ratio chart, room distribution bar chart)
2. Katalog Aset & Inventori (4-column elevated card grid with image preview, filter pills & search)
3. Katalog Mudah Alih Responsif (2-column mobile card grid, horizontal scrolling pill tabs, bottom navigation)
4. Modal Butiran Aset & Kod QR (Full specifications, official photo, downloadable/printable QR code)
5. Pengimbas Kod QR Kamera Telefon (Live camera viewfinder with animated reticle & instant match sheet)
6. Buku Simpanan & Kad Stok Rasmi (Official tabular view with filters, export to CSV/Excel and PDF)
7. Borang Pendaftaran Aset Baharu (Manual photo dropzone with instant client-side canvas compression preview)
8. Borang Aduan Kerosakan Mudah Alih (Step-by-step incident form with camera photo snap of damaged item)
9. Semakan Teknikal Bersebelahan (Split-screen side-by-side visual proof: Original Photo vs Damaged Photo)
10. Sokongan & Kelulusan Pelupusan Aset (Official Government PDF document preview with 1-click approve/reject card)
11. Lembaran Pelekat Kod QR Sedia Cetak (A4 sheet with 21 high-contrast QR labels featuring UPK logo)
12. Peta Aliran Navigasi Sistem (End-to-end interactive flowchart)

---

## Detailed Page Specifications (Standard Brunei Malay Labels)

### 1. Global Navigation Bar & Papan Pemuka (ZARE-Style Mega Menu)
Full-width institutional command center featuring a Dual-Tier Horizontal Navigation system (NO left sidebar):
- Tier 1: Dark Navy Top Bar (#0F3E5D, Height 64px, full-width):
  * Left: UPK Official Monogram Crest + "e-Inventori UPK" in crisp white bold typography. Subtitle: "Unit Pendidikan Kerjaya, Jabatan Sekolah-Sekolah".
  * Right:
    - Room Scope selector: Dropdown [Semua Bilik UPK v] in semi-transparent navy pill.
    - Notification bell with unread damage alert badge (crimson red badge #D62828 with count 4).
    - Message / Bulletin bell with counter 5.
    - User Profile Widget: Avatar photo, "Jessica Roy", subtitle "Pentadbir Inventori", chevron icon [v].
- Tier 2: Clean White Horizontal Navbar (Height 52px, full-width, subtle bottom shadow and border #E2E8F0):
  * Horizontal Menu Items with outline icons & chevrons:
    1. [icon: home] Papan Pemuka
    2. [icon: box] Katalog Aset [v]
    3. [icon: clipboard] Buku Simpanan & Kad Stok [v]
    4. [icon: camera] Imbasan & Aduan [v]
    5. [icon: scale] Pemeriksaan & Pelupusan [v]
    6. [icon: settings] Pentadbiran Sistem [v]
  * Interactive Multi-Column Mega Menu Dropdown Panel:
    - Triggered by hover/click on menu items. A full-width white floating container (16px rounded corners, elevated shadow 0 15px 35px rgba(15, 62, 93, 0.12), padding 28px).
    - Divided into 4 organized columns with category headers in uppercase 11px Cerulean (#16719A):
      * Column 1 ("KATALOG & PENDAFTARAN"):
        - [icon: grid] Paparan Kad Bergambar (Card Grid View)
        - [icon: plus-circle] Daftar Aset Baharu (Muat Naik Gambar Manual)
        - [icon: printer] Cetak Pelekat Kod QR Pukal
        - [icon: map-pin] Semakan Penempatan & Lokasi Bilik
      * Column 2 ("BUKU SIMPANAN RASMI"):
        - [icon: arm-chair] Perabot Pejabat
        - [icon: laptop] Peralatan Komputer & IT
        - [icon: zap] Peralatan Elektrik
        - [icon: package] Barang Guna Habis (Consumables)
      * Column 3 ("ADUAN & PEMERIKSAAN"):
        - [icon: qr-code] Pengimbas Kod QR (Kamera Telefon)
        - [icon: alert-triangle] Hantar Aduan Kerosakan Baharu
        - [icon: tool] Semakan Teknikal Bersebelahan (Side-by-Side)
        - [icon: list] Senarai Aduan & Tindakan Semasa
      * Column 4 ("KELULUSAN & LAPORAN"):
        - [icon: check-square] Sokongan Pelupusan Aset (Ketua Unit)
        - [icon: file-text] Cetak Kad Stok mengikut Bilik (PDF)
        - [icon: download] Eksport Data Penuh (Excel/CSV)
        - [icon: archive] Arkib Rekod Aset Dihapuskan
- Main Workspace (100% full-width below navbar):
  * KPI Metrics Bar (4 elevated white cards with 16px border-radius):
    - Jumlah Keseluruhan Aset: "1,248 Unit" with soft cerulean icon box (#E2EEF5 with #16719A icon).
    - Beroperasi Baik: "1,180 Unit" with emerald badge (+94.5%).
    - Dalam Penyelenggaraan: "42 Unit" with amber alert badge and [Lihat Aduan] link.
    - Cadangan Pelupusan: "26 Unit" with soft red badge and [Tindakan Sokongan] link.
    - Peringatan Stok Guna Habis: Banner highlighting 5 stationery items below safety threshold.
  * Interactive Charts Row:
    - Left Panel (60%): "Agihan Aset Mengikut Bilik" — horizontal bar chart in Cerulean #16719A with rounded pill bars.
    - Right Panel (40%): "Nisbah Status Keseluruhan" — donut chart with emerald (#2A9D8F), amber (#E9C46A), and crimson (#D62828).
  * Recent Activity Table: Full-width clean table showing real-time QR scans, room transfers, and newly reported damage logs.

### 2. Desktop Asset Catalog & Card Grid View (Katalog Aset & Inventori)
Full-width visual-first inventory catalog styled like a premium e-commerce gallery.
- Header & Controls:
  * Title "Katalog Aset & Inventori UPK" with subtitle "Perekodan visual aset alih dan barang guna habis rasmi".
  * Primary Button: [+ Daftar Aset Baharu] in solid Cerulean (#16719A).
  * Secondary Button: [Cetak Pelekat Kod QR Pukal] with outline style.
- Filter & Search Bar:
  * Full-width search bar with magnifying glass icon and placeholder: "Cari nama barang, nombor siri pendaftaran, atau kod aset... (Ctrl + K)".
  * Category Pill Tabs (Rounded 9999px): [Semua Aset (1,248)] active in #16719A with white text; [Perabot Pejabat], [Peralatan Komputer], [Peralatan Elektrik], [Barang Guna Habis] in white background with subtle border #E2E8F0.
  * Room Dropdown Filter: [Pilih Bilik / Lokasi v] (Makmal Kerjaya, Pejabat Pentadbiran, Bilik Mesyuarat Utama).
  * Status Filter: [Semua Status v], [Susunan: Terkini Didaftar v].
- 4-Column Card Grid (Full-width responsive grid):
  * Individual Card Component:
    - Top Image (4:3 ratio): High-resolution photo of asset on clean neutral background with subtle hover zoom (`scale(1.03)`).
    - Status Badge: Floating pill on top-right corner with blur backdrop (Green "Beroperasi Baik", Amber "Diselenggara", Red "Cadang Pelupusan").
    - Card Body:
      * Category Label: Muted uppercase text ("PERALATAN KOMPUTER & IT").
      * Asset Name: Bold slate text ("Komputer Riba Dell Latitude 3420").
      * Serial / ID Pill: Monospace tag `UPK-AST-014` with copy button.
      * Room Placement: Pin icon with location ("Makmal Kerjaya UPK (Bilik 2)").
      * Quantity: "Baki Stok: 1 Unit".
    - Card Footer:
      * Left: Mini high-contrast QR code preview (click to enlarge).
      * Right: [Butiran Lengkap] button with eye icon.

### 3. Mobile Responsive Catalog (Katalog Mudah Alih Mesra Telefon)
Optimized for smartphones (390px viewport width) for field asset audits in rooms.
- Mobile Sticky Header:
  * Compact top bar with UPK Logo, search field with filter button, and floating camera QR scan icon.
  * Horizontal scrolling category pill bar: [Semua], [Perabot], [Komputer], [Elektrik], [Guna Habis].
- 2-Column Mobile Card Grid:
  * Cards feature rounded 14px corners, 4:3 item image, status badge, 2-line title clamp, room tag, and full-width [Lihat Butiran] touch button.
- Bottom Sticky Navigation Bar (Height 68px, glassmorphism background):
  * 5 navigation targets: [Utama], [Katalog], [Floating Center Pill: IMBAS KOD QR with glowing Cerulean ring], [Aduan Kerosakan], [Kad Stok].

### 4. Asset Detail & QR Code Modal (Modal Butiran Aset & Kod QR)
A comprehensive 2-column modal dialog presenting the asset's digital twin.
- Left Column:
  * Large verified asset photo with zoom icon and registration timestamp.
  * High-resolution QR Code block with official UPK header, asset ID, and [Cetak Pelekat Kod QR Ini] button.
- Right Column:
  * Status header with large colored pill badge [Beroperasi Baik].
  * Structured key-value grid: Nombor Siri Pendaftaran, Buku Simpanan, Penempatan Bilik Semasa, Pegawai Penanggungjawab Bilik, Tarikh Pendaftaran, Harga Perolehan Asal, Nilai Semasa, Spesifikasi Teknikal.
  * Mini Stock Movement History: 3 latest transactions from the Stock Card.
- Modal Action Footer:
  * [Kemaskini Maklumat] (Outline button #16719A).
  * [Pindah Lokasi Bilik] (Outline button with arrow icon).
  * [Laporkan Kerosakan] (Solid red danger button #D62828 with camera icon).

### 5. Mobile QR Camera Scanner (Pengimbas Kod QR Kamera Telefon)
A seamless mobile scanner designed to verify physical assets instantly in rooms.
- Viewfinder: Full-screen camera stream with rounded square targeting reticle, dark semi-transparent overlay vignette, active animated scanning beam, and torch toggle button.
- Feedback Helper: "Halakan kamera tepat pada label Kod QR di atas barang inventori".
- Instant Slide-Up Result Card (Triggered upon scan):
  * Displays item thumbnail, Asset Name, Serial Number, and Assigned Room.
  * Verification indicator:
    - Green check banner: "Lokasi Tepat: Barang ini berada di bilik penempatan rasminya."
    - Amber warning banner: "Lokasi Tidak Sepadan: Rekod sistem menunjukkan barang ini kepunyaan Stor Utama."
  * Action buttons: [Buka Maklumat Lengkap] or [Hantar Aduan Kerosakan Pantas].

### 6. Stock Card & Room Ledger (Buku Simpanan & Kad Stok Rasmi)
Full-width official government-compliant digital stock ledger.
- Room & Category Selector: Dropdown for Room (e.g., Bilik Pentadbiran Am) and tabs for the 4 official storage books.
- Export Actions Bar: [Eksport ke Excel (.xlsx)], [Muat Turun CSV], [Cetak Format PDF Kad Stok].
- Data Table Architecture:
  * Table Header: Uppercase 11px font in soft slate background #E2EEF5 with crisp 1px borders.
  * Columns: Tarikh | ID Aset | Perihal Barang | Jenis Transaksi (Masuk/Keluar/Pindah) | Dari Bilik | Ke Bilik | Masuk (+Qty) | Keluar (-Qty) | Baki Terkini | Pegawai / Tindakan.
  * Quantity highlighting: Green bold for stock additions (+10), Red bold for deductions (-2), and neutral for internal room transfers.
  * Interactive row hover with popover showing transaction remarks and reference document numbers.
- Pagination Bar: Page number pills, items per page selector (10, 25, 50, 100), and record counter.

### 7. Asset Registration Form (Borang Pendaftaran Aset Baharu)
Full-width single-column structured form with intuitive sections.
- Section 1: Maklumat Asas Pendaftaran (Nama Barang, No. Siri Pendaftaran, Buku Simpanan dropdown, Kategori radio buttons: Aset Alih / Barang Guna Habis, Bilik Penempatan dropdown, Kuantiti Awal, Paras Peringatan Stok Minimum).
- Section 2: Dokumentasi Visual Gambar (Muat Naik Gambar Manual):
  * Large dashed dropzone area with camera and cloud upload icons.
  * Text: "Pilih gambar dari galeri atau rakam terus menggunakan kamera telefon".
  * Subtext: "Sistem memampatkan imej secara automatik di bawah 600 KB untuk kelajuan simpanan".
  * Live Preview Slot: Rounded 12px container displaying the compressed image thumbnail with dimensions, file size badge (e.g., "342 KB - Sedia Disimpan"), and [Tukar Gambar] button.
- Section 3: Catatan & Spesifikasi Teknikal (Multi-line textarea).
- Sticky Bottom Action Bar: [Batal], [Simpan Sebagai Draf], [Simpan & Jana Pelekat Kod QR] (Solid Cerulean #16719A).

### 8. Mobile Damage Report Form (Borang Aduan Kerosakan Barang)
Designed for quick field reporting by teachers and staff upon noticing broken assets.
- Asset Auto-Detection Banner: Shows the scanned item's photo, name, and room.
- Form Inputs: Nama Pelapor & Emel Rasmi, Tarikh Kerosakan Disedari, Bahagian yang Mengalami Kerosakan dropdown (Skrin, Struktur Fizikal, Papan Litar, dsb.).
- Visual Damage Proof Capture (Muat Naik Gambar Bukti Kerosakan):
  * Prominent button: [Rakam Gambar Kerosakan Sekarang] (Direct camera trigger).
  * Preview slot for damaged part photo with caption field ("Cth: Keretakan pada bahagian engsel kanan laptop").
- Tahap Kerosakan: Radio pills (Ringan / Sederhana / Kritikal - Tidak Selamat Digunakan).
- Submit Action: [Hantar Laporan Kerosakan] with instant toast feedback.

### 9. Technical Inspection Review (Semakan Teknikal Bersebelahan / Side-by-Side)
An investigative interface for technicians to evaluate broken assets against their original state.
- Case Header: No. Rujukan Aduan: `ADU-2026-018`, No. Siri Aset, Butiran Pengadu, and Status [Menunggu Semakan Teknikal].
- Dual Visual Comparison Panel (Side-by-Side Visual Proof):
  * Left Box (50%): "GAMBAR ASAL (Semasa Pendaftaran)" — Clear picture of the pristine asset with registration date and room metadata.
  * Right Box (50%): "GAMBAR KEROSAKAN SEMASA (Bukti Aduan)" — High-resolution close-up photo of the broken component with reporter timestamp.
  * Interactive Split Slider: Allows sliding left/right to compare condition differences.
- Technician Assessment Panel:
  * Textarea for physical diagnosis and repair feasibility notes.
  * Decision Selector:
    - Option A: [Boleh Dibaiki] with estimated repair cost input (BND $____).
    - Option B: [Perakuan Pelupusan / Penghapusan Aset] with justification dropdown (Usang, Rosak Teruk Tidak Ekonomik Dibaiki, Hilang Upaya).
- Action Button: [Sahkan Perakuan Teknikal & Kemukakan ke Pegawai Pengesah].

### 10. Asset Disposal Approval & Official PDF Preview (Sokongan Pelupusan Aset Kerajaan)
Executive decision board for the Head of Unit (Ketua Unit / Pegawai Pengesah).
- Left Panel (60%): Interactive PDF Preview Canvas
  * Shows the rendered official Government Asset Disposal Form ("Borang Permohonan Pelupusan Aset Alih Kerajaan").
  * Features UPK official crest, asset valuation table, side-by-side photographic evidence embedded in the PDF, technician endorsement, and digital verification QR code in the footer.
- Right Panel (40%): Executive Action Card
  * Summary checklist:
    [x] Gambar kerosakan visual telah disemak
    [x] Perakuan teknikal memenuhi kriteria pelupusan aset
    [x] Rekod penempatan fizikal disahkan
  * Input: Catatan & Ulasan Pegawai Pengesah (Textarea).
  * Action Buttons:
    - [Tolak Permohonan] (Outlined Crimson Red #D62828).
    - [Sokong & Luluskan Pelupusan Aset] (Solid Deep Navy #0F3E5D with checkmark icon).
  * Direct Export: [Muat Turun Dokumen PDF Rasmi Ber-QR] and [Cetak Borang].

### 11. Printable QR Sticker Sheet (Lembaran Pelekat Kod QR Sedia Cetak)
Print-ready layout designed for standard sticky label sheets (3 columns x 7 rows = 21 stickers per A4).
- Controls: Label size selector (50mm x 30mm), Room filter, Print orientation, [Cetak Terus ke Pencetak] button.
- Sticker Unit Card Design:
  * Crisp 1px dashed cutting guide border.
  * Header: Mini UPK institutional logo with text "UNIT PENDIDIKAN KERJAYA".
  * Body: Crisp black-and-white QR code on the left, Asset ID (`UPK-AST-014`), Item Name, and Room on the right.
  * Footer: Official security notice "HAK MILIK KERAJAAN — JANGAN ALIHKAN".

### 12. Navigation Flow & System Architecture Map (Peta Aliran Sistem)
Visual flow diagram demonstrating the interconnected system pathways:
- Aliran A (Pendaftaran): Borang W-07 -> Storan Awan -> Katalog W-02 & Cetakan Pelekat W-11.
- Aliran B (Pemeriksaan Bilik): Kod QR Barang Fizikal -> Pengimbas Kamera W-05 -> Modal Butiran W-04 -> Kemaskini Kad Stok W-06.
- Aliran C (Rantaian Aduan & Pelupusan): Modal Butiran W-04 -> Aduan Kerosakan W-08 -> Semakan Teknikal Bersebelahan W-09 -> Sokongan Pelupusan Ketua Unit W-10 -> Dokumen PDF Rasmi Diterbitkan & Status Aset dikemas kini kepada "Dilupuskan".

---

## Global Design Requirements
- Fully Responsive Design: Optimized for Desktop (1440px), Tablet (768px), and Mobile Smartphones (390px).
- Navigation Paradigm: Full-width horizontal mega-menu without sidebars for maximum data visibility.
- Skeleton Loading States: Animated shimmer placeholders (#E2EEF5 to #F1F5F9) for all image cards, data tables, and metrics while Google Apps Script fetches data.
- Toast Notifications (Makluman Sistem):
  * Kejayaan (Emerald #10B981): "Gambar berjaya dimuat naik & aset didaftarkan."
  * Peringatan (Amber #F59E0B): "Stok barang guna habis berada di bawah paras minimum."
  * Ralat (Red #EF4444): "Ralat sambungan. Sila semak semula data awda."
  * Maklumat (Cerulean #16719A): "Kod QR berjaya diimbas."
- Empty States: Friendly institutional SVG illustration, helpful guidance copy, and a prominent primary CTA button (e.g., "Tiada barang dijumpai di bilik ini — [Daftar Barang Baharu]").
- Accessibility & Contrast: Strict WCAG AA compliance with high-contrast text against backgrounds and visible keyboard focus rings (#16719A outline with 2px offset).
- The Overall Feel: A prestigious, modern, and reliable institutional platform that blends the visual clarity of high-end consumer apps with the procedural rigor of official government asset administration in Brunei Darussalam.
