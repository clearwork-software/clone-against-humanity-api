// Nest
import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common'

// Guards
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'

// Service
import { UserService } from './user.service'

// Entities
import { User } from './entities/user.entity'

// DTOs
import { UpdateUserDto } from './dto/update-user.dto'

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateUserDto, @Req() req) {
    if (req.user.id !== id) {
      throw new ForbiddenException('You can only update your own profile')
    }

    return this.userService.update(id, data)
  }
}
