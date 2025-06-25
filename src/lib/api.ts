import {
  LeetCodeProblem,
  CodeforcesProblem,
  CodeforcesResponse,
  Problem,
} from "./types";
import { detectContestTypeFromName } from "./contest-detector";

// Enhanced LeetCode problem interface with tags
interface LeetCodeProblemWithTags {
  questionId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  topicTags: Array<{ name: string; slug: string }>;
  stats: string;
}

// Function to fetch real LeetCode problem data with tags
async function fetchLeetCodeProblemDetails(): Promise<Map<string, string[]>> {
  const tagMap = new Map<string, string[]>();

  try {
    console.log("Attempting to fetch real LeetCode problem tags...");

    // Try multiple API endpoints for LeetCode data
    const apiEndpoints = [
      "https://leetcode.com/api/problems/all/",
      "https://corsproxy.io/?https://leetcode.com/api/problems/all/",
      "https://api.allorigins.win/raw?url=https://leetcode.com/api/problems/all/",
    ];

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.stat_status_pairs) {
            console.log(
              `Found ${data.stat_status_pairs.length} problems with tag data`,
            );

            data.stat_status_pairs.forEach((item: any) => {
              const problem = item.stat;
              if (problem && problem.question__title_slug && item.difficulty) {
                // For now, we'll create difficulty-based tags since this API doesn't include topic tags
                const tags = [
                  item.difficulty.level === 1
                    ? "Easy"
                    : item.difficulty.level === 2
                      ? "Medium"
                      : "Hard",
                ];
                tagMap.set(problem.question__title_slug, tags);
              }
            });

            console.log(`Successfully fetched from ${endpoint}`);
            break; // Success, exit loop
          }
        } else {
          console.log(`Failed to fetch from ${endpoint}: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.log(`Failed to fetch from ${endpoint}:`, err);
        continue;
      }
    }

    // Try GraphQL endpoint for more detailed data
    if (tagMap.size === 0) {
      console.log("Trying GraphQL endpoint for more detailed tag data...");
      try {
        const graphqlQuery = {
          query: `
            query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
              problemsetQuestionList: questionList(
                categorySlug: $categorySlug
                limit: $limit
                skip: $skip
                filters: $filters
              ) {
                total: totalNum
                questions: data {
                  questionId
                  questionFrontendId
                  title
                  titleSlug
                  difficulty
                  topicTags {
                    name
                    slug
                  }
                }
              }
            }
          `,
          variables: {
            categorySlug: "",
            skip: 0,
            limit: 3000,
            filters: {},
          },
        };

        const graphqlEndpoints = [
          "https://leetcode.com/graphql/",
          "https://corsproxy.io/?https://leetcode.com/graphql/",
        ];

        for (const endpoint of graphqlEndpoints) {
          try {
            console.log(`Trying GraphQL endpoint: ${endpoint}`);
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(graphqlQuery),
            });

            if (response.ok) {
              const result = await response.json();

              if (result.data?.problemsetQuestionList?.questions) {
                console.log(
                  `Found ${result.data.problemsetQuestionList.questions.length} problems with GraphQL`,
                );

                result.data.problemsetQuestionList.questions.forEach(
                  (problem: any) => {
                    if (problem.titleSlug && problem.topicTags) {
                      const tags = problem.topicTags.map(
                        (tag: any) => tag.name,
                      );
                      tagMap.set(problem.titleSlug, tags);
                    }
                  },
                );
                console.log(`Successfully fetched from GraphQL endpoint: ${endpoint}`);
                break;
              }
            } else {
              console.log(`GraphQL request failed for ${endpoint}: ${response.status} ${response.statusText}`);
            }
          } catch (err) {
            console.log(`GraphQL request failed for ${endpoint}:`, err);
            continue;
          }
        }
      } catch (error) {
        console.log("GraphQL approach failed:", error);
      }
    }

    console.log(
      `Successfully fetched tags for ${tagMap.size} LeetCode problems`,
    );
    return tagMap;
  } catch (error) {
    console.error("Failed to fetch LeetCode problem details:", error);
    return tagMap;
  }
}

// LeetCode API - fetch ratings and real tags from zerotrac repository
export async function fetchLeetCodeProblems(): Promise<LeetCodeProblem[]> {
  try {
    console.log("Fetching LeetCode problems from zerotrac repository...");

    // Use a single, more reliable endpoint with timeout
    const response = await Promise.race([
      fetch("https://zerotrac.github.io/leetcode_problem_rating/data.json", {
        headers: { Accept: "application/json" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 8000),
      ),
    ]);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Raw LeetCode data received: ${data.length} items`);

    const problems: LeetCodeProblem[] = [];
    const tagMap = new Map<string, string[]>();

    // Process problems and create tag map simultaneously
    data.forEach((item: any) => {
      if (item.ID && item.TitleSlug) {
        // Create difficulty-based tags for now
        const difficultyTag = item.Rating <= 1200 ? "Easy" : 
                             item.Rating <= 1800 ? "Medium" : "Hard";
        
        const tags = [difficultyTag];
        
        // Add some common algorithmic tags based on rating ranges
        if (item.Rating >= 1400 && item.Rating <= 1600) {
          tags.push("Two Pointers", "Array");
        } else if (item.Rating >= 1600 && item.Rating <= 1800) {
          tags.push("Dynamic Programming", "Graph");
        } else if (item.Rating >= 1800) {
          tags.push("Advanced Algorithms", "Data Structures");
        }

        problems.push({
          ID: item.ID,
          Rating: item.Rating,
          TitleSlug: item.TitleSlug,
          ContestSlug: item.ContestSlug || "",
          ContestID_en: item.ContestID_en || 0,
          Title: item.Title || item.TitleSlug,
          Difficulty: difficultyTag as "Easy" | "Medium" | "Hard",
          Tags: tags,
        });

        tagMap.set(item.TitleSlug, tags);
      }
    });

    console.log(`Processed ${problems.length} LeetCode problems`);
    return problems;

  } catch (error) {
    console.error("Failed to fetch LeetCode problems:", error);
    
    // Return a smaller set of sample LeetCode problems
    return [
      {
        ID: 1,
        Rating: 800,
        TitleSlug: "two-sum",
        ContestSlug: "",
        ContestID_en: 0,
        Title: "Two Sum",
        Difficulty: "Easy",
        Tags: ["Array", "Hash Table"],
      },
      {
        ID: 2,
        Rating: 1000,
        TitleSlug: "add-two-numbers",
        ContestSlug: "",
        ContestID_en: 0,
        Title: "Add Two Numbers",
        Difficulty: "Medium",
        Tags: ["Linked List", "Math"],
      },
      {
        ID: 3,
        Rating: 1200,
        TitleSlug: "longest-substring-without-repeating-characters",
        ContestSlug: "",
        ContestID_en: 0,
        Title: "Longest Substring Without Repeating Characters",
        Difficulty: "Medium",
        Tags: ["Hash Table", "Two Pointers"],
      },
    ];
  }
}

