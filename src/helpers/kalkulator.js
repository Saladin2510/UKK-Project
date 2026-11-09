/**
 * @file kalkulator.js
 * @description Modul logika perhitungan finansial transaksi kasir MoonCafe.
 * Mencakup kalkulasi subtotal, diskon bertingkat (tiered discount),
 * diskon tambahan member loyalty (+5%), pajak restoran PB1 (10%),
 * grand total, dan uang kembalian.
 * 
 * Standar Penilaian BNSP:
 * - J.620100.017.02 : Mengimplementasikan pemrograman terstruktur.
 * - J.620100.023.02 : Membuat dokumen kode program (JSDoc / Docblock).
 * - J.620100.033.02 : Melaksanakan pengujian unit program (Jest).
 * 
 * @author Saladin (Peserta UKK 2026)
 */

/**
 * Menghitung subtotal kotor dari kumpulan item belanja.
 * 
 * @param {Array<{harga: number, qty: number}>} items - Daftar item pesanan dengan properti harga dan qty.
 * @returns {number} Nominal total kotor belanja (Rp).
 */
function hitungSubtotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }
  return items.reduce((total, item) => {
    const harga = Number(item.harga) || 0;
    const qty = Number(item.qty) || 0;
    return total + (harga * qty);
  }, 0);
}

/**
 * Menghitung persentase diskon bertingkat (tiered discount) berdasarkan nominal subtotal belanja.
 * 
 * Aturan Bisnis MoonCafe:
 * - Subtotal >= Rp200.000 : Diskon 15% (Tier 3)
 * - Subtotal >= Rp100.000 : Diskon 10% (Tier 2)
 * - Subtotal >= Rp50.000  : Diskon 10% (Tier 1 - Sesuai Mockup MUK Kasir)
 * - Subtotal < Rp50.000   : Diskon 0%  (Tier 0)
 * 
 * @param {number} subtotal - Nilai belanja kotor sebelum diskon dan pajak.
 * @returns {number} Persentase diskon bertingkat (misal: 0, 10, atau 15).
 */
function hitungDiskonBertingkatPersen(subtotal) {
  const nominal = Number(subtotal) || 0;
  if (nominal >= 200000) {
    return 15;
  }
  if (nominal >= 50000) {
    return 10;
  }
  return 0;
}

/**
 * Menghitung persentase diskon tambahan untuk pelanggan terdaftar sebagai Member.
 * Member aktif mendapatkan ekstra potongan 5%.
 * 
 * @param {boolean} isMember - Status apakah pelanggan merupakan member terdaftar.
 * @returns {number} Persentase ekstra diskon (5 jika member, 0 jika non-member).
 */
function hitungDiskonMemberPersen(isMember) {
  return isMember === true ? 5 : 0;
}

/**
 * Menghitung dasar pengenaan pajak (DPP) setelah dikurangi total potongan diskon.
 * 
 * @param {number} subtotal - Total kotor pesanan.
 * @param {number} totalDiskonNominal - Nominal potongan diskon dalam Rupiah.
 * @returns {number} Nilai DPP (tidak boleh bernilai negatif).
 */
function hitungDPP(subtotal, totalDiskonNominal) {
  const bersih = (Number(subtotal) || 0) - (Number(totalDiskonNominal) || 0);
  return Math.max(0, bersih);
}

/**
 * Menghitung besaran Pajak Restoran (PB1) sebesar 10% dari nilai DPP.
 * 
 * @param {number} dpp - Dasar pengenaan pajak setelah diskon.
 * @returns {number} Besaran nominal pajak 10% (Rp).
 */
function hitungPajak10(dpp) {
  const dasar = Number(dpp) || 0;
  return dasar * 0.10;
}

/**
 * Fungsi komprehensif untuk memproses kalkulasi transaksi kasir secara utuh.
 * Menghasilkan objek rincian finansial lengkap untuk disimpan ke database dan dicetak di struk.
 * 
 * @param {Array<{harga: number, qty: number}>} items - Rincian item yang dibeli.
 * @param {boolean} [isMember=false] - Apakah pembeli memiliki kartu member.
 * @returns {{
 *   subtotal: number,
 *   diskonTierPersen: number,
 *   diskonMemberPersen: number,
 *   totalDiskonPersen: number,
 *   totalDiskonNominal: number,
 *   dpp: number,
 *   pajak10: number,
 *   grandTotal: number
 * }} Rincian lengkap kalkulasi tagihan transaksi.
 */
function kalkulasiTransaksi(items, isMember = false) {
  const subtotal = hitungSubtotal(items);
  const diskonTierPersen = hitungDiskonBertingkatPersen(subtotal);
  const diskonMemberPersen = hitungDiskonMemberPersen(isMember);
  const totalDiskonPersen = diskonTierPersen + diskonMemberPersen;

  const totalDiskonNominal = subtotal * (totalDiskonPersen / 100);
  const dpp = hitungDPP(subtotal, totalDiskonNominal);
  const pajak10 = hitungPajak10(dpp);
  const grandTotal = dpp + pajak10;

  return {
    subtotal,
    diskonTierPersen,
    diskonMemberPersen,
    totalDiskonPersen,
    totalDiskonNominal,
    dpp,
    pajak10,
    grandTotal
  };
}

/**
 * Menghitung uang kembalian pelanggan.
 * 
 * @param {number} uangBayar - Nominal uang tunai yang diserahkan pelanggan ke kasir.
 * @param {number} grandTotal - Total akhir tagihan yang wajib dibayar.
 * @returns {number} Nilai uang kembalian (positif jika ada kembalian, negatif jika kurang).
 */
function hitungKembalian(uangBayar, grandTotal) {
  return (Number(uangBayar) || 0) - (Number(grandTotal) || 0);
}

module.exports = {
  hitungSubtotal,
  hitungDiskonBertingkatPersen,
  hitungDiskonMemberPersen,
  hitungDPP,
  hitungPajak10,
  kalkulasiTransaksi,
  hitungKembalian
};

