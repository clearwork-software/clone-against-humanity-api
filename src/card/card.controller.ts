// Nest
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common'

// Guards
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'

// Service
import { CardService } from './card.service'

// DTOs
import { CreateCardDto } from './dto/create-card.dto'
import { UpdateCardDto } from './dto/update-card.dto'

@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() data: CreateCardDto) {
    return this.cardService.create(data)
  }

  @UseGuards(JwtAuthGuard)
  @Get('white')
  async getWhiteCard(@Query('gameId') gameId?: string) {
    if (gameId) {
      const cards = await this.cardService.generateHandForGame(
        'white',
        1,
        gameId,
      )
      return cards[0]
    }
    return await this.cardService.generateCard('white')
  }

  @UseGuards(JwtAuthGuard)
  @Get('white/hand')
  async getWhiteHand(@Query('gameId') gameId?: string) {
    if (gameId) {
      return await this.cardService.generateHandForGame('white', 5, gameId)
    }
    return await this.cardService.generateHand('white')
  }

  @UseGuards(JwtAuthGuard)
  @Get('black/hand')
  async getBlackHand(@Query('gameId') gameId?: string) {
    if (gameId) {
      return await this.cardService.generateHandForGame('black', 3, gameId)
    }
    return await this.cardService.generateHand('black')
  }

  @Get()
  findAll() {
    return this.cardService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateCardDto) {
    return this.cardService.update(id, data)
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardService.remove(id)
  }
}
