export type CaseData = {
  id: string;
  title: string;
  evidence: string;
};

export type Verdict = 'guilty' | 'notguilty';

export type InitResponse = {
  type: 'init';
  postId: string;
  username: string | null;
  caseData: CaseData;
  guilty: number;
  notGuilty: number;
  userVote: Verdict | null;
  streak: number;
};

export type VoteResponse = {
  type: 'vote';
  postId: string;
  guilty: number;
  notGuilty: number;
  userVote: Verdict;
  alreadyVoted: boolean;
  streak: number;
};

export type Argument = {
  id: string;
  username: string;
  side: Verdict;
  text: string;
  votes: number;
  createdAt: number;
};

export type ArgumentsResponse = {
  type: 'arguments';
  arguments: Argument[];
};

export type CreateArgumentResponse = {
  type: 'createArgument';
  argument: Argument;
};

export type ArgumentVoteResponse = {
  type: 'argumentVote';
  id: string;
  votes: number;
  alreadyVoted: boolean;
};
