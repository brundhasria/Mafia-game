import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGame } from '../../context/GameContext.js';
import { ROLE_DEFINITIONS } from 'mafia-shared';

export const GameOverScreen: React.FC = () => {
  const { view, playAgain, t } = useGame();

  const winner = view?.winner || 'VILLAGERS';
  const isVillagerWin = winner === 'VILLAGERS';
  const isMafiaWin = winner === 'MAFIA';
  const isJesterWin = winner === 'JESTER';

  // Trigger confetti burst on Villager win
  useEffect(() => {
    if (isVillagerWin) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#eab308', '#22c55e', '#3b82f6', '#f59e0b'],
      });
    }
  }, [isVillagerWin]);

  if (!view) return null;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-between min-h-[85vh] p-4 select-none">
      {/* Background Vignette Effect for Mafia Win */}
      {isMafiaWin && (
        <div className="fixed inset-0 bg-red-950/20 pointer-events-none shadow-[inset_0_0_120px_rgba(220,38,38,0.4)]" />
      )}

      {/* Victory Header */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center my-4"
      >
        <span className="text-5xl block mb-2">
          {isVillagerWin ? '🏆' : isMafiaWin ? '💀' : '🃏'}
        </span>
        <h1
          className={`font-serif text-3xl md:text-4xl font-black uppercase tracking-wider ${
            isVillagerWin
              ? 'text-amber-300 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]'
              : isMafiaWin
                ? 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                : 'text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]'
          }`}
        >
          {isVillagerWin
            ? t('villagersWin')
            : isMafiaWin
              ? t('mafiaWins')
              : t('jesterWins')}
        </h1>
        <p className="text-xs text-slate-300 font-sans mt-1">
          {isVillagerWin
            ? 'The village eliminated all Mafia and saved the township!'
            : isMafiaWin
              ? 'Darkness prevailed. The Mafia gained dominance over the village.'
              : 'The Jester tricked the village into casting the fatal vote!'}
        </p>
      </motion.div>

      {/* Staggered Role Reveal of Every Player */}
      <div className="w-full my-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
          ✦ True Identities Revealed ✦
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
          {view.players.map((p, idx) => {
            const role = p.role || 'VILLAGER';
            const roleInfo = ROLE_DEFINITIONS[role];

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15, rotateY: 90 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ delay: idx * 0.12, duration: 0.4 }}
                className="bg-slate-900/80 border rounded-xl p-3 flex flex-col items-center text-center shadow-md relative overflow-hidden"
                style={{ borderColor: `${roleInfo.color}55` }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1.5 border"
                  style={{
                    borderColor: roleInfo.color,
                    backgroundColor: '#090d16',
                  }}
                >
                  {role === 'MAFIA' && '🔪'}
                  {role === 'DOCTOR' && '💉'}
                  {role === 'DETECTIVE' && '🔍'}
                  {role === 'VILLAGER' && '🌾'}
                  {role === 'JESTER' && '🃏'}
                  {role === 'MAYOR' && '⚖️'}
                </div>

                <div className="font-semibold text-xs text-slate-100 truncate w-full">
                  {p.nickname}
                </div>

                <div
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: roleInfo.color }}
                >
                  {roleInfo.name}
                </div>

                {!p.isAlive && (
                  <span className="text-[9px] text-slate-500 font-serif">
                    (Eliminated)
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Game Timeline */}
      <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-4 max-h-48 overflow-y-auto">
        <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
          📜 Chronicles of the Village
        </h4>
        <div className="space-y-2 text-xs">
          {view.timeline.map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.08 }}
              className="border-l-2 border-amber-500/40 pl-3 py-0.5 text-slate-300"
            >
              <div className="font-bold text-slate-200">{entry.title}</div>
              <div className="text-[11px] text-slate-400">{entry.description}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Play Again Button */}
      <motion.button
        onClick={playAgain}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-4 rounded-2xl font-serif font-black text-base tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)] animate-pulse"
      >
        🔄 {t('playAgain')}
      </motion.button>
    </div>
  );
};
