import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext.js';
import { CountdownRing } from '../narrator/PhaseBanner.js';

export const DayDiscussionScreen: React.FC = () => {
  const {
    view,
    myPlayerId,
    remainingMs,
    chatMessages,
    sendChat,
    skipDiscussion,
    t,
  } = useGame();

  const [messageText, setMessageText] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; x: number }[]>([]);

  if (!view) return null;

  const me = view.players.find((p) => p.id === myPlayerId);
  const isAlive = me?.isAlive ?? false;

  const alivePlayers = view.players.filter((p) => p.isAlive);
  const skipVotesCount = view.skipDiscussionVotes?.length || 0;
  const skipMajorityNeeded = Math.floor(alivePlayers.length / 2) + 1;
  const hasVotedSkip = myPlayerId ? view.skipDiscussionVotes?.includes(myPlayerId) : false;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    const channel = isAlive ? 'public' : 'ghost';
    await sendChat(messageText.trim(), channel);
    setMessageText('');
  };

  const handleSendEmoji = (emoji: string) => {
    const newEmoji = {
      id: Math.random().toString(),
      emoji,
      x: 20 + Math.random() * 60,
    };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== newEmoji.id));
    }, 2000);
  };

  // Filter messages based on alive or spectator status
  const visibleMessages = chatMessages.filter((m) => {
    if (m.channel === 'public') return true;
    if (m.channel === 'ghost' && !isAlive) return true;
    return false;
  });

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-[82vh] justify-between p-3 relative">
      {/* Floating Emojis Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
        <AnimatePresence>
          {floatingEmojis.map((item) => (
            <motion.div
              key={item.id}
              initial={{ y: 300, opacity: 1, scale: 0.8 }}
              animate={{ y: -50, opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              style={{ left: `${item.x}%` }}
              className="absolute text-3xl"
            >
              {item.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header with Timer and Skip Discussion Button */}
      <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-md rounded-2xl p-3 border border-slate-800 shadow-lg mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <h2 className="font-serif text-lg font-bold text-slate-100">
              {t('dayDiscussion')} {view.round}
            </h2>
          </div>
          <p className="text-[11px] text-slate-400">
            {isAlive ? 'Discuss suspicions and observe behaviors' : 'Ghost realm spectator mode'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAlive && (
            <button
              onClick={skipDiscussion}
              disabled={hasVotedSkip}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-serif transition-all ${
                hasVotedSkip
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {hasVotedSkip ? 'Voted Skip' : 'Skip'} ({skipVotesCount}/{skipMajorityNeeded})
            </button>
          )}

          <CountdownRing
            remainingMs={remainingMs}
            totalDurationMs={view.settings.discussionDurationSec * 1000}
          />
        </div>
      </div>

      {/* Living Players Bar */}
      <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800/80 mb-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
          Alive:
        </span>
        {alivePlayers.map((p) => {
          const isMe = p.id === myPlayerId;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs whitespace-nowrap ${
                isMe
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-200'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isMe ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                }`}
              />
              <span className="font-semibold">
                {p.nickname} {isMe && view.myRole ? `(You - ${view.myRole})` : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-slate-950/70 backdrop-blur-md rounded-2xl border border-slate-800/80 p-3 overflow-y-auto space-y-2.5 mb-2">
        {visibleMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic">
            <span>🗣️ No accusations made yet. Speak up!</span>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = msg.senderId === myPlayerId;
            const isGhost = msg.channel === 'ghost';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5 px-1">
                  <span>{msg.senderNickname}</span>
                  {isGhost && (
                    <span className="text-purple-400 font-bold tracking-wider">[GHOST]</span>
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs font-sans shadow-sm ${
                    isGhost
                      ? 'bg-purple-950/50 border border-purple-800/50 text-purple-200 backdrop-blur-sm'
                      : isMe
                        ? 'bg-amber-600 text-slate-950 font-medium'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/50'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Emoji Quick Reactions */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {['👀', '🤔', '🤥', '🔪', '😱', '🛡️'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendEmoji(emoji)}
            className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 flex items-center justify-center text-sm transition-transform active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={
            isAlive
              ? t('typeMessage')
              : 'Ghost chat (only dead players can read)...'
          }
          className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 transition-colors"
        />
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold font-serif shadow-lg transition-transform"
        >
          {t('send')}
        </button>
      </form>
    </div>
  );
};
