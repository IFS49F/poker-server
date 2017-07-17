const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const Redis = require('ioredis');
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const port = process.env.PORT || 4000;

app.use(express.static(__dirname + '/public'));

const ts = new Date().getTime();
const redis = new Redis(redisUrl, {
  keyPrefix: `poker:${ts}:`
});
const defaultState = {
  team: [],
  show: false
};

function getResultWithoutScores(result) {
  if (!result) { return defaultState; }

  /*
  * For players who just joined or player, if `Show` has been
  * clicked already, they should also see others' scores.
  */
  if (result.show) { return result; }

  let { team, show } = result;

  return {
    team: team.map(player => Object.assign({}, player, { score: null })),
    show
  };
}

function onConnection(socket) {
  console.log(`Client '${socket.id}' connected`);

  let currentRoom = null;

  socket.on('join', (room, playerName) => {
    console.log(`Client '${socket.id}' joined room '${room}'`);

    currentRoom = room;

    socket.join(currentRoom, () => {
      redis.get(currentRoom, (err, result) => {
        if (!result) {
          console.log(`New room '${currentRoom}' created`);
          result = defaultState;
        } else {
          result = JSON.parse(result);
        }

        redis.set(currentRoom, JSON.stringify(result));
        io.in(currentRoom).emit('stateUpdate', getResultWithoutScores(result));
      });
    });
  });

  socket.on('play', (playerName) => {
    redis.get(currentRoom, (err, result) => {
      if (!result) { return };

      result = JSON.parse(result);

      console.log(`Client '${socket.id}' starts playing in room '${currentRoom}' under the name '${playerName}'`);

      result.team.push({
        id: socket.id,
        name: playerName,
        score: null,
        voted: false
      });

      redis.set(currentRoom, JSON.stringify(result));
      io.in(currentRoom).emit('stateUpdate', getResultWithoutScores(result));
    });
  });

  socket.on('vote', (score) => {
    redis.get(currentRoom, (err, result) => {
      if (!result) { return; }

      result = JSON.parse(result);

      console.log(`Client '${socket.id}' of room '${currentRoom}' voted`);

      let votingPlayer = result.team.find(item => item.id === socket.id);

      votingPlayer.score = score;
      votingPlayer.voted = true;

      redis.set(currentRoom, JSON.stringify(result));
      io.in(currentRoom).emit('stateUpdate', getResultWithoutScores(result));
    });
  });

  socket.on('show', () => {
    redis.get(currentRoom, (err, result) => {
      if (!result) { return; }

      result = JSON.parse(result);

      console.log(`Client '${socket.id}' of room '${currentRoom}' showed the result`);

      result.show = true;

      redis.set(currentRoom, JSON.stringify(result));
      io.in(currentRoom).emit('stateUpdate', result);
    });
  });

  socket.on('clear', () => {
    redis.get(currentRoom, (err, result) => {
      if (!result) { return; }

      result = JSON.parse(result);

      console.log(`Client '${socket.id}' of room '${currentRoom}' cleared the result`);

      result.team.forEach(item => {
        item.score = null;
        item.voted = false;
      });
      result.show = false;

      redis.set(currentRoom, JSON.stringify(result));
      io.in(currentRoom).emit('stateUpdate', result);
    });
  });

  socket.on('disconnect', () => {
    redis.get(currentRoom, (err, result) => {
      if (!result) { return; }

      result = JSON.parse(result);

      console.log(`Client '${socket.id}' of room '${currentRoom}' disconnected`);

      result.team = result.team.filter(item => item.id !== socket.id);

      if (result.team.length === 0) {
        console.log(`All clients of room '${currentRoom}' disconnected, deleting the room`);
        result = defaultState;
        redis.del(currentRoom);
      } else {
        redis.set(currentRoom, JSON.stringify(result));
      }

      io.in(currentRoom).emit('stateUpdate', getResultWithoutScores(result));
    });
  });
}

io.on('connection', onConnection);

http.listen(port, () => console.log(`Listening on port ${port}`));
