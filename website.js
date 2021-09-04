var vhost = require('vhost');
var express = require('express')
require('dotenv').config()

express()
    .use(vhost('doodul.xyz', require('./domains/main').app))
    .use(vhost('eventsub.doodul.xyz', require('./domains/eventsub').app))
    .listen(process.env.PORT)

console.log(`Server started on port ${process.env.PORT}`)