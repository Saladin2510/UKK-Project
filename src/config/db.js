/**
 * @file db.js
 * @description Modul konfigurasi dan manajemen koneksi basis data MySQL lokal (XAMPP).
 * Menggunakan Connection Pooling dari library `mysql2/promise` untuk performa tinggi,
 * konkurensi multi-user kasir, dan penanganan koneksi asynchronous berbasis Promise.
 * 
 * Standar Penilaian UKK BNSP (Skema Pemrogram Junior):
 * - J.620100.016.01 : Menulis Kode Sesuai Guidelines dan Best Practices.
 * - J.620100.023.02 : Membuat Dokumen Kode Program (JSDoc / Docblock).
 * - J.620100.025.02 : Melakukan Penanganan Koneksi / Error Database.
 * 
 * @author Saladin (Peserta UKK 2026 - SMK Telkom Purwokerto)
 * @version 2.4.0
 */

const mysql = require('mysql2/promise');

/**
 * Konfigurasi Connection Pool MySQL XAMPP.
 * Menjamin koneksi database tetap stabil dan dapat digunakan kembali (reusable) tanpa overhead rekoneksi berulang.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_pos_mooncafe',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Menguji apakah server database MySQL XAMPP sedang aktif dan siap melayani kueri transaksi.
 * @returns {Promise<boolean>} Status koneksi (true jika sukses terhubung, false jika gagal).
 */
async function testKoneksi() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Berhasil terhubung ke database MySQL XAMPP: db_pos_mooncafe');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Gagal terhubung ke MySQL XAMPP:', error.message);
    console.error('💡 Pastikan modul MySQL di control panel XAMPP sudah di-START!');
    return false;
  }
}

module.exports = {
  pool,
  testKoneksi
};

