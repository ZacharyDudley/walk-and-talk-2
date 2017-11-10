const express = require('express');
const app = express();
const http = require('http')
const url = require('url')
const WebSocket = require('ws')
const morgan = require('morgan');
const bodyParser = require('body-parser');

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('public'));

// app.use((req, res) => {
//   res.send({msg: 'hi'})
// })

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const broadcast = () => {
  let message = 'MESSAGE FOR YOU'
  wss.clients.forEach(client => {
    console.log('CLIENT: ', client.id)
    client.send(message)
  })
}

wss.on('connection', socket => {
  console.log('CONNECTED: ', socket.id)
  // console.log('CLIENTS: ', wss.clients)
  broadcast()

  socket.on('message', message => {
    console.log('RECEIVED: %s', message)
    socket.send(message)
  })

})


server.listen(3000, () => {
  console.log('LISTENING ON %d', server.address().port)
})


// app.use('/', router);

// app.get('/', (req, res, next, err) => {
//   res.status(404).send(err)
// })
