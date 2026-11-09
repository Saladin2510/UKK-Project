# Entity Relationship Diagram (ERD) - PoS Kasir MoonCafe
**Proyek:** Bootcamp UKK 2026 - Pemrogram Junior (Junior Coder)  
**Sekolah:** SMK Telkom Purwokerto  
**Standar Kompetensi:** BNSP `J.620100.004.02` (Menggunakan struktur data)

---

## 📊 Diagram Relasi Database

```mermaid
erDiagram
    KATEGORI ||--o{ PRODUK : "1:M (Memiliki)"
    PETUGAS ||--o{ TRANSAKSI : "1:M (Melayani)"
    MEMBERS ||--o{ TRANSAKSI : "1:M (Melakukan - Opsional)"
    TRANSAKSI ||--|{ DETAIL_TRANSAKSI : "1:M (Memiliki)"
    PRODUK ||--o{ DETAIL_TRANSAKSI : "1:M (Dipesan dalam)"

    PETUGAS {
        int id_petugas PK
        varchar nama_petugas
        varchar username UK
        varchar password
        enum role "admin, kasir"
    }

    MEMBERS {
        int id_member PK
        varchar kode_member UK
        varchar nama_member
        varchar no_telp
        int poin_loyalitas
        date tgl_bergabung
    }

    KATEGORI {
        int id_kategori PK
        varchar nama_kategori
    }

    PRODUK {
        int id_produk PK
        int id_kategori FK
        varchar nama_produk
        text deskripsi "Komposisi dan alergen"
        decimal harga
        int stok
        varchar gambar
    }

    TRANSAKSI {
        int id_transaksi PK
        varchar nomor_nota UK
        datetime tgl_transaksi
        int id_petugas FK
        int id_member FK
        enum tipe_pesanan "dine_in, take_away"
        decimal subtotal
        decimal diskon_tier_persen
        decimal diskon_member_persen
        decimal total_diskon_nominal
        decimal dpp
        decimal pajak_10_persen
        decimal grand_total
        decimal bayar
        decimal kembalian
    }

    DETAIL_TRANSAKSI {
        int id_detail PK
        int id_transaksi FK
        int id_produk FK
        int qty
        decimal harga_satuan
        decimal subtotal_item
    }

    PENGATURAN_STRUK {
        int id PK
        varchar nama_resto
        varchar alamat
        varchar no_telepon
        text pesan_footer
    }
```

---

## 🔗 Detail Relasi & Kardinalitas

1. **`KATEGORI` → `PRODUK` (1 : M — One to Many)**
   - Setiap 1 kategori (misal: *Makanan*, *Minuman*, *Snack*) dapat memiliki banyak menu produk.
   - Setiap produk terikat pada tepat 1 kategori.

2. **`PETUGAS` → `TRANSAKSI` (1 : M — One to Many)**
   - Setiap 1 petugas kasir dapat melayani dan mencatat banyak transaksi penjualan.
   - Setiap struk transaksi mencatat ID kasir yang bertugas saat itu.

3. **`MEMBERS` → `TRANSAKSI` (1 : M — One to Many, Opsional)**
   - Pelanggan yang terdaftar sebagai Member dapat memiliki banyak riwayat transaksi.
   - Kolom `id_member` bersifat *nullable* (bernilai NULL jika pembeli adalah pelanggan umum).

4. **`TRANSAKSI` ↔ `PRODUK` (M : M — Many to Many melalui `DETAIL_TRANSAKSI`)**
   - Satu transaksi bisa membeli banyak menu makanan/minuman sekaligus.
   - Satu menu makanan/minuman bisa dipesan di banyak transaksi berbeda.
   - Tabel `DETAIL_TRANSAKSI` berfungsi sebagai *associative table* yang menyimpan `qty`, `harga_satuan`, dan `subtotal_item` secara permanen untuk integritas audit transaksi.

