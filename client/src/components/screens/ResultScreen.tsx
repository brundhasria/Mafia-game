import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../context/GameContext.js';
import { RoleRevealCard } from './RoleRevealScreen.js';
import { sounds } from '../../audio/soundManager.js';
import { triggerHaptic } from '../../config/animations.js';

export const ResultScreen: React.FC = () => {
  const { view, t } = useGame();
  const [drumrollFinished, setDrumrollFinished] = useState(false);

  const voteResult = view?.voteResult;
  const eliminatedPlayer = view?.players.find((p) => p.id === voteResult?.eliminatedId);

  useEffect(() => {
    sounds.playDrumroll();
    const timer = setTimeout(() => {
      setDrumrollFinished(true);
      if (eliminatedPlayer) {
        sounds.playCardFlip();
        triggerHaptic([50, 70, 90]);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [eliminatedPlayer]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[78vh] p-4 text-center select-none">
      {/* Spotlight Circle in background */}
      <div className="fixed inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-black pointer-events-none" />

      <h2 className="font-serif text-2xl font-black text-amber-200 tracking-wide mb-6">
        ⚖️ THE VERDICT
      </h2>

      {!drumrollFinished ? (
        /* Drumroll Tension State */
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 0.3, repeat: Infinity }}
          className="flex flex-col items-center p-8"
        >
          <div className="w-20 h-20 rounded-full border-4 border-amber-400 border-dashed animate-spin mb-4" />
          <h3 className="font-serif text-xl font-bold text-amber-300">
            Tallying Village Ballots...
          </h3>
          <p className="text-xs text-slate-400 mt-1">A tense silence blankets the town.</p>
        </motion.div>
      ) : voteResult?.tie ? (
        /* Tie Vote Scenario */
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900/80 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
        >
          <motion.div
            animate={{ x: [-5, 5, -5, 5, 0] }}
            transition={{ duration: 0.5 }}
            className="text-5xl mb-4"
          >
            ⚖️
          </motion.div>
          <h3 className="font-serif text-xl font-bold text-slate-200 mb-2">
            A TIE HAS OCCURRED!
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed font-sans">
            The village could not reach a majority consensus. Nobody is eliminated today.
          </p>
        </motion.div>
      ) : !voteResult?.eliminatedId ? (
        /* Skip Vote Scenario */
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900/80 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
        >
          <div className="text-5xl mb-4">🕊️</div>
          <h3 className="font-serif text-xl font-bold text-amber-200 mb-2">
            ELIMINATION SKIPPED
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed font-sans">
            The village voted to spare everyone today. Night will soon fall again.
          </p>
        </motion.div>
      ) : (
        /* Elimination Scenario with Card Flip & Dissolve Effect */
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="flex flex-col items-center w-full"
        >
          <div className="text-sm font-semibold text-red-400 uppercase tracking-widest mb-2">
            Eliminated by Village Vote
          </div>

          <h3 className="font-serif text-3xl font-black text-slate-100 mb-4">
            {eliminatedPlayer?.nickname}
          </h3>

          {/* Reveal Card */}
          <div className="my-2">
            <RoleRevealCard role={voteResult.role} autoFlipped={true} />
          </div>

          <p className="text-xs text-slate-400 mt-2">
            Their spirit dissolves into the Ghost Realm...
          </p>
        </motion.div>
      )}
    </div>
  );
};
