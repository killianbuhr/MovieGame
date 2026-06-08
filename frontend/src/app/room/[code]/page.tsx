'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';

interface Player {
  id: string;
  pseudo: string;
}

interface RoomState {
  code: string;
  status: string;
  scores: { player: Player; points: number }[];
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [pseudo, setPseudo] = useState('');

  useEffect(() => {
    const storedPseudo = localStorage.getItem('pseudo') || '';
    setPseudo(storedPseudo);

    const socket = getSocket();

    socket.emit('room:state', { code }, (state: RoomState) => {
      if (state) setRoom(state);
    });

    socket.on('room:updated', (data: RoomState) => {
      setRoom(data);
    });

    socket.on('game:question', () => {
      router.push(`/game/${code}`);
    });

    return () => {
      socket.off('room:updated');
      socket.off('game:question');
    };
  }, [code, router]);

  function copyCode() {
    navigator.clipboard.writeText(code);
  }

  function startGame() {
    const socket = getSocket();
    socket.emit('game:start', { roomCode: code });
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-400">🎬 MovieGame</h1>
          <p className="text-gray-400 mt-1">Connecté en tant que <span className="text-white font-semibold">{pseudo}</span></p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 text-center space-y-2">
          <p className="text-gray-400 text-sm">Code de la partie</p>
          <p className="text-4xl font-bold tracking-widest text-yellow-400">{code}</p>
          <button onClick={copyCode} className="text-sm text-gray-400 hover:text-white transition">
            📋 Copier le code
          </button>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-gray-300">Joueurs connectés ({room?.scores?.length || 0})</h2>
          {room?.scores?.length ? (
            room.scores.map((s) => (
              <div key={s.player.id} className="flex justify-between items-center">
                <span>{s.player.pseudo}</span>
                <span className="text-yellow-400 font-bold">{s.points} pts</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">En attente de joueurs...</p>
          )}
        </div>

        <button
          onClick={startGame}
          className="w-full py-4 rounded-2xl bg-yellow-400 text-gray-950 font-bold text-xl hover:bg-yellow-300 transition"
        >
          🚀 Lancer la partie
        </button>
      </div>
    </main>
  );
}
