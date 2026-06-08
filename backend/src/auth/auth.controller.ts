import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('guest')
  joinAsGuest(@Body('pseudo') pseudo: string) {
    return this.auth.joinAsGuest(pseudo);
  }
}
