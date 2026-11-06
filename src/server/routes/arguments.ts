import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  Argument,
  ArgumentsResponse,
  ArgumentVoteResponse,
  CreateArgumentResponse,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const argumentsApi = new Hono();

const argsKey = (postId: string) => `args:${postId}`;
const voteKey = (postId: string, username: string) =>
  `vote:${postId}:${username}`;
const argVoteKey = (postId: string, id: string, username: string) =>
  `argvote:${postId}:${id}:${username}`;

const makeId = () =>
  `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

const readArgs = async (postId: string): Promise<Argument[]> => {
  const raw = await redis.get(argsKey(postId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Argument[];
  } catch {
    return [];
  }
};

argumentsApi.get('/arguments', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId missing from context' },
      400
    );
  }
  const args = await readArgs(postId);
  args.sort((a, b) => b.votes - a.votes);
  return c.json<ArgumentsResponse>({
    type: 'arguments',
    arguments: args.slice(0, 20),
  });
});

argumentsApi.post('/arguments', async (c) => {
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
      { status: 'error', message: 'Login required' },
      401
    );
  }
  const userVote = await redis.get(voteKey(postId, username));
  if (userVote !== 'guilty' && userVote !== 'notguilty') {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Cast your verdict before arguing' },
      403
    );
  }
  const body = await c.req.json<{ text?: string }>();
  const text = (body.text ?? '').trim().slice(0, 140);
  if (text.length < 2) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Argument is too short' },
      400
    );
  }
  // App Review requirement: user text shown in the app must be published
  // with reportable, actionable attribution. Post the argument as a real
  // Reddit comment on this post, as the user, before saving it in-app.
  // If the comment cannot be posted, the argument is not saved.
  let commentId: string;
  try {
    const comment = await reddit.submitComment({
      id: postId,
      text: `⚖️ **${userVote === 'guilty' ? 'GUILTY' : 'NOT GUILTY'}** — ${text}`,
      runAs: 'USER',
    });
    commentId = comment.id;
  } catch (err) {
    console.error('Failed to publish argument as a comment', err);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message:
          'Your argument could not be posted as a comment, so it was not saved. Please try again.',
      },
      502
    );
  }
  const argument: Argument = {
    id: makeId(),
    username,
    side: userVote,
    text,
    votes: 0,
    createdAt: Date.now(),
    commentId,
  };
  const args = await readArgs(postId);
  args.push(argument);
  await redis.set(argsKey(postId), JSON.stringify(args));
  return c.json<CreateArgumentResponse>({
    type: 'createArgument',
    argument,
  });
});

argumentsApi.post('/arguments/:id/upvote', async (c) => {
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
      { status: 'error', message: 'Login required' },
      401
    );
  }
  const id = c.req.param('id');
  const args = await readArgs(postId);
  const arg = args.find((a) => a.id === id);
  if (!arg) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Argument not found' },
      404
    );
  }
  if (arg.username === username) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'You cannot upvote your own argument' },
      403
    );
  }
  const already = await redis.get(argVoteKey(postId, id, username));
  if (already) {
    return c.json<ArgumentVoteResponse>({
      type: 'argumentVote',
      id,
      votes: arg.votes,
      alreadyVoted: true,
    });
  }
  arg.votes += 1;
  await redis.set(argsKey(postId), JSON.stringify(args));
  await redis.set(argVoteKey(postId, id, username), '1');
  return c.json<ArgumentVoteResponse>({
    type: 'argumentVote',
    id,
    votes: arg.votes,
    alreadyVoted: false,
  });
});
