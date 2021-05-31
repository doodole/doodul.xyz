require('dotenv').config()
const express = require('express')
const CryptoJS = require('crypto-js')
const connections = require('../connections')
const mysql = require(`mysql`);
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false}))

let client = connections.client

const con = connections.con

let recentlyfollowed = [];

setInterval(() => {
  recentlyfollowed = [];
}, 1.8e+6)

app.post ('/follow', async (req, res) => {
  console.log(req.body)
  console.log(req.headers)
  message = req.headers[`twitch-eventsub-message-id`] + req.headers['twitch-eventsub-message-timestamp'] + JSON.stringify(req.body)
  const hash = CryptoJS.HmacSHA256(message, process.env.WEBHOOKSECRET);
  const hashbase64 = CryptoJS.enc.Hex.stringify(hash)
  if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
    if (req.headers["twitch-eventsub-message-signature"] === `sha256=`+ hashbase64) {
        res.status(200).send(req.body.challenge);
        return;
      }
      res.status(400).send('bad request')
      return;
  }
  if (req.headers['twitch-eventsub-message-type'] === 'notification' && req.headers['twitch-eventsub-subscription-type'] === 'channel.follow') {
    if (req.headers["twitch-eventsub-message-signature"] === `sha256=`+hashbase64) {
      if (recentlyfollowed.includes(`${req.body.event.user_name}${req.body.event.broadcaster_user_login}`)) {
        res.status(200).send('we gucci');
        return
      }
      con.query(`SELECT * FROM follownotifications WHERE channelUID = ${mysql.escape(req.body.event.broadcaster_user_id)}`, (err, result) => {
          if (err) throw err;
          client.say(result[0].channel, `${req.body.event.user_name} ${result[0].message}`)
          recentlyfollowed.push(`${req.body.event.user_name}${req.body.event.broadcaster_user_login}`)
      })
      res.status(200).send('we gucci');
      return;
    }
    res.status(400).send('bad request')
    return;
  }
})

app.post ('/live', async (req, res) => {
  console.log(req.body)
  console.log(req.headers)
  const message = req.headers[`twitch-eventsub-message-id`] + req.headers['twitch-eventsub-message-timestamp'] + JSON.stringify(req.body)
  var hash = CryptoJS.HmacSHA256(message, process.env.WEBHOOKSECRET);
  var hashbase64 = CryptoJS.enc.Hex.stringify(hash)
  if (req.headers["twitch-eventsub-message-signature"] === `sha256=`+ hashbase64) {
    if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification' && req.headers['twitch-eventsub-subscription-type'] === 'stream.online') {
      res.status(200).send(req.body.challenge);
      return;
    }
    else if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification' && req.headers['twitch-eventsub-subscription-type'] === 'stream.offline') {
      res.status(200).send(req.body.challenge);
      return;
    }
    else if (req.headers['twitch-eventsub-message-type'] === 'notification' && req.headers['twitch-eventsub-subscription-type'] === 'stream.online') {
      con.query(
        `UPDATE live 
        SET isLive = 'true' 
        WHERE channelUID = ${mysql.escape(req.body.event.broadcaster_user_id)}`
      )
      const result = await connections.query(`SELECT * FROM live WHERE channelUID = ${mysql.escape(req.body.event.broadcaster_user_id)}`)
      if (result[0].notifications === 'yes') {
        if (result[0].peopleLive === null || result[0].peopleLive === '') {
          client.say(req.body.event.broadcaster_user_login, result[0].messageLive)
          res.status(200).send('we gucci');
          return
        }
        const peopleArray = result[0].peopleLive.split(' ');
        const lentest = {};
        let n = 0
        for (i in peopleArray) {
            if (lentest.hasOwnProperty(n) === false) {
                lentest[n] = result[0].messageLive + ' ' + peopleArray[i]
            }
            else {
                if (lentest[n].length < 400) {
                lentest[n] = lentest[n] + ' ' + peopleArray[i]
                }
                else {
                    n = n+1
                    lentest[n] = result[0].messageLive + ' ' + peopleArray[i]
                }
            }
        }
        for (key in lentest) {
          if (lentest.hasOwnProperty(key)) {
            client.say(req.body.event.broadcaster_user_login, lentest[key])
          }
        }
      }
      res.status(200).send('we gucci');
      return;
    }
    else if (req.headers['twitch-eventsub-message-type'] === 'notification' && req.headers['twitch-eventsub-subscription-type'] === 'stream.offline') {
      con.query(
        `UPDATE live 
        SET isLive = 'false' 
        WHERE channelUID = ${mysql.escape(req.body.event.broadcaster_user_id)}`
      )
      const result = await connections.query(`SELECT * FROM live WHERE channelUID = ${mysql.escape(req.body.event.broadcaster_user_id)}`)
      if (result[0].notifications === 'yes') {
        if (result[0].peopleOffline === null || result[0].peopleOffline === '') {
          client.say(req.body.event.broadcaster_user_login, result[0].messageOffline)
          res.status(200).send('we gucci');
          return
        }
        const peopleArray = result[0].peopleOffline.split(' ');
        const lentest = {};
        let n = 0
        for (i in peopleArray) {
            if (lentest.hasOwnProperty(n) === false) {
                lentest[n] = result[0].messageOffline + ' ' + peopleArray[i]
            }
            else {
                if (lentest[n].length < 400) {
                lentest[n] = lentest[n] + ' ' + peopleArray[i]
                }
                else {
                    n = n+1
                    lentest[n] = result[0].messageOffline + ' ' + peopleArray[i]
                }
            }
        }
        for (key in lentest) {
          if (lentest.hasOwnProperty(key)) {
            client.say(req.body.event.broadcaster_user_login, lentest[key])
          }
        }
      }
      res.status(200).send('we gucci');
      return;
    }
  }
  res.status(400).send('bad request')
  return;
})

app.use(function (err, req, res, next) {
  res.status(500).send('eShrug')
})

exports.app = app