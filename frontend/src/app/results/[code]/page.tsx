'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

interface Score {
  player: { pseudo: string };
  points: number;
}

function ResultsContent() {
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const scoresRaw = searchParams.get('scores');
  const pseudo = searchParams.get('pseudo') || '';
  const scores: Score[] = scoresRaw ? JSON.parse(decodeURIComponent(scoresRaw)) : [];

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-yellow-400">🎬 Résultats</h1>
          <p className="text-gray-400 mt-1">Partie {code}</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 space-y-4">
          {scores.map((s, i) => (
            <div
              key={i}
              className={`flex justify-between items-center p-3 rounded-xl ${s.player.pseudo === pseudo ? 'bg-yellow-400/20 border border-yellow-400/50' : 'bg-gray-700'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{medals[i] || `${i + 1}.`}</span>
                <span className="font-semibold">{s.player.pseudo}</span>
                {s.player.pseudo === pseudo && <span className="text-xs text-yellow-400">(toi)</span>}
              </div>
              <span className="text-yellow-400 font-bold text-lg">{s.points} pts</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full py-4 rounded-2xl bg-yellow-400 text-gray-950 font-bold text-xl hover:bg-yellow-300 transition"
        >
          🔁 Rejouer
        </button>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
