import './index.css';

import { navigateTo } from '@devvit/web/client';
import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 bg-[#14100c]">
      <p className="text-6xl">⚖️</p>
      <div className="flex flex-col items-center gap-2 px-4">
        <h1 className="text-2xl font-black tracking-widest text-center text-[#e8b34b]">
          ORDER IN THE GAME
        </h1>
        <p className="text-base text-center text-[#c9bda6]">
          {context.username
            ? `Juror ${context.username}, court is in session.`
            : 'Court is in session.'}
        </p>
        <p className="text-sm text-center text-[#a89c86] max-w-[300px]">
          A new ridiculous case drops every day. Vote guilty or not guilty,
          argue your side, and keep your streak alive.
        </p>
      </div>
      <div className="flex items-center justify-center mt-5">
        <button
          className="flex items-center justify-center bg-[#b3261e] text-white w-auto h-12 rounded-full cursor-pointer transition-colors px-6 text-base font-black tracking-widest hover:bg-[#931d17]"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          TAP TO START
        </button>
      </div>
      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 text-[0.8em] text-[#a89c86]">
        <button
          className="cursor-pointer hover:text-white transition-colors"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span className="text-[#3a2f20]">|</span>
        <button
          className="cursor-pointer hover:text-white transition-colors"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
        <span className="text-[#3a2f20]">|</span>
        <button
          className="cursor-pointer hover:text-white transition-colors"
          onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}
        >
          Discord
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
