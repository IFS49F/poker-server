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
    console.log('Client ' + socket.id + ' joined room ' + room + ' ...');

    currentRoom = room;

    socket.join(room, () => {
      if (!clients[room]) {
        console.log('New room ' + room + ' created for the first client...');
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
    if (!clients[currentRoom]) { return; }

    console.log('Client ' + socket.id + ' of room ' + currentRoom + ' voted...');

    let votingPlayer = clients[currentRoom].team.find(item => item.id === socket.id);

    votingPlayer.score = score;
    votingPlayer.voted = true;

    io.in(currentRoom).emit('voted', clients[currentRoom]);
  });

  socket.on('show', (show) => {
    if (!clients[currentRoom]) { return; }

    console.log('Client ' + socket.id + ' of room ' + currentRoom + ' showed the result...');

    clients[currentRoom].show = show;

    io.in(currentRoom).emit('voted', clients[currentRoom]);
  });

  socket.on('clear', (show) => {
    if (!clients[currentRoom]) { return; }

    console.log('Client ' + socket.id + ' of room ' + currentRoom + ' cleared the result...');

    clients[currentRoom].team.forEach(item => {
      item.score = null;
      item.voted = false;
    });
    clients[currentRoom].show = false;

    io.in(currentRoom).emit('cleared', clients[currentRoom]);
  });

  socket.on('disconnect', () => {
    if (!clients[currentRoom]) { return; }

    console.log('Client ' + socket.id + ' of room ' + currentRoom + ' disconnected...');

    clients[currentRoom].team = clients[currentRoom].team.filter(item => item.id !== socket.id);

    if (clients[currentRoom].team.length === 0) {
      console.log('All clients in disconnected, close room ' + currentRoom);
      delete clients[currentRoom];
    }

    io.in(currentRoom).emit('disconnected', clients[currentRoom]);
  })
}

io.on('connection', onConnection);

http.listen(port, () => console.log('listening on port ' + port));
