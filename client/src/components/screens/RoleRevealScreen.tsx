import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Role, ROLE_DEFINITIONS } from 'mafia-shared';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/soundManager.js';
import { triggerHaptic } from '../../config/animations.js';

interface RoleRevealCardProps {
  role?: Role;
  autoFlipped?: boolean;
}

export const RoleRevealCard: React.FC<RoleRevealCardProps> = ({
  role: propRole,
  autoFlipped = false,
}) => {
  const { view, t, language } = useGame();
  const role = propRole || view?.myRole || 'VILLAGER';
  const roleInfo = ROLE_DEFINITIONS[role];

  const [isPeeking, setIsPeeking] = useState(autoFlipped);
  const isFlipped = autoFlipped || isPeeking;

  const handlePointerDown = () => {
    setIsPeeking(true);
    sounds.playCardFlip();
    triggerHaptic(40);
  };

  const handlePointerUp = () => {
    if (!autoFlipped) {
      setIsPeeking(false);
      triggerHaptic(20);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* 3D Card Container */}
      <div
        className="w-72 h-96 relative perspective-1000 select-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <motion.div
          className="w-full h-full relative rounded-2xl shadow-2xl transition-transform duration-500 transform-style-3d border border-slate-700/50"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Card Back (Hidden / Face Down) */}
          <div className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 flex flex-col items-center justify-between border-2 border-amber-500/20 shadow-[0_0_25px_rgba(0,0,0,0.8)]">
            <div className="w-full flex justify-between items-center text-amber-500/40 text-xs font-serif">
              <span>✦ SECRET IDENTITY ✦</span>
              <span>MAFIA</span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full border border-amber-500/30 flex items-center justify-center bg-slate-950/60 mb-4 shadow-inner">
                <span className="text-4xl">🎭</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-amber-100 mb-1">
                {t('peekCard')}
              </h3>
              <p className="text-xs text-slate-400">
                Hold to reveal privately. Release to conceal.
              </p>
            </div>

            <div className="w-full py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center text-xs font-mono text-amber-300 animate-pulse">
              TAP & HOLD TO PEEK
            </div>
          </div>

          {/* Card Front (Revealed Role) */}
          <div
            className="absolute inset-0 backface-hidden rounded-2xl p-6 flex flex-col items-center justify-between shadow-2xl rotate-y-180 border-2 overflow-hidden"
            style={{
              borderColor: roleInfo.color,
              background: `linear-gradient(145deg, #090d16 0%, #151d30 60%, ${roleInfo.color}22 100%)`,
            }}
          >
            {/* Light Sweep Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none -skew-x-12"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}
            />

            {/* Role Header */}
            <div className="w-full flex justify-between items-center text-xs font-bold tracking-widest uppercase">
              <span style={{ color: roleInfo.color }}>{roleInfo.alignment}</span>
              <span className="text-slate-400">SHADOWS</span>
            </div>

            {/* Role Icon & Role Specific Visual Flair */}
            <div className="relative flex flex-col items-center my-auto">
              {/* Mafia Red Smoke / Doctor Green Pulse / Detective Blue Spotlight / Villager Candle */}
              {role === 'MAFIA' && (
                <div className="absolute -inset-4 bg-red-600/30 rounded-full blur-xl animate-pulse" />
              )}
              {role === 'DOCTOR' && (
                <div className="absolute -inset-4 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
              )}
              {role === 'DETECTIVE' && (
                <div className="absolute -inset-4 bg-blue-500/30 rounded-full blur-xl animate-pulse" />
              )}
              {role === 'VILLAGER' && (
                <div className="absolute -inset-4 bg-amber-500/30 rounded-full blur-xl animate-pulse" />
              )}

              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 relative z-10 border-2 shadow-lg"
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

              <h2
                className="font-serif text-3xl font-black uppercase tracking-wider relative z-10"
                style={{ color: roleInfo.color }}
              >
                {language === 'ta' ? roleInfo.nameTa : roleInfo.name}
              </h2>
            </div>

            {/* Role Description */}
            <div className="w-full bg-slate-950/70 backdrop-blur-sm border border-slate-800 rounded-xl p-3 text-center z-10">
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {language === 'ta' ? roleInfo.descriptionTa : roleInfo.description}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        Keep your screen shielded from nearby players!
      </p>
    </div>
  );
};
