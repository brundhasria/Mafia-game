import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GamePhase } from 'mafia-shared';
import { useGame } from '../../context/GameContext.js';
import { ANIMATION_PRESETS } from '../../config/animations.js';

interface VillageSkylineProps {
  phase?: GamePhase;
}

export const VillageSkyline: React.FC<VillageSkylineProps> = ({ phase: propPhase }) => {
  const { view, animationMode } = useGame();
  const currentPhase = propPhase || view?.phase || 'LOBBY';
  const config = ANIMATION_PRESETS[animationMode];

  const isNight = currentPhase === 'NIGHT' || currentPhase === 'ROLE_REVEAL';
  const isDawn = currentPhase === 'DAWN';
  const isDay = currentPhase === 'DAY_DISCUSSION' || currentPhase === 'VOTING' || currentPhase === 'RESULT';
  const isGameOver = currentPhase === 'GAME_OVER';

  // Sky gradient styling
  let skyGradient = 'linear-gradient(to bottom, #050811, #0b1329, #151d3b)'; // Night
  if (isDawn) {
    skyGradient = 'linear-gradient(to bottom, #19142b, #3b1d3a, #78350f, #b45309)'; // Dawn
  } else if (isDay) {
    skyGradient = 'linear-gradient(to bottom, #1e293b, #1e3a5f, #2563eb33)'; // Day
  } else if (isGameOver) {
    skyGradient =
      view?.winner === 'MAFIA'
        ? 'linear-gradient(to bottom, #1a0505, #3f0d0d, #09090b)'
        : 'linear-gradient(to bottom, #1e1b4b, #312e81, #d97706)';
  }

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
      {/* Sky Transition Background */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: skyGradient }}
        transition={{ duration: config.worldTransitionDuration, ease: 'easeInOut' }}
      />

      {/* Twinkling Stars (Night & Dawn) */}
      <AnimatePresence>
        {(isNight || currentPhase === 'LOBBY') && animationMode !== 'off' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            {[...Array(24)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  top: `${(i * 19) % 55}%`,
                  left: `${(i * 29) % 95}%`,
                  opacity: 0.3 + ((i % 5) * 0.15),
                }}
                animate={
                  animationMode === 'full'
                    ? {
                        scale: [1, 1.6, 1],
                        opacity: [0.3, 0.9, 0.3],
                      }
                    : {}
                }
                transition={{
                  duration: 2 + (i % 3),
                  repeat: Infinity,
                  delay: (i * 0.3) % 2,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moon / Sun */}
      <motion.div
        className="absolute w-20 h-20 md:w-28 md:h-28 rounded-full"
        animate={{
          top: isNight || currentPhase === 'LOBBY' ? '12%' : '80%',
          right: isNight || currentPhase === 'LOBBY' ? '14%' : '20%',
          opacity: isNight || currentPhase === 'LOBBY' ? 1 : 0,
          scale: isNight || currentPhase === 'LOBBY' ? 1 : 0.6,
        }}
        transition={{ duration: config.worldTransitionDuration, ease: 'easeInOut' }}
      >
        {/* Crescent Moon */}
        <div className="w-full h-full rounded-full bg-amber-100 shadow-[0_0_40px_rgba(253,230,138,0.35)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-[#0b1329] rounded-full translate-x-3 -translate-y-2" />
        </div>
      </motion.div>

      {/* Sun (Dawn / Day) */}
      <motion.div
        className="absolute w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 shadow-[0_0_60px_rgba(245,158,11,0.5)]"
        animate={{
          top: isDay || isDawn ? '14%' : '85%',
          left: isDay || isDawn ? '15%' : '10%',
          opacity: isDay || isDawn ? 1 : 0,
          scale: isDay || isDawn ? 1 : 0.4,
        }}
        transition={{ duration: config.worldTransitionDuration, ease: 'easeInOut' }}
      />

      {/* Ambient Fog Layer */}
      {animationMode === 'full' && (isNight || isDawn) && (
        <motion.div
          className="absolute bottom-16 left-0 right-0 h-36 bg-gradient-to-t from-slate-900/60 to-transparent blur-md"
          animate={{ x: [-20, 20, -20] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Illustrated Village Skyline (SVG) */}
      <div className="absolute bottom-0 left-0 right-0 h-48 md:h-64">
        <svg
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
          className="w-full h-full text-slate-950 fill-current opacity-90"
        >
          {/* Distant Hills */}
          <path
            d="M0 220 Q 300 160, 600 210 T 1200 190 L 1200 300 L 0 300 Z"
            className="text-slate-950/60 fill-current"
          />

          {/* Village Houses and Church Steeple */}
          {/* House 1 */}
          <polygon points="50,220 90,170 130,220" />
          <rect x="60" y="220" width="60" height="80" />
          {/* Cottage Window */}
          <rect
            x="80"
            y="240"
            width="16"
            height="18"
            className={isDay || isDawn ? 'fill-amber-300' : 'fill-amber-900/40'}
          />

          {/* Cottage 2 */}
          <polygon points="170,230 220,185 270,230" />
          <rect x="185" y="230" width="70" height="70" />
          <rect
            x="208"
            y="250"
            width="18"
            height="18"
            className={isDay || isDawn ? 'fill-amber-300' : 'fill-amber-900/30'}
          />

          {/* Church Tower & Spire */}
          <rect x="350" y="160" width="60" height="140" />
          <polygon points="350,160 380,80 410,160" />
          {/* Belfry Arch */}
          <rect x="368" y="180" width="24" height="35" rx="12" className="fill-slate-900" />

          {/* Cottage 3 */}
          <polygon points="460,225 510,180 560,225" />
          <rect x="475" y="225" width="70" height="75" />
          <rect
            x="500"
            y="245"
            width="18"
            height="18"
            className={isDay || isDawn ? 'fill-amber-300' : 'fill-amber-900/30'}
          />

          {/* Windmill Silhouette */}
          <polygon points="670,250 690,140 730,140 750,250" />
          <line x1="710" y1="140" x2="660" y2="90" stroke="currentColor" strokeWidth="4" />
          <line x1="710" y1="140" x2="760" y2="190" stroke="currentColor" strokeWidth="4" />
          <line x1="710" y1="140" x2="660" y2="190" stroke="currentColor" strokeWidth="4" />
          <line x1="710" y1="140" x2="760" y2="90" stroke="currentColor" strokeWidth="4" />

          {/* Row of small cottages */}
          <polygon points="800,240 840,195 880,240" />
          <rect x="812" y="240" width="56" height="60" />
          <rect
            x="830"
            y="255"
            width="16"
            height="16"
            className={isDay || isDawn ? 'fill-amber-300' : 'fill-amber-900/30'}
          />

          <polygon points="920,230 965,185 1010,230" />
          <rect x="935" y="230" width="60" height="70" />

          <polygon points="1060,240 1100,200 1140,240" />
          <rect x="1070" y="240" width="60" height="60" />

          {/* Base ground line */}
          <rect x="0" y="280" width="1200" height="20" />
        </svg>
      </div>
    </div>
  );
};
