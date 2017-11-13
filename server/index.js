'use strict'

const express = require('express')
const app = express()
const fs = require('fs')
const http = require('http')
const https = require('https')
const url = require('url')
const WebSocket = require('ws')
// const WebSocketServer = require('websocket').server
const morgan = require('morgan')
const bodyParser = require('body-parser')

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('public'));

let connectionArray = []
let nextID = Date.now()

let httpsOptions = {
  key: fs.readFileSync('private.key'),
  cert: fs.readFileSync('mydomain.csr')
}

// let server = https.createServer(httpsOptions, app)
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })
server.listen(3000, () => {
  console.log('LISTENING ON %d', server.address().port)
})


wss.on('connection', (connection, req) => {
  connectionArray.push(connection)
  connection.clientID = nextID
  nextID++

  connectionArray.forEach(client => {
    console.log('CONNECTED: ', client.clientID)
  })

  let idMsg = {
    type: 'id',
    id: connection.clientID
  }

  connection.send(JSON.stringify(idMsg))

  connection.on('message', message => {
    console.log(message)
    let sendToAllClients = true
    let msg = JSON.parse(message)

    if (message.type === 'utf8') {
      console.log('Message: ' + message.utf8Data)
    }


    if (connectionArray.length >= 2) {
      if (sendToAllClients) {
        connectionArray.forEach(client => {
          if (client.clientID !== msg.id) {
            return client.send(JSON.stringify(msg))
          }
        })
      }
    }
  })

  connection.on('close', (reason, description) => {
    connectionArray = connectionArray.filter(client => {
      console.log(client.connected)
      return client.connected;
    });

    console.log(connectionArray.length)
    console.log('CONNECTION CLOSED')
    console.log('Reason: ' + reason)
    console.log('Description' + description)
  })
})


