import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  CaseData,
  InitResponse,
  Verdict,
  VoteResponse,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

const SEED_CASES: Omit<CaseData, 'id'>[] = [
  {
    title: 'The People vs. The Last-Slice Bandit',
    evidence:
      'The defendant ate the final slice of pizza after the entire table verbally agreed to split everything evenly. When confronted, they said "you snooze, you lose."',
  },
  {
    title: 'The People vs. The One-Letter Replier',
    evidence:
      'The defendant responded "k" to a three-paragraph apology text that took the sender 40 minutes to write. No follow-up was ever sent.',
  },
  {
    title: 'The People vs. The Finale Spoiler',
    evidence:
      'After swearing a blood oath to wait, the defendant watched the season finale alone at 2am and then acted surprised during the "first" viewing with their partner.',
  },
  {
    title: 'The People vs. The Microwave Menace',
    evidence:
      'The defendant reheated fish in the shared office microwave. Twice. In one week. The break room still smells like low tide.',
  },
  {
    title: 'The People vs. The Armrest Annexer',
    evidence:
      'On a six-hour flight, the defendant claimed both middle-seat armrests within minutes of takeoff and defended them like territory for the entire journey.',
  },
  {
    title: 'The People vs. The Hawaiian Heretic',
    evidence:
      'At a traditional Italian restaurant, the defendant ordered pineapple on pizza and told the waiter his nonna "would have wanted it this way."',
  },
  {
    title: 'The People vs. The Vague Planner',
    evidence:
      'The defendant has said "we should hang out sometime!" four separate times with zero follow-through, each time with the warmth of a lifelong promise.',
  },
];

const caseKey = (postId: string) => `case:${postId}`;
const tallyKey = (postId: string, side: Verdict) => `tally:${postId}:${side}`;
const voteKey = (postId: string, username: string) =>
  `vote:${postId}:${username}`;
const streakKey = (username: string) => `streak:${username}`;

const dayNumber = () => Math.floor(Date.now() / 86400000);

const getOrSeedCase = async (postId: string): Promise<CaseData> => {
  const raw = await redis.get(caseKey(postId));
  if (raw) return JSON.parse(raw) as CaseData;
  const seed = SEED_CASES[dayNumber() % SEED_CASES.length];
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
