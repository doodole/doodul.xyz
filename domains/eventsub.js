require('dotenv').config()
const express = require('express')
const CryptoJS = require('crypto-js')
const connections = require('../connections')
const mysql = require(`mysql2`);
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

let client = connections.client

const con = connections.con

let recentlyfollowed = [];

setInterval(() => {
    recentlyfollowed = [];
}, 1.8e+6)

app.post('/follow', async (req, res) => {
    console.log(req.body)
    console.log(req.headers)
    message = req.headers[`twitch-eventsub-message-id`] + req.headers['twitch-eventsub-message-timestamp'] + JSON.stringify(req.body)
    const hash = CryptoJS.HmacSHA256(message, process.env.WEBHOOKSECRET);
    const hashbase64 = CryptoJS.enc.Hex.stringify(hash)
    if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
        if (req.headers["twitch-eventsub-message-signature"] === `sha256=` + hashbase64) {
            return res.status(200).send(req.body.challenge)
        }
        return res.status(400).send('bad request')
    }
    if (req.headers['twitch-eventsub-message-type'] === 'notification' && req.headers['twitch-eventsub-subscription-type'] === 'channel.follow') {
        if (req.headers["twitch-eventsub-message-signature"] === `sha256=` + hashbase64) {
            if (recentlyfollowed.includes(`${req.body.event.user_name}${req.body.event.broadcaster_user_login}`)) {
                return res.status(200).send('we gucci')
            }
            con.query(
                `SELECT * 
                FROM follownotifications 
                WHERE channelUID = ?`, [req.body.event.broadcaster_user_id], 
                (err, result) => {
                    if (err) throw err;
                    client.say(result[0].channel, `${result[0].message}`.replace("$follower", req.body.event.user_name))
                    recentlyfollowed.push(`${req.body.event.user_name}${req.body.event.broadcaster_user_login}`)
                }
            )
            return res.status(200).send('we gucci')
        }
        return res.status(400).send('bad request')
    }
})

app.post('/live', async (req, res) => {
    console.log(req.body)
    console.log(req.headers)
    const message = req.headers[`twitch-eventsub-message-id`] + req.headers['twitch-eventsub-message-timestamp'] + JSON.stringify(req.body)
    var hash = CryptoJS.HmacSHA256(message, process.env.WEBHOOKSECRET);
    var hashbase64 = CryptoJS.enc.Hex.stringify(hash)
    if (req.headers["twitch-eventsub-message-signature"] === `sha256=` + hashbase64) {
        if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification' && req.headers['twitch-eventsub-subscription-type'] === 'stream.online') {
            return res.status(200).send(req.body.challenge)
        } else if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification' && req.headers['twitch-eventsub-subscription-type'] === 'stream.offline') {
            return res.status(200).send(req.body.challenge)
        } else if (req.headers['twitch-eventsub-message-type'] === 'notification' && req.headers['twitch-eventsub-subscription-type'] === 'stream.online') {
            const [liveInfo] = await con.promise().query(
                `SELECT isLive, messageLive, peopleLive, notifications 
                FROM live 
                WHERE channelUID = ?`, [req.body.event.broadcaster_user_id]
            )
            if (liveInfo[0].isLive === "true") {
                return res.status(200).send('bruh?')
            }
            con.query(
                `UPDATE live 
                SET isLive = 'true' 
                WHERE channelUID = ?`, [req.body.event.broadcaster_user_id]
            )
            if (liveInfo[0].notifications === 'yes') {
                if (liveInfo[0].peopleLive === null || liveInfo[0].peopleLive === '') {
                    client.say(req.body.event.broadcaster_user_login, liveInfo[0].messageLive)
                    return res.status(200).send('we gucci')
                }
                const peopleArray = liveInfo[0].peopleLive.split(' ').slice(0, -1)
                const splitMessage = {};
                let n = 0
                for (i in peopleArray) {
                    if (splitMessage.hasOwnProperty(n) === false) {
                        splitMessage[n] = liveInfo[0].messageLive + ' ' + peopleArray[i]
                    } else {
                        if (splitMessage[n].length < 400) {
                            splitMessage[n] = splitMessage[n] + ' ' + peopleArray[i]
                        } else {
                            n = n + 1
                            splitMessage[n] = liveInfo[0].messageLive + ' ' + peopleArray[i]
                        }
                    }
                }
                for (key in splitMessage) {
                    if (splitMessage.hasOwnProperty(key)) {
                        client.say(req.body.event.broadcaster_user_login, splitMessage[key])
                    }
                }
            }
            return res.status(200).send('we gucci')
        } else if (req.headers['twitch-eventsub-message-type'] === 'notification' && req.headers['twitch-eventsub-subscription-type'] === 'stream.offline') {
            const [offlineInfo] = await con.promise().query(
                `SELECT isLive, messageOffline, peopleOffline, notifications 
                FROM live 
                WHERE channelUID = ?`, [req.body.event.broadcaster_user_id]
            )
            if (offlineInfo[0].isLive === "false") {
                return res.status(200).send('bruh?')
            }
            con.query(
                `UPDATE live 
                SET isLive = 'false' 
                WHERE channelUID = ?`, [req.body.event.broadcaster_user_id]
            )
            if (offlineInfo[0].notifications === 'yes') {
                if (offlineInfo[0].peopleOffline === null || offlineInfo[0].peopleOffline === '') {
                    client.say(req.body.event.broadcaster_user_login, offlineInfo[0].messageOffline)
                    return res.status(200).send('we gucci')
                }
                const peopleArray = offlineInfo[0].peopleOffline.split(' ').slice(0, -1)
                const splitMessage = {};
                let n = 0
                for (i in peopleArray) {
                    if (splitMessage.hasOwnProperty(n) === false) {
                        splitMessage[n] = offlineInfo[0].messageOffline + ' ' + peopleArray[i]
                    }
                    else {
                        if (splitMessage[n].length < 400) {
                            splitMessage[n] = splitMessage[n] + ' ' + peopleArray[i]
                        } else {
                            n = n + 1
                            splitMessage[n] = offlineInfo[0].messageOffline + ' ' + peopleArray[i]
                        }
                    }
                }
                for (key in splitMessage) {
                    if (splitMessage.hasOwnProperty(key)) {
                        client.say(req.body.event.broadcaster_user_login, splitMessage[key])
                    }
                }
            }
            return res.status(200).send('we gucci')
        }
    }
    return res.status(400).send('bad request')
})

app.use(function (err, req, res, next) {
    res.status(500).send('eShrug')
})

exports.app = app