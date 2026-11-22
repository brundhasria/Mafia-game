import React, { createContext, useContext, useEffect, useState, useCallback, useTransition } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  PlayerGameView,
  ClientToServerEvents,
  ServerToClientEvents,
  GameSettings,
  Role,
  ChatMessage,
  ChatChannel,
  TRANSLATIONS,
  Language,
} from 'mafia-shared';
import { sounds } from '../audio/soundManager.js';
import { AnimationMode, triggerHaptic } from '../config/animations.js';

interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface GameContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  view: PlayerGameView | null;
  connected: boolean;
  isConnecting: boolean;
  myPlayerId: string | null;
  sessionToken: string | null;
  error: string | null;
  toasts: ToastNotification[];
  phaseBanner: { text: string; show: boolean } | null;
  remainingMs: number;
  language: Language;
  soundEnabled: boolean;
  animationMode: AnimationMode;
  chatMessages: ChatMessage[];
  setLanguage: (lang: Language) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAnimationMode: (mode: AnimationMode) => void;
  t: (key: keyof typeof TRANSLATIONS.en) => string;
  // Room actions
  createRoom: (nickname: string) => Promise<boolean>;
  joinRoom: (code: string, nickname: string) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  kickPlayer: (playerId: string) => Promise<boolean>;
  updateSettings: (settings: Partial<GameSettings>) => Promise<boolean>;
  submitNightAction: (type: 'kill' | 'protect' | 'investigate', targetId: string) => Promise<boolean>;
  submitVote: (targetId: string | 'skip') => Promise<boolean>;
  skipDiscussion: () => Promise<boolean>;
  sendChat: (text: string, channel: ChatChannel) => Promise<boolean>;
  playAgain: () => Promise<boolean>;
  leaveRoom: () => void;
  dismissToast: (id: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [view, setView] = useState<PlayerGameView | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('mafia_session_token') : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [phaseBanner, setPhaseBanner] = useState<{ text: string; show: boolean } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [remainingMs, setRemainingMs] = useState<number>(0);

  // Preferences
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('mafia_language') as Language) || 'en';
  });
  const [soundEnabled, setSoundState] = useState<boolean>(() => sounds.isEnabled());
  const [animationMode, setAnimationModeState] = useState<AnimationMode>(() => {
    return (localStorage.getItem('mafia_animation_mode') as AnimationMode) || 'full';
  });

  const addToast = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mafia_language', lang);
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundState(enabled);
    sounds.setSoundEnabled(enabled);
  }, []);

  const setAnimationMode = useCallback((mode: AnimationMode) => {
    setAnimationModeState(mode);
    localStorage.setItem('mafia_animation_mode', mode);
  }, []);

  const t = useCallback(
    (key: keyof typeof TRANSLATIONS.en): string => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
      return (dict as any)[key] || TRANSLATIONS.en[key] || String(key);
    },
    [language]
  );

  // Initialize socket
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
    const s: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    s.on('connect', () => {
      setConnected(true);
      setIsConnecting(false);

      // Attempt session recovery
      const savedToken = localStorage.getItem('mafia_session_token');
      if (savedToken) {
        s.emit('room:reconnect', { sessionToken: savedToken }, (res) => {
          if (res.success && res.view && res.playerId) {
            setView(res.view);
            setMyPlayerId(res.playerId);
            addToast('Reconnected to room ' + res.roomCode, 'success');
          } else {
            localStorage.removeItem('mafia_session_token');
            setSessionToken(null);
          }
        });
      }
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('game:state', (updatedView) => {
      setView(updatedView);
      if (updatedView.phaseRemainingMs !== undefined) {
        setRemainingMs(updatedView.phaseRemainingMs);
      }
    });

    s.on('game:timer', ({ remainingMs: r }) => {
      setRemainingMs(r);
    });

    s.on('game:phase_change', ({ phase, durationMs, narratorText, narratorTextTa }) => {
      setRemainingMs(durationMs);
      const text = language === 'ta' && narratorTextTa ? narratorTextTa : narratorText;
      setPhaseBanner({ text, show: true });
      triggerHaptic([30, 40, 30]);

      // Play ambient crossfades or phase stingers
      if (phase === 'NIGHT') {
        sounds.setAmbient('night');
      } else if (phase === 'DAY_DISCUSSION' || phase === 'VOTING') {
        sounds.setAmbient('day');
      } else if (phase === 'GAME_OVER') {
        sounds.stopAmbient();
      }

      setTimeout(() => {
        setPhaseBanner((prev) => (prev ? { ...prev, show: false } : null));
      }, 4000);
    });

    s.on('game:chat_message', (msg) => {
      setChatMessages((prev) => [...prev.slice(-150), msg]);
    });

    s.on('game:toast', (toast) => {
      const msg = language === 'ta' && toast.messageTa ? toast.messageTa : toast.message;
      addToast(msg, toast.type);
    });

    s.on('player:joined', ({ player }) => {
      sounds.playJoined();
      addToast(`${player.nickname} joined the room!`, 'info');
    });

    s.on('game:over', ({ winner }) => {
      if (winner === 'MAFIA') {
        sounds.playDefeat();
      } else {
        sounds.playVictory();
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [language, addToast]);

  // Smooth client-side countdown timer synchronized with server authority
  useEffect(() => {
    if (!view || view.phase === 'LOBBY' || view.phase === 'GAME_OVER') {
      return;
    }

    const interval = setInterval(() => {
      if (view.phaseEndTime) {
        const diff = Math.max(0, view.phaseEndTime - Date.now());
        setRemainingMs(diff);
      } else {
        setRemainingMs((prev) => Math.max(0, prev - 250));
      }
    }, 250);

    return () => clearInterval(interval);
  }, [view?.phase, view?.phaseEndTime]);

  const createRoom = useCallback(
    (nickname: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket) return resolve(false);
        setError(null);
        socket.emit('room:create', { nickname }, (res) => {
          if (res.success && res.view && res.sessionToken && res.playerId) {
            setView(res.view);
            setMyPlayerId(res.playerId);
            setSessionToken(res.sessionToken);
            localStorage.setItem('mafia_session_token', res.sessionToken);
            triggerHaptic(50);
            resolve(true);
          } else {
            setError(res.error || 'Failed to create room');
            resolve(false);
          }
        });
      });
    },
    [socket]
  );

  const joinRoom = useCallback(
    (code: string, nickname: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket) return resolve(false);
        setError(null);
        socket.emit('room:join', { code, nickname }, (res) => {
          if (res.success && res.view && res.sessionToken && res.playerId) {
            setView(res.view);
            setMyPlayerId(res.playerId);
            setSessionToken(res.sessionToken);
            localStorage.setItem('mafia_session_token', res.sessionToken);
            triggerHaptic(50);
            resolve(true);
          } else {
            setError(res.error || 'Failed to join room');
            resolve(false);
          }
        });
      });
    },
    [socket]
  );

  const startGameAction = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket) return resolve(false);
      socket.emit('room:start', (res) => {
        if (!res.success) {
          addToast(res.error || 'Cannot start game', 'error');
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, [socket, addToast]);

  const kickPlayer = useCallback(
    (playerId: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket) return resolve(false);
        socket.emit('room:kick', { targetPlayerId: playerId }, (res) => {
          if (!res.success) addToast(res.error || 'Failed to kick player', 'error');
          resolve(res.success);
        });
      });
    },
    [socket, addToast]
  );

  const updateSettings = useCallback(
    (settings: Partial<GameSettings>): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket) return resolve(false);
        socket.emit('room:settings', { settings }, (res) => {
          resolve(res.success);
        });
      });
    },
    [socket]
  );

  const submitNightAction = useCallback(
    (type: 'kill' | 'protect' | 'investigate', targetId: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket) return resolve(false);
        socket.emit('game:action', { type, targetId }, (res) => {
          if (res.success) {
            triggerHaptic([40, 60]);
            if (type === 'kill') sounds.playKnifeSlash();
            if (type === 'protect') sounds.playShield();
            if (type === 'investigate') sounds.playStamp();
            resolve(true);
          } else {
            addToast(res.error || 'Action failed', 'error');
            resolve(false);
          }
        });
      });
    },
    [socket, addToast]
  );

  const submitVote = useCallback(
    (targetId: string | 'skip'): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket) return resolve(false);
        sounds.playVoteToken();
        triggerHaptic(40);
        socket.emit('game:vote', { targetId }, (res) => {
          if (!res.success) {
            addToast(res.error || 'Vote failed', 'error');
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    },
    [socket, addToast]
  );

  const skipDiscussion = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket) return resolve(false);
      socket.emit('game:skip_discussion', (res) => {
        if (!res.success) addToast(res.error || 'Failed to vote skip', 'error');
        resolve(res.success);
      });
    });
  }, [socket, addToast]);

  const sendChat = useCallback(
    (text: string, channel: ChatChannel): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket) return resolve(false);
        socket.emit('game:chat', { text, channel }, (res) => {
          if (!res.success) addToast(res.error || 'Could not send message', 'error');
          resolve(res.success);
        });
      });
    },
    [socket, addToast]
  );

  const playAgain = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket) return resolve(false);
      socket.emit('game:play_again', (res) => {
        resolve(res.success);
      });
    });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('mafia_session_token');
    setSessionToken(null);
    setView(null);
    setMyPlayerId(null);
    setChatMessages([]);
  }, []);

  return (
    <GameContext.Provider
      value={{
        socket,
        view,
        connected,
        isConnecting,
        myPlayerId,
        sessionToken,
        error,
        toasts,
        phaseBanner,
        remainingMs,
        language,
        soundEnabled,
        animationMode,
        chatMessages,
        setLanguage,
        setSoundEnabled,
        setAnimationMode,
        t,
        createRoom,
        joinRoom,
        startGame: startGameAction,
        kickPlayer,
        updateSettings,
        submitNightAction,
        submitVote,
        skipDiscussion,
        sendChat,
        playAgain,
        leaveRoom,
        dismissToast,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
};
