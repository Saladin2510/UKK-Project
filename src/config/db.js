/**
 * @file db.js
 * @description Modul koneksi basis data MySQL lokal (XAMPP) menggunakan Connection Pool.
 * 
 * Standar Penilaian BNSP:
 * - J.620100.016.01 : Menulis kode sesuai guidelines dan best practices.
 * - J.620100.025.02 : Melakukan penanganan koneksi / error database.
 * 
 * @author Saladin (Peserta UKK 2026)
 */

const mysql = require('mysql2/promise');

// Konfigurasi koneksi standar MySQL XAMPP
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
 * Menguji apakah server database MySQL XAMPP sedang aktif dan terhubung.
 * @returns {Promise<boolean>} Status koneksi (true jika sukses).
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

