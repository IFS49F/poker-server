const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const Redis = require('ioredis');
const port = process.env.PORT || 4000;

app.use(express.static(__dirname + '/public'));

let clients = {};
let redis = new Redis();

function onConnection(socket) {
  console.log('Client ' + socket.id + ' connected...');

  let currentRoom = null;

  socket.on('join', (room, playerName) => {
    console.log('Client ' + socket.id + ' joined room ' + room + ' ...');

    currentRoom = room;

    socket.join(room, () => {
      redis.get(room, (err, result) => {
        if (!result) {
          console.log('New room ' + room + ' created for the first client...');
          result = {
            team: [],
            show: false
          }
        } else {
          result = JSON.parse(result);
        }

        result.team.push({
          id: socket.id,
          name: playerName,
          score: null,
          voted: false
        });

        redis.set(room, JSON.stringify(result));
        // sending to all clients in room include sender
        io.in(room).emit('joined', result);
      });
    });
  });

  socket.on('vote', (score) => {
    redis.get(currentRoom, (err, result) => {
      if (!result) { return; }

      result = JSON.parse(result);

      console.log('Client ' + socket.id + ' of room ' + currentRoom + ' voted...');

      let votingPlayer = result.team.find(item => item.id === socket.id);

      votingPlayer.score = score;
      votingPlayer.voted = true;

      redis.set(currentRoom, JSON.stringify(result));
      io.in(currentRoom).emit('voted', result);
    });
  });

  socket.on('show', (show) => {
    redis.get(currentRoom, (err, result) => {
      if (!result) { return; }

      result = JSON.parse(result);

      console.log('Client ' + socket.id + ' of room ' + currentRoom + ' showed the result...');

      result.show = show;

      redis.set(currentRoom, JSON.stringify(result));
      io.in(currentRoom).emit('voted', result);
    });
  });

  socket.on('clear', (show) => {
    redis.get(currentRoom, (err, result) => {
      if (!result) { return; }

      result = JSON.parse(result);

      console.log('Client ' + socket.id + ' of room ' + currentRoom + ' cleared the result...');

      result.team.forEach(item => {
        item.score = null;
        item.voted = false;
      });
      result.show = false;

      redis.set(currentRoom, JSON.stringify(result));
      io.in(currentRoom).emit('cleared', result);
    });
  });

  socket.on('disconnect', () => {
    redis.get(currentRoom, (err, result) => {
      if (!result) { return; }

      result = JSON.parse(result);

      console.log('Client ' + socket.id + ' of room ' + currentRoom + ' disconnected...');

      result.team = result.team.filter(item => item.id !== socket.id);

      if (result.team.length === 0) {
        console.log('All clients in disconnected, close room ' + currentRoom);
        result = null;
        redis.del(currentRoom);
      } else {
        redis.set(currentRoom, JSON.stringify(result));
      }

      io.in(currentRoom).emit('disconnected', result);
    });
  });
}

io.on('connection', onConnection);

http.listen(port, () => console.log('listening on port ' + port));
