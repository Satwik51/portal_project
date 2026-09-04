const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Middleware
app.use(compression()); // Compress all HTTP responses for fast loading on slow internet
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Optimized limit for Base64 (reduced from 10mb to save RAM on free tier)

let db;

// Database Connection & Setup
async function initDb() {
    try {
        db = mysql.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            timezone: 'Z',
            ssl: { rejectUnauthorized: false },
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        // Test connection
        await db.query('SELECT 1');
        console.log("✅ Successfully connected to Aiven MySQL (Pool initialized)!");

        await db.query(`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                attendance_id VARCHAR(50) UNIQUE,
                event_id VARCHAR(50),
                event_name VARCHAR(100),
                day VARCHAR(20),
                session_name VARCHAR(50),
                enrollment_number VARCHAR(50),
                student_name VARCHAR(100),
                gender VARCHAR(20),
                course VARCHAR(50),
                selfie_base64 LONGTEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Database Table 'attendance_records' is ready!");

        // In case table already exists without the column, alter it
        try {
            await db.query(`ALTER TABLE attendance_records ADD COLUMN selfie_base64 LONGTEXT;`);
            console.log("✅ Added selfie_base64 column to existing table.");
        } catch (e) {
            // Error means column already exists, safe to ignore
        }
    } catch (err) {
        console.error("❌ Failed to connect to Database. Check your .env file!");
        console.error(err.message);
    }
}
initDb();

// API Route to save attendance
app.post('/api/v1/attendance', async (req, res) => {
    try {
        const data = req.body;
        
        // 1. Check for Duplicate Proxy
        const [existing] = await db.query(
            'SELECT id FROM attendance_records WHERE enrollment_number = ? AND session_name = ? AND day = ? AND event_id = ?',
            [data.enrollment_number, data.session_name, data.day, data.event_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Attendance already marked for this session!', code: 'DUPLICATE' });
        }

        // 2. Save New Record
        const attendanceId = 'ATT-' + Date.now();
        
        await db.query(`
            INSERT INTO attendance_records 
            (attendance_id, event_id, event_name, day, session_name, enrollment_number, student_name, gender, course, selfie_base64)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            attendanceId, data.event_id, data.event_name, data.day, data.session_name, 
            data.enrollment_number, data.student_name, data.gender, data.course, data.selfie_base64
        ]);

        res.json({ data: { success: true, attendanceId, message: 'Saved to MySQL!' } });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ error: 'Internal Database Error' });
    }
});

// API Route to fetch all attendance (For Admin Dashboard)
app.get('/api/v1/attendance', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM attendance_records ORDER BY timestamp DESC');
        res.json({ data: rows });
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ error: 'Internal Database Error' });
    }
});

// API Route to delete attendance records
app.delete('/api/v1/attendance', async (req, res) => {
    try {
        const { ids, deleteAll } = req.body;
        
        if (deleteAll) {
            await db.query('TRUNCATE TABLE attendance_records');
            return res.json({ success: true, message: 'All records deleted successfully' });
        }
        
        if (ids && Array.isArray(ids) && ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            await db.query(`DELETE FROM attendance_records WHERE id IN (${placeholders})`, ids);
            return res.json({ success: true, message: `${ids.length} records deleted` });
        }

        res.status(400).json({ error: 'No records selected for deletion' });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: 'Failed to delete records' });
    }
});

// Start Server or Export for Vercel
const PORT = process.env.PORT || 3000;
if (process.env.VERCEL) {
    // Vercel Serverless Function export
    module.exports = app;
} else {
    // Local Development
    app.listen(PORT, () => {
        console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
    });
}
