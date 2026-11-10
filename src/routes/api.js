/**
 * @file api.js
 * @description Rute REST API terpadu untuk PoS Kasir MoonCafe.
 * Mencakup Manajemen Menu (CRUD), Autentikasi Login Kasir/Admin, Dashboard Ringkasan,
 * Laporan Penjualan, Pencarian Member, Pemrosesan Transaksi, dan Struk.
 * 
 * Standar Penilaian BNSP:
 * - J.620100.010.01 : Perintah eksekusi bahasa pemrograman.
 * - J.620100.016.01 : Best practices dan clean code.
 * - J.620100.023.02 : Docblock documentation.
 * - J.620100.025.02 : Error handling dan debugging.
 * 
 * @author Saladin (Peserta UKK 2026)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool } = require('../config/db');
const { kalkulasiTransaksi, hitungKembalian } = require('../helpers/kalkulator');

// Konfigurasi Multer untuk Penyimpanan Foto Produk Lokal di Server
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanExt = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'menu-' + uniqueSuffix + cleanExt);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Batas ukuran 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const ext = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mime = filetypes.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error('Format file tidak didukung. Harap upload gambar JPG, PNG, WEBP, atau GIF.'));
  }
});

// =====================================================================
// ENDPOINT UPLOAD FOTO PRODUK KE PENYIMPANAN LOKAL
// =====================================================================
/**
 * POST /api/upload-gambar
 * Menerima file multipart/form-data dengan field 'foto'
 * Menyimpan file secara lokal di public/uploads/ dan mengembalikan relative URL
 */
router.post('/upload-gambar', (req, res) => {
  upload.single('foto')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Ukuran foto maksimal 5MB.' });
      }
      return res.status(400).json({ success: false, message: 'Gagal mengunggah foto: ' + err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file gambar yang dipilih.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      message: 'Foto produk berhasil disimpan di server lokal!',
      url: fileUrl,
      filename: req.file.filename
    });
  });
});

