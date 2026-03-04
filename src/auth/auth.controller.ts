// Nest
import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common'

// Guards
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'

// Service
import { AuthService } from './auth.service'

// DTOs
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() data: LoginDto) {
    return this.authService.login(data)
  }

  @Post('register')
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req) {
    return this.authService.getProfile(req.user)
  }
}
