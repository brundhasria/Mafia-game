import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext.js';
import { CountdownRing } from '../narrator/PhaseBanner.js';
import { ROLE_DEFINITIONS } from 'mafia-shared';

export const NightScreen: React.FC = () => {
  const {
    view,
    myPlayerId,
    remainingMs,
    submitNightAction,
    sendChat,
    chatMessages,
    t,
    language,
  } = useGame();

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [slashAnimated, setSlashAnimated] = useState(false);
  const [shieldAnimated, setShieldAnimated] = useState(false);
  const [stampAnimated, setStampAnimated] = useState(false);
  const [mafiaChatInput, setMafiaChatInput] = useState('');

  if (!view) return null;

  const me = view.players.find((p) => p.id === myPlayerId);
  const myRole = view.myRole || 'VILLAGER';
  const roleInfo = ROLE_DEFINITIONS[myRole];
  const isAlive = me?.isAlive ?? false;

  // Filter alive potential targets
  const alivePlayers = view.players.filter((p) => p.isAlive);

  // Mafia cannot target fellow Mafia
  const isMafia = myRole === 'MAFIA';
  const isDoctor = myRole === 'DOCTOR';
  const isDetective = myRole === 'DETECTIVE';

  const handleConfirmAction = async () => {
    if (!selectedTargetId) return;

    if (isMafia) {
      setSlashAnimated(true);
      await submitNightAction('kill', selectedTargetId);
    } else if (isDoctor) {
      setShieldAnimated(true);
      await submitNightAction('protect', selectedTargetId);
    } else if (isDetective) {
      setStampAnimated(true);
      await submitNightAction('investigate', selectedTargetId);
    }
  };

  const handleSendMafiaChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mafiaChatInput.trim()) return;
    await sendChat(mafiaChatInput.trim(), 'mafia');
    setMafiaChatInput('');
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col min-h-[80vh] justify-between p-4">
      {/* Top Phase Header with Countdown */}
      <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-lg mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌙</span>
            <h2 className="font-serif text-xl font-bold text-slate-100">
              {t('nightPhase')} {view.round}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {roleInfo.nightActionDescription || 'Close your eyes. Wait for dawn.'}
          </p>
        </div>
        <CountdownRing
          remainingMs={remainingMs}
          totalDurationMs={view.settings.nightDurationSec * 1000}
        />
      </div>

      {/* Your Role Identity Card */}
      <div
        className="rounded-2xl p-3 mb-4 flex items-center justify-between border shadow-lg"
        style={{
          borderColor: `${roleInfo.color}55`,
          background: `linear-gradient(135deg, #090d16 0%, ${roleInfo.color}15 100%)`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl border shadow-inner"
            style={{ borderColor: roleInfo.color, backgroundColor: '#090d16' }}
          >
            {myRole === 'MAFIA' && '🔪'}
            {myRole === 'DOCTOR' && '💉'}
            {myRole === 'DETECTIVE' && '🔍'}
            {myRole === 'VILLAGER' && '🌾'}
            {myRole === 'JESTER' && '🃏'}
            {myRole === 'MAYOR' && '⚖️'}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              YOUR IDENTITY
            </div>
            <div className="font-serif font-black text-sm" style={{ color: roleInfo.color }}>
              {language === 'ta' ? roleInfo.nameTa : roleInfo.name}
            </div>
          </div>
        </div>
        <div className="text-[11px] text-slate-300 max-w-[210px] text-right font-medium leading-tight">
          {language === 'ta' ? roleInfo.descriptionTa : roleInfo.description}
        </div>
      </div>

      {/* Role Badge and Teammates for Mafia */}
      {isMafia && view.teammates && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 mb-4 text-xs">
          <div className="font-bold text-red-300 flex items-center gap-1.5 mb-1.5">
            <span>🗡️</span> MAFIA SYNDICATE
          </div>
          <div className="flex flex-wrap gap-2">
            {view.teammates.map((m) => (
              <span
                key={m.id}
                className="bg-red-900/60 px-2.5 py-1 rounded-md text-red-100 font-medium"
              >
                {m.nickname} {m.id === myPlayerId ? '(You)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Doctor Self Protect status notice */}
      {isDoctor && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 mb-4 text-xs text-emerald-200">
          🛡️ Self-protection: {view.doctorSelfProtectUsed ? 'Already used once' : '1 remaining'}
        </div>
      )}

      {/* Detective Investigation Result */}
      {isDetective && view.nightActionResult && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-blue-950/60 border-2 border-blue-400 rounded-xl p-3 mb-4 text-center shadow-lg"
        >
          <div className="text-xs font-semibold text-blue-300">INVESTIGATION RESULT</div>
          <div className="text-lg font-bold text-slate-100 my-1">
            Target is {view.nightActionResult.isMafia ? '🚨 MAFIA!' : '🕊️ NOT MAFIA'}
          </div>
        </motion.div>
      )}

      {/* Action Content Area */}
      <div className="flex-1 flex flex-col justify-center">
        {!isAlive ? (
          <div className="text-center p-6 bg-slate-900/60 rounded-2xl border border-slate-800">
            <span className="text-4xl block mb-2">👻</span>
            <h3 className="font-serif text-lg font-bold text-slate-300">
              {t('spectatorMode')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Dead players cannot take night actions.
            </p>
          </div>
        ) : myRole === 'VILLAGER' || myRole === 'MAYOR' || myRole === 'JESTER' ? (
          /* Villagers have no night action: show breathing moon */
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              className="w-24 h-24 rounded-full bg-slate-800/80 border border-amber-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.15)] mb-4"
              animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-4xl">😴</span>
            </motion.div>
            <h3 className="font-serif text-lg font-bold text-slate-200">
              The village sleeps deeply...
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {t('waitingForNightActions')}
            </p>
          </div>
        ) : view.hasSubmittedAction ? (
          /* Already submitted action: breathing moon waiting screen */
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              className="w-24 h-24 rounded-full bg-slate-800/80 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-4"
              animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-4xl">✨</span>
            </motion.div>
            <h3 className="font-serif text-lg font-bold text-emerald-300">
              Action Confirmed
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Rest quietly while others complete their decisions...
            </p>
          </div>
        ) : (
          /* Player target picker */
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-center">
              Select your target
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
              {alivePlayers.map((p) => {
                const isSelected = selectedTargetId === p.id;
                const isSelf = p.id === myPlayerId;
                const cannotSelfProtect = isDoctor && isSelf && view.doctorSelfProtectUsed;

                return (
                  <motion.button
                    key={p.id}
                    disabled={cannotSelfProtect}
                    onClick={() => setSelectedTargetId(p.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${
                      cannotSelfProtect
                        ? 'opacity-40 cursor-not-allowed bg-slate-900/40 border-slate-800'
                        : isSelected
                          ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    {/* Reticle indicator */}
                    {isSelected && (
                      <motion.div
                        layoutId="reticle"
                        className="absolute inset-0 border-2 border-amber-400 rounded-xl pointer-events-none"
                      />
                    )}

                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-300 border border-slate-700">
                      {p.nickname.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="truncate">
                      <div className="font-semibold text-sm text-slate-100 truncate">
                        {p.nickname} {isSelf ? '(You)' : ''}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {cannotSelfProtect ? 'Self protect used' : 'Alive'}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Confirm action button */}
            <motion.button
              disabled={!selectedTargetId}
              onClick={handleConfirmAction}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3.5 rounded-xl font-serif font-bold text-sm tracking-wide transition-all shadow-lg ${
                selectedTargetId
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isMafia ? 'Confirm Target 🔪' : isDoctor ? 'Protect Player 🛡️' : 'Investigate 🔍'}
            </motion.button>
          </div>
        )}
      </div>

      {/* Mafia Private Night Chat */}
      {isMafia && isAlive && (
        <div className="mt-4 bg-slate-950/80 border border-red-900/40 rounded-xl p-3">
          <div className="text-xs font-bold text-red-400 mb-2 flex items-center justify-between">
            <span>🗡️ MAFIA LAIR CHAT</span>
            <span className="text-[10px] text-slate-500">Only Mafia can read</span>
          </div>

          <div className="h-24 overflow-y-auto space-y-1 mb-2 text-xs">
            {chatMessages
              .filter((m) => m.channel === 'mafia')
              .slice(-15)
              .map((m) => (
                <div key={m.id} className="text-slate-300">
                  <span className="font-bold text-red-400">{m.senderNickname}: </span>
                  {m.text}
                </div>
              ))}
          </div>

          <form onSubmit={handleSendMafiaChat} className="flex gap-2">
            <input
              type="text"
              value={mafiaChatInput}
              onChange={(e) => setMafiaChatInput(e.target.value)}
              placeholder="Whisper to Mafia..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
