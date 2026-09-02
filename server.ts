import express from "express";
import http from "http";
import path from "path";
import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import type {
  GamePhase,
  RoundInfo,
  PlayerBet,
  HistoricRound,
  UserProfile,
  LeaderboardEntry,
  PersonalBetLog,
  WSClientMessage,
  WSServerMessage,
} from "./src/types";

const PORT = 3000;
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Provably Fair Crash Math ---
function generateSeed(length = 64): string {
  return crypto.randomBytes(length / 2).toString("hex");
}

function calculateCrashMultiplier(serverSeed: string, clientSeed: string, nonce: number): { hash: string; multiplier: number } {
  const message = `${clientSeed}:${nonce}`;
  const hash = crypto.createHmac("sha256", serverSeed).update(message).digest("hex");
  
  // 52-bit integer from the first 13 hex characters
  const h = parseInt(hash.slice(0, 13), 16);
  const e = Math.pow(2, 52);

  // 3% house edge / 1 in 33 chance of instant crash at 1.00x
  if (h % 33 === 0) {
    return { hash, multiplier: 1.00 };
  }

  const rawMultiplier = Math.floor((100 * e - h) / (e - h)) / 100;
  // Bound multiplier between 1.00 and 1000.00
  const multiplier = Math.max(1.00, Math.min(Number(rawMultiplier.toFixed(2)), 1000.00));
  return { hash, multiplier };
}

// Multiplier growth function given elapsed seconds
function getFlightMultiplier(elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 1.00;
  // Smooth exponential growth: 1.00 * e^(0.065 * t)
  const val = Math.exp(0.065 * elapsedSeconds);
  return Math.max(1.00, Number(val.toFixed(2)));
}

// --- In-Memory State ---
let currentRoundNumber = 1042;
let globalClientSeed = "0000000000000000004d6e1457a4f1da41e0824addd0e071d561440d066559f2";

interface ActiveRoundState {
  roundId: string;
  roundNumber: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  hash: string;
  crashMultiplier: number;
  phase: GamePhase;
  currentMultiplier: number;
  startTime: number;
  countdownRemaining: number;
  bets: Map<string, PlayerBet>; // betId -> PlayerBet
}

// Pre-fill realistic historic rounds
const historicRounds: HistoricRound[] = [];
for (let i = 15; i >= 1; i--) {
  const roundNum = currentRoundNumber - i;
  const sSeed = generateSeed();
  const { hash, multiplier } = calculateCrashMultiplier(sSeed, globalClientSeed, roundNum);
  historicRounds.push({
    roundId: `rnd-${roundNum}`,
    roundNumber: roundNum,
    crashMultiplier: multiplier,
    hash,
    serverSeed: sSeed,
    clientSeed: globalClientSeed,
    nonce: roundNum,
    timestamp: Date.now() - i * 18000,
    totalBets: Math.floor(Math.random() * 25) + 12,
    totalPayout: Math.floor(Math.random() * 12000) + 1500,
  });
}

// Seed leaderboard
let leaderboard: LeaderboardEntry[] = [
  {
    userId: "tg_whale_99",
    username: "@crypto_whale",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
    highestMultiplier: 184.20,
    highestWin: 92100,
    totalProfit: 145200,
    rank: 1,
    badge: "Whale",
  },
  {
    userId: "tg_pilot_ace",
    username: "@ton_pilot",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80",
    highestMultiplier: 96.50,
    highestWin: 48250,
    totalProfit: 87400,
    rank: 2,
    badge: "Top Pilot",
  },
  {
    userId: "tg_dubai_king",
    username: "@dubai_trader",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=120&q=80",
    highestMultiplier: 45.80,
    highestWin: 36640,
    totalProfit: 62100,
    rank: 3,
    badge: "VIP",
  },
  {
    userId: "tg_hamster_pro",
    username: "@hamster_baron",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80",
    highestMultiplier: 31.40,
    highestWin: 18840,
    totalProfit: 34900,
    rank: 4,
    badge: "Ace",
  },
  {
    userId: "tg_alex_sol",
    username: "@alex_sol",
    avatar: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=120&q=80",
    highestMultiplier: 22.10,
    highestWin: 11050,
    totalProfit: 21800,
    rank: 5,
    badge: "Rookie",
  },
];