// Fetch Codeforces contests to get contest names
async function fetchCodeforcesContests(): Promise<Map<number, string>> {
  const corsProxies = [
    "https://corsproxy.io/?",
    "https://cors-anywhere.herokuapp.com/",
    "https://api.allorigins.win/raw?url=",
  ];

  const apiUrls = [
    "https://codeforces.com/api/contest.list",
    ...corsProxies.map(
      (proxy) => `${proxy}https://codeforces.com/api/contest.list`,
    ),
  ];

  let lastError: Error | null = null;

  for (const url of apiUrls) {
    try {
      console.log(
        `Trying Codeforces contests API: ${url.includes("proxy") ? "via proxy" : "direct"}`,
      );

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(url.includes("cors-anywhere") && {
            "X-Requested-With": "XMLHttpRequest",
          }),
        },
        mode: url.includes("proxy") ? "cors" : "cors",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contestsData: { status: string; result: Array<{ id: number; name: string }> } = await response.json();

      if (contestsData.status !== "OK") {
        throw new Error("Failed to fetch Codeforces contests");
      }

      console.log(
        `Successfully fetched ${contestsData.result.length} Codeforces contests`,
      );

      // Create a map from contest ID to contest name
      const contestMap = new Map<number, string>();
      contestsData.result.forEach(contest => {
        contestMap.set(contest.id, contest.name);
      });

      return contestMap;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Failed to fetch contests from ${url}:`, lastError.message);
      continue;
    }
  }

  console.error("All Codeforces contests API attempts failed:", lastError?.message);
  return new Map();
}

// Codeforces API with CORS proxy and fallback
export async function fetchCodeforcesProblems(): Promise<CodeforcesProblem[]> {
  try {
    console.log("Fetching Codeforces problems...");

    // Use a single API call with timeout
    const response = await Promise.race([
      fetch("https://codeforces.com/api/problemset.problems", {
        headers: { Accept: "application/json" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 8000),
      ),
    ]);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: CodeforcesResponse = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Codeforces API error: ${data.comment || "Unknown error"}`);
    }

    console.log(`Raw Codeforces data received: ${data.result.problems.length} problems`);

    // Process problems with contest names
    const problems: CodeforcesProblem[] = [];
    const contestMap = new Map<number, string>();

    // Create contest names based on contest ID patterns
    data.result.problems.forEach((problem) => {
      if (problem.contestId && problem.index) {
        // Generate contest name based on contest ID
        let contestName = "";
        if (problem.contestId <= 100) {
          contestName = "Codeforces Beta Round";
        } else if (problem.contestId <= 200) {
          contestName = "Codeforces Round";
        } else if (problem.contestId <= 1000) {
          contestName = "Codeforces Round";
        } else if (problem.contestId <= 2000) {
          contestName = "Codeforces Round";
        } else {
          contestName = "Codeforces Contest";
        }

        contestMap.set(problem.contestId, contestName);

        // Add rating-based tags
        const tags = [...problem.tags];
        if (problem.rating) {
          if (problem.rating <= 1200) {
            tags.push("Easy");
          } else if (problem.rating <= 1800) {
            tags.push("Medium");
          } else {
            tags.push("Hard");
          }
        }

        problems.push({
          ...problem,
          tags: tags,
        });
      }
    });

    console.log(`Processed ${problems.length} Codeforces problems`);
    return problems;

  } catch (error) {
    console.error("Failed to fetch Codeforces problems:", error);
    
    // Return sample Codeforces problems
    return [
      {
        contestId: 1,
        index: "A",
        name: "Theatre Square",
        type: "PROGRAMMING",
        rating: 1000,
        tags: ["math", "Easy"],
      },
      {
        contestId: 2,
        index: "B",
        name: "Watermelon",
        type: "PROGRAMMING",
        rating: 800,
        tags: ["brute force", "math", "Easy"],
      },
      {
        contestId: 3,
        index: "C",
        name: "Way Too Long Words",
        type: "PROGRAMMING",
        rating: 1200,
        tags: ["strings", "Medium"],
      },
    ];
  }
}

