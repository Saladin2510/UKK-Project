/**
 * @file app.js
 * @description Entry point dan konfigurasi server backend Express.js untuk PoS Kasir MoonCafe.
 * Terintegrasi dengan koneksi basis data MySQL lokal (XAMPP), router REST API terpadu,
 * dan penyedia aset statis antarmuka Single Page Application (SPA).
 * 
 * Standar Penilaian UKK BNSP (Skema Pemrogram Junior):
 * - J.620100.009.01 : Menggunakan Spesifikasi Program.
 * - J.620100.016.01 : Menulis Kode Sesuai Guidelines dan Best Practice.
 * - J.620100.017.02 : Mengimplementasikan Pemrograman Terstruktur.
 * - J.620100.023.02 : Membuat Dokumen Kode Program (JSDoc / Docblock).
 * - J.620100.025.02 : Melakukan Penanganan Error (Error Handling & Debugging).
 * 
 * @author Saladin (Peserta UKK 2026 - SMK Telkom Purwokerto)
 * @version 2.4.0
 */

const express = require('express');
const path = require('path');
const { testKoneksi } = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware parsing payload JSON dan URL-encoded request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan file statis antarmuka POS kasir (HTML, Tailwind CSS, Lucide Icons, Chart.js, Gambar)
app.use(express.static(path.join(__dirname, '../public')));

// Integrasi modul rute REST API terpusat (/api)
app.use('/api', apiRoutes);

/**
 * Route Root: Menyajikan file antarmuka utama Single Page Application (SPA) MoonCafe POS.
 * @route GET /
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * Route Health Check: Memantau status operasional server dan kesehatan koneksi MySQL.
 * @route GET /api/status
 * @returns {Object} JSON status ketersediaan server dan database.
 */
app.get('/api/status', async (req, res) => {
  const dbConnected = await testKoneksi();
  res.json({
    status: 'online',
    app: 'PoS Kasir MoonCafe',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Jalankan listener server pada port yang dikonfigurasikan
app.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`🚀 Server PoS Kasir MoonCafe Aktif!`);
  console.log(`🌐 Buka di browser: http://localhost:${PORT}`);
  console.log(`=================================================`);
  await testKoneksi();
});

module.exports = app;
