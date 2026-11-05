# ⚖️ Order in the Game

A daily courtroom debate game for Reddit, built on [Devvit](https://developers.reddit.com/).

Every day a new ridiculous fictional case drops. Players vote **guilty** or **not guilty**, write one-line closing arguments for their side, upvote the best arguments, and build day streaks.

## The loop

1. Read today's case (5 seconds)
2. Tap GUILTY or NOT GUILTY → see the live tally
3. Write a one-line closing argument for your side
4. Upvote the best arguments (never your own)
5. Come back tomorrow — streaks reset if you skip a day

## Stack

Devvit Web — React + TypeScript client, Hono server, Redis for state.

## Develop

```bash
npm install
npm run dev
```

## Commands

- `npm run dev`: Playtest the app live on Reddit
- `npm run build`: Build client and server
- `npm run deploy`: Upload a new version
- `npm run launch`: Publish for review
