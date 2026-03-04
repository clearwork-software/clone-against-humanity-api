// Nest
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

// TypeORM
import { DataSource, Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'

// Service
import { CardService } from 'src/card/card.service'
import { UserService } from 'src/user/user.service'

// Gateway
import { GameGateway } from './game.gateway'

// Entities
import { Game, GameStatus } from './entities/game.entity'
import { GameRound, RoundPhase } from './entities/round.entity'

// DTOs
import { CreateGameDto } from './dto/create-game.dto'
import { UpdateGameDto } from './dto/update-game.dto'

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game) private gameRepo: Repository<Game>,
    @InjectRepository(GameRound) private roundRepo: Repository<GameRound>,

    private readonly dataSource: DataSource,
    private readonly gameGateway: GameGateway,

    private readonly cardService: CardService,
    private readonly userService: UserService,
  ) {}

  async create(data: CreateGameDto): Promise<Game> {
    const game = await this.gameRepo.save(data)

    this.gameGateway.server.emit('game_created', game)

    return game
  }

  async findAll(): Promise<Game[]> {
    const games = await this.gameRepo.find({
      relations: ['players', 'rounds'],
      order: { rounds: { number: 'ASC' } },
    })

    return games
  }

  async findOne(id: string): Promise<Game> {
    const game = await this.gameRepo.findOne({
      where: { id },
      relations: ['players', 'rounds'],
      order: { rounds: { number: 'ASC' } },
    })

    return game
  }

  async findByInviteCode(code: string): Promise<Game> {
    const game = await this.gameRepo.findOne({
      where: { invite_code: code },
      relations: ['players', 'rounds'],
      order: { rounds: { number: 'ASC' } },
    })

    return game
  }

  async update(id: string, data: UpdateGameDto): Promise<Game> {
    const game = await this.findOne(id)

    if (!game) {
      throw new Error('Game not found')
    }

    await this.gameRepo.update(id, data)

    const updated = await this.findOne(id)

    this.gameGateway.server.to(id).emit('game_updated', updated)

    return updated
  }

  async playerJoin(id: string, playerId: string): Promise<Game> {
    const game = await this.findOne(id)

    if (!game) {
      throw new NotFoundException('Game not found')
    }

    if (game?.players?.length >= game.max_players) {
      throw new BadRequestException('Game is full')
    }

    const alreadyJoined = game.players.some((p) => p.id === playerId)
    if (alreadyJoined) {
      throw new BadRequestException('Player already in game')
    }

    const player = await this.userService.findOne(playerId)

    game.players.push(player)

    await this.gameRepo.save(game)

    const updated = await this.findOne(id)

    this.gameGateway.server.to(id).emit('game_updated', updated)

    return updated
  }

  async playerLeave(id: string, playerId: string) {
    const game = await this.findOne(id)

    if (!game) {
      throw new NotFoundException('Game not found')
    }

    game.players = game.players.filter((p) => p.id !== playerId)

    await this.gameRepo.save(game)

    const updated = await this.findOne(id)

    this.gameGateway.server.to(id).emit('game_updated', updated)

    return updated
  }

  async startGame(id: string, playerId: string): Promise<Game> {
    const game = await this.findOne(id)

    if (!game) {
      throw new NotFoundException('Game not found')
    }

    if (game.status !== GameStatus.WAITING) {
      throw new BadRequestException('Game has already started')
    }

    if (game.players.length < 2) {
      throw new BadRequestException('Not enough players')
    }

    if (game.host !== playerId) {
      throw new BadRequestException('You are not the host')
    }

    game.status = GameStatus.IN_PROGRESS
    await this.gameRepo.save(game)

    await this.roundRepo.save({
      game_id: game.id,
      number: 1,
      czar_id: game.players[0].id,
      phase: RoundPhase.PICKING_BLACK,
    })

    const updated = await this.findOne(id)

    this.gameGateway.server.to(id).emit('game_updated', updated)

    return updated
  }

  async selectBlackCard(
    id: string,
    playerId: string,
    cardId: string,
  ): Promise<Game> {
    const game = await this.findOne(id)

    if (!game) {
      throw new NotFoundException('Game not found')
    }

    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is not in progress')
    }

    const round = game.rounds[game.rounds.length - 1]

    if (round.phase !== RoundPhase.PICKING_BLACK) {
      throw new BadRequestException('Not in black card selection phase')
    }

    if (round.czar_id !== playerId) {
      throw new BadRequestException('You are not the czar')
    }

    const card = await this.cardService.findOne(cardId)
    const player = game.players.find((p) => p.id === playerId)

    if (!player) {
      throw new BadRequestException('Player is not in this game')
    }

    round.black_card = {
      ...card,
      player_id: player.id,
      player_name: player.username,
    }

    round.phase = RoundPhase.PICKING_WHITE

    await this.roundRepo.save(round)

    const updated = await this.findOne(id)

    this.gameGateway.server.to(id).emit('game_updated', updated)

    return updated
  }

  async selectWhiteCard(
    id: string,
    playerId: string,
    cardId: string,
  ): Promise<Game> {
    const game = await this.findOne(id)

    if (!game) {
      throw new NotFoundException('Game not found')
    }

    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is not in progress')
    }

    const currentRound = game.rounds[game.rounds.length - 1]

    if (currentRound.phase !== RoundPhase.PICKING_WHITE) {
      throw new BadRequestException('Not in white card selection phase')
    }

    if (currentRound.czar_id === playerId) {
      throw new BadRequestException('You are the czar')
    }

    const player = game.players.find((p) => p.id === playerId)

    if (!player) {
      throw new BadRequestException('Player is not in this game')
    }

    const card = await this.cardService.findOne(cardId)

    // Use a transaction with pessimistic lock to prevent lost updates
    // on the white_cards JSON column when multiple players submit simultaneously
    await this.dataSource.transaction(async (manager) => {
      const round = await manager.findOne(GameRound, {
        where: { id: currentRound.id },
        lock: { mode: 'pessimistic_write' },
      })

      const cards = round.white_cards || []

      if (cards.some((c) => c.player_id === playerId)) {
        throw new BadRequestException('You already played a card this round')
      }

      cards.push({
        ...card,
        player_id: player.id,
        player_name: player.username,
      })

      round.white_cards = cards

      const nonCzarCount = game.players.length - 1
      if (cards.length >= nonCzarCount) {
        round.phase = RoundPhase.JUDGING
      }

      await manager.save(round)
    })

    const updated = await this.findOne(id)

    this.gameGateway.server.to(id).emit('game_updated', updated)

    return updated
  }

  async selectWinningCard(
    id: string,
    playerId: string,
    card_id: string,
  ): Promise<Game> {
    const game = await this.findOne(id)

    if (!game) {
      throw new NotFoundException('Game not found')
    }

    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is not in progress')
    }

    const round = game.rounds[game.rounds.length - 1]

    if (round.phase !== RoundPhase.JUDGING) {
      throw new BadRequestException('Not in judging phase')
    }

    if (round.czar_id !== playerId) {
      throw new BadRequestException('Only the czar can pick the winner')
    }

    const card = round.white_cards?.find((c) => c.id === card_id)

    if (!card) {
      throw new BadRequestException('Card not found in submitted cards')
    }

    round.winning_card = {
      ...card,
    }

    round.phase = RoundPhase.COMPLETE

    await this.roundRepo.save(round)

    // Determine if the game is over or if we need a new round
    if (game.rounds.length >= game.max_rounds) {
      return this.endGameInternal(id)
    } else {
      return this.startNewRoundInternal(game, round)
    }
  }

  private async startNewRoundInternal(
    game: Game,
    currentRound: GameRound,
  ): Promise<Game> {
    const czarIndex = game.players.findIndex(
      (p) => p.id === currentRound.czar_id,
    )

    const nextCzarIndex =
      czarIndex + 1 >= game.players.length ? 0 : czarIndex + 1

    const nextCzar = game.players[nextCzarIndex]

    await this.roundRepo.save({
      game_id: game.id,
      number: currentRound.number + 1,
      czar_id: nextCzar.id,
      phase: RoundPhase.PICKING_BLACK,
    })

    const updated = await this.findOne(game.id)

    this.gameGateway.server.to(game.id).emit('game_updated', updated)

    return updated
  }

  private async endGameInternal(id: string): Promise<Game> {
    const game = await this.findOne(id)

    if (!game) {
      throw new NotFoundException('Game not found')
    }

    // calculate winner
    const scoreMap = new Map<string, number>()

    for (const round of game.rounds) {
      if (round.winning_card) {
        const winnerId = round.winning_card.player_id
        const currentScore = scoreMap.get(winnerId) || 0

        scoreMap.set(winnerId, currentScore + 1)
      }
    }

    let topScore = 0
    let winnerId = ''

    for (const [playerId, score] of scoreMap) {
      if (score > topScore) {
        topScore = score
        winnerId = playerId
      }
    }

    game.winner = winnerId
    game.status = GameStatus.FINISHED

    await this.gameRepo.save(game)

    const updated = await this.findOne(id)

    this.gameGateway.server.to(id).emit('game_updated', updated)

    return updated
  }

  async remove(id: string): Promise<void> {
    const game = await this.findOne(id)

    if (game) {
      await this.gameRepo.remove(game)
    }
  }
}
