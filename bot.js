require('dotenv').config();

const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'PROD';

const webAppUrl = 'https://alexgervas.github.io/car-simulator/';
const carImg = "https://i.pinimg.com/736x/6e/3a/67/6e3a6798353975790e656eb7ecafb7d3.jpg";

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    const userFirstName = ctx.from.first_name;
    const userLastName = ctx.from.last_name;
    const username = ctx.from.username || ctx.from.first_name;

    try {
        await fetch(`${process.env.BASE_URL}/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                username,
                userFirstName,
                userLastName,
            }),
        });

        await ctx.replyWithPhoto({ url: carImg }, {
            caption: `Добро пожаловать, @${username}! 🌟\n\n` +
                'Какой нибудь текст для описания пам пам пам...'
        });

        await ctx.reply('Нажмите на кнопку ниже, чтобы запустить приложение:', Markup.keyboard([
            [Markup.button.webApp('Запустить приложение', webAppUrl)]
        ]).resize());

    } catch (err) {
        console.error('Error saving user:', err);
        await ctx.reply('Error saving user');
    }
});

if (isProduction) {
    app.post('/webhook', (req, res) => {
        bot.handleUpdate(req.body, res)
            .catch(err => {
                console.error('Error handling update:', err);
                res.status(500).send('Error');
            });
    });
} else {
    // Test bot for local (Polling):
    bot.launch()
        .then(() => {
            console.log('Bot started!');
        })
        .catch((err) => {
            console.error('Error when starting bot:', err);
        });
}

app.get('/', (req, res) => {
    res.send('Hello from your web server!');
});

/**
 * Логин пользователя (по email, password)
 */
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = userResult.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                userFirstName: user.userfirstname,
                userLastName: user.userlastname,
            }
        });

    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).send('Error logging in');
    }
});

/**
 * Добавление нового пользователя
 */
app.post('/create-user', async (req, res) => {
    const { telegram_id, username, userFirstName, userLastName, email, password_hash } = req.body;

    try {
        const checkQuery = `
            SELECT id FROM users 
            WHERE (telegram_id = $1 AND $1 IS NOT NULL)
               OR (email = $2 AND $2 IS NOT NULL)
            LIMIT 1
        `;
        const checkResult = await pool.query(checkQuery, [telegram_id || null, email || null]);

        if (checkResult.rows.length > 0) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const hashedPassword = password_hash ? await bcrypt.hash(password_hash, 10) : null;

        const insertUser = `INSERT INTO users (telegram_id, username, userFirstName, userLastName, email, password_hash) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            ON CONFLICT (telegram_id) DO NOTHING
            RETURNING id`;
        const result = await pool.query(insertUser, [telegram_id || null, username, userFirstName, userLastName, email || null, hashedPassword]);
        const userId = result.rows.length > 0 ? result.rows[0].id : null;

        if (userId) {
            const levels = [
                { level: 'snake', status: true },
                { level: 'parallel-parking', status: false },
                { level: 'garage', status: false },
                { level: 'steep-grade', status: false }
            ];

            await Promise.all(levels.map(({ level, status }) =>
                pool.query(`INSERT INTO levels (user_id, level, status) VALUES ($1, $2, $3)`, [userId, level, status])
            ));
        }

        res.status(201).json({ message: 'User created with initial levels', id: userId });
    } catch (err) {
        console.error('Error saving user:', err);
        res.status(500).send('Error saving user');
    }
});

/**
 * Список всех пользователей
 */
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Error fetching users');
    }
});

/**
 * Получение информации пользователя по id
 */
app.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1 OR telegram_id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).send('Пользователь не найден');
        } else {
            res.status(200).json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).send('Ошибка при получении пользователя');
    }
});

/**
 * Удаление пользователя и его выполненных уровней
 */
app.delete('/users/:id', async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
        const userResult = await client.query('SELECT id FROM users WHERE id = $1 OR telegram_id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        const internalUserId = userResult.rows[0].id;

        await client.query('BEGIN');
        await client.query('DELETE FROM levels WHERE user_id = $1', [internalUserId]);
        await client.query('DELETE FROM users WHERE id = $1', [internalUserId]);
        await client.query('COMMIT');
        res.status(200).send('User deleted successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting user:', err);
        res.status(500).send('Error deleting user');
    } finally {
        client.release();
    }
});

/**
 * Вывод уровней 
 */
app.get('/levels', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM levels');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching levels:', err);
        res.status(500).send('Error fetching levels');
    }
});

/**
 * Вывод всех уровней по id или telegram_id пользователя
 */
app.get('/levels/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const userResult = await pool.query('SELECT id FROM users WHERE id = $1 OR telegram_id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        const internalUserId = userResult.rows[0].id;

        const levelsResult = await pool.query(
            'SELECT level, status FROM levels WHERE user_id = $1',
            [internalUserId]
        );
        const levels = levelsResult.rows.map(row => ({
            level: row.level,
            status: row.status
        }));
        res.status(200).json({ user_id: internalUserId, levels });
    } catch (err) {
        console.error('Error fetching user levels:', err);
        res.status(500).send('Error fetching user levels');
    }
});

/**
 * Сохранение выполненного уровня и разблокировка следующего
 */
app.post('/complete-level', async (req, res) => {
    const { userId, currentLevel } = req.body;
    const levelsOrder = ['snake', 'parallel-parking', 'garage', 'steep-grade'];

    if (!userId) {
        return res.status(400).send('userId is required');
    }

    const client = await pool.connect();
    try {
        const userResult = await client.query('SELECT id, telegram_id FROM users WHERE id = $1', [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        const { id: internalUserId, telegram_id } = userResult.rows[0];
        const currentIndex = levelsOrder.indexOf(currentLevel);

        if (currentIndex === -1) {
            return res.status(400).send('Incorrect current level');
        }

        const upsertLevelTrue = async (uid, level) => {
            const upd = await client.query('UPDATE levels SET status = TRUE WHERE user_id = $1 AND level = $2', [uid, level]);
            if (upd.rowCount === 0) {
                await client.query('INSERT INTO levels (user_id, level, status) VALUES ($1, $2, TRUE)', [uid, level]);
            }
        };
        await client.query('BEGIN');
        await upsertLevelTrue(internalUserId, currentLevel);

        const nextLevel = levelsOrder[currentIndex + 1] || null;

        if (nextLevel) {
            await upsertLevelTrue(internalUserId, nextLevel);
        }
        await client.query('COMMIT');

        if (telegram_id) {
            if (nextLevel) {
                await bot.telegram.sendMessage(telegram_id, `Поздравляем! Вы прошли упражнение "${currentLevel}"! 🎉 \nСледующее задание"${nextLevel}" разблокировано! ✅`);
            } else {
                await bot.telegram.sendMessage(telegram_id, `Вы завершили последнее упражнение "${currentLevel}" 🎉`);
            }
        }

        res.status(200).json({ success: true, telegram_id: telegram_id, unlocked: nextLevel });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error completing level:', err);
        res.status(500).send('Server error');
    } finally {
        client.release();
    }
});

/**
 * Проверка выполнения всех упражнений
 */
app.post('/check-completion', express.json(), async (req, res) => {
    const { userId, totalLevels } = req.body;

    try {
        const userResult = await pool.query(
            'SELECT id, telegram_id FROM users WHERE id = $1 OR telegram_id = $1',
            [userId]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        const { id: internalUserId, telegram_id } = userResult.rows[0];

        const completedResult = await pool.query(
            'SELECT COUNT(*) AS completed_levels FROM levels WHERE user_id = $1 AND status = TRUE',
            [internalUserId]
        );

        const completedLevels = parseInt(completedResult.rows[0].completed_levels, 10);

        if (completedLevels === totalLevels) {
            if (telegram_id) {
                await bot.telegram.sendMessage(telegram_id, 'Поздравляем! Вы успешно выполнили все уровни! 🎉');
            }
            return res.status(200).send('All levels are completed');
        } else {
            const remainingLevels = totalLevels - completedLevels;
            return res.status(200).send(`It remains to be completed ${remainingLevels} levels.`);
        }
    } catch (err) {
        console.error('Error checking completion:', err);
        res.status(500).send('Error checking completion');
    }
});

app.listen(PORT, () => {
    const serverUrl = PORT === 3000 ? `http://localhost:${PORT}` : `https://car-simulator.onrender.com/webhook`;
    console.log(`Server running on port ${PORT}`);
    console.log(`Set your webhook URL: ${serverUrl}`);
});
