// User Statistics API for LeetCode and Codeforces

export interface LeetCodeUserStats {
  totalSolved: number;
  totalQuestions: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: number;
  ranking: number;
  contributionPoints: number;
  reputation: number;
}

export interface CodeforcesUser {
  handle: string;
  email?: string;
  vkId?: string;
  openId?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  city?: string;
  organization?: string;
  contribution: number;
  rank: string;
  rating: number;
  maxRank: string;
  maxRating: number;
  lastOnlineTimeSeconds: number;
  registrationTimeSeconds: number;
  friendOfCount: number;
  avatar: string;
  titlePhoto: string;
}

export interface CodeforcesSubmission {
  id: number;
  contestId: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
    type: string;
    rating?: number;
    tags: string[];
  };
  author: {
    contestId: number;
    members: Array<{ handle: string }>;
    participantType: string;
    ghost: boolean;
    room?: number;
    startTimeSeconds?: number;
  };
  programmingLanguage: string;
  verdict: string;
  testset: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

export interface CodeforcesContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds?: number;
}

export interface UserPerformanceStats {
  leetcode?: {
    username: string;
    stats: LeetCodeUserStats;
    recentActivity: any[];
  };
  codeforces?: {
    handle: string;
    user: CodeforcesUser;
    submissions: CodeforcesSubmission[];
    contests: CodeforcesContest[];
    problemsSolved: {
      total: number;
      byDifficulty: Record<string, number>;
      byProblemType: Record<string, number>;
      byContestType: Record<string, number>;
    };
  };
}

// LeetCode API (using GraphQL endpoint via proxy)
export async function fetchLeetCodeUserStats(
  username: string,
): Promise<LeetCodeUserStats | null> {
  try {
    // Using LeetCode's public API endpoint
    const response = await fetch(
      `https://leetcode-api-faisalshohag.vercel.app/${username}`,
    );

    if (!response.ok) {
      throw new Error("User not found");
    }

    const data = await response.json();

    return {
      totalSolved: data.totalSolved || 0,
      totalQuestions: data.totalQuestions || 0,
      easySolved: data.easySolved || 0,
      mediumSolved: data.mediumSolved || 0,
      hardSolved: data.hardSolved || 0,
      acceptanceRate: data.acceptanceRate || 0,
      ranking: data.ranking || 0,
      contributionPoints: data.contributionPoints || 0,
      reputation: data.reputation || 0,
    };
  } catch (error) {
    console.error("Error fetching LeetCode stats:", error);
    return null;
  }
}

// Codeforces API
export async function fetchCodeforcesUser(
  handle: string,
): Promise<CodeforcesUser | null> {
  try {
    const response = await fetch(
      `https://codeforces.com/api/user.info?handles=${handle}`,
    );

    if (!response.ok) {
      throw new Error("User not found");
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.result || data.result.length === 0) {
      throw new Error("User not found");
    }

    return data.result[0];
  } catch (error) {
    console.error("Error fetching Codeforces user:", error);
    return null;
  }
}

