import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext.js';
import { CountdownRing } from '../narrator/PhaseBanner.js';

export const VotingScreen: React.FC = () => {
  const { view, myPlayerId, remainingMs, submitVote, t } = useGame();
  const [selectedTarget, setSelectedTarget] = useState<string | 'skip' | null>(null);

  if (!view) return null;

  const me = view.players.find((p) => p.id === myPlayerId);
  const isAlive = me?.isAlive ?? false;
  const alivePlayers = view.players.filter((p) => p.isAlive);
  const currentVotes = view.currentVotes || {};
  const voteCounts = view.voteCounts || {};

  const handleCastVote = async (targetId: string | 'skip') => {
    setSelectedTarget(targetId);
    await submitVote(targetId);
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col min-h-[80vh] justify-between p-4">
      {/* Header with Countdown */}
      <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-lg mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <h2 className="font-serif text-xl font-bold text-slate-100">
              {t('votingPhase')} {view.round}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAlive ? 'Cast your vote to eliminate or choose skip.' : 'Spectating the village trial...'}
          </p>
        </div>
        <CountdownRing
          remainingMs={remainingMs}
          totalDurationMs={view.settings.votingDurationSec * 1000}
        />
      </div>

      {/* Target Candidates List with Vote Badges */}
      <div className="flex-1 flex flex-col justify-center space-y-3">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-center mb-1">
          Accused Suspects
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
          {alivePlayers.map((p) => {
            const count = voteCounts[p.id] || 0;
            const isSelected = selectedTarget === p.id || currentVotes[myPlayerId || ''] === p.id;
            const isSelf = p.id === myPlayerId;

            return (
              <motion.button
                key={p.id}
                disabled={!isAlive}
                onClick={() => handleCastVote(p.id)}
                whileHover={isAlive ? { scale: 1.02 } : {}}
                whileTap={isAlive ? { scale: 0.98 } : {}}
                className={`relative p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  !isAlive
                    ? 'opacity-80 bg-slate-900/40 border-slate-800'
                    : isSelected
                      ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-300 border border-slate-700 shadow-inner">
                    {p.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm text-slate-100">
                      {p.nickname} {isSelf ? `(You - ${view.myRole})` : ''}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isSelf ? 'Your Seat' : 'Suspect'}
                    </div>
                  </div>
                </div>

                {/* Bouncing Vote Count Badge */}
                {count > 0 && (
                  <motion.div
                    key={count}
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="flex items-center gap-1 bg-red-600/90 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md"
                  >
                    <span>🗳️</span>
                    <span>{count}</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Skip Vote Button */}
        {isAlive && (
          <div className="pt-2">
            <motion.button
              onClick={() => handleCastVote('skip')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 rounded-xl border flex items-center justify-between px-4 transition-all ${
                selectedTarget === 'skip' || currentVotes[myPlayerId || ''] === 'skip'
                  ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 text-slate-300'
              }`}
            >
              <span className="font-serif font-bold text-sm">
                🕊️ Vote to Skip Elimination
              </span>
              {(voteCounts['skip'] || 0) > 0 && (
                <span className="bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {voteCounts['skip']} votes
                </span>
              )}
            </motion.button>
          </div>
        )}
      </div>

      {/* Confirmation text */}
      {view.hasSubmittedAction && isAlive && (
        <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-center text-xs font-medium text-emerald-300">
          ✓ Your ballot has been recorded. Awaiting final village count.
        </div>
      )}
    </div>
  );
};
