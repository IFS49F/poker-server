const redis = require('../db/redis');
const defaultState = {
  team: [],
  show: false
};
// sometime if we want to show how many observers there
// are in current room to clients, this filter is not needed.
const filterObservers = (result) => {
  if (!result) { return defaultState; }

  let { team, show } = result;
  return {
    team: team.filter(player => player.name),
    show
  };
};
const filterScores = (result) => {
  if (!result) { return defaultState; }
  // scores should not be filtered if `show` is true
  if (result.show) { return filterObservers(result); }

  let { team, show } = result;
  return filterObservers({
    team: team.map(player => Object.assign({}, player, { score: null })),
    show
  });
};

module.exports = (socket, io) => {
  console.log(`Client '${socket.id}' connected`);
  let currentRoom = null;

  socket.on('join', (room, playerName) => {
    console.log(`Client '${socket.id}' joined room '${room}'`);
    currentRoom = room;

    socket.join(currentRoom, () => {
      redis.get(currentRoom).then(result => {
        if (!result) {
          console.log(`New room '${currentRoom}' created`);
          result = defaultState;
        }
        // we should also store observer into redis, otherwise
        // if the unique player quit, the observer can not play
        // since the room has been deleted.
        result.team.push({
          id: socket.id,
          // if there is no name, that says he/she is observer.
          name: null,
          score: null,
          voted: false
        });

        redis.set(currentRoom, result);
        io.in(currentRoom).emit('stateUpdate', filterScores(result));
      });
    });
  });

  socket.on('play', (playerName) => {
    redis.get(currentRoom).then(result => {
      if (!result) { return; }

      console.log(`Client '${socket.id}' starts playing in room '${currentRoom}' under the name '${playerName}'`);
      let player = result.team.find(item => item.id === socket.id);
      player.name = playerName;

      redis.set(currentRoom, result);
      io.in(currentRoom).emit('stateUpdate', filterScores(result));
    });
  });

  socket.on('vote', (score) => {
    redis.get(currentRoom).then(result => {
      if (!result) { return; }

      console.log(`Client '${socket.id}' of room '${currentRoom}' voted`);
      let votingPlayer = result.team.find(item => item.id === socket.id);
      votingPlayer.score = score;
      votingPlayer.voted = true;

      redis.set(currentRoom, result);
      io.in(currentRoom).emit('stateUpdate', filterScores(result));
    });
  });

  socket.on('show', () => {
    redis.get(currentRoom).then(result => {
      if (!result) { return; }

      console.log(`Client '${socket.id}' of room '${currentRoom}' showed the result`);
      result.show = true;

      redis.set(currentRoom, result);
      io.in(currentRoom).emit('stateUpdate', filterObservers(result));
    });
  });

  socket.on('clear', () => {
    redis.get(currentRoom).then(result => {
      if (!result) { return; }

      console.log(`Client '${socket.id}' of room '${currentRoom}' cleared the result`);
      result.team.forEach(item => {
        item.score = null;
        item.voted = false;
      });
      result.show = false;

      redis.set(currentRoom, result);
      // the boolean is used for clients to indicate it's clear action,
      // then the local state `myScore` could be cleared.
      io.in(currentRoom).emit('stateUpdate', filterObservers(result), true);
    });
  });

  socket.on('disconnect', () => {
    redis.get(currentRoom).then(result => {
      if (!result) { return; }

      console.log(`Client '${socket.id}' of room '${currentRoom}' disconnected`);
      result.team = result.team.filter(item => item.id !== socket.id);
      if (result.team.length === 0) {
        console.log(`All clients of room '${currentRoom}' disconnected, deleting the room`);
        result = defaultState;
        redis.del(currentRoom);
      } else {
        redis.set(currentRoom, result);
      }

      socket.to(currentRoom).emit('stateUpdate', filterScores(result));
    });
  });
}
