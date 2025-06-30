require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const webAppUrl = 'https://alexgervas.github.io/car-simulator/'
const carImg = "https://i.pinimg.com/736x/6e/3a/67/6e3a6798353975790e656eb7ecafb7d3.jpg"

bot.command('start', async (ctx) => {
    const username = ctx.from.username || ctx.from.first_name;

    await ctx.replyWithPhoto({ url: carImg }, {
        caption: `Добро пожаловать, @${username}! 🌟\n\n` +
            'Какой нибудь текст для описания пам пам пам...'
    });

    await ctx.reply('Нажмите на кнопку ниже, чтобы запустить приложение:', Markup.keyboard([
        [Markup.button.webApp('Запустить приложение', webAppUrl)]
    ]).resize());
});

bot.launch()
    .then(() => {
        console.log('Bot started!');
    })
    .catch((err) => {
        console.error('Error when starting bot:', err);
    });
