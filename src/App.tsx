import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  RoundInfo,
  UserProfile,
  PlayerBet,
  HistoricRound,
  LeaderboardEntry,
  PersonalBetLog,
  WSServerMessage,
  WSClientMessage,
} from './types';
import { TelegramHeader } from './components/TelegramHeader';
import { HistoryPills } from './components/HistoryPills';
import { AviatorCanvas } from './components/AviatorCanvas';
import { BetPanel } from './components/BetPanel';
import { LiveBetsFeed } from './components/LiveBetsFeed';
import { LeaderboardModal } from './components/LeaderboardModal';
import { PersonalHistoryModal } from './components/PersonalHistoryModal';
import { ProvablyFairModal } from './components/ProvablyFairModal';
import { sounds } from './utils/sound';
import { getTelegramWebApp, triggerHaptic, DEMO_TELEGRAM_USERS } from './utils/telegram';
import confetti from 'canvas-confetti';
import { AlertCircle } from 'lucide-react';

export default function App() {
  // Telegram identity state
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile>({
    id: DEMO_TELEGRAM_USERS[0].id,
    username: DEMO_TELEGRAM_USERS[0].username,
    avatar: DEMO_TELEGRAM_USERS[0].avatar,
    balance: 1000.0,
    currency: 'ETB',
    totalWon: 0,
    totalLost: 0,
    totalBetsCount: 0,
    biggestMultiplier: 1.0,
  });

  // Game state
  const [round, setRound] = useState<RoundInfo>({
    roundId: 'init',
    roundNumber: 1042,
    phase: 'WAITING_BETS',
    multiplier: 1.0,
    crashMultiplier: null,
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    clientSeed: '0000000000000000004d6e1457a4f1da41e0824addd0e071d561440d066559f2',
    nonce: 1042,
    countdownRemaining: 5.0,
    startTime: Date.now(),
  });

  const [activeBets, setActiveBets] = useState<PlayerBet[]>([]);
  const [history, setHistory] = useState<HistoricRound[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myBets, setMyBets] = useState<PersonalBetLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProvablyFairOpen, setIsProvablyFairOpen] = useState(false);
  const [selectedHistoricRound, setSelectedHistoricRound] = useState<HistoricRound | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Telegram WebApp
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        const tgId = `tg_${u.id}`;
        const tgUsername = u.username ? `@${u.username}` : `@${u.first_name.toLowerCase()}`;
        const tgPhoto = u.photo_url || DEMO_TELEGRAM_USERS[0].avatar;
        setCurrentUserProfile((prev) => ({
          ...prev,
          id: tgId,
          username: tgUsername,
          avatar: tgPhoto,
        }));
      }
    }
  }, []);

  // Send message helper
  const sendMessage = useCallback((msg: WSClientMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Identify user to server
      ws.send(
        JSON.stringify({
          type: 'IDENTIFY',
          payload: {
            userId: currentUserProfile.id,
            username: currentUserProfile.username,
            avatar: currentUserProfile.avatar,
          },
        })
      );
    };

    ws.onmessage = (evt) => {
      try {
        const msg: WSServerMessage = JSON.parse(evt.data);

        switch (msg.type) {
          case 'INIT_STATE':
            setRound(msg.payload.round);
            setCurrentUserProfile(msg.payload.user);
            setActiveBets(msg.payload.activeBets);
            setHistory(msg.payload.history);
            setLeaderboard(msg.payload.leaderboard);
            setMyBets(msg.payload.myBets);
            break;

          case 'ROUND_COUNTDOWN':
            setRound((prev) => ({
              ...prev,
              phase: 'WAITING_BETS',
              countdownRemaining: msg.payload.remaining,
              roundNumber: msg.payload.roundNumber,
              hash: msg.payload.hash,
              multiplier: 1.0,
              crashMultiplier: null,
            }));
            // Countdown audio blip
            if (msg.payload.remaining <= 3 && msg.payload.remaining > 0) {
              sounds.playCountdownBeep(msg.payload.remaining <= 1);
            }
            break;

          case 'ROUND_START':
            setRound(msg.payload.round);
            sounds.startFlightEngine();
            triggerHaptic('light');
            break;

          case 'MULTIPLIER_UPDATE':
            setRound((prev) => ({
              ...prev,
              multiplier: msg.payload.multiplier,
            }));
            sounds.updateEnginePitch(msg.payload.multiplier);
            break;

          case 'ROUND_CRASH':
            setRound((prev) => ({
              ...prev,
              phase: 'CRASHED',
              multiplier: msg.payload.crashMultiplier,
              crashMultiplier: msg.payload.crashMultiplier,
              serverSeed: msg.payload.serverSeed,
            }));
            setHistory((prev) => [msg.payload.historicRound, ...prev.slice(0, 40)]);
            sounds.playCrashSound();
            triggerHaptic('heavy');
            break;

          case 'BET_PLACED':
            setActiveBets((prev) => {
              const filtered = prev.filter((b) => b.betId !== msg.payload.bet.betId);
              return [...filtered, msg.payload.bet];
            });
            break;

          case 'BET_CANCELED':
            setActiveBets((prev) => prev.filter((b) => b.betId !== msg.payload.betId));
            break;

          case 'BET_CASHED_OUT':
            setActiveBets((prev) =>
              prev.map((b) => (b.betId === msg.payload.bet.betId ? msg.payload.bet : b))
            );
            // If current user won, celebrate!
            if (msg.payload.bet.userId === currentUserProfile.id) {
              sounds.playCashoutChime();
              triggerHaptic('success');
              if ((msg.payload.bet.cashoutMultiplier || 1) >= 2.0) {
                confetti({
                  particleCount: 50,
                  spread: 60,
                  origin: { y: 0.65 },
                });
              }
            }
            break;

          case 'USER_UPDATED':
            setCurrentUserProfile(msg.payload.user);
            break;

          case 'NEW_MY_BET_LOG':
            setMyBets((prev) => [msg.payload.log, ...prev.slice(0, 49)]);
            break;

          case 'LEADERBOARD_UPDATE':
            setLeaderboard(msg.payload.leaderboard);
            break;

          case 'ERROR':
            setErrorMessage(msg.payload.message);
            setTimeout(() => setErrorMessage(null), 3000);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Try to reconnect
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 1500);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [currentUserProfile.id, currentUserProfile.username, currentUserProfile.avatar]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      sounds.stopFlightEngine();
    };
  }, [connectWebSocket]);

  // Handle Switch User (e.g. testing different Telegram accounts)
  const handleSwitchUser = (newId: string, newUsername: string, newAvatar: string) => {
    setCurrentUserProfile((prev) => ({
      ...prev,
      id: newId,
      username: newUsername,
      avatar: newAvatar,
    }));
    sendMessage({
      type: 'IDENTIFY',
      payload: { userId: newId, username: newUsername, avatar: newAvatar },
    });
  };

  // Betting Actions
  const handlePlaceBet = (slot: 1 | 2, amount: number, autoCashoutMultiplier: number | null) => {
    sendMessage({
      type: 'PLACE_BET',
      payload: { slot, amount, autoCashoutMultiplier },
    });
  };

  const handleCancelBet = (slot: 1 | 2) => {
    sendMessage({
      type: 'CANCEL_BET',
      payload: { slot },
    });
  };

  const handleCashOut = (slot: 1 | 2) => {
    sendMessage({
      type: 'CASH_OUT',
      payload: { slot },
    });
  };

  const handleClaimFaucet = () => {
    sendMessage({
      type: 'CLAIM_FAUCET',
      payload: { amount: 500 },
    });
  };

  const handleResetBankroll = () => {
    sendMessage({
      type: 'RESET_BANKROLL',
    });
  };

  // Find user's active bets for Slot 1 and Slot 2
  const activeBetSlot1 = activeBets.find(
    (b) => b.userId === currentUserProfile.id && b.slot === 1 && (b.status === 'active' || b.cashedOut)
  ) || null;

  const activeBetSlot2 = activeBets.find(
    (b) => b.userId === currentUserProfile.id && b.slot === 2 && (b.status === 'active' || b.cashedOut)
  ) || null;

  // Clicking a pill from history opens provably fair modal
  const handleSelectHistoricRound = (historicRound: HistoricRound) => {
    setSelectedHistoricRound(historicRound);
    setIsProvablyFairOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0d0e14] text-white flex flex-col font-sans antialiased selection:bg-red-600 selection:text-white">
      {/* Toast Notification for errors */}
      {errorMessage && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-500 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Telegram Mini App Header */}
      <TelegramHeader
        user={currentUserProfile}
        isConnected={isConnected}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onClaimFaucet={handleClaimFaucet}
        onResetBankroll={handleResetBankroll}
        onSwitchUser={handleSwitchUser}
      />

      {/* Main Container - responsive mobile & desktop layout */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-2.5 sm:px-4 py-3 flex flex-col gap-3">
        {/* Top Recent Multipliers Pill Carousel */}
        <HistoryPills
          history={history}
          onSelectRound={handleSelectHistoricRound}
          onOpenFullHistory={() => setIsHistoryOpen(true)}
        />

        {/* Aviator Flight Radar Canvas */}
        <AviatorCanvas
          phase={round.phase}
          multiplier={round.multiplier}
          countdownRemaining={round.countdownRemaining}
          crashMultiplier={round.crashMultiplier}
          roundNumber={round.roundNumber}
          hash={round.hash}
          onOpenProvablyFair={() => {
            setSelectedHistoricRound(null);
            setIsProvablyFairOpen(true);
          }}
        />

        {/* Dual Betting Deck (Slot 1 & Slot 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <BetPanel
            slot={1}
            phase={round.phase}
            currentMultiplier={round.multiplier}
            userBalance={currentUserProfile.balance}
            activeBet={activeBetSlot1}
            onPlaceBet={handlePlaceBet}
            onCancelBet={handleCancelBet}
            onCashOut={handleCashOut}
          />

          <BetPanel
            slot={2}
            phase={round.phase}
            currentMultiplier={round.multiplier}
            userBalance={currentUserProfile.balance}
            activeBet={activeBetSlot2}
            onPlaceBet={handlePlaceBet}
            onCancelBet={handleCancelBet}
            onCashOut={handleCashOut}
          />
        </div>

        {/* Live Bets Multiplayer Feed */}
        <LiveBetsFeed bets={activeBets} currentMultiplier={round.multiplier} />
      </main>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        leaderboard={leaderboard}
        currentUser={currentUserProfile}
      />

      {/* Historical Betting Log Modal */}
      <PersonalHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        myBets={myBets}
        globalHistory={history}
        onVerifyRound={(rnd) => {
          setSelectedHistoricRound(rnd);
          setIsProvablyFairOpen(true);
        }}
      />

      {/* Provably Fair Modal */}
      <ProvablyFairModal
        isOpen={isProvablyFairOpen}
        onClose={() => setIsProvablyFairOpen(false)}
        selectedRound={selectedHistoricRound}
        currentHash={round.hash}
        currentRoundNumber={round.roundNumber}
      />
    </div>
  );
}
