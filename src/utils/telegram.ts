/**
 * Telegram WebApp Integration and Fallback Utilities
 */

export interface TelegramUser {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    start_param?: string;
  };
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  MainButton?: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded?: boolean;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'medium') {
  try {
    const tg = getTelegramWebApp();
    if (tg?.HapticFeedback) {
      if (style === 'success' || style === 'error') {
        tg.HapticFeedback.notificationOccurred(style);
      } else {
        tg.HapticFeedback.impactOccurred(style);
      }
      return;
    }
  } catch (e) {
    // Ignore error
  }

  // Fallback to standard Vibration API
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (style === 'heavy' || style === 'error') {
        navigator.vibrate([40, 30, 60]);
      } else if (style === 'success') {
        navigator.vibrate([25, 40, 40]);
      } else {
        navigator.vibrate(25);
      }
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }
}

// Preset demo Telegram users for simulation & testing
export const DEMO_TELEGRAM_USERS = [
  {
    id: 'tg_user_ton_pro',
    username: '@ton_captain',
    name: 'Anton Volkov',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'tg_user_dubai_whale',
    username: '@dubai_whale',
    name: 'Tariq Al-Mansoor',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'tg_user_crypto_lisa',
    username: '@crypto_lisa',
    name: 'Lisa Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'tg_user_sol_trader',
    username: '@sol_pilot',
    name: 'David Miller',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  },
];
