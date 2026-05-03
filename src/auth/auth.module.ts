import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtGuard } from '../guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local-strategy.auth';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<number>('JWT_EXPIRATION') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalAuthGuard,
    JwtGuard,
    JwtStrategy,
    LocalStrategy,
  ],
})
export class AuthModule {}
