import { describe, it, expect } from 'vitest';
import {
  createGameState,
  startGame,
  transitionToNight,
  submitNightAction,
  resolveNightAndTransitionToDawn,
  transitionToDayDiscussion,
  transitionToVoting,
  submitVote,
  resolveVotesAndTransitionToResult,
  checkWinCondition,
  getPlayerView,
  GameEngineError,
} from '../src/engine.js';
import { getRoleDistribution } from '../src/roles.js';
import { Player, Role } from '../src/types.js';

function makeMockPlayers(count: number): Record<string, Player> {
  const players: Record<string, Player> = {};
  for (let i = 1; i <= count; i++) {
    const id = `p${i}`;
    players[id] = {
      id,
      nickname: `Player ${i}`,
      sessionToken: `token_${id}`,
      isHost: i === 1,
      isConnected: true,
      isAlive: true,
      avatarSeed: `seed_${id}`,
    };
  }
  return players;
}

describe('Role Assignment Counts (5 to 12 players)', () => {
  it('correctly calculates roles for 5-6 players (1 M, 1 Doc, 1 Det, rest Vil)', () => {
    for (const count of [5, 6]) {
      const roles = getRoleDistribution(count);
      expect(roles.length).toBe(count);
      expect(roles.filter((r) => r === 'MAFIA').length).toBe(1);
      expect(roles.filter((r) => r === 'DOCTOR').length).toBe(1);
      expect(roles.filter((r) => r === 'DETECTIVE').length).toBe(1);
      expect(roles.filter((r) => r === 'VILLAGER').length).toBe(count - 3);
    }
  });

  it('correctly calculates roles for 7-9 players (2 M, 1 Doc, 1 Det, rest Vil)', () => {
    for (const count of [7, 8, 9]) {
      const roles = getRoleDistribution(count);
      expect(roles.length).toBe(count);
      expect(roles.filter((r) => r === 'MAFIA').length).toBe(2);
      expect(roles.filter((r) => r === 'DOCTOR').length).toBe(1);
      expect(roles.filter((r) => r === 'DETECTIVE').length).toBe(1);
      expect(roles.filter((r) => r === 'VILLAGER').length).toBe(count - 4);
    }
  });

  it('correctly calculates roles for 10-12 players (3 M, 1 Doc, 1 Det, rest Vil)', () => {
    for (const count of [10, 11, 12]) {
      const roles = getRoleDistribution(count);
      expect(roles.length).toBe(count);
      expect(roles.filter((r) => r === 'MAFIA').length).toBe(3);
      expect(roles.filter((r) => r === 'DOCTOR').length).toBe(1);
      expect(roles.filter((r) => r === 'DETECTIVE').length).toBe(1);
      expect(roles.filter((r) => r === 'VILLAGER').length).toBe(count - 5);
    }
  });

  it('throws error for player counts below 5 or above 12', () => {
    expect(() => getRoleDistribution(4)).toThrow();
    expect(() => getRoleDistribution(13)).toThrow();
  });
});

describe('Doctor Saves Mafia Target', () => {
  it('prevents death at dawn when Doctor protects Mafia target', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state = startGame(state, 'NIGHT');

    // Force known roles
    state.players['p1'].role = 'MAFIA';
    state.players['p1'].role = 'MAFIA';
    state.players['p2'].role = 'DOCTOR';
    state.players['p3'].role = 'DETECTIVE';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';
    state.players['p3'].role = 'DETECTIVE';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';

    // Mafia targets p4, Doctor protects p4
    state = submitNightAction(state, 'p1', 'kill', 'p4');
    state = submitNightAction(state, 'p2', 'protect', 'p4');

    state = resolveNightAndTransitionToDawn(state);

    expect(state.dawnResult?.saved).toBe(true);
    expect(state.dawnResult?.victimId).toBe(null);
    expect(state.players['p4'].isAlive).toBe(true);
  });

  it('eliminates target if Doctor protects someone else', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state = startGame(state, 'NIGHT');

    state.players['p1'].role = 'MAFIA';
    state.players['p1'].role = 'MAFIA';
    state.players['p2'].role = 'DOCTOR';
    state.players['p3'].role = 'DETECTIVE';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';
    state.players['p3'].role = 'DETECTIVE';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';

    state = submitNightAction(state, 'p1', 'kill', 'p4');
    state = submitNightAction(state, 'p2', 'protect', 'p5');

    state = resolveNightAndTransitionToDawn(state);

    expect(state.dawnResult?.saved).toBe(false);
    expect(state.dawnResult?.victimId).toBe('p4');
    expect(state.players['p4'].isAlive).toBe(false);
  });
});

