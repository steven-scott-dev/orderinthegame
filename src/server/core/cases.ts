import type { CaseData } from '../../shared/api';

export const SEED_CASES: Omit<CaseData, 'id'>[] = [
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

export const dayNumber = () => Math.floor(Date.now() / 86400000);

export const caseForDay = (day: number): Omit<CaseData, 'id'> =>
  SEED_CASES[day % SEED_CASES.length];

export const todaysCase = (): Omit<CaseData, 'id'> => caseForDay(dayNumber());
