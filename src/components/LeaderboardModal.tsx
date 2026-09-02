import React, { useState } from 'react';
import type { LeaderboardEntry, UserProfile } from '../types';
import { Trophy, Medal, Award, Flame, X } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardEntry[];
  currentUser: UserProfile;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  leaderboard,
  currentUser,
}) => {
  const [filter, setFilter] = useState<'profit' | 'multiplier' | 'win'>('profit');

  if (!isOpen) return null;

  const sortedList = [...leaderboard].sort((a, b) => {
    if (filter === 'multiplier') return b.highestMultiplier - a.highestMultiplier;
    if (filter === 'win') return b.highestWin - a.highestWin;
    return b.totalProfit - a.totalProfit;
  });

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Whale':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Top Pilot':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'VIP':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Ace':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.4)]" />;
    return <span className="font-mono text-xs font-bold text-slate-500">#{rank}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="leaderboard-modal"
        className="relative w-full max-w-md bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#161922] via-red-950/30 to-[#161922] border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide uppercase italic">Aviator Hall of Fame</h2>
              <p className="text-[11px] text-gray-400">Top pilots in Telegram mini app</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="grid grid-cols-3 gap-1.5 p-2 bg-black/40 border-b border-white/10 text-xs">
          <button
            onClick={() => setFilter('profit')}
            className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'profit'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-white/5'
            }`}
          >
            Total Profit
          </button>
          <button
            onClick={() => setFilter('multiplier')}
            className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'multiplier'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-white/5'
            }`}
          >
            Max Multiplier
          </button>
          <button
            onClick={() => setFilter('win')}
            className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'win'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-white/5'
            }`}
          >
            Single Win
          </button>
        </div>

        {/* List of Leaders */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {sortedList.map((entry, idx) => {
            const rank = idx + 1;
            const isSelf = entry.userId === currentUser.id;

            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isSelf
                    ? 'bg-red-950/30 border-red-500/40 shadow-md'
                    : 'bg-black/30 border-white/5 hover:border-white/10'
                }`}
              >
                {/* Rank + User */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 flex items-center justify-center flex-shrink-0">
                    {getRankIcon(rank)}
                  </div>

                  <img
                    src={entry.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                        {entry.username}
                      </span>
                      {isSelf && (
                        <span className="text-[9px] px-1 rounded bg-red-500/30 text-red-300 font-mono font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.2 mt-0.5 rounded text-[9px] font-medium border ${getBadgeColor(
                        entry.badge
                      )}`}
                    >
                      {entry.badge}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right font-mono flex-shrink-0">
                  {filter === 'profit' && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-green-400">
                        +${entry.totalProfit.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500 font-sans uppercase font-bold">PROFIT</span>
                    </div>
                  )}

                  {filter === 'multiplier' && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-extrabold text-yellow-400">
                        {entry.highestMultiplier.toFixed(2)}x
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 text-red-500" /> Max
                      </span>
                    </div>
                  )}

                  {filter === 'win' && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-sky-400">
                        ${entry.highestWin.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500 font-sans uppercase font-bold">WIN</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer / Your Rank Bar */}
        <div className="p-3 bg-black/50 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Your Best Multiplier:</span>
            <span className="font-mono font-bold text-yellow-400">
              {currentUser.biggestMultiplier.toFixed(2)}x
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-green-400 font-semibold">
            <span>Net Profit:</span>
            <span>+${(currentUser.totalWon - currentUser.totalLost).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