// User Profiles Store
const userProfiles = new Map<string, UserProfile>();
const userBetLogs = new Map<string, PersonalBetLog[]>(); // userId -> logs

function getOrCreateUser(userId: string, username = "@telegram_pilot", avatar = ""): UserProfile {
  if (!userProfiles.has(userId)) {
    userProfiles.set(userId, {
      id: userId,
      username: username.startsWith("@") ? username : `@${username}`,
      avatar: avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
      balance: 1000.00,
      currency: "ETB",
      totalWon: 0,
      totalLost: 0,
      totalBetsCount: 0,
      biggestMultiplier: 1.00,
    });
    userBetLogs.set(userId, []);
  }
  return userProfiles.get(userId)!;
}

// Bot roster with authentic Aviator masked usernames and distinct avatars
const BOT_POOL = [
  { username: "o***z", avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=100&q=80" },
  { username: "3***0", avatar: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=100&q=80" },
  { username: "s***0", avatar: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=100&q=80" },
  { username: "t***7", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" },
  { username: "t***8", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80" },
  { username: "a***4", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80" },
  { username: "k***9", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" },
  { username: "m***2", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" },
  { username: "x***1", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=100&q=80" },
  { username: "7***5", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80" },
];

// Initialize the first round
let activeRound: ActiveRoundState = createNextRoundState();

function createNextRoundState(): ActiveRoundState {
  currentRoundNumber++;
  const serverSeed = generateSeed();
  const { hash, multiplier } = calculateCrashMultiplier(serverSeed, globalClientSeed, currentRoundNumber);
  return {
    roundId: `rnd-${currentRoundNumber}`,
    roundNumber: currentRoundNumber,
    serverSeed,
    clientSeed: globalClientSeed,
    nonce: currentRoundNumber,
    hash,
    crashMultiplier: multiplier,
    phase: "WAITING_BETS",
    currentMultiplier: 1.00,
    startTime: Date.now(),
    countdownRemaining: 5.0,
    bets: new Map(),
  };
}

// Connected WebSocket clients mapping: ws -> userId
const clientSockets = new Map<WebSocket, string>();

function broadcast(message: WSServerMessage) {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function sendToClient(ws: WebSocket, message: WSServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendToUser(userId: string, message: WSServerMessage) {
  for (const [ws, uId] of clientSockets.entries()) {
    if (uId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

// Generate bot bets for current round
function spawnBotBets() {
  const botCount = Math.floor(Math.random() * 5) + 3;
  const shuffledBots = [...BOT_POOL].sort(() => 0.5 - Math.random()).slice(0, botCount);

  for (const bot of shuffledBots) {
    const betId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const betAmounts = [4113.79, 4113.85, 4033.12, 4000.0, 1600.0, 800.0, 400.0, 80.0, 40.0, 16.0];
    const betAmount = betAmounts[Math.floor(Math.random() * betAmounts.length)];
    // Random target multiplier or manual cashout strategy
    const targetMultiplier = Math.random() > 0.4 ? Number((1.18 + Math.random() * 4.5).toFixed(2)) : null;

    const botBet: PlayerBet = {
      betId,
      userId: `bot_${bot.username}`,
      username: bot.username,
      avatar: bot.avatar,
      isBot: true,
      slot: 1,
      amount: betAmount,
      autoCashoutMultiplier: targetMultiplier,
      cashedOut: false,
      status: "active",
      timestamp: Date.now(),
    };
    activeRound.bets.set(betId, botBet);
    broadcast({ type: "BET_PLACED", payload: { bet: botBet } });
  }
}

// --- Aviator Game Loop ---
let countdownTimer: NodeJS.Timeout | null = null;
let flightInterval: NodeJS.Timeout | null = null;
let flightStartTimestamp = 0;

function startWaitingPhase() {
  activeRound = createNextRoundState();
  let remaining = 5.0;
  activeRound.countdownRemaining = remaining;

  // Broadcast countdown start
  broadcast({
    type: "ROUND_COUNTDOWN",
    payload: {
      remaining,
      roundNumber: activeRound.roundNumber,
      hash: activeRound.hash,
    },
  });

  // Spawn some bots placing bets
  setTimeout(() => {
    if (activeRound.phase === "WAITING_BETS") {
      spawnBotBets();
    }
  }, 1000);

  countdownTimer = setInterval(() => {
    remaining -= 0.5;
    activeRound.countdownRemaining = Math.max(0, Number(remaining.toFixed(1)));
    
    broadcast({
      type: "ROUND_COUNTDOWN",
      payload: {
        remaining: activeRound.countdownRemaining,
        roundNumber: activeRound.roundNumber,
        hash: activeRound.hash,
      },
    });

    if (remaining <= 0) {
      if (countdownTimer) clearInterval(countdownTimer);
      startFlightPhase();
    }
  }, 500);
}

function startFlightPhase() {
  activeRound.phase = "FLYING";
  activeRound.currentMultiplier = 1.00;
  activeRound.startTime = Date.now();
  flightStartTimestamp = activeRound.startTime;

  broadcast({
    type: "ROUND_START",
    payload: {
      round: {
        roundId: activeRound.roundId,
        roundNumber: activeRound.roundNumber,
        phase: "FLYING",
        multiplier: 1.00,
        crashMultiplier: null, // Hidden for security!
        hash: activeRound.hash,
        clientSeed: activeRound.clientSeed,
        nonce: activeRound.nonce,
        countdownRemaining: 0,
        startTime: activeRound.startTime,
      },
    },
  });

  // High-frequency multiplier tick (~60ms for ultra-smooth updates)
  flightInterval = setInterval(() => {
    const elapsedMs = Date.now() - flightStartTimestamp;
    const elapsedSec = elapsedMs / 1000;
    const currentMult = getFlightMultiplier(elapsedSec);
    activeRound.currentMultiplier = currentMult;

    // Check Auto-Cashout for all active bets (both user & bots)
    for (const bet of activeRound.bets.values()) {
      if (!bet.cashedOut && bet.status === "active") {
        if (bet.autoCashoutMultiplier && currentMult >= bet.autoCashoutMultiplier) {
          executeCashOut(bet, bet.autoCashoutMultiplier);
        } else if (bet.isBot && Math.random() < 0.08 && currentMult >= 1.20) {
          // Bot random cashout behavior
          executeCashOut(bet, currentMult);
        }
      }
    }

    // Check if crashed
    if (currentMult >= activeRound.crashMultiplier) {
      if (flightInterval) clearInterval(flightInterval);
      endFlightCrash();
      return;
    }

    broadcast({
      type: "MULTIPLIER_UPDATE",
      payload: {
        multiplier: currentMult,
        elapsedMs,
      },
    });
  }, 60);
}

function executeCashOut(bet: PlayerBet, cashMultiplier: number) {
  if (bet.cashedOut || bet.status !== "active") return;

  bet.cashedOut = true;
  bet.cashoutMultiplier = cashMultiplier;
  const payout = Number((bet.amount * cashMultiplier).toFixed(2));
  const profit = Number((payout - bet.amount).toFixed(2));
  bet.payout = payout;
  bet.status = "cashed_out";

  // Update user balance if human player
  if (!bet.isBot) {
    const user = userProfiles.get(bet.userId);
    if (user) {
      user.balance = Number((user.balance + payout).toFixed(2));
      user.totalWon = Number((user.totalWon + payout).toFixed(2));
      if (cashMultiplier > user.biggestMultiplier) {
        user.biggestMultiplier = cashMultiplier;
      }
      sendToUser(bet.userId, { type: "USER_UPDATED", payload: { user } });

      // Record personal log
      const log: PersonalBetLog = {
        betId: bet.betId,
        roundNumber: activeRound.roundNumber,
        slot: bet.slot,
        amount: bet.amount,
        cashoutMultiplier: cashMultiplier,
        payout,
        profit,
        status: "WON",
        timestamp: Date.now(),
      };
      const logs = userBetLogs.get(bet.userId) || [];
      logs.unshift(log);
      if (logs.length > 50) logs.pop();
      userBetLogs.set(bet.userId, logs);

      sendToUser(bet.userId, { type: "NEW_MY_BET_LOG", payload: { log } });

      // Check leaderboard update
      updateLeaderboard(user, cashMultiplier, payout, profit);
    }
  }

  broadcast({
    type: "BET_CASHED_OUT",
    payload: { bet },
  });
}

function updateLeaderboard(user: UserProfile, multiplier: number, win: number, profit: number) {
  const existingIdx = leaderboard.findIndex((e) => e.userId === user.id);
  if (existingIdx !== -1) {
    const entry = leaderboard[existingIdx];
    entry.highestMultiplier = Math.max(entry.highestMultiplier, multiplier);
    entry.highestWin = Math.max(entry.highestWin, win);
    entry.totalProfit = Number((entry.totalProfit + profit).toFixed(2));
  } else {
    leaderboard.push({
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      highestMultiplier: multiplier,
      highestWin: win,
      totalProfit: profit,
      rank: 0,
      badge: multiplier > 50 ? "Whale" : multiplier > 10 ? "Top Pilot" : "Ace",
    });
  }

  // Sort and re-rank
  leaderboard.sort((a, b) => b.totalProfit - a.totalProfit);
  leaderboard.slice(0, 10).forEach((entry, i) => {
    entry.rank = i + 1;
  });
  broadcast({ type: "LEADERBOARD_UPDATE", payload: { leaderboard } });
}

function endFlightCrash() {
  activeRound.phase = "CRASHED";
  const finalMultiplier = activeRound.crashMultiplier;

  // Settle remaining bets as lost
  const settledBets: PlayerBet[] = [];
  let totalRoundBets = 0;
  let totalRoundPayout = 0;

  for (const bet of activeRound.bets.values()) {
    totalRoundBets++;
    if (!bet.cashedOut && bet.status === "active") {
      bet.status = "lost";
      bet.cashoutMultiplier = 0;
      bet.payout = 0;

      if (!bet.isBot) {
        const user = userProfiles.get(bet.userId);
        if (user) {
          user.totalLost = Number((user.totalLost + bet.amount).toFixed(2));
          sendToUser(bet.userId, { type: "USER_UPDATED", payload: { user } });

          const log: PersonalBetLog = {
            betId: bet.betId,
            roundNumber: activeRound.roundNumber,
            slot: bet.slot,
            amount: bet.amount,
            cashoutMultiplier: null,
            payout: 0,
            profit: -bet.amount,
            status: "LOST",
            timestamp: Date.now(),
          };
          const logs = userBetLogs.get(bet.userId) || [];
          logs.unshift(log);
          if (logs.length > 50) logs.pop();
          userBetLogs.set(bet.userId, logs);
          sendToUser(bet.userId, { type: "NEW_MY_BET_LOG", payload: { log } });
        }
      }
    } else if (bet.cashedOut) {
      totalRoundPayout += bet.payout || 0;
    }
    settledBets.push(bet);
  }

  const historicItem: HistoricRound = {
    roundId: activeRound.roundId,
    roundNumber: activeRound.roundNumber,
    crashMultiplier: finalMultiplier,
    hash: activeRound.hash,
    serverSeed: activeRound.serverSeed,
    clientSeed: activeRound.clientSeed,
    nonce: activeRound.nonce,
    timestamp: Date.now(),
    totalBets: totalRoundBets,
    totalPayout: Number(totalRoundPayout.toFixed(2)),
  };

  historicRounds.unshift(historicItem);
  if (historicRounds.length > 60) historicRounds.pop();

  broadcast({
    type: "ROUND_CRASH",
    payload: {
      crashMultiplier: finalMultiplier,
      serverSeed: activeRound.serverSeed,
      historicRound: historicItem,
      settledBets,
    },
  });

  // Wait 3.5 seconds before starting next round
  setTimeout(() => {
    startWaitingPhase();
  }, 3500);
}

// Start game loop immediately
startWaitingPhase();

// --- WebSocket Connection Handling ---
wss.on("connection", (ws: WebSocket) => {
  let boundUserId = "";

  ws.on("message", (raw: string) => {
    try {
      const msg: WSClientMessage = JSON.parse(raw.toString());

      if (msg.type === "IDENTIFY") {
        const { userId, username, avatar } = msg.payload;
        boundUserId = userId;
        clientSockets.set(ws, userId);
        const user = getOrCreateUser(userId, username, avatar);

        // Send full initial state
        const roundForClient: RoundInfo = {
          roundId: activeRound.roundId,
          roundNumber: activeRound.roundNumber,
          phase: activeRound.phase,
          multiplier: activeRound.currentMultiplier,
          crashMultiplier: activeRound.phase === "CRASHED" ? activeRound.crashMultiplier : null,
          hash: activeRound.hash,
          serverSeed: activeRound.phase === "CRASHED" ? activeRound.serverSeed : undefined,
          clientSeed: activeRound.clientSeed,
          nonce: activeRound.nonce,
          countdownRemaining: activeRound.countdownRemaining,
          startTime: activeRound.startTime,
        };

        sendToClient(ws, {
          type: "INIT_STATE",
          payload: {
            round: roundForClient,
            user,
            activeBets: Array.from(activeRound.bets.values()),
            history: historicRounds.slice(0, 30),
            leaderboard,
            myBets: userBetLogs.get(userId) || [],
          },
        });
      } else if (msg.type === "PLACE_BET") {
        if (!boundUserId) return;
        const { slot, amount, autoCashoutMultiplier } = msg.payload;
        const user = userProfiles.get(boundUserId);

        if (!user) {
          sendToClient(ws, { type: "ERROR", payload: { message: "User not found" } });
          return;
        }

        if (activeRound.phase !== "WAITING_BETS") {
          sendToClient(ws, { type: "ERROR", payload: { message: "Bets can only be placed before takeoff" } });
          return;
        }

        const betAmt = Number(amount);
        if (isNaN(betAmt) || betAmt <= 0) {
          sendToClient(ws, { type: "ERROR", payload: { message: "Invalid bet amount" } });
          return;
        }

        if (user.balance < betAmt) {
          sendToClient(ws, { type: "ERROR", payload: { message: "Insufficient balance" } });
          return;
        }

        // Check if user already placed a bet in this slot for this round
        for (const b of activeRound.bets.values()) {
          if (b.userId === boundUserId && b.slot === slot && b.status === "active") {
            sendToClient(ws, { type: "ERROR", payload: { message: `Slot ${slot} already has an active bet` } });
            return;
          }
        }

        // Deduct balance
        user.balance = Number((user.balance - betAmt).toFixed(2));
        user.totalBetsCount += 1;
        sendToUser(boundUserId, { type: "USER_UPDATED", payload: { user } });

        const betId = `bet-${boundUserId}-${slot}-${activeRound.roundNumber}`;
        const newBet: PlayerBet = {
          betId,
          userId: boundUserId,
          username: user.username,
          avatar: user.avatar,
          isBot: false,
          slot,
          amount: betAmt,
          autoCashoutMultiplier: autoCashoutMultiplier && autoCashoutMultiplier >= 1.05 ? autoCashoutMultiplier : null,
          cashedOut: false,
          status: "active",
          timestamp: Date.now(),
        };

        activeRound.bets.set(betId, newBet);
        broadcast({ type: "BET_PLACED", payload: { bet: newBet } });
      } else if (msg.type === "CANCEL_BET") {
        if (!boundUserId) return;
        const { slot } = msg.payload;

        if (activeRound.phase !== "WAITING_BETS") {
          sendToClient(ws, { type: "ERROR", payload: { message: "Cannot cancel bet after takeoff" } });
          return;
        }

        let targetBetId = "";
        for (const [bId, b] of activeRound.bets.entries()) {
          if (b.userId === boundUserId && b.slot === slot && b.status === "active") {
            targetBetId = bId;
            // Refund
            const user = userProfiles.get(boundUserId);
            if (user) {
              user.balance = Number((user.balance + b.amount).toFixed(2));
              user.totalBetsCount = Math.max(0, user.totalBetsCount - 1);
              sendToUser(boundUserId, { type: "USER_UPDATED", payload: { user } });
            }
            break;
          }
        }

        if (targetBetId) {
          activeRound.bets.delete(targetBetId);
          broadcast({ type: "BET_CANCELED", payload: { betId: targetBetId, userId: boundUserId, slot } });
        }
      } else if (msg.type === "CASH_OUT") {
        if (!boundUserId) return;
        const { slot } = msg.payload;

        if (activeRound.phase !== "FLYING") {
          sendToClient(ws, { type: "ERROR", payload: { message: "Round is not currently flying" } });
          return;
        }

        for (const b of activeRound.bets.values()) {
          if (b.userId === boundUserId && b.slot === slot && b.status === "active" && !b.cashedOut) {
            executeCashOut(b, activeRound.currentMultiplier);
            break;
          }
        }
      } else if (msg.type === "CLAIM_FAUCET") {
        if (!boundUserId) return;
        const user = userProfiles.get(boundUserId);
        if (user) {
          const claimAmount = Math.min(1000, Math.max(100, msg.payload.amount || 500));
          user.balance = Number((user.balance + claimAmount).toFixed(2));
          sendToUser(boundUserId, { type: "USER_UPDATED", payload: { user } });
        }
      } else if (msg.type === "RESET_BANKROLL") {
        if (!boundUserId) return;
        const user = userProfiles.get(boundUserId);
        if (user) {
          user.balance = 1000.00;
          sendToUser(boundUserId, { type: "USER_UPDATED", payload: { user } });
        }
      }
    } catch (err) {
      console.error("WS Message error:", err);
    }
  });

  ws.on("close", () => {
    clientSockets.delete(ws);
  });
});

// --- REST API Endpoints ---
// Provably Fair Verifier
app.post("/api/verify", (req, res) => {
  const { serverSeed, clientSeed, nonce } = req.body;
  if (!serverSeed || !clientSeed || nonce === undefined) {
    return res.status(400).json({ error: "Missing serverSeed, clientSeed, or nonce" });
  }
  const result = calculateCrashMultiplier(String(serverSeed), String(clientSeed), Number(nonce));
  res.json({
    hash: result.hash,
    crashMultiplier: result.multiplier,
    verified: true,
  });
});

// Leaderboard endpoint
app.get("/api/leaderboard", (req, res) => {
  res.json({ leaderboard });
});

// History endpoint
app.get("/api/history", (req, res) => {
  res.json({ history: historicRounds.slice(0, 50) });
});

// User balance top-up / faucet
app.post("/api/user/:id/faucet", (req, res) => {
  const user = getOrCreateUser(req.params.id);
  user.balance += 500;
  sendToUser(user.id, { type: "USER_UPDATED", payload: { user } });
  res.json({ balance: user.balance });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    roundNumber: activeRound.roundNumber,
    phase: activeRound.phase,
    multiplier: activeRound.currentMultiplier,
    connectedClients: wss.clients.size,
  });
});

// --- Vite / Static Serving ---
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Aviator Telegram Engine listening on port ${PORT}`);
  });
}

start();
