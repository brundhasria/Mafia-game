import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameState,
  getPlayerView,
  ChatMessage,
  Role,
} from 'mafia-shared';
import { RoomManager } from './roomManager.js';
import { sanitizeNickname, sanitizeChatText } from './sanitizer.js';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
) {
  /**
   * Broadcasts secure per-player view to all connected sockets in a room.
   */
  function broadcastRoomState(room: GameState): void {
    for (const player of Object.values(room.players)) {
      const socketIds = roomManager.getPlayerSockets(player.id);
      if (socketIds.length > 0) {
        const view = getPlayerView(room, player.id);
        for (const sId of socketIds) {
          io.to(sId).emit('game:state', view);
        }
      }
    }
  }

  /**
   * Sends chat message only to permitted sockets.
   * - Public: all sockets in the room
   * - Mafia: only alive Mafia (and dead Mafia spectators)
   * - Ghost: only dead players
   */
  function broadcastChatMessage(room: GameState, message: ChatMessage): void {
    for (const player of Object.values(room.players)) {
      let canReceive = false;
      if (message.channel === 'public') {
        canReceive = true;
      } else if (message.channel === 'mafia') {
        canReceive = player.role === 'MAFIA';
      } else if (message.channel === 'ghost') {
        canReceive = !player.isAlive;
      }

      if (canReceive) {
        const socketIds = roomManager.getPlayerSockets(player.id);
        for (const sId of socketIds) {
          io.to(sId).emit('game:chat_message', message);
        }
      }
    }
  }

  // Register room manager callbacks for automated phase and event notifications
  // (Callbacks are wired inside server.ts or here)

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    let currentSession: { roomId: string; playerId: string } | null = null;

    socket.on('room:create', ({ nickname }, callback) => {
      const sanitized = sanitizeNickname(nickname);
      if (!sanitized.valid) {
        return callback({ success: false, error: sanitized.error });
      }

      const { room, player } = roomManager.createRoom(sanitized.nickname);
      currentSession = { roomId: room.roomId, playerId: player.id };
      roomManager.associateSocket(player.id, socket.id);
      socket.join(room.roomId);

      const view = getPlayerView(room, player.id);
      callback({
        success: true,
        roomId: room.roomId,
        roomCode: room.roomCode,
        sessionToken: player.sessionToken,
        playerId: player.id,
        view,
      });

      broadcastRoomState(room);
    });

    socket.on('room:join', ({ code, nickname, sessionToken }, callback) => {
      // If sessionToken is provided, try reconnecting first
      if (sessionToken) {
        const reconnectRes = roomManager.reconnect(sessionToken);
        if (reconnectRes.success && reconnectRes.room && reconnectRes.player) {
          currentSession = {
            roomId: reconnectRes.room.roomId,
            playerId: reconnectRes.player.id,
          };
          roomManager.associateSocket(reconnectRes.player.id, socket.id);
          socket.join(reconnectRes.room.roomId);

          const view = getPlayerView(reconnectRes.room, reconnectRes.player.id);
          callback({
            success: true,
            roomId: reconnectRes.room.roomId,
            roomCode: reconnectRes.room.roomCode,
            sessionToken: reconnectRes.player.sessionToken,
            playerId: reconnectRes.player.id,
            view,
          });

          broadcastRoomState(reconnectRes.room);
          return;
        }
      }

      const sanitized = sanitizeNickname(nickname);
      if (!sanitized.valid) {
        return callback({ success: false, error: sanitized.error });
      }

      const joinRes = roomManager.joinRoom(code, sanitized.nickname);
      if (!joinRes.success || !joinRes.room || !joinRes.player) {
        return callback({ success: false, error: joinRes.error });
      }

      currentSession = { roomId: joinRes.room.roomId, playerId: joinRes.player.id };
      roomManager.associateSocket(joinRes.player.id, socket.id);
      socket.join(joinRes.room.roomId);

      const view = getPlayerView(joinRes.room, joinRes.player.id);
      callback({
        success: true,
        roomId: joinRes.room.roomId,
        roomCode: joinRes.room.roomCode,
        sessionToken: joinRes.player.sessionToken,
        playerId: joinRes.player.id,
        view,
      });

      broadcastRoomState(joinRes.room);
    });

    socket.on('room:reconnect', ({ sessionToken }, callback) => {
      const res = roomManager.reconnect(sessionToken);
      if (!res.success || !res.room || !res.player) {
        return callback({ success: false, error: res.error || 'Session not found' });
      }

      currentSession = { roomId: res.room.roomId, playerId: res.player.id };
      roomManager.associateSocket(res.player.id, socket.id);
      socket.join(res.room.roomId);

      const view = getPlayerView(res.room, res.player.id);
      callback({
        success: true,
        roomId: res.room.roomId,
        roomCode: res.room.roomCode,
        sessionToken: res.player.sessionToken,
        playerId: res.player.id,
        view,
      });

      broadcastRoomState(res.room);
      io.to(res.room.roomId).emit('player:status', {
        playerId: res.player.id,
        isConnected: true,
      });
    });

    socket.on('room:start', (callback) => {
      if (!currentSession) return callback({ success: false, error: 'Not in a room' });
      const res = roomManager.startGame(currentSession.roomId, currentSession.playerId);
      callback(res);
      if (res.success) {
        const room = roomManager.getRoom(currentSession.roomId);
        if (room) broadcastRoomState(room);
      }
    });

    socket.on('room:kick', ({ targetPlayerId }, callback) => {
      if (!currentSession) return callback({ success: false, error: 'Not in a room' });
      const kicked = roomManager.kickPlayer(
        currentSession.roomId,
        currentSession.playerId,
        targetPlayerId
      );
      if (kicked) {
        const targetSockets = roomManager.getPlayerSockets(targetPlayerId);
        for (const sId of targetSockets) {
          io.to(sId).emit('game:toast', {
            message: 'You were kicked from the lobby by the host.',
            messageTa: 'நீங்கள் அறை தலைவரால் வெளியேற்றப்பட்டீர்கள்.',
            type: 'error',
          });
        }
        const room = roomManager.getRoom(currentSession.roomId);
        if (room) broadcastRoomState(room);
        callback({ success: true });
      } else {
        callback({ success: false, error: 'Could not kick player' });
      }
    });

    socket.on('room:settings', ({ settings }, callback) => {
      if (!currentSession) return callback({ success: false, error: 'Not in a room' });
      const ok = roomManager.updateSettings(
        currentSession.roomId,
        currentSession.playerId,
        settings
      );
      if (ok) {
        const room = roomManager.getRoom(currentSession.roomId);
        if (room) broadcastRoomState(room);
        callback({ success: true });
      } else {
        callback({ success: false, error: 'Could not update settings' });
      }
    });

    socket.on('game:action', ({ type, targetId }, callback) => {
      if (!currentSession) return callback({ success: false, error: 'Not in a room' });
      const res = roomManager.handleNightAction(
        currentSession.roomId,
        currentSession.playerId,
        type,
        targetId
      );
      callback(res);
    });

    socket.on('game:vote', ({ targetId }, callback) => {
      if (!currentSession) return callback({ success: false, error: 'Not in a room' });
      const res = roomManager.handleVote(
        currentSession.roomId,
        currentSession.playerId,
        targetId
      );
      callback(res);
    });

    socket.on('game:skip_discussion', (callback) => {
      if (!currentSession) return callback({ success: false, error: 'Not in a room' });
      const res = roomManager.handleSkipDiscussion(
        currentSession.roomId,
        currentSession.playerId
      );
      callback(res);
    });

    socket.on('game:chat', ({ text, channel }, callback) => {
      if (!currentSession) return callback({ success: false, error: 'Not in a room' });
      const sanitized = sanitizeChatText(text);
      if (!sanitized.valid) {
        return callback({ success: false, error: 'Invalid message text' });
      }

      const res = roomManager.handleChatMessage(
        currentSession.roomId,
        currentSession.playerId,
        sanitized.text,
        channel
      );

      if (res.success && res.message) {
        const room = roomManager.getRoom(currentSession.roomId);
        if (room) {
          broadcastChatMessage(room, res.message);
        }
        callback({ success: true });
      } else {
        callback({ success: false, error: res.error });
      }
    });

    socket.on('game:play_again', (callback) => {
      if (!currentSession) return callback({ success: false, error: 'Not in a room' });
      const res = roomManager.handlePlayAgain(
        currentSession.roomId,
        currentSession.playerId
      );
      callback(res);
    });

    socket.on('disconnect', () => {
      if (currentSession) {
        const { playerId, roomId } = currentSession;
        roomManager.removeSocket(playerId, socket.id);
        const { room, newHostId } = roomManager.handleDisconnect(playerId);

        if (room) {
          io.to(roomId).emit('player:status', { playerId, isConnected: false });
          if (newHostId) {
            io.to(roomId).emit('player:left', { playerId, newHostId });
          }
          broadcastRoomState(room);
        }
      }
    });
  });

  return { broadcastRoomState, broadcastChatMessage };
}
