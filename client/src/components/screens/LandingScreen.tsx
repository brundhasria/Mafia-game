import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../context/GameContext.js';

export const LandingScreen: React.FC = () => {
  const {
    createRoom,
    joinRoom,
    language,
    setLanguage,
    soundEnabled,
    setSoundEnabled,
    animationMode,
    setAnimationMode,
    error,
    t,
  } = useGame();

  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setLoading(true);
    if (mode === 'create') {
      await createRoom(nickname.trim());
    } else {
      await joinRoom(roomCode.trim(), nickname.trim());
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-[90vh] justify-between p-5 select-none">
      {/* Top Bar with Language & Settings */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 text-slate-200 transition-colors"
        >
          <span>🌐</span>
          <span className="font-semibold">{language === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full bg-slate-900/80 border border-slate-800 text-slate-200 text-sm hover:border-amber-500/50"
            title="Toggle Sound"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          <button
            onClick={() => {
              const next = animationMode === 'full' ? 'reduced' : animationMode === 'reduced' ? 'off' : 'full';
              setAnimationMode(next);
            }}
            className="px-2.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs font-mono uppercase"
            title="Animation Mode"
          >
            {animationMode}
          </button>
        </div>
      </div>

      {/* Hero Title & Logo */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center my-6"
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/20 via-red-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-4xl mb-4 shadow-[0_0_35px_rgba(245,158,11,0.2)]">
          🎭
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-black text-slate-100 tracking-wider">
          MAFIA
        </h1>
        <p className="font-serif text-xs md:text-sm text-amber-400/90 tracking-widest uppercase mt-1">
          Shadows of the Village
        </p>
      </motion.div>

      {/* Main Action Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl"
      >
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`py-2 rounded-xl text-xs font-serif font-bold transition-all ${
              mode === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('createRoom')}
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`py-2 rounded-xl text-xs font-serif font-bold transition-all ${
              mode === 'join'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('joinRoom')}
          </button>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500/40 rounded-xl p-3 mb-4 text-xs text-red-200 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 pl-1">
              {t('nickname')}
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={16}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('enterNickname')}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
            />
          </div>

          {mode === 'join' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 pl-1">
                {t('roomCode')}
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder={t('enterRoomCode')}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-center font-mono font-black text-lg tracking-widest text-amber-300 placeholder-slate-600 uppercase focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
              />
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading || !nickname.trim() || (mode === 'join' && roomCode.length < 4)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-4 rounded-xl font-serif font-black text-sm tracking-wider transition-all shadow-lg ${
              loading || !nickname.trim() || (mode === 'join' && roomCode.length < 4)
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {loading ? 'Entering Village...' : mode === 'create' ? t('createRoom') : t('joinRoom')}
          </motion.button>
        </form>
      </motion.div>

      {/* Footer Details */}
      <div className="text-center text-[11px] text-slate-500 font-sans my-4">
        <span>No accounts. No databases. Pure deception.</span>
      </div>
    </div>
  );
};
