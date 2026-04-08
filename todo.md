# Project TODO - Sistem Kasir & Manajemen Toko

## Database & Backend
- [x] Desain schema: products, units, orders, order_items, discounts, invoices, payment_methods
- [x] Migrasi database dan validasi schema
- [x] API produk: CRUD, filter, pencarian
- [x] API pesanan: create, update status, list
- [x] API diskon: aplikasi otomatis pada tagihan
- [x] API invoice: generate, detail, status pembayaran
- [x] API pembayaran: COD, Transfer Bank

## Frontend - Katalog & Pelanggan
- [x] Halaman katalog produk dengan grid layout
- [ ] Filter produk berdasarkan kategori/satuan
- [x] Pencarian produk real-time
- [x] Detail produk dengan gambar, harga, stok
- [x] Keranjang belanja (add/remove/update quantity)
- [x] Halaman checkout dengan review pesanan
- [x] Pilihan metode pembayaran (COD/Transfer)
- [x] Konfirmasi pesanan dan nomor invoice
- [ ] Halaman riwayat pesanan pelanggan

## Frontend - Admin Dashboard
- [x] Dashboard overview dengan statistik penjualan
- [x] Halaman manajemen produk (CRUD)
- [ ] Upload/edit gambar produk
- [ ] Manajemen satuan produk
- [x] List pesanan masuk dengan status
- [x] Detail pesanan dan invoice
- [ ] Manajemen diskon produk
- [ ] Laporan penjualan dan analytics

## UI/UX & Styling
- [x] Desain sistem warna elegan (color palette)
- [x] Typography dan spacing system
- [x] Responsive design untuk mobile/tablet/desktop
- [x] Loading states dan empty states
- [x] Error handling dan validasi form
- [x] Toast notifications untuk feedback user

## Testing & Deployment
- [x] Unit tests untuk API endpoints
- [ ] Integration tests untuk checkout flow
- [ ] Manual testing katalog dan admin
- [ ] Optimasi performa dan SEO
- [ ] Final checkpoint sebelum delivery
