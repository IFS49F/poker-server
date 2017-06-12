const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 4000;

app.use(express.static(__dirname + '/public'));

function onConnection(socket) {
  console.log('Client connected...');
}

io.on('connection', onConnection);

http.listen(port, () => console.log('listening on port ' + port));
