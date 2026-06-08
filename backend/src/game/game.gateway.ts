import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private questionStartTimes = new Map<string, number>();
  private questionTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly game: GameService) {}

  @SubscribeMessage('game:start')
  async handleStart(@MessageBody() data: { roomCode: string }) {
    const session = await this.game.startGame(data.roomCode);
    const question = this.game.getCurrentQuestion(data.roomCode);
    const startedAt = Date.now();
    this.questionStartTimes.set(`${data.roomCode}:${session.currentIndex}`, startedAt);

    this.server.to(data.roomCode).emit('game:question', { ...question, startedAt });
    this.scheduleNext(data.roomCode, 0);
  }

  @SubscribeMessage('game:current-question')
  handleCurrentQuestion(@MessageBody() data: { roomCode: string }) {
    const question = this.game.getCurrentQuestion(data.roomCode);
    if (!question) return null;
    const startedAt = this.questionStartTimes.get(`${data.roomCode}:${question.index}`) || Date.now();
    return { ...question, startedAt };
  }

  @SubscribeMessage('game:answer')
  async handleAnswer(
    @MessageBody() data: { roomCode: string; answer: string; questionIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    const playerId = client.data.playerId;
    const startedAt = this.questionStartTimes.get(`${data.roomCode}:${data.questionIndex}`) || Date.now();
    const result = await this.game.submitAnswer(data.roomCode, playerId, data.answer, Date.now(), startedAt);
    client.emit('game:answer:result', result);

    // Si tout le monde a répondu, passer à la question suivante immédiatement
    if (result.allAnswered) {
      const timer = this.questionTimers.get(data.roomCode);
      if (timer) clearTimeout(timer);
      this.questionTimers.delete(data.roomCode);
      await this.moveToNext(data.roomCode);
    }
  }

  private scheduleNext(roomCode: string, questionIndex: number) {
    const timer = setTimeout(async () => {
      this.questionTimers.delete(roomCode);
      await this.moveToNext(roomCode);
    }, 32000);
    this.questionTimers.set(roomCode, timer);
  }

  private async moveToNext(roomCode: string) {
    // Petit délai pour que les joueurs voient le résultat
    await new Promise((r) => setTimeout(r, 2000));

    const next = await this.game.nextQuestion(roomCode);
    if (!next) {
      const results = await this.game.getResults(roomCode);
      this.server.to(roomCode).emit('game:finished', results);
    } else {
      const startedAt = Date.now();
      this.questionStartTimes.set(`${roomCode}:${next.index}`, startedAt);
      this.server.to(roomCode).emit('game:question', { ...next, startedAt });
      this.scheduleNext(roomCode, next.index);
    }
  }
}
