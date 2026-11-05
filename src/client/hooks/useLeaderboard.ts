import { useEffect, useState } from 'react';
import type { LeaderboardResponse } from '../../shared/api';

export const useLeaderboard = () => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: LeaderboardResponse = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to load leaderboard', err);
      }
      setLoading(false);
    };
    void load();
  }, []);

  return { data, loading } as const;
};
