// TypeORM
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

// Entities
import { GameRound } from './round.entity'
import { User } from 'src/user/entities/user.entity'

export enum GameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
}

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  invite_code: string

  @Column()
  host: string

  @Column()
  max_players: number

  @JoinTable()
  @ManyToMany(() => User, (user) => user.games)
  players: User[]

  @Column()
  max_rounds: number

  @OneToMany(() => GameRound, (round) => round.game, { cascade: true })
  rounds: GameRound[] // ordered by { number: ASC } in all queries via findOne/findAll

  @Column({
    type: 'varchar',
    enum: GameStatus,
    default: GameStatus.WAITING,
  })
  status: GameStatus

  @Column('json', {
    default: '[]',
    nullable: false,
  })
  dealt_white_cards: string[]

  @Column('json', {
    default: '[]',
    nullable: false,
  })
  dealt_black_cards: string[]

  @Column({
    default: null,
    nullable: true,
  })
  winner?: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
