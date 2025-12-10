// Trader session management using localStorage
const TRADER_SESSION_KEY = 'metycle_trader_session';

export interface TraderSession {
  traderId: number;
  traderName: string;
  timestamp: number;
}

export const traderSession = {
  get: (): TraderSession | null => {
    try {
      const stored = localStorage.getItem(TRADER_SESSION_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  set: (traderId: number, traderName: string): void => {
    const session: TraderSession = {
      traderId,
      traderName,
      timestamp: Date.now()
    };
    localStorage.setItem(TRADER_SESSION_KEY, JSON.stringify(session));
  },

  clear: (): void => {
    localStorage.removeItem(TRADER_SESSION_KEY);
  }
};