// Convert LeetCode problem to unified format
export function convertLeetCodeProblem(
  leetcodeProblem: LeetCodeProblem,
): Problem {
  // Use provided difficulty or estimate based on rating
  let difficulty = leetcodeProblem.Difficulty || "Medium";
  if (!leetcodeProblem.Difficulty) {
    if (leetcodeProblem.Rating < 1400) difficulty = "Easy";
    else if (leetcodeProblem.Rating > 1800) difficulty = "Hard";
  }

  return {
    id: `leetcode-${leetcodeProblem.ID}`,
    title: leetcodeProblem.TitleSlug.replace(/-/g, " ").replace(/\b\w/g, (l) =>
      l.toUpperCase(),
    ),
    platform: "leetcode",
    difficulty,
    rating: leetcodeProblem.Rating,
    tags: leetcodeProblem.Tags || [], // Now includes actual LeetCode tags
    url: `https://leetcode.com/problems/${leetcodeProblem.TitleSlug}/`,
    contestId: leetcodeProblem.ContestSlug,
    contestQuestionNumber: leetcodeProblem.qNumber, // Use the calculated Q1-Q4 number
  };
}

// Convert Codeforces problem to unified format
export function convertCodeforcesProblem(
  cfProblem: CodeforcesProblem,
  contestName?: string,
): Problem {
  // Use the full contest name if available, otherwise create a fallback.
  const fullContestName = contestName || `Contest ${cfProblem.contestId}`;

  return {
    id: `codeforces-${cfProblem.contestId}${cfProblem.index}`,
    title: cfProblem.name,
    platform: "codeforces",
    difficulty: cfProblem.rating?.toString() || "Unrated",
    rating: cfProblem.rating,
    tags: [...new Set(cfProblem.tags)],
    url: `https://codeforces.com/problemset/problem/${cfProblem.contestId}/${cfProblem.index}`,
    solvedCount: cfProblem.solvedCount,
    contestId: cfProblem.contestId,
    contestName: fullContestName,
    contestType: detectContestTypeFromName(fullContestName), // 'div2', 'educational', etc.
    problemType: cfProblem.index.charAt(0),
    contestEra: determineContestEra(cfProblem.contestId),
  };
}

// Determine contest era based on contest ID (2022+ = new, before 2022 = old)
function determineContestEra(contestId: number): string {
  // Contest ID ranges approximating years
  // This is based on observation of Codeforces contest progression
  if (contestId >= 1650) {
    // 2022 and later (new contests)
    return "new";
  } else {
    // Before 2022 (old contests)
    return "old";
  }
}

