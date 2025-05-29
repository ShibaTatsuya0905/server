require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.SERVER_PORT || 5001;

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
};

const pool = mysql.createPool(dbConfig);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/patients', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM patients ORDER BY createdAt DESC');
        res.json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bệnh nhân:", error);
        res.status(500).json({ message: "Lỗi server khi lấy dữ liệu." });
    }
});

app.post('/api/patients', async (req, res) => {
    const {
        hoTen, ngaySinh, gioiTinh, diaChi, soDienThoai,
        ngheNghiep, benhNen, lyDoKham, tienSuNhaKhoa, chiTiet
    } = req.body;

    if (!hoTen || !ngaySinh) {
        return res.status(400).json({ message: "Họ tên và Ngày sinh là bắt buộc." });
    }
    const newPatientId = uuidv4();
    try {
        const sql = `INSERT INTO patients (id, hoTen, ngaySinh, gioiTinh, diaChi, soDienThoai, ngheNghiep, benhNen, lyDoKham, tienSuNhaKhoa, chiTiet)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [
            newPatientId, hoTen, ngaySinh, gioiTinh, diaChi, soDienThoai,
            ngheNghiep, benhNen, lyDoKham, tienSuNhaKhoa, chiTiet
        ];
        await pool.query(sql, values);
        const [insertedRows] = await pool.query('SELECT * FROM patients WHERE id = ?', [newPatientId]);
        res.status(201).json(insertedRows[0]);
    } catch (error) {
        console.error("Lỗi khi tạo hồ sơ bệnh nhân:", error);
        res.status(500).json({ message: "Lỗi server khi tạo hồ sơ." });
    }
});

app.put('/api/patients/:id', async (req, res) => {
    const patientId = req.params.id;
    const {
        hoTen, ngaySinh, gioiTinh, diaChi, soDienThoai,
        ngheNghiep, benhNen, lyDoKham, tienSuNhaKhoa, chiTiet
    } = req.body;

    if (!hoTen || !ngaySinh) {
        return res.status(400).json({ message: "Họ tên và Ngày sinh là bắt buộc." });
    }

    try {
        const sql = `
            UPDATE patients SET
            hoTen = ?, ngaySinh = ?, gioiTinh = ?, diaChi = ?, soDienThoai = ?,
            ngheNghiep = ?, benhNen = ?, lyDoKham = ?, tienSuNhaKhoa = ?, chiTiet = ?
            WHERE id = ?`;
        const values = [
            hoTen, ngaySinh, gioiTinh, diaChi, soDienThoai,
            ngheNghiep, benhNen, lyDoKham, tienSuNhaKhoa, chiTiet,
            patientId
        ];

        const [result] = await pool.query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bệnh nhân để cập nhật." });
        }

        const [updatedRows] = await pool.query('SELECT * FROM patients WHERE id = ?', [patientId]);
        res.status(200).json(updatedRows[0]);
    } catch (error) {
        console.error("Lỗi khi cập nhật hồ sơ bệnh nhân:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật hồ sơ." });
    }
});

app.delete('/api/patients/:id', async (req, res) => {
    const patientId = req.params.id;
    try {
        const [result] = await pool.query('DELETE FROM patients WHERE id = ?', [patientId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bệnh nhân để xóa." });
        }
        res.status(200).json({ message: "Xóa hồ sơ bệnh nhân thành công.", id: patientId });
    } catch (error) {
        console.error("Lỗi khi xóa hồ sơ bệnh nhân:", error);
        res.status(500).json({ message: "Lỗi server khi xóa hồ sơ." });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server đang chạy tại http://localhost:${PORT}`);
    pool.getConnection()
        .then(connection => {
            console.log('Kết nối MySQL thành công!');
            connection.release();
        })
        .catch(err => {
            console.error('Không thể kết nối tới MySQL:', err.message);
        });
});