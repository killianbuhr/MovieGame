import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async joinAsGuest(pseudo: string) {
    const player = await this.prisma.player.create({
      data: { pseudo },
    });

    const token = this.jwt.sign({ sub: player.id, pseudo: player.pseudo });

    return { token, player };
  }
}
