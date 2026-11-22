import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext.js';
import { ROLE_DEFINITIONS } from 'mafia-shared';
import { RoleRevealCard } from '../screens/RoleRevealScreen.js';

export const MyIdentityBadge: React.FC = () => {
  const { view, language, t } = useGame();
  const [showModal, setShowModal] = useState(false);
  const [isRevealed, setIsRevealed] = useState(true);

  if (!view || !view.myRole || view.phase === 'LOBBY') {
    return null;
  }

  const role = view.myRole;
  const roleInfo = ROLE_DEFINITIONS[role];

  return (
    <>
      {/* Header Pill */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-full px-3 py-1 shadow-md">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
          title="Click to view full role card and powers"
        >
          {isRevealed ? (
            <>
              <span className="text-sm">
                {role === 'MAFIA' && '🔪'}
                {role === 'DOCTOR' && '💉'}
                {role === 'DETECTIVE' && '🔍'}
                {role === 'VILLAGER' && '🌾'}
                {role === 'JESTER' && '🃏'}
                {role === 'MAYOR' && '⚖️'}
              </span>
              <span style={{ color: roleInfo.color }} className="font-serif tracking-wide">
                {language === 'ta' ? roleInfo.nameTa : roleInfo.name}
              </span>
            </>
          ) : (
            <span className="text-slate-400 font-mono text-[11px] tracking-wider">
              🎭 ROLE HIDDEN
            </span>
          )}
        </button>

        {/* Privacy eye toggle so nearby friends don't glance */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsRevealed(!isRevealed);
          }}
          className="text-slate-400 hover:text-slate-200 text-xs pl-1 border-l border-slate-800"
          title={isRevealed ? 'Hide role for privacy' : 'Show role'}
        >
          {isRevealed ? '👁️' : '🙈'}
        </button>
      </div>

      {/* Full Role Identity Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border-2 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-center"
              style={{ borderColor: roleInfo.color }}
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>

              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                YOUR SECRET IDENTITY
              </div>

              <div className="my-2 flex justify-center">
                <RoleRevealCard role={role} autoFlipped={true} />
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="mt-4 w-full py-2.5 rounded-xl font-serif font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Close & Return to Game
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
