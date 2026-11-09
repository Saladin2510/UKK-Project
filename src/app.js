/**
 * @file app.js
 * @description Entry point server Express.js untuk PoS Kasir MoonCafe terintegrasi REST API & MySQL.
 * @author Saladin (Peserta UKK 2026)
 */

const express = require('express');
const path = require('path');
const { testKoneksi } = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware parsing JSON dan form URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan file statis antarmuka POS kasir (HTML, CSS, JS, Gambar)
app.use(express.static(path.join(__dirname, '../public')));

// Integrasi Rute REST API Terpusat
app.use('/api', apiRoutes);

// Route utama: Mengarahkan langsung ke antarmuka Kasir MoonCafe
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Endpoint status kesehatan server
app.get('/api/status', async (req, res) => {
  const dbConnected = await testKoneksi();
  res.json({
    status: 'online',
    app: 'PoS Kasir MoonCafe',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Jalankan server
app.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`🚀 Server PoS Kasir MoonCafe Aktif!`);
  console.log(`🌐 Buka di browser: http://localhost:${PORT}`);
  console.log(`=================================================`);
  await testKoneksi();
});

module.exports = app;