describe('Doctor Self-Protect Rule', () => {
  it('allows Doctor to self-protect once and disallows second time', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state = startGame(state, 'NIGHT');

    state.players['p1'].role = 'MAFIA';
    state.players['p2'].role = 'DOCTOR';
    state.players['p3'].role = 'DETECTIVE';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';

    // First self-protect works
    state = submitNightAction(state, 'p2', 'protect', 'p2');
    expect(state.nightActions.doctorTarget).toBe('p2');
    expect(state.players['p2'].doctorSelfProtectUsed).toBe(true);

    // Transition to next night
    state = resolveNightAndTransitionToDawn(state);
    state = transitionToDayDiscussion(state);
    state = transitionToVoting(state);
    state = resolveVotesAndTransitionToResult(state);
    state = transitionToNight(state);

    // Second self-protect should throw
    expect(() => {
      submitNightAction(state, 'p2', 'protect', 'p2');
    }).toThrow(/once per game/i);
  });
});

describe('Tie Vote Eliminates Nobody', () => {
  it('eliminates nobody when two players receive equal top votes', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state.phase = 'VOTING';

    // p1, p2 vote for p3 (2 votes)
    // p3, p4 vote for p4 (2 votes)
    // p5 votes skip
    state = submitVote(state, 'p1', 'p3');
    state = submitVote(state, 'p2', 'p3');
    state = submitVote(state, 'p3', 'p4');
    state = submitVote(state, 'p4', 'p4');
    state = submitVote(state, 'p5', 'skip');

    state = resolveVotesAndTransitionToResult(state);

    expect(state.voteResult?.tie).toBe(true);
    expect(state.voteResult?.eliminatedId).toBe(null);
    expect(Object.values(state.players).every((p) => p.isAlive)).toBe(true);
  });

  it('eliminates single most-voted player', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state.phase = 'VOTING';
    state.players['p3'].role = 'MAFIA';

    state = submitVote(state, 'p1', 'p3');
    state = submitVote(state, 'p2', 'p3');
    state = submitVote(state, 'p4', 'p3');
    state = submitVote(state, 'p3', 'p1');
    state = submitVote(state, 'p5', 'skip');

    state = resolveVotesAndTransitionToResult(state);

    expect(state.voteResult?.tie).toBe(false);
    expect(state.voteResult?.eliminatedId).toBe('p3');
    expect(state.players['p3'].isAlive).toBe(false);
  });
});

describe('Win Conditions', () => {
  it('Villagers win when all Mafia are eliminated', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state.players['p1'].role = 'MAFIA';
    state.players['p1'].role = 'MAFIA';
    state.players['p2'].role = 'DOCTOR';
    state.players['p3'].role = 'DETECTIVE';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';
    state.players['p3'].role = 'DETECTIVE';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';

    // Eliminate p1 (Mafia)
    state.players['p1'].isAlive = false;

    const winner = checkWinCondition(state);
    expect(winner).toBe('VILLAGERS');
  });

  it('Mafia win when alive Mafia count >= alive non-Mafia count', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state.players['p1'].role = 'MAFIA';
    state.players['p2'].role = 'MAFIA';
    state.players['p3'].role = 'DOCTOR';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';

    // Alive: 2 Mafia, 3 non-mafia. Kill p5.
    state.players['p5'].isAlive = false;
    // Now 2 Mafia, 2 non-mafia -> Mafia win!
    const winner = checkWinCondition(state);
    expect(winner).toBe('MAFIA');
  });
});