// =====================================================================
// 1. AUTENTIKASI LOGIN KASIR / ADMIN
// =====================================================================
/**
 * POST /api/auth/login
 * Memvalidasi kredensial login akun kasir / admin dari tabel petugas.
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const [rows] = await pool.query(
      `SELECT id_petugas, nama_petugas, username, role FROM petugas WHERE username = ? AND password = ?`,
      [username.trim(), password.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    res.json({
      success: true,
      message: 'Login berhasil.',
      user: rows[0]
    });
  } catch (error) {
    console.error('Error login:', error.message);
    res.status(500).json({ success: false, message: 'Gagal melakukan login: ' + error.message });
  }
});


// =====================================================================
// 2. DASHBOARD STATISTIK RINGKASAN & ANALITIK
// =====================================================================
/**
 * GET /api/dashboard/stats
 * Mengambil ringkasan data finansial, statistik omzet harian, KPI admin/kasir, dan performa karyawan.
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    // 1. Total penjualan & transaksi hari ini
    const [todaySales] = await pool.query(`
      SELECT 
        COALESCE(SUM(grand_total), 0) AS omzet_hari_ini,
        COUNT(id_transaksi) AS transaksi_hari_ini
      FROM transaksi
      WHERE DATE(tgl_transaksi) = CURDATE()
    `);

    // 2. Total seluruh omzet kumulatif, total transaksi, & pajak terkumpul
    const [allSales] = await pool.query(`
      SELECT 
        COALESCE(SUM(grand_total), 0) AS total_omzet,
        COALESCE(SUM(pajak_10_persen), 0) AS total_pajak,
        COUNT(id_transaksi) AS total_transaksi
      FROM transaksi
    `);

    // 3. Total produk & stok
    const [prodStats] = await pool.query(`
      SELECT 
        COUNT(id_produk) AS total_produk,
        COALESCE(SUM(stok), 0) AS total_stok
      FROM produk
    `);

    // 4. Total member & total petugas karyawan
    const [memberStats] = await pool.query(`SELECT COUNT(id_member) AS total_member FROM members`);
    const [staffStats] = await pool.query(`SELECT COUNT(id_petugas) AS total_karyawan FROM petugas`);

    // 5. 3 Menu Terlaris (Top Selling)
    const [topMenus] = await pool.query(`
      SELECT 
        p.nama_produk,
        k.nama_kategori,
        COALESCE(SUM(d.qty), 0) AS total_terjual,
        p.gambar
      FROM detail_transaksi d
      JOIN produk p ON d.id_produk = p.id_produk
      JOIN kategori k ON p.id_kategori = k.id_kategori
      GROUP BY p.id_produk
      ORDER BY total_terjual DESC
      LIMIT 3
    `);

    // 6. 5 Transaksi Terkini
    const [recentOrders] = await pool.query(`
      SELECT 
        t.nomor_nota,
        DATE_FORMAT(t.tgl_transaksi, '%H:%i') AS jam,
        t.tipe_pesanan,
        CAST(t.grand_total AS FLOAT) AS grand_total
      FROM transaksi t
      ORDER BY t.id_transaksi DESC
      LIMIT 5
    `);

    // 7. Tren Penjualan 7 Hari Terakhir untuk Grafik
    const [trendSales] = await pool.query(`
      SELECT 
        DATE_FORMAT(tgl_transaksi, '%d/%m') AS tanggal,
        COALESCE(SUM(grand_total), 0) AS omzet,
        COUNT(id_transaksi) AS total_transaksi
      FROM transaksi
      GROUP BY DATE(tgl_transaksi)
      ORDER BY DATE(tgl_transaksi) ASC
      LIMIT 7
    `);

    // 8. Performa Karyawan (Kasir vs Admin)
    const [staffPerformance] = await pool.query(`
      SELECT 
        p.id_petugas,
        p.nama_petugas,
        p.role,
        COUNT(t.id_transaksi) AS total_transaksi,
        COALESCE(SUM(t.grand_total), 0) AS total_omzet
      FROM petugas p
      LEFT JOIN transaksi t ON p.id_petugas = t.id_petugas
      GROUP BY p.id_petugas
      ORDER BY total_omzet DESC
    `);

    // 9. Peringatan Stok Menipis (Stok <= 25)
    const [lowStock] = await pool.query(`
      SELECT id_produk, nama_produk, stok, gambar 
      FROM produk 
      WHERE stok <= 25 
      ORDER BY stok ASC 
      LIMIT 4
    `);

    res.json({
      success: true,
      data: {
        omzetHariIni: Number(todaySales[0].omzet_hari_ini),
        transaksiHariIni: Number(todaySales[0].transaksi_hari_ini),
        totalOmzet: Number(allSales[0].total_omzet),
        totalPajak: Number(allSales[0].total_pajak),
        totalTransaksi: Number(allSales[0].total_transaksi),
        totalProduk: Number(prodStats[0].total_produk),
        totalStok: Number(prodStats[0].total_stok),
        totalMember: Number(memberStats[0].total_member),
        totalKaryawan: Number(staffStats[0].total_karyawan),
        topMenus,
        recentOrders,
        trendSales,
        staffPerformance,
        lowStock
      }
    });
  } catch (error) {
    console.error('Error dashboard stats:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memuat statistik dashboard.' });
  }
});


// =====================================================================
// 3. LAPORAN PENJUALAN
// =====================================================================
/**
 * GET /api/laporan
 * Mengambil rekapitulasi laporan penjualan lengkap beserta tren harian untuk grafik Chart.js.
 */
