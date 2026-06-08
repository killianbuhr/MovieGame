'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';

export default function Home() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleCreate() {
    if (!pseudo.trim()) return setError('Entre ton pseudo');
    setLoading(true);
    const socket = getSocket();
    socket.emit('room:create', { pseudo }, (res: { room: { code: string }; player: { id: string } }) => {
      localStorage.setItem('playerId', res.player.id);
      localStorage.setItem('pseudo', pseudo);
      router.push(`/room/${res.room.code}`);
    });
  }

  function handleJoin() {
    if (!pseudo.trim()) return setError('Entre ton pseudo');
    if (!roomCode.trim()) return setError('Entre le code de la room');
    setLoading(true);
    const socket = getSocket();
    socket.emit('room:join', { code: roomCode.toUpperCase(), pseudo }, (res: { room: { code: string }; player: { id: string } }) => {
      localStorage.setItem('playerId', res.player.id);
      localStorage.setItem('pseudo', pseudo);
      router.push(`/room/${res.room.code}`);
    });
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-yellow-400">🎬 MovieGame</h1>
          <p className="text-gray-400 mt-2">Le quiz cinéma multijoueur</p>
        </div>

        {error && <p className="text-red-400 text-center">{error}</p>}

        <input
          type="text"
          placeholder="Ton pseudo"
          value={pseudo}
          onChange={(e) => { setPseudo(e.target.value); setError(''); }}
          className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-yellow-400 text-white"
        />

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-gray-950 font-bold text-lg hover:bg-yellow-300 transition disabled:opacity-50"
        >
          Créer une partie
        </button>

        <div className="flex items-center gap-4">
          <hr className="flex-1 border-gray-700" />
          <span className="text-gray-500">ou</span>
          <hr className="flex-1 border-gray-700" />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Code de la room"
            value={roomCode}
            onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
            maxLength={6}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-yellow-400 text-white uppercase tracking-widest"
          />
          <button
            onClick={handleJoin}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gray-700 font-bold hover:bg-gray-600 transition disabled:opacity-50"
          >
            Rejoindre
          </button>
        </div>
      </div>
    </main>
  );
}
