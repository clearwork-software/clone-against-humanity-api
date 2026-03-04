// Nest
import { BadRequestException, Injectable } from '@nestjs/common'

// Passport
import { JwtService } from '@nestjs/jwt'

// Service
import { UserService } from 'src/user/user.service'

// DTOs
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(data: LoginDto): Promise<any> {
    const user = await this.userService.findOneByUsernameWithPassword(data.username)

    if (!user) {
      throw new BadRequestException('Invalid username or password')
    }

    const verified = await this.userService.verifyPassword(
      data.password,
      user.password,
    )

    if (!verified) {
      throw new BadRequestException('Invalid username or password')
    }

    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles || ['USER'],
    }

    return {
      access_token: this.jwtService.sign(payload),
    }
  }

  async register(data: RegisterDto): Promise<any> {
    const user = await this.userService.findOneByUsernameOrEmail(data)

    if (user?.username) {
      throw new BadRequestException('Username already exists')
    }

    if (user?.email) {
      throw new BadRequestException('Email already exists')
    }

    const registered = await this.userService.create(data)

    const payload = {
      username: registered.username,
      sub: registered.id,
      roles: registered.roles || ['USER'],
    }

    const { password: _, ...userWithoutPassword } = registered

    return {
      access_token: this.jwtService.sign(payload),
      ...userWithoutPassword,
    }
  }

  async getProfile(user: { id: string; username: string }): Promise<any> {
    const found = await this.userService.findOneByUsername(user.username)

    if (!found) {
      throw new BadRequestException('User not found')
    }

    return found
  }
}
