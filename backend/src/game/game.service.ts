import { Injectable } from '@nestjs/common';
import { TmdbService } from '../tmdb/tmdb.service';
import { PrismaService } from '../prisma/prisma.service';

const QUESTION_COUNT = 10;
const QUESTION_DURATION = 30; // secondes
const MAX_POINTS = 1000;

export interface Question {
  index: number;
  total: number;
  posterPath: string;
  options: string[];
  startedAt: number;
}

interface GameSession {
  roomCode: string;
  questions: { movieId: number; title: string; posterPath: string; options: string[] }[];
  currentIndex: number;
  timer: NodeJS.Timeout | null;
  playerCount: number;
  answeredPlayers: Set<string>; // playerIds ayant répondu à la question courante
}

@Injectable()
export class GameService {
  private sessions = new Map<string, GameSession>();

  constructor(
    private tmdb: TmdbService,
    private prisma: PrismaService,
  ) {}

  async buildQuestions() {
    const data = await this.tmdb.getPopularMovies(1);
    const movies = data.results.slice(0, 40);
    const selected = [...movies].sort(() => Math.random() - 0.5).slice(0, QUESTION_COUNT);

    return selected.map((movie: { id: number; title: string; poster_path: string }) => {
      const wrong = movies
        .filter((m: { id: number }) => m.id !== movie.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((m: { title: string }) => m.title);
      const options = [...wrong, movie.title].sort(() => Math.random() - 0.5);
      return { movieId: movie.id, title: movie.title, posterPath: movie.poster_path, options };
    });
  }

  async startGame(roomCode: string): Promise<GameSession> {
    const questions = await this.buildQuestions();

    const room = await this.prisma.room.findUnique({
      where: { code: roomCode },
      include: { scores: true },
    });
    const playerCount = room?.scores?.length ?? 1;

    const session: GameSession = {
      roomCode,
      questions,
      currentIndex: 0,
      timer: null,
      playerCount,
      answeredPlayers: new Set(),
    };
    this.sessions.set(roomCode, session);

    await this.prisma.room.update({
      where: { code: roomCode },
      data: { status: 'PLAYING' },
    });

    return session;
  }

  getCurrentQuestion(roomCode: string): Question | null {
    const session = this.sessions.get(roomCode);
    if (!session) return null;
    const q = session.questions[session.currentIndex];
    return {
      index: session.currentIndex,
      total: QUESTION_COUNT,
      posterPath: q.posterPath,
      options: q.options,
      startedAt: Date.now(),
    };
  }

  async submitAnswer(roomCode: string, playerId: string, answer: string, answeredAt: number, questionStartedAt: number) {
    const session = this.sessions.get(roomCode);
    if (!session) return { correct: false, points: 0, allAnswered: false };

    // Empêcher de répondre deux fois
    if (session.answeredPlayers.has(playerId)) {
      return { correct: false, points: 0, allAnswered: false };
    }
    session.answeredPlayers.add(playerId);

    const q = session.questions[session.currentIndex];
    const correct = q.title === answer;

    let points = 0;
    if (correct) {
      const elapsed = (answeredAt - questionStartedAt) / 1000;
      points = Math.max(0, Math.round(MAX_POINTS * (1 - elapsed / QUESTION_DURATION)));
    }

    if (correct && points > 0) {
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
      if (room) {
        await this.prisma.score.updateMany({
          where: { playerId, roomId: room.id },
          data: { points: { increment: points } },
        });
      }
    }

    const allAnswered = session.answeredPlayers.size >= session.playerCount;
    return { correct, points, correctAnswer: q.title, allAnswered };
  }

  async nextQuestion(roomCode: string): Promise<Question | null> {
    const session = this.sessions.get(roomCode);
    if (!session) return null;
    session.currentIndex++;
    session.answeredPlayers = new Set(); // reset pour la prochaine question
    if (session.currentIndex >= QUESTION_COUNT) {
      await this.prisma.room.update({ where: { code: roomCode }, data: { status: 'FINISHED' } });
      this.sessions.delete(roomCode);
      return null;
    }
    return this.getCurrentQuestion(roomCode);
  }

  async getResults(roomCode: string) {
    return this.prisma.room.findUnique({
      where: { code: roomCode },
      include: { scores: { include: { player: true }, orderBy: { points: 'desc' } } },
    });
  }
}
