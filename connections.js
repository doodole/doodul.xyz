var mysql = require(`mysql2`);
const Twitch = require("dank-twitch-irc")
require('dotenv').config()

con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

exports.con = con

let client = new Twitch.ChatClient({
    username: process.env.BOT_NAME,
    password: process.env.OAUTH_TOKEN,
    rateLimits: `default`,
});

client.use(new Twitch.AlternateMessageModifier(client));
client.use(new Twitch.SlowModeRateLimiter(client, 10));

exports.client = client