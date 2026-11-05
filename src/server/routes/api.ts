import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  CaseData,
  InitResponse,
  LeaderboardResponse,
  Verdict,
  VoteResponse,
} from '../../shared/api';
import { caseForDay, dayNumber } from '../core/cases';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

const caseKey = (postId: string) => `case:${postId}`;
const tallyKey = (postId: string, side: Verdict) => `tally:${postId}:${side}`;
const voteKey = (postId: string, username: string) =>
  `vote:${postId}:${username}`;
const streakKey = (username: string) => `streak:${username}`;
const streakBoardKey = 'leaderboard:streaks';

const getOrSeedCase = async (postId: string): Promise<CaseData> => {
  const raw = await redis.get(caseKey(postId));
  if (raw) return JSON.parse(raw) as CaseData;
  const seed = caseForDay(dayNumber());
  const cased: CaseData = { ...seed, id: postId };
  await redis.set(caseKey(postId), JSON.stringify(cased));
  return cased;
};

const getTally = async (postId: string) => {
  const [g, ng] = await Promise.all([
    redis.get(tallyKey(postId, 'guilty')),
    redis.get(tallyKey(postId, 'notguilty')),
  ]);
  return {
    guilty: g ? parseInt(g) : 0,
    notGuilty: ng ? parseInt(ng) : 0,
  };
};

const readStreak = async (username: string): Promise<number> => {
  const raw = await redis.get(streakKey(username));
  if (!raw) return 0;
  try {
    const s = JSON.parse(raw) as { count: number; lastDay: number };
    if (s.lastDay < dayNumber() - 1) return 0;
    return s.count;
  } catch {
    return 0;
  }
};

const recordVoteDay = async (username: string): Promise<number> => {
  const today = dayNumber();
  const raw = await redis.get(streakKey(username));
  let count = 1;
  if (raw) {
    try {
      const s = JSON.parse(raw) as { count: number; lastDay: number };
      if (s.lastDay === today) count = s.count;
      else if (s.lastDay === today - 1) count = s.count + 1;
    } catch {
      count = 1;
    }
  }
  await redis.set(streakKey(username), JSON.stringify({ count, lastDay: today }));
  try {
    await redis.zAdd(streakBoardKey, { member: username, score: count });
  } catch (err) {
    console.error('Failed to update the streak leaderboard', err);
  }
  return count;
};

api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId missing from context' },
      400
    );
  }
  try {
    const [caseData, tally, username] = await Promise.all([
      getOrSeedCase(postId),
      getTally(postId),
      reddit.getCurrentUsername(),
    ]);
    let userVote: Verdict | null = null;
    let streak = 0;
    if (username) {
      const v = await redis.get(voteKey(postId, username));
      if (v === 'guilty' || v === 'notguilty') userVote = v;
      streak = await readStreak(username);
    }
    return c.json<InitResponse>({
      type: 'init',
      postId,
      username: username ?? null,
      caseData,
      guilty: tally.guilty,
      notGuilty: tally.notGuilty,
      userVote,
      streak,
    });
  } catch (error) {
    console.error(`Init failed for post ${postId}:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load the case' },
      500
    );
  }
});

api.post('/vote', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId missing from context' },
      400
    );
  }
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Login required to vote' },
      401
    );
  }
  let verdict: Verdict | null = null;
  try {
    const body = await c.req.json<{ verdict?: string }>();
    if (body.verdict === 'guilty' || body.verdict === 'notguilty') {
      verdict = body.verdict;
    }
  } catch {
    verdict = null;
  }
  if (!verdict) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'verdict must be guilty or notguilty' },
      400
    );
  }

  const existing = await redis.get(voteKey(postId, username));
  const streak = await recordVoteDay(username);
  const tally = await getTally(postId);

  if (existing === 'guilty' || existing === 'notguilty') {
    return c.json<VoteResponse>({
      type: 'vote',
      postId,
      guilty: tally.guilty,
      notGuilty: tally.notGuilty,
      userVote: existing,
      alreadyVoted: true,
      streak,
    });
  }

  await redis.set(voteKey(postId, username), verdict);
  await redis.incrBy(tallyKey(postId, verdict), 1);
  const updated = await getTally(postId);
  return c.json<VoteResponse>({
    type: 'vote',
    postId,
    guilty: updated.guilty,
    notGuilty: updated.notGuilty,
    userVote: verdict,
    alreadyVoted: false,
    streak,
  });
});

api.get('/leaderboard', async (c) => {
  try {
    const rows = await redis.zRange(streakBoardKey, 0, 9, {
      by: 'rank',
      reverse: true,
    });
    const entries = rows.map((r) => ({
      username: r.member,
      streak: r.score,
    }));
    let you: LeaderboardResponse['you'] = null;
    const username = await reddit.getCurrentUsername();
    if (username) {
      const [score, rankAsc, total] = await Promise.all([
        redis.zScore(streakBoardKey, username),
        redis.zRank(streakBoardKey, username),
        redis.zCard(streakBoardKey),
      ]);
      if (score !== undefined && rankAsc !== undefined) {
        you = { username, streak: score, rank: total - rankAsc };
      }
    }
    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      entries,
      you,
    });
  } catch (error) {
    console.error('Leaderboard failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load the leaderboard' },
      500
    );
  }
});