export async function fetchCodeforcesSubmissions(
  handle: string,
  count: number = 1000,
): Promise<CodeforcesSubmission[]> {
  try {
    const response = await fetch(
      `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=${count}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch submissions");
    }

    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(data.comment || "Failed to fetch submissions");
    }

    return data.result || [];
  } catch (error) {
    console.error("Error fetching Codeforces submissions:", error);
    return [];
  }
}

export async function fetchCodeforcesContests(): Promise<CodeforcesContest[]> {
  try {
    const response = await fetch("https://codeforces.com/api/contest.list");

    if (!response.ok) {
      throw new Error("Failed to fetch contests");
    }

    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(data.comment || "Failed to fetch contests");
    }

    return data.result || [];
  } catch (error) {
    console.error("Error fetching Codeforces contests:", error);
    return [];
  }
}

// Analyze Codeforces performance
export function analyzeCodeforcesPerformance(
  submissions: CodeforcesSubmission[],
  contests: CodeforcesContest[] = [],
): {
  total: number;
  byDifficulty: Record<string, number>;
  byProblemType: Record<string, number>;
  byContestType: Record<string, number>;
  verdictStats: Record<string, number>;
  languageStats: Record<string, number>;
} {
  const acceptedSubmissions = submissions.filter((sub) => sub.verdict === "OK");

  const uniqueProblems = new Set();
  const byDifficulty: Record<string, number> = {};
  const byProblemType: Record<string, number> = {};
  const byContestType: Record<string, number> = {};
  const verdictStats: Record<string, number> = {};
  const languageStats: Record<string, number> = {};

  // Create a map of contest IDs to contest info for faster lookup
  const contestMap = new Map<number, CodeforcesContest>();
  contests.forEach(contest => {
    contestMap.set(contest.id, contest);
  });

  submissions.forEach((submission) => {
    // Verdict stats
    verdictStats[submission.verdict] =
      (verdictStats[submission.verdict] || 0) + 1;

    // Language stats
    languageStats[submission.programmingLanguage] =
      (languageStats[submission.programmingLanguage] || 0) + 1;
  });

  acceptedSubmissions.forEach((submission) => {
    const problemKey = `${submission.problem.contestId}${submission.problem.index}`;

    if (!uniqueProblems.has(problemKey)) {
      uniqueProblems.add(problemKey);

      // By difficulty
      if (submission.problem.rating) {
        const difficultyRange = getDifficultyRange(submission.problem.rating);
        byDifficulty[difficultyRange] =
          (byDifficulty[difficultyRange] || 0) + 1;
      }

      // By problem type (A, B, C, D, etc.)
      const problemType = submission.problem.index.charAt(0);
      byProblemType[problemType] = (byProblemType[problemType] || 0) + 1;

      // By contest type with better detection
      const contestType = getContestType(submission.problem.contestId, contestMap.get(submission.problem.contestId));
      byContestType[contestType] = (byContestType[contestType] || 0) + 1;
    }
  });

  return {
    total: uniqueProblems.size,
    byDifficulty,
    byProblemType,
    byContestType,
    verdictStats,
    languageStats,
  };
}

function getDifficultyRange(rating: number): string {
  if (rating < 1000) return "Newbie (800-999)";
  if (rating < 1200) return "Pupil (1000-1199)";
  if (rating < 1400) return "Specialist (1200-1399)";
  if (rating < 1600) return "Expert (1400-1599)";
  if (rating < 1900) return "Candidate Master (1600-1899)";
  if (rating < 2100) return "Master (1900-2099)";
  if (rating < 2300) return "International Master (2100-2299)";
  if (rating < 2400) return "Grandmaster (2300-2399)";
  if (rating < 2600) return "International Grandmaster (2400-2599)";
  return "Legendary Grandmaster (2600+)";
}

function getContestType(contestId: number, contest?: CodeforcesContest): string {
  // If we have contest info, use the full contest name
  if (contest) {
    return contest.name;
  }
  
  // Fallback to contest ID if no contest info
  return `Contest ${contestId}`;
}

// Combined user performance fetch
export async function fetchUserPerformance(
  leetcodeHandle?: string,
  codeforcesHandle?: string,
): Promise<UserPerformanceStats> {
  const stats: UserPerformanceStats = {};

  try {
    // Fetch LeetCode data
    if (leetcodeHandle) {
      const leetcodeStats = await fetchLeetCodeUserStats(leetcodeHandle);
      if (leetcodeStats) {
        stats.leetcode = {
          username: leetcodeHandle,
          stats: leetcodeStats,
          recentActivity: [], // Could be expanded to fetch recent submissions
        };
      }
    }

    // Fetch Codeforces data
    if (codeforcesHandle) {
      const [user, submissions, contests] = await Promise.all([
        fetchCodeforcesUser(codeforcesHandle),
        fetchCodeforcesSubmissions(codeforcesHandle),
        fetchCodeforcesContests(),
      ]);

      if (user) {
        const problemsSolved = analyzeCodeforcesPerformance(submissions, contests);
        stats.codeforces = {
          handle: codeforcesHandle,
          user,
          submissions,
          contests,
          problemsSolved,
        };
      }
    }
  } catch (error) {
    console.error("Error fetching user performance:", error);
  }

  return stats;
}

// Advanced Codeforces stats (cftracker/cfviz style)
export function computeAdvancedCodeforcesStats(
  user: CodeforcesUser,
  submissions: CodeforcesSubmission[],
  contests: CodeforcesContest[],
) {
  // 1. Total contests participated
  const contestIds = new Set<number>();
  submissions.forEach((s) => {
    if (s.author && s.author.participantType === 'CONTESTANT') {
      contestIds.add(s.contestId);
    }
  });
  const totalContests = contestIds.size;

  // 2. Best/Worst rank, max up/down (requires contest standings, not available in current API fetch)
  // We'll leave these as null for now, unless you fetch standings per contest.
  const bestRank = null;
  const worstRank = null;
  const maxUp = null;
  const maxDown = null;

  // 3. Attempts per problem
  const problemAttempts: Record<string, number> = {};
  submissions.forEach((s) => {
    const key = `${s.problem.contestId}${s.problem.index}`;
    problemAttempts[key] = (problemAttempts[key] || 0) + 1;
  });
  const attemptsArr = Object.values(problemAttempts);
  const avgAttempts = attemptsArr.length ? (attemptsArr.reduce((a, b) => a + b, 0) / attemptsArr.length) : 0;
  const maxAttempts = attemptsArr.length ? Math.max(...attemptsArr) : 0;

  // 4. Solved with one submission
  const acceptedProblems = new Set<string>();
  const solvedWithOneSubmission = new Set<string>();
  const acCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    const key = `${s.problem.contestId}${s.problem.index}`;
    if (s.verdict === 'OK') {
      acCounts[key] = (acCounts[key] || 0) + 1;
      if (!acceptedProblems.has(key)) {
        acceptedProblems.add(key);
        if (problemAttempts[key] === 1) {
          solvedWithOneSubmission.add(key);
        }
      }
    }
  });
  const maxACs = attemptsArr.length ? Math.max(...Object.values(acCounts)) : 0;

  return {
    totalContests,
    bestRank,
    worstRank,
    maxUp,
    maxDown,
    avgAttempts: Number(avgAttempts.toFixed(2)),
    maxAttempts,
    solvedWithOneSubmission: solvedWithOneSubmission.size,
    maxACs,
  };
}

// API functions to check recent submissions and verify solved problems

interface LeetCodeSubmission {
  id: number;
  title: string;
  titleSlug: string;
  status: string;
  timestamp: number;
}

interface CodeforcesSubmission {
  id: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
  };
  verdict: string;
  creationTimeSeconds: number;
}

// Check if a LeetCode problem was recently solved
export async function checkLeetCodeSubmission(
  problemTitleSlug: string,
  username: string,
  timeWindow: number = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
): Promise<boolean> {
  try {
    console.log(`Checking LeetCode submission for ${problemTitleSlug} by ${username}`);
    
    // Fetch real submissions from LeetCode API
    const response = await fetch(
      `https://leetcode-api-faisalshohag.vercel.app/${username}/submissions`
    );

    if (!response.ok) {
      console.error("Failed to fetch LeetCode submissions");
      return false;
    }

    const data = await response.json();
    const submissions = data.submissions || [];
    const currentTime = Date.now();

    // Find a recent successful submission for this specific problem
    const recentSubmission = submissions.find(
      (sub: any) => sub.titleSlug === problemTitleSlug && 
                   sub.status === "ac" && 
                   currentTime - sub.timestamp < timeWindow
    );

    if (recentSubmission) {
      console.log(`Found recent LeetCode submission: ${recentSubmission.id} at ${new Date(recentSubmission.timestamp).toLocaleString()}`);
      return true;
    } else {
      console.log(`No recent LeetCode submission found for ${problemTitleSlug}`);
      return false;
    }
  } catch (error) {
    console.error("Error checking LeetCode submission:", error);
    return false;
  }
}

