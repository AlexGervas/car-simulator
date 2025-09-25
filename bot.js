require('dotenv').config();

const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);
const pendingActions = new Map();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'PROD';

const webAppUrl = 'https://alexgervas.github.io/car-simulator';
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

function isTelegramDataValid(data, botToken) {
    const { hash, ...fields } = data || {};
    if (!hash) return false;

    const pairs = Object.keys(fields)
        .sort()
        .map(k => `${k}=${fields[k]}`)
        .join('\n');

    const secret = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secret).update(pairs).digest('hex');

    return hmac === hash;
}

module.exports = { isTelegramDataValid };

// middleware для проверки токена
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
}

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
                telegram_id: userId,
                telegram_username: username,
                userfirstname: userFirstName,
                userlastname: userLastName
            }),
        });

        await ctx.replyWithPhoto({ url: carImg }, {
            caption: `Добро пожаловать, @${username}! 🌟\n\n` +
                'Вы можете играть прямо в Telegram или войти через веб-сайт.'
        });

        // await ctx.reply('Выберите действие:', Markup.keyboard([
        //     Markup.button.webApp('Запустить приложение', webAppUrl),
        // ]).resize());

        const userResult = await pool.query(
            'SELECT email, password_hash FROM users WHERE telegram_id = $1 LIMIT 1',
            [String(userId)]
        );
        const user = userResult.rows[0];

        const inlineButtons = [
            [Markup.button.webApp('Запустить приложение', webAppUrl)]
        ];

        const redirectUrl = `${webAppUrl}/registration?first_name=${encodeURIComponent(userFirstName)}&last_name=${encodeURIComponent(userLastName)}&telegram_id=${encodeURIComponent(String(userId))}`;
        if (!user?.email || !user?.password_hash) {
            inlineButtons.push([
                Markup.button.callback('Привязать логин и пароль', 'link_web_login'),
                Markup.button.url('Зарегистрироваться на сайте', redirectUrl)
            ]);
        }
        await ctx.reply('Выберите действие:', Markup.inlineKeyboard(inlineButtons));

    } catch (err) {
        console.error('Error saving user:', err);
        await ctx.reply('Error saving user');
    }
});

bot.action('link_web_login', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        'Чтобы привязать вход через веб-сервис, выберите действие:',
        Markup.keyboard([['Добавить Email', 'Добавить пароль']]).resize().oneTime()
    );
});

bot.hears('Добавить пароль', async (ctx) => {
    const userId = ctx.from.id;
    pendingActions.set(userId, 'password');

    await ctx.reply(
        'Введите пароль.\n\n' +
        'Требования:\n' +
        '- минимум 8 символов\n' +
        '- хотя бы одна буква\n' +
        '- хотя бы одна цифра\n' +
        '- хотя бы один спецсимвол'
    );
});

bot.command('setemail', async (ctx) => {
    const userId = ctx.from.id;
    pendingActions.set(userId, 'email');
    await ctx.reply('Введите ваш email:');
});

