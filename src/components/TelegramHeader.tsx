import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { sounds } from '../utils/sound';
import { triggerHaptic, DEMO_TELEGRAM_USERS } from '../utils/telegram';
import {
  Volume2,
  VolumeX,
  Coins,
  Plus,
  Trophy,
  History,
  CheckCircle,
  UserCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface TelegramHeaderProps {
  user: UserProfile;
  isConnected: boolean;
  onOpenLeaderboard: () => void;
  onOpenHistory: () => void;
  onClaimFaucet: () => void;
  onResetBankroll: () => void;
  onSwitchUser: (userId: string, username: string, avatar: string) => void;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  user,
  isConnected,
  onOpenLeaderboard,
  onOpenHistory,
  onClaimFaucet,
  onResetBankroll,
  onSwitchUser,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(sounds.getMuted());
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    triggerHaptic('light');
  };

  return (
    <header
      id="telegram-app-header"
      className="w-full bg-[#12141c]/95 border-b border-white/5 px-3 sm:px-6 py-2.5 flex items-center justify-between select-none sticky top-0 z-30 backdrop-blur-md"
    >
      {/* Left: App Identity */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <img
            src="/logo-yEkF9SfW.svg"
            alt="Aviator"
            className="h-6 sm:h-7.5 w-auto object-contain drop-shadow-[0_0_15px_rgba(229,5,58,0.5)]"
          />
          <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center text-white ml-0.5" title="Verified Mini App">
            <CheckCircle className="w-2.5 h-2.5 fill-sky-500 text-white" />
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-400 pl-1 border-l border-white/10">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="tracking-wide font-mono text-[9px] uppercase">{isConnected ? 'Live' : 'Syncing'}</span>
        </div>
      </div>

      {/* Center/Right: Balance & Quick Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Balance Capsule */}
        <div className="relative">
          <button
            id="wallet-balance-button"
            onClick={() => {
              triggerHaptic('light');
              setShowWalletMenu(!showWalletMenu);
            }}
            className="bg-black/40 hover:bg-black/60 px-3 sm:px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 sm:gap-3 transition-all active:scale-95 shadow-inner cursor-pointer"
          >
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider hidden xs:inline">
              Balance
            </span>
            <span className="text-yellow-400 font-mono font-bold text-sm sm:text-base">
              {user.balance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] text-yellow-500/80 font-mono font-bold hidden sm:inline">
              {user.currency}
            </span>
            <div className="w-4 h-4 rounded-full bg-white/10 text-yellow-400 flex items-center justify-center ml-0.5">
              <Plus className="w-3 h-3" />
            </div>
          </button>

          {/* Wallet / Faucet Dropdown */}
          {showWalletMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#12141c] border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 text-xs">
              <div className="p-2 border-b border-white/5 mb-1">
                <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">
                  Demo Bankroll
                </span>
                <span className="font-mono text-sm font-bold text-yellow-400">
                  {user.balance.toFixed(2)} {user.currency}
                </span>
              </div>

              <button
                onClick={() => {
                  triggerHaptic('success');
                  onClaimFaucet();
                  setShowWalletMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-500/15 text-emerald-300 font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Claim +500 ETB</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onResetBankroll();
                  setShowWalletMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-red-500/15 text-red-300 font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-red-400" />
                <span>Reset to 1,000 ETB</span>
              </button>
            </div>
          )}
        </div>

        {/* User Identity Pill */}
        <div className="relative">
          <button
            id="user-profile-button"
            onClick={() => {
              triggerHaptic('light');
              setShowUserSwitcher(!showUserSwitcher);
            }}
            className="flex items-center gap-1.5 p-1 sm:px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer"
            title="Switch Telegram Pilot Account"
          >
            <img
              src={user.avatar}
              alt=""
              className="w-6 h-6 rounded-full object-cover border border-white/10"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-semibold text-gray-300 hidden md:inline truncate max-w-[80px]">
              {user.username}
            </span>
          </button>

          {/* Account Switcher Dropdown */}
          {showUserSwitcher && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#12141c] border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 text-xs">
              <span className="text-[10px] text-gray-400 block px-2 py-1 uppercase font-bold tracking-wider border-b border-white/5 mb-1">
                Simulate Telegram User
              </span>
              {DEMO_TELEGRAM_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    triggerHaptic('medium');
                    onSwitchUser(u.id, u.username, u.avatar);
                    setShowUserSwitcher(false);
                  }}
                  className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                    user.id === u.id
                      ? 'bg-red-950/40 text-red-300 border border-red-500/40'
                      : 'hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <img src={u.avatar} alt="" className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <div className="text-left min-w-0 flex-1">
                    <span className="font-semibold block truncate leading-tight">{u.username}</span>
                    <span className="text-[10px] text-gray-400 block truncate">{u.name}</span>
                  </div>
                  {user.id === u.id && <UserCheck className="w-3.5 h-3.5 text-red-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard Icon Button */}
        <button
          id="header-leaderboard-btn"
          onClick={() => {
            triggerHaptic('light');
            onOpenLeaderboard();
          }}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-yellow-400 border border-white/5 transition-colors cursor-pointer"
          title="Leaderboard"
        >
          <Trophy className="w-4 h-4" />
        </button>

        {/* History Icon Button */}
        <button
          id="header-history-btn"
          onClick={() => {
            triggerHaptic('light');
            onOpenHistory();
          }}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 transition-colors cursor-pointer"
          title="Betting History"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Sound Toggle */}
        <button
          id="header-sound-btn"
          onClick={handleToggleSound}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
          title={isMuted ? 'Unmute Game Sounds' : 'Mute Game Sounds'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </header>
  );
};
