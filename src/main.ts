// Nest
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'

// Modules
import { AppModule } from './app.module'
import { readFileSync } from 'fs'
import { IoAdapter } from '@nestjs/platform-socket.io'

async function bootstrap() {
  const httpsOptions =
    process.env.NODE_ENV === 'production'
      ? {
          key: readFileSync(
            '/etc/letsencrypt/live/api.cloneagainsthumanity.com/privkey.pem',
          ),
          cert: readFileSync(
            '/etc/letsencrypt/live/api.cloneagainsthumanity.com/fullchain.pem',
          ),
        }
      : null

  const app = await NestFactory.create(AppModule, {
    httpsOptions,
  })

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  })

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  )

  app.useWebSocketAdapter(new IoAdapter(app))

  await app.listen(4000, '0.0.0.0')
}
bootstrap()
