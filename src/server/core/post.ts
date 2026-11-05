import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: '⚖️ Order in the Game — cast your verdict!',
  });
};
