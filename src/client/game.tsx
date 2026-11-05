import './index.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useCase } from './hooks/useCase';
import { useArguments } from './hooks/useArguments';
import type { Verdict } from '../../shared/api';

const ArgumentsSection = ({ userVote }: { userVote: Verdict }) => {
  const { args, loading, submitError, submit, upvote } = useArguments();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = draft.trim();
    if (text.length < 2 || sending) return;
    setSending(true);
    const ok = await submit(text);
    if (ok) setDraft('');
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-3 mt-2">
      <h3 className="text-sm font-black tracking-[0.2em] text-[#e8b34b] text-center">
        CLOSING ARGUMENTS
      </h3>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={140}
          placeholder={`One line arguing ${
            userVote === 'guilty' ? 'GUILTY' : 'NOT GUILTY'
          }…`}
          className="flex-1 bg-[#221c14] border border-[#3a2f20] rounded-xl px-3 py-2 text-sm text-[#f5efe4] placeholder-[#6b5f4b] outline-none focus:border-[#e8b34b]"
        />
        <button
          onClick={send}
          disabled={sending || draft.trim().length < 2}
          className="px-4 rounded-xl bg-[#e8b34b] text-[#14100c] text-sm font-black cursor-pointer disabled:opacity-40"
        >
          SEND
        </button>
      </div>
      {submitError && (
        <p className="text-center text-xs text-red-400">{submitError}</p>
      )}
      {loading && (
        <p className="text-center text-xs text-[#a89c86]">
          Hearing arguments…
        </p>
      )}
      {!loading && args.length === 0 && (
        <p className="text-center text-xs text-[#a89c86]">
          No arguments yet. Yours could be the first.
        </p>
      )}
      {args.map((a) => (
        <div
          key={a.id}
          className="bg-[#221c14] border border-[#3a2f20] rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full ${
                a.side === 'guilty'
                  ? 'bg-[#b3261e] text-white'
                  : 'bg-[#2e7d32] text-white'
              }`}
            >
              {a.side === 'guilty' ? 'GUILTY' : 'NOT GUILTY'}
            </span>
            <span className="text-[11px] text-[#a89c86]">u/{a.username}</span>
          </div>
          <p className="text-sm text-[#f5efe4] leading-snug">{a.text}</p>
          <button
            onClick={() => upvote(a.id)}
            className="mt-2 text-xs font-bold text-[#e8b34b] cursor-pointer hover:text-white"
          >
            ▲ {a.votes}
          </button>
        </div>
      ))}
    </div>
  );
};

export const App = () => {
  const {
    loading,
    error,
    needsLogin,
    caseData,
    username,
    guilty,
    notGuilty,
    userVote,
    vote,
    streak,
  } = useCase();

  const total = guilty + notGuilty;
  const guiltyPct = total > 0 ? Math.round((guilty / total) * 100) : 50;

  return (
    <div className="flex relative flex-col items-center min-h-screen bg-[#14100c] text-[#f5efe4] px-4 py-6">
      <div className="w-full max-w-md flex flex-col gap-4 pb-10">
        <header className="text-center">
          <p className="text-3xl">⚖️</p>
          <h1 className="text-xl font-black tracking-widest text-[#e8b34b]">
            ORDER IN THE GAME
          </h1>
          <p className="text-xs text-[#a89c86] mt-1">
            {username
              ? `Juror ${username} reporting for duty`
              : 'Daily court is in session'}
          </p>
          {!loading && streak > 0 && (
            <p className="text-sm font-bold text-[#e8b34b] mt-1">
              🔥 {streak}-day streak
            </p>
          )}
        </header>

        {loading && (
          <p className="text-center text-[#a89c86] mt-10">
            Bringing the defendant into the courtroom…
          </p>
        )}

        {error && !loading && (
          <p className="text-center text-red-400 mt-10">{error}</p>
        )}

        {needsLogin && !loading && (
          <p className="text-center text-[#e8b34b] mt-10">
            Log in to Reddit to cast your verdict.
          </p>
        )}

        {caseData && !loading && !needsLogin && (
          <>
            <div className="bg-[#221c14] border border-[#3a2f20] rounded-2xl p-5">
              <h2 className="text-lg font-bold leading-snug">
                {caseData.title}
              </h2>
              <p className="text-sm text-[#c9bda6] mt-3 leading-relaxed">
                {caseData.evidence}
              </p>
            </div>

            {!userVote ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => vote('guilty')}
                  className="w-full py-4 rounded-xl bg-[#b3261e] hover:bg-[#931d17] active:scale-[0.98] transition text-white text-lg font-black tracking-widest cursor-pointer"
                >
                  GUILTY
                </button>
                <button
                  onClick={() => vote('notguilty')}
                  className="w-full py-4 rounded-xl bg-[#2e7d32] hover:bg-[#256428] active:scale-[0.98] transition text-white text-lg font-black tracking-widest cursor-pointer"
                >
                  NOT GUILTY
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-center text-sm text-[#a89c86]">
                  You voted:{' '}
                  <span
                    className={
                      userVote === 'guilty'
                        ? 'text-[#ff6b5e] font-bold'
                        : 'text-[#7fd67f] font-bold'
                    }
                  >
                    {userVote === 'guilty' ? 'GUILTY' : 'NOT GUILTY'}
                  </span>
                </p>
                <div className="w-full h-10 rounded-xl overflow-hidden flex bg-[#2e7d32]">
                  <div
                    className="h-full bg-[#b3261e] transition-all duration-500 flex items-center justify-start pl-3 text-xs font-bold text-white"
                    style={{ width: `${guiltyPct}%` }}
                  >
                    {guiltyPct}% guilty
                  </div>
                </div>
                <p className="text-center text-xs text-[#a89c86]">
                  {total} {total === 1 ? 'verdict' : 'verdicts'} cast
                </p>
              </div>
            )}

            {userVote && <ArgumentsSection userVote={userVote} />}
          </>
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
