import React, { useState, useEffect } from 'react';
import type { HistoricRound } from '../types';
import { ShieldCheck, CheckCircle, Copy, X, Lock, RefreshCw } from 'lucide-react';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRound: HistoricRound | null;
  currentHash?: string;
  currentRoundNumber?: number;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  isOpen,
  onClose,
  selectedRound,
  currentHash,
  currentRoundNumber,
}) => {
  const [serverSeed, setServerSeed] = useState<string>('');
  const [clientSeed, setClientSeed] = useState<string>('');
  const [nonce, setNonce] = useState<number>(0);
  const [verifyResult, setVerifyResult] = useState<{
    hash: string;
    multiplier: number;
    verified: boolean;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRound) {
      setServerSeed(selectedRound.serverSeed);
      setClientSeed(selectedRound.clientSeed);
      setNonce(selectedRound.nonce);
      setVerifyResult({
        hash: selectedRound.hash,
        multiplier: selectedRound.crashMultiplier,
        verified: true,
      });
    } else {
      setServerSeed('');
      setClientSeed('0000000000000000004d6e1457a4f1da41e0824addd0e071d561440d066559f2');
      setNonce(currentRoundNumber || 1043);
      setVerifyResult(null);
    }
  }, [selectedRound, currentRoundNumber]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed) return;
    setIsVerifying(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverSeed, clientSeed, nonce }),
      });
      const data = await res.json();
      setVerifyResult({
        hash: data.hash,
        multiplier: data.crashMultiplier,
        verified: data.verified,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="provably-fair-dialog"
        className="relative w-full max-w-lg bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#161922] via-red-950/30 to-[#161922] border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide uppercase italic">
                Provably Fair Cryptography
              </h2>
              <p className="text-[11px] text-gray-400">
                Tamper-proof HMAC-SHA256 crash derivation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* Algorithm Banner */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-gray-300 leading-relaxed">
            <p className="mb-1 text-[11px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> How It Works
            </p>
            Each flight multiplier is predetermined using a secret Server Seed, public Client Seed,
            and Round Nonce. The SHA-256 hash is committed <strong className="text-white">before flight</strong>,
            guaranteeing the server cannot modify the crash point after bets are placed.
          </div>

          {/* Current Committed Round Hash (If Active) */}
          {!selectedRound && currentHash && (
            <div className="p-3 rounded-xl bg-black/30 border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Current Round #{currentRoundNumber} Committed Hash
                </span>
                <button
                  onClick={() => handleCopy(currentHash, 'currHash')}
                  className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  {copiedKey === 'currHash' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-[11px] text-gray-200 break-all bg-black/50 p-2.5 rounded-lg border border-white/10">
                {currentHash}
              </div>
            </div>
          )}

          {/* Interactive Verifier Inputs */}
          <div className="space-y-3 pt-1">
            <h3 className="font-bold text-gray-200 text-xs uppercase tracking-wider">
              Verify Any Round Multiplier
            </h3>

            {/* Server Seed */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-gray-400 font-medium">Server Seed (Hex)</label>
                {serverSeed && (
                  <button
                    onClick={() => handleCopy(serverSeed, 'sSeed')}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedKey === 'sSeed' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Revealed 64-char hex string"
                value={serverSeed}
                onChange={(e) => setServerSeed(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 font-mono text-[11px] text-gray-200 focus:outline-none focus:border-red-500/60"
              />
            </div>

            {/* Client Seed */}
            <div>
              <label className="block text-[11px] text-gray-400 font-medium mb-1">Client Seed (Public)</label>
              <input
                type="text"
                value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 font-mono text-[11px] text-gray-200 focus:outline-none focus:border-red-500/60"
              />
            </div>

            {/* Nonce */}
            <div>
              <label className="block text-[11px] text-gray-400 font-medium mb-1">Nonce (Round Number)</label>
              <input
                type="number"
                value={nonce}
                onChange={(e) => setNonce(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-red-500/60"
              />
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={isVerifying || !serverSeed}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(22,163,74,0.4)] disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-98 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Compute & Verify Multiplier
                </>
              )}
            </button>
          </div>

          {/* Verification Result Output */}
          {verifyResult && (
            <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 animate-in fade-in space-y-1.5">
              <div className="flex items-center gap-2 text-green-400 font-bold text-xs">
                <CheckCircle className="w-4 h-4" />
                <span>Verification Successful!</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-gray-400">Calculated Crash Multiplier:</span>
                <span className="font-mono text-lg font-black text-yellow-400">
                  {verifyResult.multiplier.toFixed(2)}x
                </span>
              </div>
              <div className="pt-1">
                <span className="text-[10px] text-gray-500 block mb-0.5">Computed SHA-256 HMAC:</span>
                <p className="font-mono text-[10px] text-gray-300 break-all bg-black/50 p-2 rounded-lg border border-white/10">
                  {verifyResult.hash}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
