import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/soundManager.js';
import { triggerHaptic } from '../../config/animations.js';

export const DawnScreen: React.FC = () => {
  const { view, t } = useGame();
  const [revealed, setRevealed] = useState(false);

  const dawnResult = view?.dawnResult;
  const victim = view?.players.find((p) => p.id === dawnResult?.victimId);

  useEffect(() => {
    // 1.5s suspense delay before reveal
    const timer = setTimeout(() => {
      setRevealed(true);
      if (dawnResult?.saved) {
        sounds.playShield();
        triggerHaptic([30, 50, 40]);
      } else if (victim) {
        sounds.playTombstoneThud();
        triggerHaptic([60, 80, 100]);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [dawnResult, victim]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[75vh] p-4 text-center select-none">
      {/* Sunrise sweep light effect */}
      <motion.div
        className="fixed inset-0 bg-gradient-to-t from-amber-500/20 via-yellow-500/10 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      />

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="font-serif text-2xl font-black text-amber-200 tracking-wide mb-6"
      >
        🌅 DAWN HAS ARRIVED
      </motion.div>

      {!revealed ? (
        /* Suspense breathing suspense circle */
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="flex flex-col items-center justify-center p-8"
        >
          <div className="w-20 h-20 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin mb-4" />
          <p className="text-sm font-serif text-amber-100 italic">
            The village awakes to discover what happened in the night...
          </p>
        </motion.div>
      ) : dawnResult?.saved ? (
        /* Doctor Saved Scenario */
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="flex flex-col items-center bg-emerald-950/40 border-2 border-emerald-400 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.3)] max-w-sm w-full"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-5xl mb-4 shadow-inner"
          >
            🛡️
          </motion.div>
          <h3 className="font-serif text-2xl font-bold text-emerald-300 mb-2">
            NOBODY DIED TONIGHT!
          </h3>
          <p className="text-sm text-emerald-100/90 leading-relaxed font-sans">
            The Doctor heroically protected the Mafia's target. The village is safe for another morning.
          </p>
        </motion.div>
      ) : victim ? (
        /* Victim Died Scenario */
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 18 }}
          className="flex flex-col items-center bg-slate-900/80 border-2 border-red-500/50 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.35)] max-w-sm w-full"
        >
          {/* Avatar with shake and tombstone drop */}
          <div className="relative mb-6">
            <motion.div
              animate={{ x: [-4, 4, -4, 4, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="w-24 h-24 rounded-full bg-slate-800 border-2 border-red-500 grayscale flex items-center justify-center text-4xl shadow-xl overflow-hidden"
            >
              👤
            </motion.div>

            {/* Dropping Tombstone */}
            <motion.div
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', damping: 12 }}
              className="absolute -bottom-3 -right-3 w-12 h-12 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center text-2xl shadow-lg"
            >
              🪦
            </motion.div>
          </div>

          <h3 className="font-serif text-2xl font-bold text-red-400 mb-1">
            {victim.nickname} WAS SLAIN!
          </h3>
          <p className="text-xs text-slate-400 font-serif italic mb-3">
            Their role remains a secret until the game ends...
          </p>
          <div className="px-3 py-1 bg-red-950/60 border border-red-800/40 rounded-full text-xs text-red-300 font-mono">
            Victim has joined the Ghost Realm
          </div>
        </motion.div>
      ) : (
        /* Peaceful Sunrise Scenario */
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900/60 border border-amber-500/30 rounded-3xl p-8 max-w-sm w-full"
        >
          <span className="text-5xl block mb-4">🕊️</span>
          <h3 className="font-serif text-xl font-bold text-amber-200 mb-2">
            A PEACEFUL SUNRISE
          </h3>
          <p className="text-sm text-slate-300">
            No attacks occurred in the night. The village gathers in relief.
          </p>
        </motion.div>
      )}
    </div>
  );
};
