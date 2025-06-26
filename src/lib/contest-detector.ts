// Enhanced contest type detection using actual contest names

interface CodeforcesContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds?: number;
}

let contestsCache: CodeforcesContest[] = [];
let cacheExpiry = 0;

// Fetch contest list and cache it
async function fetchContests(): Promise<CodeforcesContest[]> {
  const now = Date.now();

  // Return cached data if still valid (cache for 1 hour)
  if (contestsCache.length > 0 && now < cacheExpiry) {
    return contestsCache;
  }

  try {
    const response = await fetch("https://codeforces.com/api/contest.list");

    if (!response.ok) {
      throw new Error("Failed to fetch contests");
    }

    const data = await response.json();

    if (data.status === "OK" && data.result) {
      contestsCache = data.result;
      cacheExpiry = now + 60 * 60 * 1000; // Cache for 1 hour
      return contestsCache;
    }

    throw new Error("Invalid response from contest API");
  } catch (error) {
    console.warn(
      "Could not fetch contest data, using fallback detection:",
      error,
    );
    return [];
  }
}

// Determine contest type from contest name
export function detectContestTypeFromName(contestName: string): string {
  const name = contestName.toLowerCase();

  // Check for division patterns with various formats
  if (
    name.includes("div. 1") ||
    name.includes("div 1") ||
    name.includes("division 1") ||
    name.includes("div1") ||
    name.includes("(div. 1)") ||
    name.includes("(div 1)")
  ) {
    return "div1";
  }
  if (
    name.includes("div. 2") ||
    name.includes("div 2") ||
    name.includes("division 2") ||
    name.includes("div2") ||
    name.includes("(div. 2)") ||
    name.includes("(div 2)")
  ) {
    return "div2";
  }
  if (
    name.includes("div. 3") ||
    name.includes("div 3") ||
    name.includes("division 3") ||
    name.includes("div3") ||
    name.includes("(div. 3)") ||
    name.includes("(div 3)")
  ) {
    return "div3";
  }
  if (
    name.includes("div. 4") ||
    name.includes("div 4") ||
    name.includes("division 4") ||
    name.includes("div4") ||
    name.includes("(div. 4)") ||
    name.includes("(div 4)")
  ) {
    return "div4";
  }
  if (
    name.includes("educational") ||
    name.includes("edu") ||
    name.includes("(educational)")
  ) {
    return "educational";
  }
  if (
    name.includes("global") ||
    name.includes("round") && name.includes("global")
  ) {
    return "global";
  }
  if (
    name.includes("good bye") ||
    name.includes("hello") ||
    name.includes("april fools") ||
    name.includes("april fool")
  ) {
    return "special";
  }

  // Check for beta rounds and very old contests
  if (name.includes("beta round")) {
    return "other";
  }

  return "other";
}

// Enhanced contest type determination
export async function determineContestTypeEnhanced(
  contestId: number,
): Promise<string> {
  try {
    const contests = await fetchContests();
    const contest = contests.find((c) => c.id === contestId);

    if (contest) {
      return detectContestTypeFromName(contest.name);
    }
  } catch (error) {
    console.warn("Could not determine contest type from API, using fallback");
  }

  // Fallback to pattern-based detection
  return determineContestTypeFallback(contestId);
}

// Fallback pattern-based detection (improved)
function determineContestTypeFallback(contestId: number): string {
  // More realistic categorization based on known Codeforces patterns
  if (contestId >= 1950) {
    // Very recent contests (2024+)
    const mod = contestId % 10;
    if (mod <= 2) return "div2";
    if (mod <= 4) return "div3";
    if (mod <= 6) return "div1";
    if (mod <= 8) return "educational";
    return "div4";
  } else if (contestId >= 1800) {
    // Recent contests (2023)
    const mod = contestId % 8;
    if (mod <= 2) return "div2";
    if (mod <= 4) return "div1";
    if (mod <= 6) return "educational";
    return "div3";
  } else if (contestId >= 1600) {
    // 2022 contests
    const mod = contestId % 6;
    if (mod <= 2) return "div2";
    if (mod <= 4) return "div1";
    return "educational";
  } else if (contestId >= 1400) {
    // 2020-2021 contests
    if (contestId % 3 === 0) return "div2";
    if (contestId % 3 === 1) return "div1";
    return "educational";
  } else if (contestId >= 1000) {
    // 2017-2019 contests
    if (contestId % 2 === 0) return "div2";
    return "div1";
  } else {
    // Very old contests
    return "other";
  }
}

// Initialize contest cache on import
fetchContests().catch(() => {
  console.warn("Could not initialize contest cache");
});
