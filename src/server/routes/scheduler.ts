import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { context, redis } from '@devvit/web/server';
import { dayNumber, todaysCase } from '../core/cases';
import { createDailyPost } from '../core/post';

export const scheduler = new Hono();

const lastPostKey = (subredditName: string) =>
  `daily:lastPost:${subredditName}`;
const caseKey = (postId: string) => `case:${postId}`;

scheduler.post('/daily-case', async (c) => {
  try {
    await c.req.json<TaskRequest>().catch(() => null);

    const { subredditName } = context;
    if (!subredditName) {
      console.error('Daily case job: subredditName missing from context');
      return c.json<TaskResponse>({ status: 'ok' }, 200);
    }

    const today = dayNumber();
    const already = await redis.get(lastPostKey(subredditName));
    if (already === String(today)) {
      console.log(
        `Daily case already posted in r/${subredditName} for day ${today}; skipping`
      );
      return c.json<TaskResponse>({ status: 'ok' }, 200);
    }

    const caseData = todaysCase();
    const post = await createDailyPost(subredditName, caseData.title);
    await redis.set(
      caseKey(post.id),
      JSON.stringify({ ...caseData, id: post.id })
    );
    await redis.set(lastPostKey(subredditName), String(today));
    console.log(
      `Daily case posted in r/${subredditName}: ${post.id} (${caseData.title})`
    );
    return c.json<TaskResponse>({ status: 'ok' }, 200);
  } catch (error) {
    console.error(`Daily case job failed: ${error}`);
    return c.json<TaskResponse>({ status: 'ok' }, 200);
  }
});
