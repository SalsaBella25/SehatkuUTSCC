const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();

const app = express();

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

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
    port: 3306
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.render('user/index', { title: 'SehaTku' }));
app.get('/lapor', (req, res) => res.render('user/lapor', { title: 'Lapor' }));

app.post('/lapor', upload.single('foto'), (req, res) => {
    const { nama, keluhan } = req.body; // Namanya sudah 'keluhan'
    const fotoUrl = req.file ? req.file.location : null;

    const query = "INSERT INTO laporan (nama, keluhan, foto) VALUES (?, ?, ?)";
    db.query(query, [nama, keluhan, fotoUrl], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Gagal mengirim laporan.");
        }
        res.send("<script>alert('Laporan Berhasil!'); window.location='/';</script>");
    });
});

app.get('/admin', (req, res) => {
    db.query("SELECT * FROM penyakit ORDER BY id DESC", (err, results) => {
        if (err) throw err;
        res.render('admin/dashboard', { title: 'Admin', dataPenyakit: results });
    });
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));