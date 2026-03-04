// Nest
import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'

// JWT
import { JwtService } from '@nestjs/jwt'

// TypeORM
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'

// Socket
import { Server, Socket } from 'socket.io'

// Entities
import { Game } from './entities/game.entity'

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
})
export class GameGateway implements OnGatewayInit {
  @WebSocketServer() server: Server

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Game) private gameRepo: Repository<Game>,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token
        if (!token) {
          return next(new Error('Authentication required'))
        }

        const decoded = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        })

        socket.data.user = decoded
        next()
      } catch {
        next(new Error('Invalid token'))
      }
    })
  }

  async handleConnection(client: Socket) {
    console.log('Client connected: ' + client.id)
  }

  async handleDisconnect(client: Socket) {
    console.log('Client disconnected: ' + client.id)
  }

  @SubscribeMessage('join_game')
  async handleJoinGame(client: Socket, gameId: string) {
    const userId = client.data.user?.id
    if (!userId) {
      client.emit('error', { message: 'Not authenticated' })
      return
    }

    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['players'],
    })

    if (!game || !game.players.some((p) => p.id === userId)) {
      client.emit('error', { message: 'Not a player in this game' })
      return
    }

    client.join(gameId)
    console.log(`Client ${client.id} joined room ${gameId}`)
  }

  @SubscribeMessage('leave_game')
  handleLeaveGame(client: Socket, gameId: string) {
    client.leave(gameId)
    console.log(`Client ${client.id} left room ${gameId}`)
  }

  @SubscribeMessage('message')
  async handlePing(client: Socket) {
    console.log('Client pinged: ' + client.id)

    client.emit('message', {
      message: 'pong',
    })
  }
}
