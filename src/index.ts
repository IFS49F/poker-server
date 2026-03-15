import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import registerSocketHandlers from './socket/index'
import type { ServerToClientEvents, ClientToServerEvents } from './types'

const app = express()
const http = createServer(app)
const clientOrigin = process.env.CLIENT_ORIGIN || '*'
const io = new Server<ClientToServerEvents, ServerToClientEvents>(http, {
  cors: {
    origin: clientOrigin,
    methods: ['GET', 'POST']
  },
  serveClient: false,
  pingInterval: 5000,
  pingTimeout: 15000
})
const port = process.env.PORT || 4000

app.use(express.static(__dirname + '/../public'))

io.on('connection', (socket) => registerSocketHandlers(socket, io))

http.listen(port, () => console.log(`Listening on port ${port}`))
