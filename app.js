const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();

const app = express();

// --- 1. KONFIGURASI AWS S3 ---
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

// --- 2. KONFIGURASI DATABASE RDS ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
    port: 3306,
    multipleStatements: true // Penting untuk dashboard statistik
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 3. ROUTING USER ---

// Beranda
app.get('/', (req, res) => res.render('user/index', { title: 'HealthBridge' }));

// Monitoring (Tampilan Grafik & Tabel)
app.get('/monitoring', (req, res) => {
    db.query("SELECT * FROM penyakit ORDER BY tanggal DESC", (err, results) => {
        if (err) throw err;
        res.render('user/monitoring', { title: 'Monitoring Penyakit', penyakit: results });
    });
});

// Lapor Lingkungan (S3 Upload)
app.get('/lapor', (req, res) => res.render('user/lapor', { title: 'Lapor Kondisi' }));

app.post('/lapor', upload.single('foto'), (req, res) => {
    const { nama, keluhan } = req.body;
    const fotoUrl = req.file ? req.file.location : null;

    const query = "INSERT INTO laporan (nama, keluhan, foto) VALUES (?, ?, ?)";
    db.query(query, [nama, keluhan, fotoUrl], (err) => {
        if (err) throw err;
        res.send("<script>alert('Laporan Berhasil Terkirim ke Cloud!'); window.location='/';</script>");
    });
});

// Booking Puskesmas
app.get('/booking', (req, res) => res.render('user/booking', { title: 'Booking Puskesmas' }));

app.post('/booking', (req, res) => {
    const { nama, puskesmas, tanggal, jam, keluhan } = req.body;
    const query = "INSERT INTO booking (nama_user, puskesmas, tanggal, jam, keluhan) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [nama, puskesmas, tanggal, jam, keluhan], (err) => {
        if (err) throw err;
        res.send("<script>alert('Booking Berhasil!'); window.location='/';</script>");
    });
});

// --- 4. ROUTING ADMIN ---

// Dashboard (Statistik Ringkas)
app.get('/admin', (req, res) => {
    const qStats = "SELECT COUNT(*) as total FROM penyakit; SELECT COUNT(*) as total FROM booking; SELECT COUNT(*) as total FROM laporan";
    db.query(qStats, (err, results) => {
        if (err) throw err;
        res.render('admin/dashboard', { 
            title: 'Admin Dashboard', 
            stats: results // Mengirim hasil dari 3 query sekaligus
        });
    });
});

// Manage Penyakit (CRUD)
app.get('/admin/monitoring', (req, res) => {
    db.query("SELECT * FROM penyakit ORDER BY id DESC", (err, results) => {
        if (err) throw err;
        res.render('admin/monitoring', { title: 'Manage Penyakit', dataPenyakit: results });
    });
});

app.post('/admin/tambah', (req, res) => {
    const { nama, wilayah, kasus, tanggal } = req.body;
    db.query("INSERT INTO penyakit (nama, wilayah, kasus, tanggal) VALUES (?, ?, ?, ?)", 
    [nama, wilayah, kasus, tanggal], (err) => {
        if (err) throw err;
        res.redirect('/admin/monitoring');
    });
});

app.get('/admin/monitoring/hapus/:id', (req, res) => {
    db.query("DELETE FROM penyakit WHERE id = ?", [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/admin/monitoring');
    });
});

// Manage Booking
app.get('/admin/booking', (req, res) => {
    db.query("SELECT * FROM booking ORDER BY id DESC", (err, results) => {
        if (err) throw err;
        res.render('admin/booking', { title: 'Manage Booking', dataBooking: results });
    });
});

// Manage Laporan
app.get('/admin/laporan', (req, res) => {
    db.query("SELECT * FROM laporan ORDER BY id DESC", (err, results) => {
        if (err) throw err;
        res.render('admin/laporan', { title: 'Manage Laporan', dataLaporan: results });
    });
});

// --- 5. START SERVER ---
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`HealthBridge Online di port ${PORT}`));