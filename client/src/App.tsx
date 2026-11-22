import React, { useEffect, useState } from 'react';
import { useGame } from './context/GameContext.js';
import { VillageSkyline } from './components/background/VillageSkyline.js';
import { PhaseBanner } from './components/narrator/PhaseBanner.js';
import { LandingScreen } from './components/screens/LandingScreen.js';
import { LobbyScreen } from './components/screens/LobbyScreen.js';
import { RoleRevealCard } from './components/screens/RoleRevealScreen.js';
import { NightScreen } from './components/screens/NightScreen.js';
import { DawnScreen } from './components/screens/DawnScreen.js';
import { DayDiscussionScreen } from './components/screens/DayDiscussionScreen.js';
import { VotingScreen } from './components/screens/VotingScreen.js';
import { ResultScreen } from './components/screens/ResultScreen.js';
import { GameOverScreen } from './components/screens/GameOverScreen.js';
import { AnimationCatalog } from './components/dev/AnimationCatalog.js';
import { MyIdentityBadge } from './components/ui/MyIdentityBadge.js';
import { motion, AnimatePresence } from 'framer-motion';

export const App: React.FC = () => {
  const {
    view,
    connected,
    isConnecting,
    toasts,
    dismissToast,
    language,
    setLanguage,
    soundEnabled,
    setSoundEnabled,
  } = useGame();

  // Simple path routing for /dev/animations
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (pathname === '/dev/animations') {
    return <AnimationCatalog />;
  }

  const renderCurrentScreen = () => {
    if (!view) {
      return <LandingScreen />;
    }

    switch (view.phase) {
      case 'LOBBY':
        return <LobbyScreen />;
      case 'ROLE_REVEAL':
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-center mb-2">
              <span className="text-xs font-serif text-amber-400 uppercase tracking-widest">
                Night is falling...
              </span>
              <h2 className="font-serif text-2xl font-bold text-slate-100">
                Your Secret Identity
              </h2>
            </div>
            <RoleRevealCard />
          </div>
        );
      case 'NIGHT':
        return <NightScreen />;
      case 'DAWN':
        return <DawnScreen />;
      case 'DAY_DISCUSSION':
        return <DayDiscussionScreen />;
      case 'VOTING':
        return <VotingScreen />;
      case 'RESULT':
        return <ResultScreen />;
      case 'GAME_OVER':
        return <GameOverScreen />;
      default:
        return <LandingScreen />;
    }
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans">
      {/* Living Village Background */}
      <VillageSkyline />

      {/* Global Narrator Banner */}
      <PhaseBanner />

      {/* Connection Indicator Bar */}
      {!connected && (
        <div className="fixed top-0 left-0 right-0 bg-red-600/90 text-white text-[11px] py-1 text-center font-medium z-50 animate-pulse">
          ⚡ Connection lost. Reconnecting to village seat...
        </div>
      )}

      {/* Top Header if in-game */}
      {view && view.phase !== 'LOBBY' && (
        <header className="px-4 py-2 flex items-center justify-between z-30 max-w-lg mx-auto w-full gap-2">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs text-amber-400 font-bold tracking-wider">
              {view.roomCode}
            </span>
          </div>

          {/* Persistent Player Role Identity Badge */}
          <MyIdentityBadge />

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 text-xs text-slate-400 hover:text-slate-200"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button
              onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
              className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700 font-bold"
            >
              {language === 'en' ? 'தமிழ்' : 'EN'}
            </button>
          </div>
        </header>
      )}

      {/* Main Screen Transition Container */}
      <main className="flex-1 flex flex-col justify-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={view ? `${view.phase}_${view.round}` : 'landing'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {renderCurrentScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Toast Notifications */}
      <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-80 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`pointer-events-auto p-3 rounded-xl border text-xs font-medium shadow-2xl backdrop-blur-md flex items-center justify-between ${
                toast.type === 'error'
                  ? 'bg-red-950/90 border-red-500/50 text-red-200'
                  : toast.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-900/90 border-slate-700 text-slate-200'
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className="ml-2 text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
