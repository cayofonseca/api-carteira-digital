import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filter/global.exception';
import { GlobalInterceptor } from './common/interceptors/global.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new GlobalInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
