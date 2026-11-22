import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ClientToServerEvents, ServerToClientEvents, GameState, getPlayerView } from 'mafia-shared';
import { RoomManager } from './roomManager.js';
import { setupSocketHandlers } from './socketHandlers.js';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

let broadcastState: ((room: GameState) => void) | null = null;

const roomManager = new RoomManager({
  onPhaseChange: (room, phaseData) => {
    io.to(room.roomId).emit('game:phase_change', {
      phase: room.phase,
      durationMs: phaseData.durationMs,
      narratorText: phaseData.en,
      narratorTextTa: phaseData.ta,
    });
  },
  onTimerTick: (roomId, remainingMs) => {
    io.to(roomId).emit('game:timer', { remainingMs });
  },
  onStateUpdate: (room) => {
    if (broadcastState) {
      broadcastState(room);
    }
  },
  onChatMessage: (roomId, message) => {
    io.to(roomId).emit('game:chat_message', message);
  },
  onDawnResult: (roomId, data) => {
    io.to(roomId).emit('game:dawn_result', data);
  },
  onVoteResult: (roomId, data) => {
    io.to(roomId).emit('game:vote_result', data);
  },
  onGameOver: (roomId, data) => {
    io.to(roomId).emit('game:over', data);
  },
});

const { broadcastRoomState } = setupSocketHandlers(io, roomManager);
broadcastState = broadcastRoomState;

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Mafia Server] listening on port ${PORT}`);
});

export { app, server, roomManager, io };
