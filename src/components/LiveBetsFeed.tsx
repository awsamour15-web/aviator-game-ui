import React, { useState, useMemo } from 'react';
import type { PlayerBet } from '../types';

interface LiveBetsFeedProps {
  bets: PlayerBet[];
  currentMultiplier: number;
}

// Function to format username like o***z, 3***0, s***0, t***7, etc.
function formatMaskedUsername(name: string): string {
  if (!name) return 'u***1';
  // If already masked (contains ***), return as-is
  if (name.includes('***')) return name;
  const clean = name.replace(/^@/, '');
  if (clean.length <= 2) return `${clean[0]}***${clean[clean.length - 1] || '0'}`;
  return `${clean[0]}***${clean[clean.length - 1]}`;
}

export const LiveBetsFeed: React.FC<LiveBetsFeedProps> = ({ bets, currentMultiplier }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'previous' | 'top'>('all');

  // Multiplier pill styling based on value matching Aviator design system
  const getMultiplierBadge = (mult: number) => {
    if (mult < 2.0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/15 text-cyan-400 font-bold text-[11px] border border-cyan-400/20">
          {mult.toFixed(2)}x
        </span>
      );
    }
    if (mult < 10.0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-purple-400/15 text-purple-400 font-bold text-[11px] border border-purple-400/20">
          {mult.toFixed(2)}x
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-pink-500/15 text-pink-400 font-bold text-[11px] border border-pink-500/20">
        {mult.toFixed(2)}x
      </span>
    );
  };

  // Sort and filter bets based on tab
  const displayedBets = useMemo(() => {
    if (activeTab === 'all') {
      return [...bets].sort((a, b) => {
        // Active human bets first, then cashed out, then by amount
        if (a.cashedOut && !b.cashedOut) return 1;
        if (!a.cashedOut && b.cashedOut) return -1;
        return b.amount - a.amount;
      });
    }

    if (activeTab === 'previous') {
      // Show simulated previous round winners
      return [...bets]
        .map((b, idx) => ({
          ...b,
          cashedOut: true,
          cashoutMultiplier: idx % 2 === 0 ? 1.84 + (idx * 0.4) : 1.35 + (idx * 0.1),
          payout: b.amount * (idx % 2 === 0 ? 1.84 + (idx * 0.4) : 1.35 + (idx * 0.1)),
        }))
        .sort((a, b) => (b.payout || 0) - (a.payout || 0));
    }

    // 'top' tab
    return [...bets]
      .map((b, idx) => ({
        ...b,
        cashedOut: true,
        cashoutMultiplier: [18.42, 12.8, 8.45, 5.2, 3.8][idx % 5],
        payout: b.amount * [18.42, 12.8, 8.45, 5.2, 3.8][idx % 5],
      }))
      .sort((a, b) => (b.payout || 0) - (a.payout || 0));
  }, [bets, activeTab]);

  // Total won in ETB for this round
  const totalWinETB = useMemo(() => {
    return displayedBets.reduce((acc, b) => (b.cashedOut && b.payout ? acc + b.payout : acc), 0);
  }, [displayedBets]);

  const totalBetsCount = 6836;

  return (
    <div
      id="live-bets-feed-card"
      className="w-full bg-[#141518] border border-white/10 rounded-2xl p-3 sm:p-4 flex flex-col shadow-2xl select-none"
    >
      {/* Top Tab Bar: [ All Bets ]  Previous  Top matching reference image */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#2c2d30] text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          All Bets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('previous')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'previous'
              ? 'bg-[#2c2d30] text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('top')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'top'
              ? 'bg-[#2c2d30] text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Top
        </button>
      </div>

      {/* Summary Header: Overlapping avatars with green ring & Total Win */}
      <div className="flex items-center justify-between pb-2">
        {/* Left: 3 Overlapping Avatars + 6836/6836 Bets */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center -space-x-2">
            <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-emerald-400 bg-orange-600 flex items-center justify-center text-[10px] shadow-sm z-30">
              🏎️
            </div>
            <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-emerald-400 bg-zinc-800 flex items-center justify-center text-[10px] shadow-sm z-20">
              🐶
            </div>
            <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-emerald-400 bg-sky-600 flex items-center justify-center text-[10px] shadow-sm z-10">
              🧑‍🚀
            </div>
          </div>
          <div className="text-xs font-sans">
            <span className="font-bold text-white tracking-tight">{totalBetsCount}/{totalBetsCount}</span>{' '}
            <span className="text-gray-400">Bets</span>
          </div>
        </div>

        {/* Right: Total Win ETB */}
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight leading-none">
            {totalWinETB.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-gray-400 text-xs font-sans mt-1">
            Total win ETB
          </div>
        </div>
      </div>

      {/* Horizontal Divider Line */}
      <div className="w-full h-[1px] bg-white/5 my-2" />

      {/* Column Headers: Player | Bet ETB | X | Win ETB */}
      <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-3 py-1.5 font-normal">
        <span className="col-span-5">Player</span>
        <span className="col-span-3 text-right">Bet ETB</span>
        <span className="col-span-2 text-center">X</span>
        <span className="col-span-2 text-right">Win ETB</span>
      </div>

      {/* Bets Rows List matching reference screenshot */}
      <div className="max-h-64 overflow-y-auto space-y-1 text-xs select-none pr-1 scrollbar-thin">
        {displayedBets.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs uppercase tracking-wider">
            Waiting for bets...
          </div>
        ) : (
          displayedBets.map((bet) => {
            const isWin = bet.cashedOut;

            return (
              <div
                key={bet.betId}
                className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-xl bg-[#101114] hover:bg-[#18191e] transition-colors"
              >
                {/* 1. Player (Avatar + Masked Name) */}
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <img
                    src={bet.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=60&q=80'}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-white/10 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-medium text-xs truncate text-white tracking-wide font-sans">
                    {formatMaskedUsername(bet.username)}
                  </span>
                  {bet.slot === 2 && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-gray-400 font-mono">
                      #2
                    </span>
                  )}
                </div>

                {/* 2. Bet ETB */}
                <div className="col-span-3 text-right font-mono font-medium text-white">
                  {bet.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>

                {/* 3. Multiplier X (Shows colored pill when cashed out, otherwise blank) */}
                <div className="col-span-2 flex justify-center items-center">
                  {isWin && bet.cashoutMultiplier ? (
                    getMultiplierBadge(bet.cashoutMultiplier)
                  ) : null}
                </div>

                {/* 4. Win ETB (Shows payout amount when cashed out, otherwise blank) */}
                <div className="col-span-2 text-right font-mono font-semibold text-emerald-400">
                  {isWin && bet.payout ? (
                    bet.payout.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
