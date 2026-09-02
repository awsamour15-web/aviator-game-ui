export type GamePhase = 'WAITING_BETS' | 'FLYING' | 'CRASHED';

export interface RoundInfo {
  roundId: string;
  roundNumber: number;
  phase: GamePhase;
  multiplier: number;
  crashMultiplier: number | null; // null during flight for provably fair security
  hash: string; // SHA-256 hash committed before flight
  serverSeed?: string; // Revealed after crash
  clientSeed: string;
  nonce: number;
  countdownRemaining: number;
  startTime: number;
  crashedAt?: number;
}

export interface PlayerBet {
  betId: string;
  userId: string;
  username: string;
  avatar?: string;
  isBot?: boolean;
  slot: 1 | 2;
  amount: number;
  autoCashoutMultiplier?: number | null;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  payout?: number;
  status: 'active' | 'cashed_out' | 'lost' | 'waiting_next_round';
  timestamp: number;
}

export interface HistoricRound {
  roundId: string;
  roundNumber: number;
  crashMultiplier: number;
  hash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  timestamp: number;
  totalBets: number;
  totalPayout: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  balance: number;
  currency: string;
  totalWon: number;
  totalLost: number;
  totalBetsCount: number;
  biggestMultiplier: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  highestMultiplier: number;
  highestWin: number;
  totalProfit: number;
  rank: number;
  badge: 'VIP' | 'Whale' | 'Top Pilot' | 'Ace' | 'Rookie';
}

export interface PersonalBetLog {
  betId: string;
  roundNumber: number;
  slot: 1 | 2;
  amount: number;
  cashoutMultiplier: number | null;
  payout: number;
  profit: number;
  status: 'WON' | 'LOST';
  timestamp: number;
}

export type WSClientMessage =
  | { type: 'IDENTIFY'; payload: { userId: string; username: string; avatar?: string } }
  | { type: 'PLACE_BET'; payload: { slot: 1 | 2; amount: number; autoCashoutMultiplier?: number | null } }
  | { type: 'CANCEL_BET'; payload: { slot: 1 | 2 } }
  | { type: 'CASH_OUT'; payload: { slot: 1 | 2 } }
  | { type: 'CLAIM_FAUCET'; payload: { amount: number } }
  | { type: 'RESET_BANKROLL' };

export type WSServerMessage =
  | {
      type: 'INIT_STATE';
      payload: {
        round: RoundInfo;
        user: UserProfile;
        activeBets: PlayerBet[];
        history: HistoricRound[];
        leaderboard: LeaderboardEntry[];
        myBets: PersonalBetLog[];
      };
    }
  | { type: 'ROUND_COUNTDOWN'; payload: { remaining: number; roundNumber: number; hash: string } }
  | { type: 'ROUND_START'; payload: { round: RoundInfo } }
  | { type: 'MULTIPLIER_UPDATE'; payload: { multiplier: number; elapsedMs: number } }
  | {
      type: 'ROUND_CRASH';
      payload: {
        crashMultiplier: number;
        serverSeed: string;
        historicRound: HistoricRound;
        settledBets: PlayerBet[];
      };
    }
  | { type: 'BET_PLACED'; payload: { bet: PlayerBet } }
  | { type: 'BET_CANCELED'; payload: { betId: string; userId: string; slot: 1 | 2 } }
  | { type: 'BET_CASHED_OUT'; payload: { bet: PlayerBet } }
  | { type: 'USER_UPDATED'; payload: { user: UserProfile } }
  | { type: 'NEW_MY_BET_LOG'; payload: { log: PersonalBetLog } }
  | { type: 'LEADERBOARD_UPDATE'; payload: { leaderboard: LeaderboardEntry[] } }
  | { type: 'ERROR'; payload: { message: string } };
