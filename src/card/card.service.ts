// Nest
import { Injectable } from '@nestjs/common'

// TypeORM
import { DataSource, Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'

// Entities
import { Card } from './entities/card.entity'
import { Game } from 'src/game/entities/game.entity'

// DTOs
import { CreateCardDto } from './dto/create-card.dto'
import { UpdateCardDto } from './dto/update-card.dto'

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card) private cardRepo: Repository<Card>,
    @InjectRepository(Game) private gameRepo: Repository<Game>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: CreateCardDto): Promise<Card> {
    return await this.cardRepo.save(data)
  }

  async findAll(): Promise<Card[]> {
    return await this.cardRepo.find()
  }

  async findAllOfType(type: 'black' | 'white'): Promise<Card[]> {
    return await this.cardRepo.find({ where: { type } })
  }

  async findOne(id: string): Promise<Card> {
    return await this.cardRepo.findOne({ where: { id } })
  }

  async update(id: string, data: UpdateCardDto): Promise<void> {
    await this.cardRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    await this.cardRepo.delete(id)
  }

  async generateCard(type: 'black' | 'white'): Promise<Card> {
    const cards = await this.findAllOfType(type)
    const random = Math.floor(Math.random() * cards.length)

    return cards[random]
  }

  async generateHand(type: 'black' | 'white'): Promise<Card[]> {
    const count = type === 'white' ? 5 : 3
    const allCards = await this.findAllOfType(type)
    const hand: Card[] = []
    const usedIds = new Set<string>()

    for (let i = 0; i < count; i++) {
      const remaining = allCards.filter((c) => !usedIds.has(c.id))
      if (remaining.length === 0) break

      const random = Math.floor(Math.random() * remaining.length)
      const card = remaining[random]
      hand.push(card)
      usedIds.add(card.id)
    }

    return hand
  }

  async generateHandForGame(
    type: 'black' | 'white',
    count: number,
    gameId: string,
  ): Promise<Card[]> {
    const allCards = await this.findAllOfType(type)

    // Use a transaction with pessimistic lock to prevent duplicate card deals
    // when multiple players request hands simultaneously
    return this.dataSource.transaction(async (manager) => {
      const game = await manager.findOne(Game, {
        where: { id: gameId },
        lock: { mode: 'pessimistic_write' },
      })

      if (!game) {
        return this.generateHand(type)
      }

      const dealtKey =
        type === 'white' ? 'dealt_white_cards' : 'dealt_black_cards'
      let dealtIds: string[] = game[dealtKey] || []

      let available = allCards.filter((card) => !dealtIds.includes(card.id))

      // If not enough cards remain, reshuffle
      if (available.length < count) {
        dealtIds = []
        available = allCards
      }

      // Pick random cards without duplicates within the hand
      const hand: Card[] = []
      const usedInHand = new Set<string>()

      for (let i = 0; i < count && available.length > 0; i++) {
        const remaining = available.filter((c) => !usedInHand.has(c.id))
        if (remaining.length === 0) break

        const random = Math.floor(Math.random() * remaining.length)
        const card = remaining[random]
        hand.push(card)
        usedInHand.add(card.id)
      }

      // Update dealt cards on the game
      const newDealtIds = [...dealtIds, ...hand.map((c) => c.id)]
      await manager.update(Game, gameId, { [dealtKey]: newDealtIds })

      return hand
    })
  }
}