// Check if a Codeforces problem was recently solved
export async function checkCodeforcesSubmission(
  contestId: number,
  problemIndex: string,
  username: string,
  timeWindow: number = 24 * 60 * 60 // 24 hours in seconds
): Promise<boolean> {
  try {
    console.log(`Checking Codeforces submission for ${contestId}${problemIndex} by ${username}`);
    
    // Fetch real submissions from Codeforces API
    const response = await fetch(
      `https://codeforces.com/api/user.status?handle=${username}&from=1&count=1000`
    );

    if (!response.ok) {
      console.error("Failed to fetch Codeforces submissions");
      return false;
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Codeforces API error:", data.comment);
      return false;
    }

    const submissions: CodeforcesSubmission[] = data.result || [];
    const currentTime = Math.floor(Date.now() / 1000);

    // Find a recent successful submission for this specific problem
    const recentSubmission = submissions.find(
      sub => sub.problem.contestId === contestId && 
             sub.problem.index === problemIndex && 
             sub.verdict === "OK" && 
             currentTime - sub.creationTimeSeconds < timeWindow
    );

    if (recentSubmission) {
      console.log(`Found recent submission: ${recentSubmission.id} at ${new Date(recentSubmission.creationTimeSeconds * 1000).toLocaleString()}`);
      return true;
    } else {
      console.log(`No recent submission found for ${contestId}${problemIndex}`);
      return false;
    }
  } catch (error) {
    console.error("Error checking Codeforces submission:", error);
    return false;
  }
}

// Get problem identifier for checking submissions
export function getProblemIdentifier(problem: any): { contestId?: number; problemIndex?: string; titleSlug?: string } {
  if (problem.platform === "leetcode") {
    // Extract titleSlug from LeetCode problem
    const titleSlug = problem.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return { titleSlug };
  } else if (problem.platform === "codeforces") {
    // Extract contestId and problemIndex from Codeforces problem
    const contestId = parseInt(problem.contestId as string);
    
    // Try multiple methods to extract problem index
    let problemIndex = problem.problemType; // First try problemType field
    
    if (!problemIndex && problem.id) {
      // Extract from problem ID (e.g., "1-A" -> "A")
      const idParts = problem.id.split('-');
      problemIndex = idParts[idParts.length - 1];
    }
    
    if (!problemIndex && problem.url) {
      // Extract from URL (e.g., "https://codeforces.com/problemset/problem/1/A" -> "A")
      const urlMatch = problem.url.match(/problem\/(\d+)\/([A-Z])/);
      if (urlMatch) {
        problemIndex = urlMatch[2];
      }
    }
    
    console.log(`Problem identifier: contestId=${contestId}, problemIndex=${problemIndex}, problemId=${problem.id}`);
    return { contestId, problemIndex };
  }
  return {};
}
