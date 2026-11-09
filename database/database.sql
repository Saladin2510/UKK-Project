-- =====================================================================
-- DATABASE: db_pos_mooncafe
-- PROYEK  : PoS Kasir MoonCafe (Bootcamp UKK 2026 - Pemrogram Junior)
-- SEKOLAH : SMK Telkom Purwokerto
-- STANDAR : 8 Unit Kompetensi BNSP
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `db_pos_mooncafe` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `db_pos_mooncafe`;

-- ---------------------------------------------------------------------
-- 1. TABEL: petugas (Akun Login Admin & Kasir)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `detail_transaksi`;
DROP TABLE IF EXISTS `transaksi`;
DROP TABLE IF EXISTS `produk`;
DROP TABLE IF EXISTS `kategori`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `petugas`;
DROP TABLE IF EXISTS `pengaturan_struk`;

CREATE TABLE `petugas` (
  `id_petugas` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_petugas` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'kasir') NOT NULL DEFAULT 'kasir',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. TABEL: members (Pelanggan Terdaftar untuk Ekstra Diskon +5% & Poin)
-- ---------------------------------------------------------------------
CREATE TABLE `members` (
  `id_member` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_member` VARCHAR(20) NOT NULL UNIQUE,
  `nama_member` VARCHAR(100) NOT NULL,
  `no_telp` VARCHAR(20) NOT NULL,
  `poin_loyalitas` INT DEFAULT 0,
  `tgl_bergabung` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. TABEL: kategori (Makanan, Minuman, Snack)
-- ---------------------------------------------------------------------
CREATE TABLE `kategori` (
  `id_kategori` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_kategori` VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. TABEL: produk (Menu, Stok, Harga, dan Deskripsi Komposisi)
-- Relasi: 1 Kategori memiliki banyak Produk (1 : M)
-- ---------------------------------------------------------------------
CREATE TABLE `produk` (
  `id_produk` INT AUTO_INCREMENT PRIMARY KEY,
  `id_kategori` INT NOT NULL,
  `nama_produk` VARCHAR(100) NOT NULL,
  `deskripsi` TEXT NULL COMMENT 'Komposisi, resep bumbu, dan info alergen',
  `harga` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stok` INT NOT NULL DEFAULT 0,
  `gambar` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_produk_kategori` FOREIGN KEY (`id_kategori`) 
    REFERENCES `kategori` (`id_kategori`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. TABEL: transaksi (Header Penjualan Kasir)
-- Relasi: 
--   - 1 Petugas melayani banyak Transaksi (1 : M)
--   - 1 Member memiliki banyak Transaksi (1 : M, Opsional/Nullable)
-- ---------------------------------------------------------------------
CREATE TABLE `transaksi` (
  `id_transaksi` INT AUTO_INCREMENT PRIMARY KEY,
  `nomor_nota` VARCHAR(30) NOT NULL UNIQUE,
  `tgl_transaksi` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_petugas` INT NOT NULL,
  `id_member` INT NULL,
  `tipe_pesanan` ENUM('dine_in', 'take_away') NOT NULL DEFAULT 'dine_in',
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `diskon_tier_persen` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `diskon_member_persen` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `total_diskon_nominal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `dpp` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `pajak_10_persen` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `bayar` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `kembalian` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT `fk_transaksi_petugas` FOREIGN KEY (`id_petugas`) 
    REFERENCES `petugas` (`id_petugas`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transaksi_member` FOREIGN KEY (`id_member`) 
    REFERENCES `members` (`id_member`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. TABEL: detail_transaksi (Item Pembelian - Perantara Many-to-Many)
-- Relasi:
--   - 1 Transaksi memiliki banyak Detail (1 : M)
--   - 1 Produk dapat dipesan di banyak Transaksi (1 : M)
-- ---------------------------------------------------------------------
CREATE TABLE `detail_transaksi` (
  `id_detail` INT AUTO_INCREMENT PRIMARY KEY,
  `id_transaksi` INT NOT NULL,
  `id_produk` INT NOT NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `harga_satuan` DECIMAL(12,2) NOT NULL,
  `subtotal_item` DECIMAL(12,2) NOT NULL,
  CONSTRAINT `fk_detail_transaksi` FOREIGN KEY (`id_transaksi`) 
    REFERENCES `transaksi` (`id_transaksi`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detail_produk` FOREIGN KEY (`id_produk`) 
    REFERENCES `produk` (`id_produk`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. TABEL: pengaturan_struk (Profil Header & Footer Kertas Struk)
-- ---------------------------------------------------------------------
CREATE TABLE `pengaturan_struk` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_resto` VARCHAR(100) NOT NULL,
  `alamat` VARCHAR(255) NOT NULL,
  `no_telepon` VARCHAR(30) NOT NULL,
  `pesan_footer` TEXT NOT NULL
) ENGINE=InnoDB;


-- =====================================================================
-- SEED DATA AWAL (DUMMY DATA UNTUK PENGUJIAN & ASESMEN UKK)
-- =====================================================================

-- Petugas Default (Password plaintext '123456' untuk kemudahan pengujian asesmen)
INSERT INTO `petugas` (`id_petugas`, `nama_petugas`, `username`, `password`, `role`) VALUES
(1, 'Administrator Resto', 'admin', 'admin123', 'admin'),
(2, 'Kasir Saladin', 'kasir', 'kasir123', 'kasir');

-- Data Member Awal
INSERT INTO `members` (`id_member`, `kode_member`, `nama_member`, `no_telp`, `poin_loyalitas`, `tgl_bergabung`) VALUES
(1, 'MBR-001', 'Budi Santoso', '081234567890', 120, '2026-01-15'),
(2, 'MBR-002', 'Siti Aisyah', '085712345678', 85, '2026-02-20');

-- Kategori Menu
INSERT INTO `kategori` (`id_kategori`, `nama_kategori`) VALUES
(1, 'Makanan'),
(2, 'Minuman'),
(3, 'Snack');

-- 6 Menu Produk Persis Slide MUK + Deskripsi Komposisi Bahan
INSERT INTO `produk` (`id_produk`, `id_kategori`, `nama_produk`, `deskripsi`, `harga`, `stok`, `gambar`) VALUES
(1, 1, 'Nasi Goreng', 'Nasi basmati aromatik, bumbu racikan khas MoonCafe, suwiran daging ayam empuk, telur mata sapi, acar segar dan kerupuk renyah.', 25000.00, 45, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(2, 1, 'Ayam Bakar', 'Paha ayam kampung dibalut marinasi madu ketumbar, dibakar hingga karamelisasi sempurna, disajikan dengan sambal terasi khas.', 28000.00, 30, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&q=80'),
(3, 1, 'Mie Goreng', 'Mie telur kenyal dimasak oseng wok-hei dengan sayur sawi, kol segar, irisan bakso sapi, dan taburan bawang merah goreng gurih.', 22000.00, 25, 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80'),
(4, 2, 'Es Teh', 'Racikan daun teh melati pilihan, diseduh segar dengan sirup gula tebu murni dan es kristal dingin menyegarkan.', 5000.00, 100, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(5, 2, 'Es Kopi Susu', 'Espresso double shot dari biji kopi Arabika lokal, dipadukan susu evaporasi lembut dan sirup gula aren organik premium.', 18000.00, 60, 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&q=80'),
(6, 2, 'Matcha Latte', 'Serbuk matcha Uji Kyoto asli Jepang, di-whisk creamy bersama susu oat murni hangat atau dingin menyegarkan.', 20000.00, 40, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&q=80');

-- Pengaturan Struk
INSERT INTO `pengaturan_struk` (`id`, `nama_resto`, `alamat`, `no_telepon`, `pesan_footer`) VALUES
(1, 'MoonCafe - Cafe & Resto', 'Jl. D.I. Panjaitan No. 128, Purwokerto', '(0281) 635888', 'Terima kasih atas kunjungan Anda di MoonCafe! Nikmati harimu dengan secangkir kehangatan.');

