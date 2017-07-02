const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 4000;

app.use(express.static(__dirname + '/public'));

let clients = {};

function onConnection(socket) {
  console.log('Client ' + socket.id + ' connected...');

  let currentRoom = null;

  socket.on('join', (room, playerName) => {
    console.log('Client ' + socket.id + ' joined...');

    currentRoom = room;

    socket.join(room, () => {
      if (!clients[room]) {
        clients[room] = {
          team: [],
          show: false
        };
      }

      clients[room].team.push({
        id: socket.id,
        name: playerName,
        score: null,
        voted: false
      });

      // sending to all clients in room include sender
      io.in(room).emit('joined', clients[room]);
    });
  });

  socket.on('vote', (score) => {
    console.log('Client ' + socket.id + ' voted...');

    let votingPlayer = clients[currentRoom].team.find(item => item.id === socket.id);

    votingPlayer.score = score;
    votingPlayer.voted = true;

    io.in(currentRoom).emit('voted', clients[currentRoom]);
  });

  socket.on('show', (show) => {
    console.log('Client ' + socket.id + ' showed the result...');

    clients[currentRoom].show = show;

    io.in(currentRoom).emit('voted', clients[currentRoom]);
  });

  socket.on('clear', (show) => {
    console.log('Client ' + socket.id + ' cleared the result...');

    clients[currentRoom].team.forEach(item => {
      item.score = null;
      item.voted = false;
    });
    clients[currentRoom].show = false;

    io.in(currentRoom).emit('cleared', clients[currentRoom]);
  });

  socket.on('disconnect', () => {
    console.log('Client ' + socket.id + ' disconnected...');

    if (!clients[currentRoom]) { return; }

    clients[currentRoom].team = clients[currentRoom].team.filter(item => item.id !== socket.id);

    io.in(currentRoom).emit('disconnected', clients[currentRoom]);
  })
}

io.on('connection', onConnection);

http.listen(port, () => console.log('listening on port ' + port));
