require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const createTables = async () => {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT UNIQUE,
            username TEXT NOT NULL,
            userFirstName TEXT,
            userLastName TEXT,
            email TEXT UNIQUE,
            password_hash TEXT
        );
    `;

    const createLevelsTable = `
        CREATE TABLE IF NOT EXISTS levels (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            level TEXT NOT NULL,
            status BOOLEAN DEFAULT FALSE,
            UNIQUE(user_id, level)
        );
    `;

    try {
        await pool.query(createUsersTable);
        console.log('Users table has been created or exists');

        await pool.query(createLevelsTable);
        console.log('Levels table has been created or exists');
    } catch (err) {
        console.error('Error when creating tables:', err);
    } finally {
        await pool.end();
    }
};

createTables();
