'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import Image from 'next/image';

interface Question {
  index: number;
  total: number;
  posterPath: string;
  options: string[];
  startedAt: number;
}

interface AnswerResult {
  correct: boolean;
  points: number;
  correctAnswer: string;
}

interface Results {
  scores: { player: { pseudo: string }; points: number }[];
}

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalScore, setTotalScore] = useState(0);

  const handleQuestion = useCallback((q: Question) => {
    setQuestion(q);
    setResult(null);
    setAnswered(false);
    setTimeLeft(30);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    // Demander la question courante au chargement (au cas où on a raté l'event)
    socket.emit('game:current-question', { roomCode: code }, (q: Question | null) => {
      if (q) handleQuestion(q);
    });

    socket.on('game:question', handleQuestion);

    socket.on('game:answer:result', (res: AnswerResult) => {
      setResult(res);
      setAnswered(true);
      if (res.correct) setTotalScore((s) => s + res.points);
    });

    socket.on('game:finished', (results: Results) => {
      const pseudo = localStorage.getItem('pseudo') || '';
      const encoded = encodeURIComponent(JSON.stringify(results.scores));
      router.push(`/results/${code}?scores=${encoded}&pseudo=${pseudo}`);
    });

    return () => {
      socket.off('game:question', handleQuestion);
      socket.off('game:answer:result');
      socket.off('game:finished');
    };
  }, [code, router, handleQuestion]);

  // Chronomètre
  useEffect(() => {
    if (!question || answered) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - question.startedAt) / 1000);
      const left = Math.max(0, 30 - elapsed);
      setTimeLeft(left);
    }, 500);
    return () => clearInterval(interval);
  }, [question, answered]);

  function submitAnswer(answer: string) {
    if (answered || !question) return;
    setAnswered(true);
    const socket = getSocket();
    socket.emit('game:answer', { roomCode: code, answer, questionIndex: question.index });
  }

  if (!question) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 text-xl animate-pulse">Chargement de la question...</p>
      </main>
    );
  }

  const blurAmount = answered ? 0 : Math.max(0, 20 - (30 - timeLeft) * 0.7);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-4 gap-4">

      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center">
        <span className="text-gray-400">Question {question.index + 1}/{question.total}</span>
        <span className={`font-bold text-xl ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
          ⏱ {timeLeft}s
        </span>
        <span className="text-yellow-400 font-bold">{totalScore} pts</span>
      </div>

      {/* Barre de progression */}
      <div className="w-full max-w-md h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 transition-all duration-500"
          style={{ width: `${(timeLeft / 30) * 100}%` }}
        />
      </div>

      {/* Affiche */}
      <div className="relative w-64 h-96 rounded-2xl overflow-hidden">
        <Image
          src={`https://image.tmdb.org/t/p/w500${question.posterPath}`}
          alt="Affiche du film"
          fill
          className="object-cover transition-all duration-1000"
          style={{ filter: `blur(${blurAmount}px)` }}
        />
      </div>

      {/* Résultat */}
      {result && (
        <div className={`w-full max-w-md p-4 rounded-xl text-center font-bold text-lg ${result.correct ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-200'}`}>
          {result.correct ? `✅ Bonne réponse ! +${result.points} pts` : `❌ Mauvaise réponse — C'était : ${result.correctAnswer}`}
        </div>
      )}

      {/* Options */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3">
        {question.options.map((option) => {
          let style = 'bg-gray-800 hover:bg-gray-700';
          if (answered && result) {
            if (option === result.correctAnswer) style = 'bg-green-700';
            else if (!result.correct) style = 'bg-gray-800 opacity-50';
          }
          return (
            <button
              key={option}
              onClick={() => submitAnswer(option)}
              disabled={answered}
              className={`${style} p-4 rounded-xl text-sm font-medium transition text-left disabled:cursor-not-allowed`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </main>
  );
}
