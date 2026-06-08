import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async createRoom(pseudo: string) {
    const player = await this.prisma.player.create({ data: { pseudo } });
    const room = await this.prisma.room.create({
      data: {
        code: this.generateCode(),
        scores: { create: { playerId: player.id, points: 0 } },
      },
    });
    return { room, player };
  }

  async joinRoom(code: string, pseudo: string) {
    const room = await this.prisma.room.findUnique({ where: { code } });
    if (!room) throw new NotFoundException(`Room ${code} introuvable`);
    const player = await this.prisma.player.create({ data: { pseudo } });
    await this.prisma.score.create({ data: { playerId: player.id, roomId: room.id, points: 0 } });
    return { room, player };
  }

  async getRoomState(code: string) {
    const room = await this.prisma.room.findUnique({
      where: { code },
      include: { scores: { include: { player: true } } },
    });
    return room;
  }
}
