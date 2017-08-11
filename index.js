const express = require('express');
const app = express();
const http = require('http').Server(app);
const clientOrigin = process.env.CLIENT_ORIGIN || '*:*';
const io = require('socket.io')(http, {
  origins: clientOrigin,
  serveClient: false,
  pingInterval: 5000,
  pingTimeout: 15000
});
const port = process.env.PORT || 4000;

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => require('./app/socket')(socket, io));

http.listen(port, () => console.log(`Listening on port ${port}`));
