const mysql = require('mysql2/promise');
require('dotenv').config();
async function test() {
    const db = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    try {
        const [rows] = await db.query('SELECT * FROM app_settings');
        console.log('TABLE EXISTS, ROWS:', rows);
    } catch(e) { console.error('ERROR:', e.message); }
    process.exit(0);
}
test();
