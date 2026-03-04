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
import { RolesGuard } from 'src/guards/roles.guard'
import { Roles } from 'src/guards/roles.decorator'

// Service
import { UserService } from './user.service'

// DTOs
import { UpdateUserDto } from './dto/update-user.dto'

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATOR')
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
