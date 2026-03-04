import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator'

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  host: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  invite_code: string

  @IsNumber()
  @Min(2)
  @Max(20)
  max_players: number

  @IsNumber()
  @Min(1)
  @Max(50)
  max_rounds: number
}
