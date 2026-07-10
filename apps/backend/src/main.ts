import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so the Next.js frontend can query it
  app.enableCors();

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('MetroRadar API')
    .setDescription('Urban Mobility Intelligence Platform API Documentation')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}`);
  console.log(
    `Swagger documentation is running on: http://localhost:${port}/api`,
  );
  console.log(`Health endpoint is running on: http://localhost:${port}/health`);
}
bootstrap().catch((err) => console.error(err));
