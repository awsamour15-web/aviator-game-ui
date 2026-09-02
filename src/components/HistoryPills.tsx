import React from 'react';
import type { HistoricRound } from '../types';
import { History, MoreHorizontal } from 'lucide-react';

interface HistoryPillsProps {
  history: HistoricRound[];
  onSelectRound: (round: HistoricRound) => void;
  onOpenFullHistory: () => void;
}

export const HistoryPills: React.FC<HistoryPillsProps> = ({
  history,
  onSelectRound,
  onOpenFullHistory,
}) => {
  // Aviator authentic color scheme matching reference UI
  const getPillColor = (multiplier: number) => {
    if (multiplier >= 10.0) {
      return 'text-[#e879f9] hover:bg-[#e879f9]/15'; // Hot pink / Magenta for 10x+
    }
    if (multiplier >= 2.0) {
      return 'text-[#c084fc] hover:bg-[#c084fc]/15'; // Purple for 2x - 9.99x
    }
    return 'text-[#38bdf8] hover:bg-[#38bdf8]/15'; // Sky blue / Cyan for < 2x
  };

  return (
    <div
      id="history-pills-container"
      className="w-full flex items-center justify-between gap-1 overflow-x-auto py-1 px-1.5 select-none text-xs font-sans"
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          id="history-icon-btn"
          onClick={onOpenFullHistory}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px] font-medium"
          title="View Betting Log & History"
        >
          <History className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {history.slice(0, 20).map((rnd) => {
          const colorClass = getPillColor(rnd.crashMultiplier);
          return (
            <button
              key={rnd.roundId}
              id={`history-pill-${rnd.roundNumber}`}
              onClick={() => onSelectRound(rnd)}
              className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[12px] font-semibold tracking-normal transition-all active:scale-95 cursor-pointer ${colorClass}`}
              title={`Round #${rnd.roundNumber} crashed at ${rnd.crashMultiplier.toFixed(2)}x (Click to verify)`}
            >
              {rnd.crashMultiplier.toFixed(2)}x
            </button>
          );
        })}
      </div>

      <button
        onClick={onOpenFullHistory}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
        title="More Rounds & Verifier"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </div>
  );
};