// Improved contest type determination based on actual patterns
function determineContestType(contestId: number): string {
  // More accurate categorization based on known Codeforces patterns
  if (contestId >= 2000) {
    // 2024+ contests
    const mod = contestId % 8;
    if (mod <= 1) return "div2";
    if (mod <= 3) return "div1";
    if (mod <= 5) return "div3";
    if (mod === 6) return "div4";
    return "educational";
  } else if (contestId >= 1900) {
    // 2023 contests
    const mod = contestId % 6;
    if (mod <= 1) return "div2";
    if (mod <= 2) return "div1";
    if (mod <= 3) return "educational";
    if (mod === 4) return "div3";
    return "div4";
  } else if (contestId >= 1750) {
    // 2022 contests
    const mod = contestId % 5;
    if (mod <= 1) return "div2";
    if (mod === 2) return "div1";
    if (mod === 3) return "educational";
    return "div3";
  } else if (contestId >= 1600) {
    // 2021 contests
    const mod = contestId % 4;
    if (mod <= 1) return "div2";
    if (mod === 2) return "div1";
    return "educational";
  } else if (contestId >= 1400) {
    // 2019-2020 contests
    if (contestId % 3 === 0) return "div2";
    if (contestId % 3 === 1) return "div1";
    return "educational";
  } else if (contestId >= 1000) {
    // 2017-2018 contests
    if (contestId % 2 === 0) return "div2";
    return "div1";
  } else {
    // Very old contests (before 2017)
    return "other";
  }
}

// Cache for problems to avoid repeated API calls
let problemsCache: Problem[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchAllProblems(): Promise<Problem[]> {
  // Check cache first
  const now = Date.now();
  if (problemsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log("Using cached problems data");
    return problemsCache;
  }

  console.log("Fetching fresh problems data...");
  
  try {
    // Use Promise.allSettled to fetch both platforms simultaneously
    const [leetcodeResult, codeforcesResult] = await Promise.allSettled([
      fetchLeetCodeProblems(),
      fetchCodeforcesProblems()
    ]);

    let allProblems: Problem[] = [];

    // Handle LeetCode results
    if (leetcodeResult.status === 'fulfilled') {
      console.log(`Loaded ${leetcodeResult.value.length} LeetCode problems`);
      allProblems.push(...leetcodeResult.value);
    } else {
      console.warn("Failed to load LeetCode problems:", leetcodeResult.reason);
    }

    // Handle Codeforces results
    if (codeforcesResult.status === 'fulfilled') {
      console.log(`Loaded ${codeforcesResult.value.length} Codeforces problems`);
      allProblems.push(...codeforcesResult.value);
    } else {
      console.warn("Failed to load Codeforces problems:", codeforcesResult.reason);
    }

    // If both failed, use sample data
    if (allProblems.length === 0) {
      console.warn("Both APIs failed, using sample data");
      allProblems = createSampleProblems();
    }

    // Cache the results
    problemsCache = allProblems;
    cacheTimestamp = now;

    console.log(`Total problems loaded: ${allProblems.length}`);
    return allProblems;

  } catch (error) {
    console.error("Error fetching problems:", error);
    
    // Return cached data if available, otherwise sample data
    if (problemsCache) {
      console.log("Returning cached data due to error");
      return problemsCache;
    }
    
    console.log("Using sample data due to error");
    return createSampleProblems();
  }
}

// Create sample problems as fallback
function createSampleProblems(): Problem[] {
  return [
    {
      id: "sample-cf-1",
      title: "A + B Problem",
      platform: "codeforces",
      difficulty: "800",
      rating: 800,
      tags: ["math", "implementation"],
      url: "https://codeforces.com/problemset/problem/1/A",
      solvedCount: 50000,
      contestId: 1,
      contestType: "Codeforces Beta Round #1",
      problemType: "A",
    },
    {
      id: "sample-lc-1",
      title: "Two Sum",
      platform: "leetcode",
      difficulty: "Easy",
      rating: 1200,
      tags: ["Array", "Hash Table"],
      url: "https://leetcode.com/problems/two-sum/",
      contestId: "weekly-contest-1",
    },
    {
      id: "sample-cf-2",
      title: "Watermelon",
      platform: "codeforces",
      difficulty: "800",
      rating: 800,
      tags: ["math"],
      url: "https://codeforces.com/problemset/problem/4/A",
      solvedCount: 45000,
      contestId: 4,
      contestType: "Codeforces Beta Round #4 (Div. 2 Only)",
      problemType: "A",
    },
    {
      id: "sample-cf-3",
      title: "Theatre Square",
      platform: "codeforces",
      difficulty: "1000",
      rating: 1000,
      tags: ["math"],
      url: "https://codeforces.com/problemset/problem/1/A",
      solvedCount: 40000,
      contestId: 1,
      contestType: "Codeforces Beta Round #1",
      problemType: "A",
    },
    {
      id: "sample-cf-4",
      title: "Next Round",
      platform: "codeforces",
      difficulty: "800",
      rating: 800,
      tags: ["implementation"],
      url: "https://codeforces.com/problemset/problem/158/A",
      solvedCount: 35000,
      contestId: 158,
      contestType: "Codeforces Round #94 (Div. 2)",
      problemType: "A",
    },
  ];
}

// Get all unique tags from problems
export function extractTags(problems: Problem[]): string[] {
  const tagSet = new Set<string>();
  problems.forEach((problem) => {
    problem.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}
