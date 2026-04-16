const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();

const app = express();

// --- KONFIGURASI AWS S3 ---
// Catatan: sessionToken wajib ada jika menggunakan AWS Academy
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            cb(null, 'laporan/' + Date.now().toString() + '-' + file.originalname);
        }
    })
});

// --- KONFIGURASI DATABASE RDS ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('Gagal koneksi RDS: ' + err.stack);
        return;
    }
    console.log('Terhubung ke Database RDS MySQL.');
});

// Middleware & View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ROUTING USER ---

// 1. Landing Page
app.get('/', (req, res) => {
    res.render('user/index', { title: 'SehaTku - Beranda' });
});

// 2. Halaman Monitoring (Publik)
app.get('/monitoring', (req, res) => {
    const query = "SELECT * FROM penyakit ORDER BY tanggal DESC";
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('user/monitoring', { 
            title: 'Monitoring Kesehatan Masyarakat',
            dataPenyakit: results 
        });
    });
});

// 3. Form Lapor (GET)
app.get('/lapor', (req, res) => {
    res.render('user/lapor', { title: 'Lapor Kesehatan Lingkungan' });
});

// 4. Proses Simpan Laporan + Upload S3 (POST)
app.post('/lapor', upload.single('foto'), (req, res) => {
    const { nama, keluhan } = req.body;
    const fotoUrl = req.file ? req.file.location : null;

    const query = "INSERT INTO laporan (nama, keluhan, foto) VALUES (?, ?, ?)";
    db.query(query, [nama, keluhan, fotoUrl], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Gagal mengirim laporan.");
        }
        res.send("<script>alert('Laporan berhasil dikirim ke S3 dan Database!'); window.location='/';</script>");
    });
});

// --- ROUTING ADMIN (CRUD) ---

// 5. Dashboard Admin (READ)
app.get('/admin', (req, res) => {
    const query = "SELECT * FROM penyakit ORDER BY id DESC";
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('admin/dashboard', { 
            title: 'Admin - Panel Monitoring',
            dataPenyakit: results 
        });
    });
});

// 6. Tambah Data (CREATE)
app.post('/admin/tambah', (req, res) => {
    const { nama, wilayah, kasus, tanggal, info } = req.body;
    const query = "INSERT INTO penyakit (nama, wilayah, kasus, tanggal, info) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [nama, wilayah, kasus, tanggal, info], (err) => {
        if (err) throw err;
        res.redirect('/admin');
    });
});

// 7. Hapus Data (DELETE)
app.get('/admin/hapus/:id', (req, res) => {
    const query = "DELETE FROM penyakit WHERE id = ?";
    db.query(query, [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/admin');
    });
});

// --- JALANKAN SERVER ---
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Aplikasi SehaTku online di port ${PORT}`);
});