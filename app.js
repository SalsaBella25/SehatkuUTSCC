const express = require('express');
const path = require('path');
const mysql = require('mysql2'); // Untuk koneksi RDS
require('dotenv').config();

const app = express();

// Konfigurasi View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- KONFIGURASI DATABASE RDS ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Koneksi RDS Gagal: ' + err.stack);
        return;
    }
    console.log('Terhubung ke Database RDS MySQL.');
});

// --- ROUTING USER ---

// 1. Landing Page
app.get('/', (req, res) => {
    res.render('user/index', { title: 'SehaTku - Beranda' });
});

// 2. Form Lapor (Upload ke S3)
app.get('/lapor', (req, res) => {
    res.render('user/lapor', { title: 'Lapor Kesehatan Lingkungan' });
});

// 3. Form Booking Puskesmas
app.get('/booking', (req, res) => {
    res.render('user/booking', { title: 'Booking Layanan Puskesmas' });
});

// --- ROUTING ADMIN (CRUD) ---

// 4. Dashboard Admin & Monitoring Penyakit (READ)
app.get('/admin', (req, res) => {
    const query = "SELECT * FROM penyakit ORDER BY id DESC";
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('admin/dashboard', { 
            title: 'Admin - Monitoring Kesehatan',
            dataPenyakit: results 
        });
    });
});

// 5. Tambah Data Penyakit (CREATE)
app.post('/admin/tambah-penyakit', (req, res) => {
    const { nama_penyakit, wilayah, jumlah_kasus, tanggal, keterangan } = req.body;
    const query = "INSERT INTO penyakit (nama, wilayah, kasus, tanggal, info) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [nama_penyakit, wilayah, jumlah_kasus, tanggal, keterangan], (err) => {
        if (err) throw err;
        res.redirect('/admin');
    });
});

// 6. Hapus Data Penyakit (DELETE)
app.get('/admin/hapus/:id', (req, res) => {
    const query = "DELETE FROM penyakit WHERE id = ?";
    db.query(query, [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/admin');
    });
});

// JALANKAN SERVER (Hanya satu kali di paling bawah)
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Aplikasi SehaTku berjalan di http://localhost:${PORT}`);
});