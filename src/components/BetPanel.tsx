import React, { useState } from 'react';
import type { GamePhase, PlayerBet } from '../types';
import { triggerHaptic } from '../utils/telegram';
import { Minus, Plus, Check } from 'lucide-react';

interface BetPanelProps {
  slot: 1 | 2;
  phase: GamePhase;
  currentMultiplier: number;
  userBalance: number;
  activeBet: PlayerBet | null;
  onPlaceBet: (slot: 1 | 2, amount: number, autoCashoutMultiplier: number | null) => void;
  onCancelBet: (slot: 1 | 2) => void;
  onCashOut: (slot: 1 | 2) => void;
}

export const BetPanel: React.FC<BetPanelProps> = ({
  slot,
  phase,
  currentMultiplier,
  userBalance,
  activeBet,
  onPlaceBet,
  onCancelBet,
  onCashOut,
}) => {
  const [mode, setMode] = useState<'bet' | 'auto'>('bet');
  const [amount, setAmount] = useState<number>(4.00);
  const [autoCashoutMult, setAutoCashoutMult] = useState<number>(2.00);
  const [isAutoCashoutEnabled, setIsAutoCashoutEnabled] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Aviator standard presets from reference screenshot: 16, 40, 80, 400
  const presets = [16, 40, 80, 400];

  const handleAmountChange = (newVal: number) => {
    const clamped = Math.max(1, Math.min(Math.floor(userBalance) || 50000, Number(newVal.toFixed(2))));
    setAmount(clamped);
  };

  const handleStep = (delta: number) => {
    triggerHaptic('light');
    handleAmountChange(amount + delta);
  };

  const handleMultiplierChange = (val: number) => {
    const clamped = Math.max(1.05, Number(val.toFixed(2)));
    setAutoCashoutMult(clamped);
  };

  // Live cashout calculation for this slot
  const currentCashoutVal = activeBet && activeBet.status === 'active'
    ? Number((activeBet.amount * currentMultiplier).toFixed(2))
    : 0;

  const handleMainBtnClick = () => {
    if (phase === 'WAITING_BETS') {
      if (activeBet && activeBet.status === 'active') {
        // Cancel bet
        triggerHaptic('medium');
        onCancelBet(slot);
      } else {
        // Place bet
        if (amount > userBalance) {
          triggerHaptic('error');
          return;
        }
        triggerHaptic('success');
        onPlaceBet(slot, amount, mode === 'auto' && isAutoCashoutEnabled ? autoCashoutMult : null);
      }
    } else if (phase === 'FLYING') {
      if (activeBet && activeBet.status === 'active' && !activeBet.cashedOut) {
        // Cashout
        triggerHaptic('success');
        onCashOut(slot);
      }
    }
  };

  const isBetPlaced = Boolean(activeBet && activeBet.status === 'active');
  const isCashedOut = Boolean(activeBet && activeBet.cashedOut);
  const isLost = Boolean(activeBet && activeBet.status === 'lost');

  // Minimized state for Slot 2
  if (isMinimized && slot === 2) {
    return (
      <div
        id={`bet-panel-slot-${slot}-minimized`}
        className="bg-[#141518] rounded-2xl border border-white/5 px-3 py-2 flex items-center justify-between select-none shadow-md"
      >
        <span className="text-xs text-gray-400 font-semibold">Bet Panel 2</span>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsMinimized(false);
          }}
          className="w-6 h-6 rounded-md bg-[#24262b] hover:bg-[#2e3138] text-gray-300 flex items-center justify-center border border-white/5 transition-colors cursor-pointer"
          title="Expand Bet Panel 2"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      id={`bet-panel-slot-${slot}`}
      className={`bg-[#141518] rounded-2xl border border-white/5 p-2.5 sm:p-3 flex flex-col justify-between select-none shadow-xl transition-all ${
        activeBet && activeBet.status === 'active' && phase === 'FLYING'
          ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
          : 'hover:border-white/10'
      }`}
    >
      {/* Top Header: Centered [ Bet | Auto ] pill toggle + Right minimize button (Slot 2 only) */}
      <div className="flex items-center justify-between mb-2">
        {/* Left spacer for perfect center alignment */}
        <div className="w-6" />

        {/* Mode Switch Pill matching reference screenshot */}
        <div className="bg-[#0e0f12] p-0.5 rounded-full inline-flex items-center border border-white/5 shadow-inner">
          <button
            type="button"
            id={`tab-bet-slot-${slot}`}
            onClick={() => {
              triggerHaptic('light');
              setMode('bet');
            }}
            className={`px-4 sm:px-5 py-0.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              mode === 'bet'
                ? 'bg-[#2c2e33] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Bet
          </button>
          <button
            type="button"
            id={`tab-auto-slot-${slot}`}
            onClick={() => {
              triggerHaptic('light');
              setMode('auto');
            }}
            className={`px-4 sm:px-5 py-0.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              mode === 'auto'
                ? 'bg-[#2c2e33] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Auto
          </button>
        </div>

        {/* Right Header Minimize Icon Button (Only Slot 2 per Aviator design) */}
        <div className="w-6 flex justify-end">
          {slot === 2 && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsMinimized(true);
              }}
              className="w-6 h-6 rounded-md bg-[#202227] hover:bg-[#292c33] text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5"
              title="Minimize Deck"
            >
              <Minus className="w-3 h-3 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Main Controls + Action Button */}
      <div className="grid grid-cols-12 gap-2 sm:gap-2.5 items-stretch">
        {/* Left Column: Stepper and 2x2 Preset Grid (6 cols) */}
        <div className="col-span-6 flex flex-col justify-between gap-1.5">
          {/* Stepper pill: (-)  4.00  (+) */}
          <div className="bg-[#0e0f12] border border-white/5 rounded-full px-1.5 py-1 flex items-center justify-between shadow-inner">
            <button
              type="button"
              disabled={isBetPlaced || phase === 'FLYING'}
              onClick={() => handleStep(-1)}
              className="w-6 h-6 rounded-full bg-[#23252a] hover:bg-[#2d3037] text-gray-300 disabled:opacity-20 disabled:pointer-events-none transition-colors flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
              title="Decrease Bet"
            >
              <Minus className="w-3 h-3 stroke-[2.5]" />
            </button>

            <div className="flex items-center justify-center flex-1 px-1">
              <input
                type="number"
                step="1"
                disabled={isBetPlaced || phase === 'FLYING'}
                value={amount}
                onChange={(e) => handleAmountChange(Number(e.target.value))}
                className="w-full text-center bg-transparent font-sans font-bold text-base text-white focus:outline-none disabled:opacity-85 tracking-tight p-0"
              />
            </div>

            <button
              type="button"
              disabled={isBetPlaced || phase === 'FLYING'}
              onClick={() => handleStep(1)}
              className="w-6 h-6 rounded-full bg-[#23252a] hover:bg-[#2d3037] text-gray-300 disabled:opacity-20 disabled:pointer-events-none transition-colors flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
              title="Increase Bet"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>

          {/* 2x2 Grid of Presets matching screenshot: 16, 40, 80, 400 */}
          {mode === 'bet' ? (
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={isBetPlaced || phase === 'FLYING'}
                  onClick={() => {
                    triggerHaptic('light');
                    handleAmountChange(p);
                  }}
                  className={`py-1 px-2.5 rounded-full text-xs font-bold font-sans transition-all text-center cursor-pointer active:scale-95 ${
                    amount === p
                      ? 'bg-[#2f3138] text-white shadow-sm border border-white/10'
                      : 'bg-[#1c1d22] hover:bg-[#25272e] text-[#8c8f96] hover:text-white'
                  } disabled:opacity-30 disabled:pointer-events-none`}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            /* Auto Mode: Auto Cash Out Multiplier Configuration */
            <div className="flex items-center justify-between bg-[#0e0f12] border border-white/5 rounded-xl px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAutoCashoutEnabled(!isAutoCashoutEnabled)}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    isAutoCashoutEnabled
                      ? 'bg-emerald-500 border-emerald-400 text-black'
                      : 'border-white/20 bg-transparent text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </button>
                <span className="text-[11px] text-gray-300 font-semibold">Auto Cash Out</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="1.05"
                  disabled={!isAutoCashoutEnabled || isBetPlaced || phase === 'FLYING'}
                  value={autoCashoutMult}
                  onChange={(e) => handleMultiplierChange(Number(e.target.value))}
                  className="w-12 text-right bg-transparent font-mono text-xs font-bold text-emerald-400 focus:outline-none disabled:opacity-40"
                />
                <span className="text-xs font-mono font-bold text-emerald-400">x</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Vibrant Green Bet Button (6 cols) */}
        <div className="col-span-6 flex min-h-[78px] sm:min-h-[82px]">
          {/* 1. WAITING_BETS: Bet Not Placed -> Big Vibrant Green Button matching screenshot */}
          {phase === 'WAITING_BETS' && !isBetPlaced && (
            <button
              id={`place-bet-btn-slot-${slot}`}
              type="button"
              onClick={handleMainBtnClick}
              className="w-full h-full rounded-xl bg-[#28a745] hover:bg-[#23923d] active:scale-[0.98] border-[1.5px] border-[#3ddc63] shadow-[0_0_18px_rgba(40,167,69,0.3)] flex flex-col items-center justify-center px-3 py-2 text-white transition-all cursor-pointer select-none group"
            >
              <span className="text-xl sm:text-2xl font-bold font-sans tracking-wide leading-tight group-hover:scale-105 transition-transform">
                Bet
              </span>
              <span className="text-base sm:text-lg font-bold font-sans text-white tracking-tight leading-tight mt-0.5">
                {amount.toFixed(2)} ETB
              </span>
            </button>
          )}

          {/* 2. WAITING_BETS: Bet Placed -> Cancel Button */}
          {phase === 'WAITING_BETS' && isBetPlaced && (
            <button
              id={`cancel-bet-btn-slot-${slot}`}
              type="button"
              onClick={handleMainBtnClick}
              className="w-full h-full rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] border-[1.5px] border-red-400 shadow-[0_0_18px_rgba(239,68,68,0.3)] flex flex-col items-center justify-center px-3 py-2 text-white transition-all cursor-pointer select-none"
            >
              <span className="text-xl sm:text-2xl font-bold font-sans tracking-wide leading-tight">
                Cancel
              </span>
              <span className="text-xs sm:text-sm font-semibold font-sans text-red-100 tracking-tight leading-tight mt-0.5">
                Waiting for flight
              </span>
            </button>
          )}

          {/* 3. FLYING: Active Bet -> Big Vibrant Orange Cash Out Button */}
          {phase === 'FLYING' && isBetPlaced && !isCashedOut && (
            <button
              id={`cash-out-btn-slot-${slot}`}
              type="button"
              onClick={handleMainBtnClick}
              className="w-full h-full rounded-xl bg-[#ff7700] hover:bg-[#ff881a] active:scale-[0.98] border-[1.5px] border-amber-300 shadow-[0_0_24px_rgba(255,119,0,0.5)] flex flex-col items-center justify-center px-3 py-2 text-white transition-all cursor-pointer select-none animate-pulse"
            >
              <span className="text-xl sm:text-2xl font-bold font-sans tracking-wide leading-tight drop-shadow-sm">
                Cash Out
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-white tracking-tight leading-tight mt-0.5">
                {currentCashoutVal.toFixed(2)} ETB
              </span>
            </button>
          )}

          {/* 4. FLYING: Cashed Out already -> Celebratory Outcome Card */}
          {isCashedOut && (
            <div className="w-full h-full rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 flex flex-col items-center justify-center p-2 shadow-inner text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Cashed Out</span>
              <span className="font-mono text-lg sm:text-xl font-black text-emerald-300">
                +{activeBet?.payout?.toFixed(2)} ETB
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-400 opacity-90">
                @ {activeBet?.cashoutMultiplier?.toFixed(2)}x
              </span>
            </div>
          )}

          {/* 5. FLYING: No Bet placed in this round */}
          {phase === 'FLYING' && !isBetPlaced && !isCashedOut && (
            <div className="w-full h-full rounded-xl bg-[#0e0f12] border border-white/5 text-gray-500 flex flex-col items-center justify-center p-2 text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Flight Active</span>
              <span className="text-[10px] text-gray-500 mt-0.5">Waiting for next round</span>
            </div>
          )}

          {/* 6. CRASHED: Outcome or Next Round Ready */}
          {phase === 'CRASHED' && (
            <div
              className={`w-full h-full rounded-xl border flex flex-col items-center justify-center p-2 text-center ${
                isCashedOut
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                  : isLost
                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                  : 'bg-[#0e0f12] border-white/5 text-gray-400'
              }`}
            >
              {isCashedOut ? (
                <>
                  <span className="text-[10px] font-bold uppercase opacity-80">Won Round</span>
                  <span className="font-mono text-base font-bold text-emerald-300">
                    +{activeBet?.payout?.toFixed(2)} ETB
                  </span>
                </>
              ) : isLost ? (
                <>
                  <span className="text-[10px] font-bold uppercase opacity-80">Flew Away</span>
                  <span className="font-mono text-xs font-bold text-red-400">
                    -{activeBet?.amount.toFixed(2)} ETB
                  </span>
                </>
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Preparing next round...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
