import envConfig from './config/env.config'
import { RequestMethod, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { patchNestJsSwagger } from 'nestjs-zod'
import { AppModule } from './app.module'
import setupSwagger from './config/swagger.config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const corsOrigin = envConfig.APP_CORS_ORIGIN
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true
  })
  console.info('CORS Origin:', corsOrigin)

  patchNestJsSwagger()

  // Use global prefix if you don't have subdomain
  if (envConfig.API_PREFIX) {
    app.setGlobalPrefix(envConfig.API_PREFIX, {
      exclude: [
        { method: RequestMethod.GET, path: '/' },
        { method: RequestMethod.GET, path: 'health' }
      ]
    })
  }

  //version
  app.enableVersioning({
    type: VersioningType.URI
  })

  //swagger
  setupSwagger(app)

  await app.listen(envConfig.APP_PORT, '0.0.0.0')

  console.log(`
    ███╗   ██╗███████╗███████╗████████╗    ██████╗  ██████╗  ██████╗
    ████╗  ██║██╔════╝██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗██╔═══██╗
    ██╔██╗ ██║█████╗  █████╗     ██║       ██████╔╝██║   ██║██║   ██║
    ██║╚██╗██║██╔══╝  ██╔══╝     ██║       ██╔══██╗██║   ██║██║   ██║
    ██║ ╚████║██║     ███████╗   ██║       ██████╔╝╚██████╔╝╚██████╔╝
    ╚═╝  ╚═══╝╚═╝     ╚══════╝   ╚═╝       ╚═════╝  ╚═════╝  ╚═════╝

    🌟 Your NestJS app is now running! 🌟
    🛠️  Built with TypeScript & NestJS
    `)

  console.info(`Server running on ${await app.getUrl()}`)

  return app
}
bootstrap()