describe('Mafia Majority-Vote Tie-Break', () => {
  it('breaks tie randomly between tied targets when alive Mafia disagree', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(7);
    state = startGame(state, 'NIGHT');

    state.players['p1'].role = 'MAFIA';
    state.players['p2'].role = 'MAFIA';

    // p1 votes p3, p2 votes p4 (1-1 tie)
    state = submitNightAction(state, 'p1', 'kill', 'p3');
    state = submitNightAction(state, 'p2', 'kill', 'p4');

    // Deterministic rng: 0 chooses first candidate, 0.99 chooses second
    const stateChoice1 = resolveNightAndTransitionToDawn(state, () => 0.1);
    expect(stateChoice1.dawnResult?.victimId).toBe('p3');

    const stateChoice2 = resolveNightAndTransitionToDawn(state, () => 0.9);
    expect(stateChoice2.dawnResult?.victimId).toBe('p4');
  });

  it('selects unanimous or majority target', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(10);
    state = startGame(state, 'NIGHT');

    state.players['p1'].role = 'MAFIA';
    state.players['p2'].role = 'MAFIA';
    state.players['p3'].role = 'MAFIA';

    // p1 and p2 vote p5, p3 votes p6 -> p5 should win majority (2 vs 1)
    state = submitNightAction(state, 'p1', 'kill', 'p5');
    state = submitNightAction(state, 'p2', 'kill', 'p5');
    state = submitNightAction(state, 'p3', 'kill', 'p6');

    state = resolveNightAndTransitionToDawn(state);
    expect(state.dawnResult?.victimId).toBe('p5');
  });
});

describe('Dead Players Cannot Act or Vote', () => {
  it('throws when dead player attempts night action', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state = startGame(state, 'NIGHT');

    state.players['p1'].role = 'MAFIA';
    state.players['p1'].isAlive = false;

    expect(() => {
      submitNightAction(state, 'p1', 'kill', 'p2');
    }).toThrow(GameEngineError);
  });

  it('throws when dead player attempts voting', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state.phase = 'VOTING';
    state.players['p4'].isAlive = false;

    expect(() => {
      submitVote(state, 'p4', 'p1');
    }).toThrow(GameEngineError);
  });
});

describe('Information Security: getPlayerView', () => {
  it('never reveals other players roles or mafia identity to a Villager', () => {
    const host = { id: 'p1', nickname: 'P1', sessionToken: 't1' };
    let state = createGameState('room1', 'ABCD', host);
    state.players = makeMockPlayers(5);
    state = startGame(state, 'NIGHT');

    state.players['p1'].role = 'MAFIA';
    state.players['p1'].role = 'MAFIA';
    state.players['p2'].role = 'DOCTOR';
    state.players['p3'].role = 'DETECTIVE';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';
    state.players['p3'].role = 'DETECTIVE';
    state.players['p4'].role = 'VILLAGER';
    state.players['p5'].role = 'VILLAGER';

    const villagerView = getPlayerView(state, 'p4');
    expect(villagerView.myRole).toBe('VILLAGER');
    expect(villagerView.teammates).toBeUndefined();

    for (const p of villagerView.players) {
      if (p.id !== 'p4') {
        expect(p.role).toBeUndefined();
      }
    }

    // Mafia view should see teammates
    const mafiaView = getPlayerView(state, 'p1');
    expect(mafiaView.teammates).toBeDefined();
    expect(mafiaView.teammates?.length).toBe(1);
    expect(mafiaView.teammates?.[0].id).toBe('p1');
  });
});