router.get('/laporan', async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        COALESCE(SUM(subtotal), 0) AS total_subtotal,
        COALESCE(SUM(total_diskon_nominal), 0) AS total_diskon,
        COALESCE(SUM(pajak_10_persen), 0) AS total_pajak,
        COALESCE(SUM(grand_total), 0) AS total_bersih,
        COUNT(id_transaksi) AS total_transaksi
      FROM transaksi
    `);

    const [transactions] = await pool.query(`
      SELECT 
        t.id_transaksi,
        t.nomor_nota,
        DATE_FORMAT(t.tgl_transaksi, '%d-%m-%Y %H:%i') AS waktu,
        t.tipe_pesanan,
        t.subtotal,
        t.total_diskon_nominal,
        t.pajak_10_persen,
        t.grand_total,
        p.nama_petugas,
        COALESCE(m.nama_member, 'Pelanggan Umum') AS pelanggan
      FROM transaksi t
      JOIN petugas p ON t.id_petugas = p.id_petugas
      LEFT JOIN members m ON t.id_member = m.id_member
      ORDER BY t.id_transaksi DESC
    `);

    // Tren harian untuk visualisasi grafik Chart.js
    const [chartData] = await pool.query(`
      SELECT 
        DATE_FORMAT(tgl_transaksi, '%d/%m') AS label_tgl,
        COALESCE(SUM(subtotal), 0) AS omzet_kotor,
        COALESCE(SUM(pajak_10_persen), 0) AS pajak,
        COALESCE(SUM(grand_total), 0) AS omzet_bersih,
        COUNT(id_transaksi) AS jumlah_transaksi
      FROM transaksi
      GROUP BY DATE(tgl_transaksi)
      ORDER BY DATE(tgl_transaksi) ASC
      LIMIT 14
    `);

    res.json({
      success: true,
      data: {
        summary: summary[0],
        transactions,
        chartData
      }
    });
  } catch (error) {
    console.error('Error laporan:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memuat laporan penjualan.' });
  }
});


// =====================================================================
// 4. MANAJEMEN MENU PRODUK (CRUD LENGKAP)
// =====================================================================
router.get('/menu', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id_produk, 
        p.id_kategori, 
        k.nama_kategori, 
        p.nama_produk, 
        p.deskripsi, 
        CAST(p.harga AS FLOAT) AS harga, 
        p.stok, 
        p.gambar
      FROM produk p
      JOIN kategori k ON p.id_kategori = k.id_kategori
      ORDER BY p.id_produk ASC
    `;
    const [rows] = await pool.query(query);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/kategori', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM kategori ORDER BY id_kategori ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/menu', async (req, res) => {
  try {
    const { id_kategori, nama_produk, deskripsi, harga, stok, gambar } = req.body;
    if (!nama_produk || !harga) {
      return res.status(400).json({ success: false, message: 'Nama produk dan harga wajib diisi.' });
    }
    const defaultImg = gambar && gambar.trim() 
      ? gambar.trim() 
      : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80';

    const insertQuery = `
      INSERT INTO produk (id_kategori, nama_produk, deskripsi, harga, stok, gambar)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertQuery, [
      Number(id_kategori) || 1,
      nama_produk.trim(),
      deskripsi ? deskripsi.trim() : null,
      Number(harga) || 0,
      Number(stok) || 0,
      defaultImg
    ]);

    res.json({ success: true, message: 'Menu berhasil ditambahkan ke database.', data: { id_produk: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/menu/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { id_kategori, nama_produk, deskripsi, harga, stok, gambar } = req.body;
    if (!nama_produk || !harga) {
      return res.status(400).json({ success: false, message: 'Nama produk dan harga wajib diisi.' });
    }
    const defaultImg = gambar && gambar.trim() 
      ? gambar.trim() 
      : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80';

    const updateQuery = `
      UPDATE produk 
      SET id_kategori = ?, nama_produk = ?, deskripsi = ?, harga = ?, stok = ?, gambar = ?
      WHERE id_produk = ?
    `;
    const [result] = await pool.query(updateQuery, [
      Number(id_kategori) || 1,
      nama_produk.trim(),
      deskripsi ? deskripsi.trim() : null,
      Number(harga) || 0,
      Number(stok) || 0,
      defaultImg,
      id
    ]);

    res.json({ success: true, message: 'Menu berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/menu/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [usage] = await pool.query(`SELECT COUNT(*) AS total FROM detail_transaksi WHERE id_produk = ?`, [id]);
    if (usage[0].total > 0) {
      return res.status(400).json({
        success: false,
        message: `Menu ini tidak dapat dihapus karena tercatat di ${usage[0].total} transaksi. Ubah stoknya menjadi 0 untuk menonaktifkannya.`
      });
    }
    await pool.query('DELETE FROM produk WHERE id_produk = ?', [id]);
    res.json({ success: true, message: 'Menu berhasil dihapus dari database.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// =====================================================================
// 5. DATA MEMBER & PENCARIAN MEMBER
// =====================================================================
// Ambil semua daftar member
router.get('/members', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM members ORDER BY id_member DESC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Tambah member baru
router.post('/members', async (req, res) => {
  try {
    const { nama_member, no_telp } = req.body;
    if (!nama_member || !nama_member.trim()) {
      return res.status(400).json({ success: false, message: 'Nama member wajib diisi.' });
    }

    // Generate kode member unik otomatis
    const [countResult] = await pool.query(`SELECT COUNT(*) AS total FROM members`);
    const nextNum = (countResult[0].total + 1).toString().padStart(3, '0');
    const kode_member = req.body.kode_member?.trim() || `MBR-${nextNum}`;

    const [insertResult] = await pool.query(
      `INSERT INTO members (kode_member, nama_member, no_telp, diskon_persen, poin_loyalitas) VALUES (?, ?, ?, 5.00, 0)`,
      [kode_member, nama_member.trim(), no_telp ? no_telp.trim() : null]
    );

    res.status(201).json({
      success: true,
      message: 'Member berhasil ditambahkan!',
      data: { id_member: insertResult.insertId, kode_member, nama_member, no_telp, diskon_persen: 5.00 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hapus member
router.delete('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM members WHERE id_member = ?`, [id]);
    res.json({ success: true, message: 'Data member berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/members/search', async (req, res) => {
  try {
    const keyword = req.query.q || '';
    if (!keyword.trim()) return res.json({ success: true, data: [] });
    const query = `
      SELECT id_member, kode_member, nama_member, no_telp, poin_loyalitas
      FROM members
      WHERE kode_member LIKE ? OR nama_member LIKE ? OR no_telp LIKE ?
      LIMIT 10
    `;
    const searchVal = `%${keyword}%`;
    const [rows] = await pool.query(query, [searchVal, searchVal, searchVal]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/transaksi', async (req, res) => {
  const { id_petugas, id_member, tipe_pesanan, items, bayar } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Keranjang pesanan tidak boleh kosong.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const productIds = items.map(item => item.id_produk);
    const [dbProducts] = await conn.query(
      `SELECT id_produk, nama_produk, harga, stok FROM produk WHERE id_produk IN (?)`,
      [productIds]
    );

    const validatedItems = [];
    for (const item of items) {
      const dbProd = dbProducts.find(p => p.id_produk === item.id_produk);
      if (!dbProd) throw new Error(`Produk ID ${item.id_produk} tidak ditemukan.`);
      if (dbProd.stok < item.qty) throw new Error(`Stok "${dbProd.nama_produk}" tidak mencukupi.`);
      validatedItems.push({
        id_produk: dbProd.id_produk,
        nama_produk: dbProd.nama_produk,
        harga: Number(dbProd.harga),
        qty: Number(item.qty)
      });
    }

    const isMemberValid = Boolean(id_member);
    const calc = kalkulasiTransaksi(validatedItems, isMemberValid);
    const nominalBayar = Number(bayar) || 0;
    if (nominalBayar < calc.grandTotal) {
      throw new Error(`Nominal uang diserahkan kurang dari total tagihan.`);
    }

    const kembalian = hitungKembalian(nominalBayar, calc.grandTotal);
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const [countRows] = await conn.query(`SELECT COUNT(*) AS totalHariIni FROM transaksi WHERE DATE(tgl_transaksi) = CURDATE()`);
    const nextSeq = String(countRows[0].totalHariIni + 1).padStart(4, '0');
    const nomorNota = `NOTA-${dateStr}-${nextSeq}`;

    const insertHeaderQuery = `
      INSERT INTO transaksi (
        nomor_nota, tgl_transaksi, id_petugas, id_member, tipe_pesanan,
        subtotal, diskon_tier_persen, diskon_member_persen, total_diskon_nominal,
        dpp, pajak_10_persen, grand_total, bayar, kembalian
      ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [headerResult] = await conn.query(insertHeaderQuery, [
      nomorNota,
      id_petugas || 2,
      id_member || null,
      tipe_pesanan || 'dine_in',
      calc.subtotal,
      calc.diskonTierPersen,
      calc.diskonMemberPersen,
      calc.totalDiskonNominal,
      calc.dpp,
      calc.pajak10,
      calc.grandTotal,
      nominalBayar,
      kembalian
    ]);

    const idTransaksi = headerResult.insertId;

    for (const item of validatedItems) {
      const subtotalItem = item.harga * item.qty;
      await conn.query(
        `INSERT INTO detail_transaksi (id_transaksi, id_produk, qty, harga_satuan, subtotal_item) VALUES (?, ?, ?, ?, ?)`,
        [idTransaksi, item.id_produk, item.qty, item.harga, subtotalItem]
      );
      await conn.query(`UPDATE produk SET stok = stok - ? WHERE id_produk = ?`, [item.qty, item.id_produk]);
    }

    if (id_member) {
      const poinDidapat = Math.floor(calc.subtotal / 10000);
      if (poinDidapat > 0) {
        await conn.query(`UPDATE members SET poin_loyalitas = poin_loyalitas + ? WHERE id_member = ?`, [poinDidapat, id_member]);
      }
    }

    await conn.commit();
    const [strukSetting] = await conn.query(`SELECT * FROM pengaturan_struk LIMIT 1`);

    res.json({
      success: true,
      message: 'Transaksi kasir berhasil disimpan ke database.',
      data: {
        id_transaksi: idTransaksi,
        nomor_nota: nomorNota,
        tipe_pesanan: tipe_pesanan || 'dine_in',
        calc,
        bayar: nominalBayar,
        kembalian,
        items: validatedItems,
        struk: strukSetting[0] || null
      }
    });
  } catch (error) {
    await conn.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.get('/transaksi', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id_transaksi,
        t.nomor_nota,
        DATE_FORMAT(t.tgl_transaksi, '%d-%m-%Y %H:%i') AS waktu,
        t.tipe_pesanan,
        CAST(t.grand_total AS FLOAT) AS grand_total,
        CAST(t.bayar AS FLOAT) AS bayar,
        CAST(t.kembalian AS FLOAT) AS kembalian,
        p.nama_petugas,
        m.nama_member,
        (SELECT COUNT(*) FROM detail_transaksi d WHERE d.id_transaksi = t.id_transaksi) AS total_item
      FROM transaksi t
      JOIN petugas p ON t.id_petugas = p.id_petugas
      LEFT JOIN members m ON t.id_member = m.id_member
      ORDER BY t.id_transaksi DESC
      LIMIT 50
    `;
    const [rows] = await pool.query(query);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/transaksi/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [headers] = await pool.query(
      `SELECT t.*, DATE_FORMAT(t.tgl_transaksi, '%d-%m-%Y %H:%i') AS waktu_str, p.nama_petugas, m.nama_member
       FROM transaksi t
       JOIN petugas p ON t.id_petugas = p.id_petugas
       LEFT JOIN members m ON t.id_member = m.id_member
       WHERE t.id_transaksi = ?`,
      [id]
    );

    if (headers.length === 0) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });

    const [items] = await pool.query(
      `SELECT d.*, p.nama_produk FROM detail_transaksi d JOIN produk p ON d.id_produk = p.id_produk WHERE d.id_transaksi = ?`,
      [id]
    );

    const [strukSetting] = await pool.query(`SELECT * FROM pengaturan_struk LIMIT 1`);
    res.json({ success: true, data: { header: headers[0], items: items, struk: strukSetting[0] || null } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/pengaturan-struk', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM pengaturan_struk LIMIT 1`);
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Pengaturan Struk & Toko
router.put('/pengaturan-struk', async (req, res) => {
  try {
    const { nama_resto, alamat, no_telepon, pesan_footer } = req.body;
    await pool.query(
      `UPDATE pengaturan_struk SET nama_resto = ?, alamat = ?, no_telepon = ?, pesan_footer = ? WHERE id = 1`,
      [nama_resto, alamat, no_telepon, pesan_footer]
    );
    res.json({ success: true, message: 'Pengaturan toko & struk berhasil disimpan ke MySQL!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================================
// 7. MANAJEMEN KARYAWAN (CRUD PETUGAS / PENGGUNA) - HAK AKSES ADMIN
// =====================================================================
/**
 * GET /api/petugas
 * Mengambil daftar seluruh karyawan/petugas (Admin & Kasir)
 */
router.get('/petugas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_petugas, 
        nama_petugas, 
        username, 
        role, 
        DATE_FORMAT(created_at, '%d-%m-%Y %H:%i') AS tgl_dibuat 
      FROM petugas 
      ORDER BY id_petugas ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/petugas
 * Menambah akun karyawan baru (Admin atau Kasir)
 */
router.post('/petugas', async (req, res) => {
  try {
    const { nama_petugas, username, password, role } = req.body;
    if (!nama_petugas || !username || !password) {
      return res.status(400).json({ success: false, message: 'Nama karyawan, username, dan password wajib diisi.' });
    }

    const cleanRole = (role === 'admin') ? 'admin' : 'kasir';

    const [existing] = await pool.query('SELECT id_petugas FROM petugas WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Username "${username.trim()}" sudah digunakan!` });
    }

    const [result] = await pool.query(
      'INSERT INTO petugas (nama_petugas, username, password, role) VALUES (?, ?, ?, ?)',
      [nama_petugas.trim(), username.trim(), password.trim(), cleanRole]
    );

    res.json({
      success: true,
      message: `Akun karyawan "${nama_petugas.trim()}" (${cleanRole.toUpperCase()}) berhasil dibuat!`,
      data: { id_petugas: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/petugas/:id
 * Memperbarui data akun karyawan (Nama, Username, Role, & opsional Password)
 */
router.put('/petugas/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { nama_petugas, username, password, role } = req.body;

    if (!nama_petugas || !username) {
      return res.status(400).json({ success: false, message: 'Nama karyawan dan username wajib diisi.' });
    }

    const cleanRole = (role === 'admin') ? 'admin' : 'kasir';

    const [dup] = await pool.query('SELECT id_petugas FROM petugas WHERE username = ? AND id_petugas != ?', [username.trim(), id]);
    if (dup.length > 0) {
      return res.status(400).json({ success: false, message: `Username "${username.trim()}" sudah digunakan akun lain!` });
    }

    if (password && password.trim()) {
      await pool.query(
        'UPDATE petugas SET nama_petugas = ?, username = ?, password = ?, role = ? WHERE id_petugas = ?',
        [nama_petugas.trim(), username.trim(), password.trim(), cleanRole, id]
      );
    } else {
      await pool.query(
        'UPDATE petugas SET nama_petugas = ?, username = ?, role = ? WHERE id_petugas = ?',
        [nama_petugas.trim(), username.trim(), cleanRole, id]
      );
    }

    res.json({ success: true, message: 'Data akun karyawan berhasil diperbarui!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/petugas/:id
 * Menghapus akun karyawan
 */
router.delete('/petugas/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (Number(id) === 1) {
      return res.status(400).json({ success: false, message: 'Akun Administrator Utama (#1) tidak boleh dihapus demi keamanan sistem.' });
    }

    await pool.query('DELETE FROM petugas WHERE id_petugas = ?', [id]);
    res.json({ success: true, message: 'Akun karyawan berhasil dihapus dari database.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
