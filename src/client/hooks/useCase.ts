import { useCallback, useEffect, useState } from 'react';
import type {
  CaseData,
  InitResponse,
  Verdict,
  VoteResponse,
} from '../../shared/api';

interface CaseState {
  loading: boolean;
  error: string | null;
  needsLogin: boolean;
  caseData: CaseData | null;
  username: string | null;
  guilty: number;
  notGuilty: number;
  userVote: Verdict | null;
  streak: number;
}

export const useCase = () => {
  const [state, setState] = useState<CaseState>({
    loading: true,
    error: null,
    needsLogin: false,
    caseData: null,
    username: null,
    guilty: 0,
    notGuilty: 0,
    userVote: null,
    streak: 0,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InitResponse = await res.json();
        if (data.type !== 'init') throw new Error('Unexpected response');
        setState({
          loading: false,
          error: null,
          needsLogin: false,
          caseData: data.caseData,
          username: data.username,
          guilty: data.guilty,
          notGuilty: data.notGuilty,
          userVote: data.userVote,
          streak: data.streak,
        });
      } catch (err) {
        console.error('Failed to load case', err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Could not load today\u2019s case. Try reopening the post.',
        }));
      }
    };
    void init();
  }, []);

  const vote = useCallback(async (verdict: Verdict) => {
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict }),
      });
      if (res.status === 401) {
        setState((prev) => ({ ...prev, needsLogin: true }));
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: VoteResponse = await res.json();
      setState((prev) => ({
        ...prev,
        guilty: data.guilty,
        notGuilty: data.notGuilty,
        userVote: data.userVote,
        streak: data.streak,
      }));
    } catch (err) {
      console.error('Failed to vote', err);
      setState((prev) => ({
        ...prev,
        error: 'Vote didn\u2019t go through. Try again.',
      }));
    }
  }, []);

  return { ...state, vote } as const;
};
