import React, { useState } from 'react';
import type { PersonalBetLog, HistoricRound } from '../types';
import { History, ShieldCheck, ArrowUpRight, ArrowDownRight, X, ExternalLink } from 'lucide-react';

interface PersonalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  myBets: PersonalBetLog[];
  globalHistory: HistoricRound[];
  onVerifyRound: (round: HistoricRound) => void;
}

export const PersonalHistoryModal: React.FC<PersonalHistoryModalProps> = ({
  isOpen,
  onClose,
  myBets,
  globalHistory,
  onVerifyRound,
}) => {
  const [tab, setTab] = useState<'my_bets' | 'global_rounds'>('my_bets');

  if (!isOpen) return null;

  // Calculate my stats
  const totalBets = myBets.length;
  const wonBets = myBets.filter((b) => b.status === 'WON').length;
  const winRate = totalBets > 0 ? ((wonBets / totalBets) * 100).toFixed(1) : '0';
  const totalProfit = myBets.reduce((acc, b) => acc + b.profit, 0);

  const getPillColor = (multiplier: number) => {
    if (multiplier >= 10.0) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    if (multiplier >= 2.0) return 'text-purple-400 bg-purple-500/15 border-purple-500/30';
    return 'text-sky-400 bg-sky-500/15 border-sky-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="history-logs-modal"
        className="relative w-full max-w-lg bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#161922] via-red-950/30 to-[#161922] border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-500">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide uppercase italic">Historical Betting Log</h2>
              <p className="text-[11px] text-gray-400">Cryptographically verifiable round audits</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switch */}
        <div className="grid grid-cols-2 p-2 bg-black/40 border-b border-white/10 gap-1.5 text-xs font-bold">
          <button
            onClick={() => setTab('my_bets')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              tab === 'my_bets'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-white/5'
            }`}
          >
            My Bets ({myBets.length})
          </button>
          <button
            onClick={() => setTab('global_rounds')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              tab === 'global_rounds'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-white/5'
            }`}
          >
            All Crash Rounds ({globalHistory.length})
          </button>
        </div>

        {/* Content Tab 1: My Bets */}
        {tab === 'my_bets' && (
          <>
            {/* Quick Summary Header */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-black/30 border-b border-white/10 text-center">
              <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Bets Placed</span>
                <p className="font-mono text-sm font-bold text-white">{totalBets}</p>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Win Rate</span>
                <p className="font-mono text-sm font-bold text-green-400">{winRate}%</p>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Net Profit</span>
                <p
                  className={`font-mono text-sm font-bold ${
                    totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {totalProfit >= 0 ? `+$${totalProfit.toFixed(1)}` : `-$${Math.abs(totalProfit).toFixed(1)}`}
                </p>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {myBets.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs uppercase tracking-wider">
                  No bets placed yet. Join the next round!
                </div>
              ) : (
                myBets.map((b) => {
                  const isWon = b.status === 'WON';
                  return (
                    <div
                      key={b.betId}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isWon
                          ? 'bg-green-500/5 border-green-500/20'
                          : 'bg-black/30 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isWon ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {isWon ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-white">
                              Round #{b.roundNumber}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              Slot {b.slot}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(b.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-400">Bet: ${b.amount}</span>
                          {isWon && (
                            <span className="text-xs font-bold text-yellow-400">
                              @{b.cashoutMultiplier?.toFixed(2)}x
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-extrabold ${
                            isWon ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {isWon ? `+$${b.profit.toFixed(2)}` : `-$${b.amount.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Content Tab 2: Global Crash Multipliers Log */}
        {tab === 'global_rounds' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {globalHistory.map((rnd) => {
              const pillColor = getPillColor(rnd.crashMultiplier);
              return (
                <div
                  key={rnd.roundId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">
                        #{rnd.roundNumber}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(rnd.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono truncate max-w-[200px] sm:max-w-[260px] mt-0.5">
                      Hash: {rnd.hash}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-xs font-bold font-mono ${pillColor}`}
                    >
                      {rnd.crashMultiplier.toFixed(2)}x
                    </span>

                    <button
                      onClick={() => {
                        onVerifyRound(rnd);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-bold border border-white/10 transition-colors cursor-pointer"
                      title="Verify SHA-256 Provably Fair"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                      <span>Verify</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