describe('Bot Simulation Test (1000 Random Complete Games)', () => {
  it('plays 1000 complete games to completion without errors or infinite loops', () => {
    const startTime = Date.now();
    let mafiaWins = 0;
    let villagerWins = 0;

    for (let gameIdx = 0; gameIdx < 1000; gameIdx++) {
      // Random player count between 5 and 12
      const playerCount = 5 + Math.floor(Math.random() * 8);
      const host = { id: 'p1', nickname: 'P1', sessionToken: 'token_p1' };
      let state = createGameState(`room_${gameIdx}`, 'TEST', host);
      state.players = makeMockPlayers(playerCount);

      // Start game
      state = startGame(state, 'NIGHT');
      expect(state.phase).toBe('NIGHT');

      let safetyTurnCounter = 0;
      const MAX_TURNS = 100; // Mafia games finish within 15-20 turns max

      while (state.phase !== 'GAME_OVER' && safetyTurnCounter < MAX_TURNS) {
        safetyTurnCounter++;

        if (state.phase === 'NIGHT') {
          const alive = Object.values(state.players).filter((p) => p.isAlive);
          const aliveMafia = alive.filter((p) => p.role === 'MAFIA');
          const aliveDoctor = alive.find((p) => p.role === 'DOCTOR');
          const aliveDetective = alive.find((p) => p.role === 'DETECTIVE');

          // Alive Mafia vote for a non-mafia target (or any alive target)
          for (const m of aliveMafia) {
            const potentialTargets = alive.filter((p) => p.id !== m.id);
            if (potentialTargets.length > 0) {
              const target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
              state = submitNightAction(state, m.id, 'kill', target.id);
            }
          }

          // Alive Doctor protects someone
          if (aliveDoctor) {
            // Can protect self only once
            const validTargets = alive.filter(
              (p) => !(p.id === aliveDoctor.id && aliveDoctor.doctorSelfProtectUsed)
            );
            if (validTargets.length > 0) {
              const target = validTargets[Math.floor(Math.random() * validTargets.length)];
              state = submitNightAction(state, aliveDoctor.id, 'protect', target.id);
            }
          }

          // Alive Detective investigates someone else
          if (aliveDetective) {
            const otherTargets = alive.filter((p) => p.id !== aliveDetective.id);
            if (otherTargets.length > 0) {
              const target = otherTargets[Math.floor(Math.random() * otherTargets.length)];
              state = submitNightAction(state, aliveDetective.id, 'investigate', target.id);
            }
          }

          // Resolve night
          state = resolveNightAndTransitionToDawn(state);
        } else if (state.phase === 'DAWN') {
          state = transitionToDayDiscussion(state);
        } else if (state.phase === 'DAY_DISCUSSION') {
          state = transitionToVoting(state);
        } else if (state.phase === 'VOTING') {
          const alive = Object.values(state.players).filter((p) => p.isAlive);
          // Each alive player votes for someone alive or 'skip'
          for (const voter of alive) {
            const options: (string | 'skip')[] = ['skip', ...alive.map((p) => p.id)];
            const chosen = options[Math.floor(Math.random() * options.length)];
            state = submitVote(state, voter.id, chosen);
          }
          state = resolveVotesAndTransitionToResult(state);
        } else if (state.phase === 'RESULT') {
          state = transitionToNight(state);
        }
      }

      expect(safetyTurnCounter).toBeLessThan(MAX_TURNS);
      expect(state.phase).toBe('GAME_OVER');
      expect(['MAFIA', 'VILLAGERS', 'JESTER']).toContain(state.winner);

      if (state.winner === 'MAFIA') mafiaWins++;
      if (state.winner === 'VILLAGERS') villagerWins++;
    }

    const elapsed = Date.now() - startTime;
    // Verify both teams get wins over 1000 games
    expect(mafiaWins).toBeGreaterThan(0);
    expect(villagerWins).toBeGreaterThan(0);
    expect(mafiaWins + villagerWins).toBe(1000);
  });
});
