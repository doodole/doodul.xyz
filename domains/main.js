const express = require('express')
const connections = require('../connections')
const path = require('path')
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false}))
app.use('/public', express.static(__dirname + '/public/'))


app.engine('pug', require('pug').__express)

app.set('views', path.join(__dirname, '/pugstuff/pug'))
app.set('view engine', 'pug')

const con = connections.con

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/commands', async (req, res) => {
  const [command] = await con.promise().query('SELECT * FROM commands WHERE permissions != "me"')
  res.render('commands', {
    command: command
  })
})

app.use((req, res, next) => {
  res.status(404);
  res.render('error')
})

app.use(function (err, req, res, next) {
    res.status(500).send('eShrug')
})

exports.app = app