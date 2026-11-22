import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/soundManager.js';

interface CountdownRingProps {
  remainingMs?: number;
  totalDurationMs?: number;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({
  remainingMs: propRemainingMs,
  totalDurationMs = 45000,
}) => {
  const { remainingMs: contextRemainingMs } = useGame();
  const remainingMs = propRemainingMs !== undefined ? propRemainingMs : contextRemainingMs;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const isUrgent = seconds <= 10 && seconds > 0;

  // Trigger heartbeat sound in last 10s
  useEffect(() => {
    if (isUrgent) {
      sounds.playHeartbeat();
    }
  }, [seconds, isUrgent]);

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, remainingMs / totalDurationMs));
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={`relative flex items-center justify-center ${isUrgent ? 'animate-pulseUrgent' : ''}`}>
      <svg className="w-14 h-14 -rotate-90 transform">
        <circle
          cx="28"
          cy="28"
          r={radius}
          stroke="currentColor"
          strokeWidth="3.5"
          className="text-slate-800"
          fill="transparent"
        />
        <motion.circle
          cx="28"
          cy="28"
          r={radius}
          stroke={isUrgent ? '#ef4444' : seconds <= 20 ? '#f59e0b' : '#10b981'}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </svg>
      <span
        className={`absolute font-mono font-bold text-sm ${
          isUrgent ? 'text-red-400 font-black scale-110' : 'text-slate-200'
        }`}
      >
        {seconds}s
      </span>
    </div>
  );
};

export const PhaseBanner: React.FC = () => {
  const { phaseBanner, animationMode } = useGame();
  const [displayedText, setDisplayedText] = useState('');

  const fullText = phaseBanner?.text || '';

  // Typewriter effect
  useEffect(() => {
    if (!phaseBanner?.show || !fullText) {
      setDisplayedText('');
      return;
    }

    if (animationMode === 'off') {
      setDisplayedText(fullText);
      return;
    }

    let i = 0;
    setDisplayedText('');
    const timer = setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(timer);
      }
    }, 25);

    return () => clearInterval(timer);
  }, [fullText, phaseBanner?.show, animationMode]);

  return (
    <AnimatePresence>
      {phaseBanner?.show && (
        <motion.div
          initial={{ y: -60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed top-16 left-4 right-4 md:left-auto md:right-auto md:w-[500px] md:translate-x-[-50%] md:left-1/2 z-50 pointer-events-none"
        >
          <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-xl px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <div className="text-sm md:text-base font-medium text-amber-100 tracking-wide font-sans">
              {displayedText}
              <span className="inline-block w-1.5 h-3.5 bg-amber-400 ml-1 animate-pulse" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
