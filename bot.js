require('dotenv').config();

const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const { Pool } = require('pg');
const cors = require('cors');

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
        await pool.query(
            `INSERT INTO users (id, username, userFirstName, userLastName) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
            [userId, username, userFirstName, userLastName]
        );

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

app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Error fetching users');
    }
});

app.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
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

app.get('/levels', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM levels');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Error fetching users');
    }
});

app.get('/levels/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM levels WHERE user_id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).send('User not found');
        } else {
            res.status(200).json(result.rows);
        }
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).send('Ошибка при получении пользователя');
    }
});

app.post('/progress', express.json(), async (req, res) => {
    const { userId, level, status } = req.body;

    try {
        await pool.query(
            `INSERT INTO levels (user_id, level, status) VALUES ($1, $2, $3) ON CONFLICT (user_id, level) DO UPDATE SET status = $3`,
            [userId, level, true]
        );

        await bot.telegram.sendMessage(userId, `Поздравляем! Вы прошли уровень "${level}"! 🎉`);
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error when sending a message');
    }
});

app.post('/check-completion', express.json(), async (req, res) => {
    const { userId, totalLevels } = req.body;

    try {
        const completedResult = await pool.query(
            'SELECT COUNT(*) AS completed_levels FROM levels WHERE user_id = $1 AND status = TRUE',
            [userId]
        );

        const completedLevels = parseInt(completedResult.rows[0].completed_levels, 10);

        if (completedLevels === totalLevels) {
            await bot.telegram.sendMessage(userId, 'Поздравляем! Вы успешно выполнили все уровни! 🎉');
            res.status(200).send('All levels are completed. The message has been sent');
        } else {
            const remainingLevels = totalLevels - completedLevels;
            res.status(200).send(`It remains to be completed ${remainingLevels} levels.`);
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
