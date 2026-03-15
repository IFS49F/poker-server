import type { Server, Socket } from 'socket.io'
import redis from '../db/redis'
import type { Player, RoomState, StateUpdatePayload, ServerToClientEvents, ClientToServerEvents } from '../types'

const defaultState: RoomState = {
  team: [],
  show: false
}

const getResultWithoutScores = (result: RoomState): RoomState => {
  if (result.show) { return result }

  const { team, show } = result
  return {
    team: team.map(player => ({ ...player, score: null })),
    show
  }
}

const isRoomEmpty = (io: Server, currentRoom: string): boolean => {
  const room = io.sockets.adapter.rooms.get(currentRoom)
  return !room || room.size === 0
}

export default (socket: Socket<ClientToServerEvents, ServerToClientEvents>, io: Server<ClientToServerEvents, ServerToClientEvents>) => {
  console.log(`Client '${socket.id}' connected`)
  let currentRoom: string | null = null

  socket.on('join', async (room = '') => {
    currentRoom = room.toLowerCase()
    console.log(`Client '${socket.id}' joined room '${currentRoom}'`)

    // socket.join() is synchronous in socket.io v4 (no callback)
    socket.join(currentRoom)

    let result = await redis.get(currentRoom)
    if (!result) {
      console.log(`New room '${currentRoom}' created`)
      result = { ...defaultState }
    }
    redis.set(currentRoom, result)
    io.in(currentRoom).emit('stateUpdate', getResultWithoutScores(result))
  })

  socket.on('play', (player) => {
    if (!currentRoom) { return }
    redis.get(currentRoom).then(result => {
      if (!result) { return }

      const playerData = typeof player !== 'object' ? { name: player } : player
      console.log(`Client '${socket.id}' starts playing in room '${currentRoom}' under the name '${playerData.name}'`)
      result.team.push({
        ...playerData,
        id: socket.id,
        score: null,
        voted: false,
      } as Player)

      redis.set(currentRoom!, result)
      io.in(currentRoom!).emit('stateUpdate', getResultWithoutScores(result))
    })
  })

  socket.on('vote', (score) => {
    if (!currentRoom) { return }
    redis.get(currentRoom).then(result => {
      if (!result) { return }

      console.log(`Client '${socket.id}' of room '${currentRoom}' voted`)
      const votingPlayer = result.team.find(item => item.id === socket.id)
      if (!votingPlayer) { return }

      votingPlayer.score = score
      votingPlayer.voted = true

      const payload: StateUpdatePayload = {
        ...getResultWithoutScores(result),
        action: { type: 'vote', playerId: votingPlayer.id }
      }

      redis.set(currentRoom!, result)
      io.in(currentRoom!).emit('stateUpdate', payload)
    })
  })

  socket.on('show', () => {
    if (!currentRoom) { return }
    redis.get(currentRoom).then(result => {
      if (!result) { return }

      console.log(`Client '${socket.id}' of room '${currentRoom}' showed the result`)
      result.show = true

      const payload: StateUpdatePayload = {
        ...result,
        action: { type: 'show', playerId: socket.id }
      }

      redis.set(currentRoom!, result)
      io.in(currentRoom!).emit('stateUpdate', payload)
    })
  })

  socket.on('clear', () => {
    if (!currentRoom) { return }
    redis.get(currentRoom).then(result => {
      if (!result) { return }

      console.log(`Client '${socket.id}' of room '${currentRoom}' cleared the result`)
      result.team.forEach(item => {
        item.score = null
        item.voted = false
      })
      result.show = false

      const payload: StateUpdatePayload = {
        ...result,
        action: { type: 'clear', playerId: socket.id }
      }

      redis.set(currentRoom!, result)
      // second arg `true` signals clients to also clear their local `myScore`
      io.in(currentRoom!).emit('stateUpdate', payload, true)
    })
  })

  socket.on('disconnect', () => {
    if (!currentRoom) { return }
    redis.get(currentRoom).then(result => {
      if (!result) { return }

      console.log(`Client '${socket.id}' of room '${currentRoom}' disconnected`)
      result.team = result.team.filter(item => item.id !== socket.id)

      if (isRoomEmpty(io, currentRoom!)) {
        console.log(`All clients of room '${currentRoom}' disconnected, deleting the room`)
        redis.del(currentRoom!)
        socket.to(currentRoom!).emit('stateUpdate', defaultState)
      } else {
        redis.set(currentRoom!, result)
        socket.to(currentRoom!).emit('stateUpdate', getResultWithoutScores(result))
      }
    })
  })
}