bot.command('setpassword', async (ctx) => {
    const userId = ctx.from.id;
    pendingActions.set(userId, 'password');
    await ctx.reply('🔑 Введите ваш пароль:');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const action = pendingActions.get(userId);

    const input = ctx.message.text.trim();

    if (!action) {
        if (input === 'Добавить Email') {
            pendingActions.set(userId, 'email');
            return ctx.reply('Введите ваш email:');
        } else if (input === 'Добавить пароль') {
            pendingActions.set(userId, 'password');
            return ctx.reply('Введите ваш пароль:');
        }
        return;
    }

    if (action === 'email') {
        if (!validator.isEmail(input)) {
            return ctx.reply('Некорректный email. Попробуйте снова:');
        }
        await pool.query('UPDATE users SET email = $1 WHERE telegram_id = $2', [
            input,
            String(userId),
        ]);
        await ctx.reply(`Email сохранён: ${input}`);
    }

    if (action === 'password') {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

        if (!passwordRegex.test(input)) {
            return ctx.reply(
                'Пароль не соответствует требованиям.\n' +
                'Он должен содержать:\n' +
                '- минимум 8 символов\n' +
                '- хотя бы одну букву\n' +
                '- хотя бы одну цифру\n' +
                '- хотя бы один спецсимвол\n' +
                'Попробуйте снова:'
            );
        }
        const hash = await bcrypt.hash(input, 10);
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE telegram_id = $2',
            [hash, String(userId)]
        );

        await ctx.reply('Пароль сохранён!');
    }

    pendingActions.delete(userId);
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
 * Логин по telegram_id
 */
app.post('/login-telegram', async (req, res) => {
    const { telegram_id } = req.body;
    if (!telegram_id) {
        return res.status(400).json({ message: 'telegram_id is required' });
    }

    try {
        const userResult = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [telegram_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];

        const token = jwt.sign(
            { id: user.id, telegram_id: user.telegram_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.status(200).json({
            message: 'Telegram Login successful',
            token,
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                username: user.username,
                userFirstName: user.userfirstname,
                userLastName: user.userlastname,
            }
        });
    } catch (err) {
        console.error('Error logging in with Telegram:', err);
        res.status(500).send('Error logging in with Telegram');
    }
});

/**
 * Добавление нового пользователя
 */
app.post('/create-user', async (req, res) => {
    const { telegram_id, telegram_username, telegram_auth_date, telegram_hash, userfirstname, userlastname, email, password_plain } = req.body;

    function generateUsername({ telegram_username, email, firstName, lastName }) {
        if (telegram_username) return telegram_username;
        if (email) return email.split('@')[0];
        if (firstName && lastName) return (firstName + lastName).toLowerCase();
        if (firstName) return firstName.toLowerCase();
        return 'user' + Date.now();
    }

    if (telegram_hash) {
        const ok = isTelegramDataValid(
            {
                id: telegram_id,
                username: telegram_username,
                first_name: userfirstname,
                last_name: userlastname,
                auth_date: telegram_auth_date,
                hash: telegram_hash
            },
            BOT_TOKEN
        );
        if (!ok) {
            return res.status(403).json({ message: 'Invalid Telegram signature' });
        }
    }

    const tgId = telegram_id ? String(telegram_id) : null;
    const firstName = userfirstname || null;
    const lastName = userlastname || null;
    const mail = email || null;
    const passHash = password_plain ? await bcrypt.hash(password_plain, 10) : null;

    const uname = generateUsername({ telegram_username, email: mail, firstName, lastName });

    try {
        const byEmail = mail
            ? await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [mail])
            : { rows: [] };
        const byTg = tgId
            ? await pool.query('SELECT * FROM users WHERE telegram_id = $1 LIMIT 1', [tgId])
            : { rows: [] };

        if (byEmail.rows.length && byTg.rows.length && byEmail.rows[0].id !== byTg.rows[0].id) {
            const keep = byEmail.rows[0];
            const drop = byTg.rows[0];

            await pool.query(
                `UPDATE users
         SET telegram_id   = COALESCE($1, telegram_id),
             username      = COALESCE($2, username),
             userfirstname = COALESCE($3, userfirstname),
             userlastname  = COALESCE($4, userlastname)
         WHERE id = $5`,
                [tgId, uname, firstName, lastName, keep.id]
            );
            await pool.query('DELETE FROM users WHERE id = $1', [drop.id]);

            return res.status(200).json({ message: 'User merged', id: keep.id });
        }

        if (byEmail.rows.length) {
            const u = byEmail.rows[0];

            await pool.query(
                `UPDATE users
         SET telegram_id   = COALESCE($1, telegram_id),
             username      = COALESCE($2, username),
             userfirstname = COALESCE($3, userfirstname),
             userlastname  = COALESCE($4, userlastname),
             password_hash = COALESCE($5, password_hash)
         WHERE id = $6`,
                [tgId, uname, firstName, lastName, passHash, u.id]
            );

            return res.status(200).json({ message: 'User updated (email path)', id: u.id });
        }

        if (byTg.rows.length) {
            const u = byTg.rows[0];

            await pool.query(
                `UPDATE users
         SET email         = COALESCE($1, email),
             userfirstname = COALESCE($2, userfirstname),
             userlastname  = COALESCE($3, userlastname),
             username      = COALESCE($4, username),
             password_hash = COALESCE($5, password_hash)
         WHERE id = $6`,
                [mail, firstName, lastName, uname, passHash, u.id]
            );

            return res.status(200).json({ message: 'User updated (telegram path)', id: u.id });
        }

        const result = await pool.query(
            `INSERT INTO users (telegram_id, username, userfirstname, userlastname, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
            [tgId, uname, firstName, lastName, mail, passHash]
        );
        const userId = result.rows[0].id;

        const levels = [
            { level: 'snake', status: true },
            { level: 'parallel-parking', status: false },
            { level: 'garage', status: false },
            { level: 'steep-grade', status: false }
        ];
        await Promise.all(
            levels.map(({ level, status }) =>
                pool.query(`INSERT INTO levels (user_id, level, status) VALUES ($1, $2, $3)`, [userId, level, status])
            )
        );

        return res.status(201).json({ message: 'User created with initial levels', id: userId });
    } catch (err) {
        console.error('Error saving user:', err);
        return res.status(500).send('Error saving user');
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
 * Получение информации пользователя по id или по токену
 */
app.get('/users/:id?', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = id && id !== 'me' ? id : req.userId;

        const result = await pool.query(
            'SELECT id, username, email, userfirstname, userlastname, telegram_id FROM users WHERE id = $1 OR telegram_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = result.rows[0];

        res.json({
            userId: user.id,
            username: user.username || undefined,
            email: user.email,
            userfirstname: user.userfirstname,
            userlastname: user.userlastname,
            telegramId: user.telegram_id,
            isTelegram: !!user.telegram_id
        });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ message: 'Error fetching user' });
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
