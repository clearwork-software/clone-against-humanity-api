// TypeORM
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

// Entities
import { Card } from 'src/card/entities/card.entity'
import { Game } from './game.entity'
import { User } from 'src/user/entities/user.entity'

export enum RoundPhase {
  PICKING_BLACK = 'picking_black',
  PICKING_WHITE = 'picking_white',
  JUDGING = 'judging',
  COMPLETE = 'complete',
}

@Entity()
@Index(['game_id', 'number'])
export class GameRound {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  game_id: string

  @ManyToOne(() => Game, (game) => game.rounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game

  @Column()
  number: number

  @Column({ nullable: true })
  czar_id: string

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'czar_id' })
  czar: User

  @Column({
    type: 'varchar',
    enum: RoundPhase,
    default: RoundPhase.PICKING_BLACK,
  })
  phase: RoundPhase

  @Column('json', {
    nullable: true,
  })
  black_card: SelectedCard

  @Column('json', {
    nullable: true,
  })
  white_cards: SelectedCard[]

  @Column('json', {
    nullable: true,
  })
  winning_card: SelectedCard
}

type SelectedCard = Card & {
  player_id: string
  player_name: string
}
