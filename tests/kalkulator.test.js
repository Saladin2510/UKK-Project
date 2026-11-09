/**
 * @file kalkulator.test.js
 * @description Unit Testing Otomatis menggunakan Jest untuk modul kalkulator MoonCafe.
 * Target Capaian MUK: 100% PASSED (Unit Kompetensi BNSP J.620100.033.02).
 */

const {
  hitungSubtotal,
  hitungDiskonBertingkatPersen,
  hitungDiskonMemberPersen,
  hitungDPP,
  hitungPajak10,
  kalkulasiTransaksi,
  hitungKembalian
} = require('../src/helpers/kalkulator');

describe('Pengujian Unit Modul Kalkulator Kasir MoonCafe', () => {

  // -------------------------------------------------------------------
  // 1. Pengujian Hitung Subtotal
  // -------------------------------------------------------------------
  describe('hitungSubtotal()', () => {
    test('Mengembalikan 0 jika daftar item kosong atau bukan array', () => {
      expect(hitungSubtotal([])).toBe(0);
      expect(hitungSubtotal(null)).toBe(0);
    });

    test('Menghitung subtotal pesanan dengan benar (Skenario Slide MUK: Rp58.000)', () => {
      const items = [
        { nama: 'Nasi Goreng', harga: 25000, qty: 1 },
        { nama: 'Ayam Bakar', harga: 28000, qty: 1 },
        { nama: 'Es Teh', harga: 5000, qty: 1 }
      ];
      expect(hitungSubtotal(items)).toBe(58000);
    });

    test('Menghitung subtotal dengan kuantitas lebih dari 1 porsi', () => {
      const items = [
        { nama: 'Es Kopi Susu', harga: 18000, qty: 2 }, // 36.000
        { nama: 'Matcha Latte', harga: 20000, qty: 3 }  // 60.000
      ];
      expect(hitungSubtotal(items)).toBe(96000);
    });
  });

  // -------------------------------------------------------------------
  // 2. Pengujian Diskon Bertingkat (Tiered Discount)
  // -------------------------------------------------------------------
  describe('hitungDiskonBertingkatPersen()', () => {
    test('Tier 0: Subtotal di bawah Rp50.000 mendapatkan diskon 0%', () => {
      expect(hitungDiskonBertingkatPersen(35000)).toBe(0);
    });

    test('Tier 1: Subtotal antara Rp50.000 s.d. Rp199.999 mendapatkan diskon 10% (Sesuai Slide MUK)', () => {
      expect(hitungDiskonBertingkatPersen(58000)).toBe(10);
      expect(hitungDiskonBertingkatPersen(120000)).toBe(10);
    });

    test('Tier 2: Subtotal >= Rp200.000 mendapatkan diskon tertinggi 15%', () => {
      expect(hitungDiskonBertingkatPersen(250000)).toBe(15);
    });
  });

  // -------------------------------------------------------------------
  // 3. Pengujian Diskon Khusus Member Resto
  // -------------------------------------------------------------------
  describe('hitungDiskonMemberPersen()', () => {
    test('Pelanggan non-member mendapatkan tambahan diskon 0%', () => {
      expect(hitungDiskonMemberPersen(false)).toBe(0);
    });

    test('Pelanggan member terdaftar mendapatkan tambahan diskon 5%', () => {
      expect(hitungDiskonMemberPersen(true)).toBe(5);
    });
  });

  // -------------------------------------------------------------------
  // 4. Pengujian Pajak Restoran PB1 (10%)
  // -------------------------------------------------------------------
  describe('hitungPajak10()', () => {
    test('Menghitung 10% dari nilai DPP dengan presisi', () => {
      expect(hitungPajak10(50000)).toBe(5000);
      expect(hitungPajak10(52200)).toBe(5220); // Skenario Slide MUK: 10% dari 52.200 = 5.220
    });
  });

  // -------------------------------------------------------------------
  // 5. Pengujian Skenario Transaksi Nyata (VALIDASI 100% PERSIS MUK SLIDE)
  // -------------------------------------------------------------------
  describe('kalkulasiTransaksi() - Skenario Utama MUK', () => {
    test('Validasi penuh: Nasi Goreng + Ayam Bakar + Es Teh (Non-Member) HARUS bernilai Rp57.420', () => {
      const pesanan = [
        { nama: 'Nasi Goreng', harga: 25000, qty: 1 },
        { nama: 'Ayam Bakar', harga: 28000, qty: 1 },
        { nama: 'Es Teh', harga: 5000, qty: 1 }
      ];

      const hasil = kalkulasiTransaksi(pesanan, false);

      expect(hasil.subtotal).toBe(58000);
      expect(hasil.diskonTierPersen).toBe(10);
      expect(hasil.totalDiskonNominal).toBe(5800);
      expect(hasil.dpp).toBe(52200);
      expect(hasil.pajak10).toBe(5220);
      expect(hasil.grandTotal).toBe(57420); // Nilai yang wajib sama persis dengan slide mockup!
    });

    test('Validasi skenario transaksi dengan Member Resto (+5% Diskon Tambahan)', () => {
      const pesanan = [
        { nama: 'Nasi Goreng', harga: 25000, qty: 1 },
        { nama: 'Ayam Bakar', harga: 28000, qty: 1 },
        { nama: 'Es Teh', harga: 5000, qty: 1 }
      ];

      const hasil = kalkulasiTransaksi(pesanan, true); // isMember = true

      expect(hasil.subtotal).toBe(58000);
      expect(hasil.totalDiskonPersen).toBe(15); // 10% tier + 5% member = 15%
      expect(hasil.totalDiskonNominal).toBe(8700);
      expect(hasil.dpp).toBe(49300);
      expect(hasil.pajak10).toBe(4930);
      expect(hasil.grandTotal).toBe(54230);
    });
  });

  // -------------------------------------------------------------------
  // 6. Pengujian Perhitungan Uang Kembalian
  // -------------------------------------------------------------------
  describe('hitungKembalian()', () => {
    test('Menghitung kembalian uang pecahan dengan benar', () => {
      const kembalian = hitungKembalian(100000, 57420);
      expect(kembalian).toBe(42580);
    });

    test('Menghasilkan nilai negatif jika uang yang diserahkan kurang', () => {
      const kembalian = hitungKembalian(50000, 57420);
      expect(kembalian).toBe(-7420);
    });
  });

});

