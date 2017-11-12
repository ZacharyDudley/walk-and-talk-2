'use strict'

const express = require('express');
const app = express();
const http = require('http')
// const https = require('https')
const url = require('url')
const WebSocket = require('ws')
// const WebSocketServer = require('websocket').server
const morgan = require('morgan');
const bodyParser = require('body-parser');

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('public'));

// app.use((req, res) => {
//   res.send({msg: 'hi'})
// })

const connectionArray = []
let nextID = Date.now()

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })
server.listen(3000, () => {
  console.log('LISTENING ON %d', server.address().port)
})

// const server = http.createServer( (req, res) => {
//   res.writeHead(404)
//   res.end()
// })

// server.listen(3000, () => {
//   console.log('LISTENING ON %d', server.address().port)
// })

// const wss = new WebSocketServer({
//   httpServer: server
// })


// const broadcast = () => {
//   let message = 'MESSAGE FOR YOU'
//   wss.clients.forEach(client => {
//     console.log('CLIENT: ', client.id)
//     client.send(message)
//   })
// }

// wss.on('connection', socket => {
//   console.log('CONNECTED: ')
//   socket.binaryType = 'arraybuffer'

//   socket.on('message', message => {
//     // const array = new Float32Array(message)
//     console.log('RECEIVED: ', message)

//     socket.send(message)
//   })
// })

// const send = msg => {
//   connection.sendUTF(msg)
// }

wss.on('request', connection => {
  console.log('REQUEST')
})

wss.on('connection', (connection, req) => {
  connectionArray.push(connection)
  connection.clientID = nextID
  nextID++
  console.log('CONNECTED: ', connection.clientID)

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
    connectionArray.filter(function(el, idx, ar) {
      return el.connected;
    });

    console.log(connectionArray.length)
    console.log('CONNECTION CLOSED')
    console.log('Reason: ' + reason)
    console.log('Description' + description)
  })
})


