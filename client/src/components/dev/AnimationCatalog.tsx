import React, { useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { VillageSkyline } from '../background/VillageSkyline.js';
import { CountdownRing } from '../narrator/PhaseBanner.js';
import { RoleRevealCard } from '../screens/RoleRevealScreen.js';
import { sounds } from '../../audio/soundManager.js';
import { GamePhase, Role } from 'mafia-shared';

export const AnimationCatalog: React.FC = () => {
  const [testPhase, setTestPhase] = useState<GamePhase>('NIGHT');
  const [testRole, setTestRole] = useState<Role>('MAFIA');
  const [testRemainingMs, setTestRemainingMs] = useState(8000);
  const [dawnScenario, setDawnScenario] = useState<'saved' | 'killed' | 'peaceful'>('killed');
  const [votingScenario, setVotingScenario] = useState<'elimination' | 'tie'>('elimination');

  return (
    <div className="relative min-h-screen text-slate-100 p-6 pb-24 overflow-x-hidden">
      {/* Background Skyline with Controlled Phase */}
      <VillageSkyline phase={testPhase} />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div>
            <h1 className="font-serif text-2xl font-bold text-amber-300">
              🎭 Animation & Sound Catalog (/dev/animations)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Test and inspect each cinematic UI animation & sound effect individually.
            </p>
          </div>
          <a
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-serif font-bold text-slate-200 border border-slate-700"
          >
            ← Return to Game
          </a>
        </div>

        {/* 1. Day/Night World Background State */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h2 className="font-serif text-lg font-bold text-amber-200 mb-2">
            1. Day/Night World Transition
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['LOBBY', 'ROLE_REVEAL', 'NIGHT', 'DAWN', 'DAY_DISCUSSION', 'VOTING', 'GAME_OVER'] as GamePhase[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setTestPhase(p);
                  if (p === 'NIGHT') sounds.setAmbient('night');
                  else if (p === 'DAY_DISCUSSION') sounds.setAmbient('day');
                  else sounds.stopAmbient();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  testPhase === p
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Circular Countdown Ring & Urgency Heartbeat */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h2 className="font-serif text-lg font-bold text-amber-200 mb-2">
            2. Circular Countdown Ring & Heartbeat Pulse
          </h2>
          <div className="flex items-center gap-6">
            <CountdownRing remainingMs={testRemainingMs} totalDurationMs={30000} />
            <div className="flex gap-2">
              <button
                onClick={() => setTestRemainingMs(25000)}
                className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-slate-700"
              >
                Normal (25s)
              </button>
              <button
                onClick={() => setTestRemainingMs(15000)}
                className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-slate-700"
              >
                Caution (15s)
              </button>
              <button
                onClick={() => setTestRemainingMs(7000)}
                className="px-3 py-1.5 bg-red-900/70 border border-red-500/40 rounded-lg text-xs text-red-200 hover:bg-red-800"
              >
                Urgent Heartbeat (7s)
              </button>
            </div>
          </div>
        </div>

        {/* 3. 3D Role Reveal Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h2 className="font-serif text-lg font-bold text-amber-200 mb-2">
            3. 3D Role Reveal Card (Hold to Peek Interaction)
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {(['MAFIA', 'DOCTOR', 'DETECTIVE', 'VILLAGER', 'JESTER', 'MAYOR'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setTestRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  testRole === r
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex justify-center bg-slate-950/40 rounded-2xl p-4">
            <RoleRevealCard role={testRole} />
          </div>
        </div>

        {/* 4. Sound Effects Trigger Grid */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h2 className="font-serif text-lg font-bold text-amber-200 mb-2">
            4. Synthesized Audio Effects Showcase
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <button
              onClick={() => sounds.playCardFlip()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
            >
              🃏 Card Flip
            </button>
            <button
              onClick={() => sounds.playKnifeSlash()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
            >
              🔪 Knife Slash
            </button>
            <button
              onClick={() => sounds.playShield()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
            >
              🛡️ Shield Bubble
            </button>
            <button
              onClick={() => sounds.playStamp()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
            >
              🔍 Detective Stamp
            </button>
            <button
              onClick={() => sounds.playTombstoneThud()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
            >
              🪦 Tombstone Thud
            </button>
            <button
              onClick={() => sounds.playVoteToken()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
            >
              🗳️ Vote Token Whoosh
            </button>
            <button
              onClick={() => sounds.playDrumroll()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
            >
              🥁 Trial Drumroll
            </button>
            <button
              onClick={() => sounds.playJoined()}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
            >
              ✨ Player Joined
            </button>
            <button
              onClick={() => {
                sounds.playVictory();
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
              }}
              className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200"
            >
              🏆 Victory Sting & Confetti
            </button>
            <button
              onClick={() => sounds.playDefeat()}
              className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200"
            >
              💀 Defeat Sting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
