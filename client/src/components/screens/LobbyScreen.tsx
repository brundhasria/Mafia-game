import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../context/GameContext.js';
import { triggerHaptic } from '../../config/animations.js';

export const LobbyScreen: React.FC = () => {
  const {
    view,
    myPlayerId,
    startGame,
    kickPlayer,
    updateSettings,
    leaveRoom,
    t,
  } = useGame();

  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!view) return null;

  const isHost = view.players.find((p) => p.id === myPlayerId)?.isHost || false;
  const playerCount = view.players.length;
  const canStart = playerCount >= 5 && playerCount <= 12;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(view.roomCode);
      setCopied(true);
      triggerHaptic(30);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col min-h-[85vh] justify-between p-4">
      {/* Room Code Card with Animated Letters and Copy Button */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl text-center relative overflow-hidden mb-4">
        <div className="text-xs font-semibold text-amber-400/80 tracking-widest uppercase mb-1">
          ROOM CODE
        </div>

        {/* Large 4-Letter Animated Display */}
        <div className="flex items-center justify-center gap-3 my-2">
          {view.roomCode.split('').map((letter, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0.5, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: idx * 0.08, type: 'spring' }}
              className="w-14 h-16 rounded-xl bg-slate-950/80 border-2 border-amber-500/40 flex items-center justify-center font-mono font-black text-3xl text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              {letter}
            </motion.div>
          ))}
        </div>

        <button
          onClick={handleCopyCode}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all active:scale-95 mt-1"
        >
          {copied ? (
            <>
              <span className="text-emerald-400">✓</span> {t('copiedCode')}
            </>
          ) : (
            <>
              <span>📋</span> {t('copyCode')}
            </>
          )}
        </button>

        {isHost && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 text-sm p-1"
            title="Host Settings"
          >
            ⚙️
          </button>
        )}
      </div>

      {/* Host Settings Modal / Drawer */}
      {showSettings && isHost && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-4 text-xs space-y-3"
        >
          <div className="font-bold text-slate-200 uppercase tracking-wider">
            Host Options
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">Enable Jester Role:</span>
            <input
              type="checkbox"
              checked={view.settings.enableJester}
              onChange={(e) => updateSettings({ enableJester: e.target.checked })}
              className="w-4 h-4 accent-amber-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">Enable Mayor Role:</span>
            <input
              type="checkbox"
              checked={view.settings.enableMayor}
              onChange={(e) => updateSettings({ enableMayor: e.target.checked })}
              className="w-4 h-4 accent-amber-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">Discussion Timer (s):</span>
            <select
              value={view.settings.discussionDurationSec}
              onChange={(e) =>
                updateSettings({ discussionDurationSec: Number(e.target.value) })
              }
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            >
              <option value={45}>45s</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
              <option value={120}>120s</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* Player List */}
      <div className="flex-1 my-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1 mb-2">
          <span>{t('playersInLobby')} ({playerCount}/12)</span>
          <span className="text-amber-400/90 font-mono">Min 5 Players</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {view.players.map((p, idx) => {
            const isMe = p.id === myPlayerId;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-xs shadow-inner">
                    {p.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                      <span>{p.nickname}</span>
                      {isMe && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                      {p.isHost && (
                        <span className="text-[10px] text-yellow-300 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/30">
                          Host 👑
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isHost && !isMe && (
                  <button
                    onClick={() => kickPlayer(p.id)}
                    className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                  >
                    Kick
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Start Game & Leave Controls */}
      <div className="space-y-2 pt-2">
        {isHost ? (
          <motion.button
            disabled={!canStart}
            onClick={startGame}
            whileHover={canStart ? { scale: 1.02 } : {}}
            whileTap={canStart ? { scale: 0.98 } : {}}
            className={`w-full py-4 rounded-2xl font-serif font-black text-sm tracking-wider transition-all shadow-lg ${
              canStart
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-amber-500/20 animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {canStart
              ? `🚀 ${t('startGame')}`
              : `Waiting for ${Math.max(0, 5 - playerCount)} more player${5 - playerCount === 1 ? '' : 's'}...`}
          </motion.button>
        ) : (
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
            ⏳ {t('waitingForHost')}
          </div>
        )}

        <button
          onClick={leaveRoom}
          className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
};
