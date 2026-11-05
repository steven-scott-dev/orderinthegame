import { useCallback, useEffect, useState } from 'react';
import type {
  Argument,
  ArgumentsResponse,
  ArgumentVoteResponse,
  CreateArgumentResponse,
} from '../../shared/api';

export const useArguments = () => {
  const [args, setArgs] = useState<Argument[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/arguments');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ArgumentsResponse = await res.json();
        setArgs(data.arguments);
      } catch (err) {
        console.error('Failed to load arguments', err);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const submit = useCallback(async (text: string): Promise<boolean> => {
    setSubmitError(null);
    const res = await fetch('/api/arguments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.status === 401) {
      setSubmitError('Log in to Reddit to argue.');
      return false;
    }
    if (res.status === 403) {
      setSubmitError('Cast your verdict (vote) before arguing.');
      return false;
    }
    if (res.status === 404) {
      setSubmitError('Server is missing the arguments endpoint — check index.ts.');
      return false;
    }
    if (!res.ok) {
      setSubmitError('Could not post your argument. Try again.');
      return false;
    }
    const data: CreateArgumentResponse = await res.json();
    setArgs((prev) => [data.argument, ...prev]);
    return true;
  }, []);

  const upvote = useCallback(async (id: string) => {
    const res = await fetch(`/api/arguments/${id}/upvote`, {
      method: 'POST',
    });
    if (!res.ok) return;
    const data: ArgumentVoteResponse = await res.json();
    setArgs((prev) =>
      prev
        .map((a) => (a.id === id ? { ...a, votes: data.votes } : a))
        .sort((a, b) => b.votes - a.votes)
    );
  }, []);

  return { args, loading, submitError, submit, upvote } as const;
};
