// Nest
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common'

// Guards
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'

// Service
import { GameService } from './game.service'

// DTOs
import { CreateGameDto } from './dto/create-game.dto'
import { UpdateGameDto } from './dto/update-game.dto'

@UseGuards(JwtAuthGuard)
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  create(@Body() data: CreateGameDto) {
    return this.gameService.create(data)
  }

  @Get()
  findAll() {
    return this.gameService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gameService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateGameDto) {
    return this.gameService.update(id, data)
  }

  @Put('join-by-code')
  async joinByCode(@Body() data: { invite_code: string }, @Req() req) {
    const game = await this.gameService.findByInviteCode(data.invite_code)

    if (!game) {
      throw new NotFoundException('Game not found for that invite code')
    }

    return this.gameService.playerJoin(game.id, req.user.id)
  }

  @Put(':id/join')
  updateJoin(@Param('id') id: string, @Req() req) {
    return this.gameService.playerJoin(id, req.user.id)
  }

  @Put(':id/leave')
  updateLeave(@Param('id') id: string, @Req() req) {
    return this.gameService.playerLeave(id, req.user.id)
  }

  @Put(':id/start')
  updateStart(@Param('id') id: string, @Req() req) {
    return this.gameService.startGame(id, req.user.id)
  }

  @Put(':id/select-black-card')
  updateSelectBlackCard(
    @Param('id') id: string,
    @Req() req,
    @Body() data: { card_id: string },
  ) {
    return this.gameService.selectBlackCard(id, req.user.id, data.card_id)
  }

  @Put(':id/select-white-card')
  updateSelectWhiteCard(
    @Param('id') id: string,
    @Req() req,
    @Body() data: { card_id: string },
  ) {
    return this.gameService.selectWhiteCard(id, req.user.id, data.card_id)
  }

  @Put(':id/select-winning-card')
  async updateSelectWinningCard(
    @Param('id') id: string,
    @Req() req,
    @Body() data: { card_id: string },
  ) {
    return this.gameService.selectWinningCard(id, req.user.id, data.card_id)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gameService.remove(id)
  }
}
