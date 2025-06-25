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

    // Try to fetch multiple data sources from zerotrac repository
    const [ratingsResponse, tagsResponse] = await Promise.allSettled([
      // Main ratings data
      Promise.race([
        fetch("https://zerotrac.github.io/leetcode_problem_rating/data.json", {
          headers: { Accept: "application/json" },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 10000),
        ),
      ]),
      // Try to fetch tags data (check if available)
      Promise.race([
        fetch(
          "https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/gh-pages/data.json",
          {
            headers: { Accept: "application/json" },
          },
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 5000),
        ),
      ]),
    ]);

    // Parse ratings response
    if (ratingsResponse.status === "rejected" || !ratingsResponse.value.ok) {
      throw new Error(
        `Failed to fetch LeetCode ratings: ${ratingsResponse.status === "rejected" ? ratingsResponse.reason : ratingsResponse.value.status}`,
      );
    }

    const ratingsData = await ratingsResponse.value.json();
    console.log(
      `Successfully fetched ${ratingsData.length} LeetCode problems with ratings`,
    );

    // Group problems by contest and assign Q1-Q4 positions based on difficulty
    const contestGroups: { [key: string]: any[] } = {};
    ratingsData.forEach((problem: any) => {
      if (problem.ContestSlug && problem.ContestSlug !== "") {
        if (!contestGroups[problem.ContestSlug]) {
          contestGroups[problem.ContestSlug] = [];
        }
        contestGroups[problem.ContestSlug].push(problem);
      }
    });

    // Assign Q1-Q4 positions based on difficulty (rating) within each contest
    const problemsWithQNumbers = ratingsData.map((problem: any) => {
      let qNumber = null;
      if (problem.ContestSlug && contestGroups[problem.ContestSlug]) {
        const contestProblems = contestGroups[problem.ContestSlug];
        if (contestProblems.length > 1) {
          // Sort problems in this contest by rating (easiest to hardest)
          const sortedProblems = [...contestProblems].sort((a, b) => a.Rating - b.Rating);
          const problemIndex = sortedProblems.findIndex((p: any) => p.ID === problem.ID);
          if (problemIndex >= 0 && problemIndex < 4) {
            qNumber = problemIndex + 1; // Q1 = easiest, Q4 = hardest
          }
        } else {
          // Single problem contest, assign as Q1
          qNumber = 1;
        }
      }
      return { ...problem, qNumber };
    });

    // Fetch real LeetCode problem tags
    const leetcodeTagsMap = await fetchLeetCodeProblemDetails();

    // Enhanced problem processing with real tag data when available
    const problemsWithRealTags = problemsWithQNumbers.map((problem: any) => {
      let tags: string[] = [];

      // Use real tags from LeetCode API if available
      if (leetcodeTagsMap.has(problem.TitleSlug)) {
        tags = leetcodeTagsMap.get(problem.TitleSlug) || [];
        console.log(`✅ Found real tags for ${problem.TitleSlug}:`, tags);
      } else {
        // Fallback to comprehensive tag estimation
        const title = problem.TitleSlug.toLowerCase();

        // Data Structure Tags
        if (title.includes("tree") || title.includes("binary"))
          tags.push("Tree");
        if (title.includes("array") || title.includes("matrix"))
          tags.push("Array");
        if (title.includes("string") || title.includes("substring"))
          tags.push("String");
        if (title.includes("list") || title.includes("linked"))
          tags.push("Linked List");
        if (title.includes("stack")) tags.push("Stack");
        if (title.includes("queue")) tags.push("Queue");
        if (title.includes("heap") || title.includes("priority"))
          tags.push("Heap");
        if (
          title.includes("hash") ||
          title.includes("map") ||
          title.includes("dict")
        )
          tags.push("Hash Table");
        if (title.includes("graph") || title.includes("node"))
          tags.push("Graph");
        if (title.includes("trie")) tags.push("Trie");

        // Algorithm Tags
        if (title.includes("sort") || title.includes("merge"))
          tags.push("Sorting");
        if (title.includes("search") && title.includes("binary"))
          tags.push("Binary Search");
        if (title.includes("dp") || title.includes("dynamic"))
          tags.push("Dynamic Programming");
        if (title.includes("greedy")) tags.push("Greedy");
        if (title.includes("backtrack")) tags.push("Backtracking");
        if (title.includes("dfs") || title.includes("depth"))
          tags.push("Depth-First Search");
        if (title.includes("bfs") || title.includes("breadth"))
          tags.push("Breadth-First Search");
        if (title.includes("union") || title.includes("find"))
          tags.push("Union Find");

        // Technique Tags
        if (title.includes("two") && title.includes("pointer"))
          tags.push("Two Pointers");
        if (title.includes("sliding") && title.includes("window"))
          tags.push("Sliding Window");
        if (title.includes("divide") && title.includes("conquer"))
          tags.push("Divide and Conquer");
        if (title.includes("recursion") || title.includes("recursive"))
          tags.push("Recursion");
        if (title.includes("monotonic")) tags.push("Monotonic Stack");
        if (title.includes("prefix") || title.includes("suffix"))
          tags.push("Prefix Sum");

        // Math Tags
        if (title.includes("math") || title.includes("number"))
          tags.push("Math");
        if (
          title.includes("bit") ||
          title.includes("xor") ||
          title.includes("manipulation")
        )
          tags.push("Bit Manipulation");
        if (title.includes("geometry")) tags.push("Geometry");
        if (title.includes("combinatorics") || title.includes("permutation"))
          tags.push("Combinatorics");

        // Problem Type Tags
        if (title.includes("simulation")) tags.push("Simulation");
        if (title.includes("design")) tags.push("Design");
        if (title.includes("game")) tags.push("Game Theory");

        // If no tags found, assign based on difficulty
        if (tags.length === 0) {
          if (problem.Rating < 1200) tags.push("Implementation");
          else if (problem.Rating < 1600) tags.push("Array", "String");
          else if (problem.Rating < 2000) tags.push("Dynamic Programming");
          else tags.push("Advanced");
        }
        
        console.log(`📝 Estimated tags for ${problem.TitleSlug}:`, tags);
      }

      // Ensure we always have at least one tag
      if (tags.length === 0) {
        tags = ["Algorithm"];
        console.log(`⚠️ No tags found for ${problem.TitleSlug}, using fallback tag`);
      }

      return {
        ...problem,
        Tags: [...new Set(tags)], // Remove duplicates
        Difficulty:
          problem.Rating < 1400
            ? "Easy"
            : problem.Rating > 1800
              ? "Hard"
              : "Medium",
      };
    });

    console.log(
      `Enhanced ${problemsWithRealTags.length} LeetCode problems with tags (${leetcodeTagsMap.size > 0 ? "using real tag data" : "using estimated tags"})`,
    );
    
    // Debug: Count problems with tags
    const problemsWithTags = problemsWithRealTags.filter(p => p.Tags && p.Tags.length > 0);
    console.log(`📊 Problems with tags: ${problemsWithTags.length}/${problemsWithRealTags.length}`);
    
    // Show sample of problems with tags
    if (problemsWithTags.length > 0) {
      console.log("Sample problems with tags:", problemsWithTags.slice(0, 3).map(p => ({
        title: p.TitleSlug,
        tags: p.Tags
      })));
    }
    
    return problemsWithRealTags;
  } catch (error) {
    console.error("Error fetching LeetCode problems:", error);
    // Return empty array instead of throwing to prevent complete failure
    return [];
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
  const corsProxies = [
    "https://corsproxy.io/?",
    "https://cors-anywhere.herokuapp.com/",
    "https://api.allorigins.win/raw?url=",
  ];

  // Try direct access first, then fallback to CORS proxies
  const apiUrls = [
    "https://codeforces.com/api/problemset.problems",
    ...corsProxies.map(
      (proxy) => `${proxy}https://codeforces.com/api/problemset.problems`,
    ),
  ];

  let lastError: Error | null = null;

  for (const url of apiUrls) {
    try {
      console.log(
        `Trying Codeforces API: ${url.includes("proxy") ? "via proxy" : "direct"}`,
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

      const problemsData: CodeforcesResponse = await response.json();

      if (problemsData.status !== "OK") {
        throw new Error(
          problemsData.comment || "Failed to fetch Codeforces problems",
        );
      }

      console.log(
        `Successfully fetched ${problemsData.result.problems.length} Codeforces problems`,
      );

      // Process problems with statistics
      const problemsWithStats = problemsData.result.problems.map((problem) => {
        const stats = problemsData.result.problemStatistics.find(
          (stat) =>
            stat.contestId === problem.contestId &&
            stat.index === problem.index,
        );
        return {
          ...problem,
          solvedCount: stats?.solvedCount || 0,
        };
      });

      return problemsWithStats;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Failed to fetch from ${url}:`, lastError.message);
      continue;
    }
  }

  // If all attempts failed, return empty array instead of throwing
  console.error("All Codeforces API attempts failed:", lastError?.message);
  return [];
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

// Fetch all problems from both platforms
export async function fetchAllProblems(): Promise<Problem[]> {
  console.log("Starting to fetch problems from all platforms...");

  // Fetch contests first to get contest names
  const contestMap = await fetchCodeforcesContests();

  const [leetcodeProblems, codeforcesProblems] = await Promise.allSettled([
    fetchLeetCodeProblems(),
    fetchCodeforcesProblems(),
  ]);

  const problems: Problem[] = [];
  let successCount = 0;

  // Add LeetCode problems
  if (
    leetcodeProblems.status === "fulfilled" &&
    leetcodeProblems.value.length > 0
  ) {
    const leetcodeConverted = leetcodeProblems.value.map(
      convertLeetCodeProblem,
    );
    problems.push(...leetcodeConverted);
    console.log(`✅ Added ${leetcodeConverted.length} LeetCode problems`);
    successCount++;
  } else {
    console.error(
      "❌ Failed to fetch LeetCode problems:",
      leetcodeProblems.status === "rejected"
        ? leetcodeProblems.reason
        : "No problems returned",
    );
  }

  // Add Codeforces problems with contest names
  if (
    codeforcesProblems.status === "fulfilled" &&
    codeforcesProblems.value.length > 0
  ) {
    const codeforcesConverted = codeforcesProblems.value.map((problem: any) => {
      const contestName = contestMap.get(problem.contestId);
      return convertCodeforcesProblem(problem, contestName);
    });
    problems.push(...codeforcesConverted);
    console.log(`✅ Added ${codeforcesConverted.length} Codeforces problems with contest names`);
    successCount++;
  } else {
    console.error(
      "❌ Failed to fetch Codeforces problems:",
      codeforcesProblems.status === "rejected"
        ? codeforcesProblems.reason
        : "No problems returned",
    );
  }

  if (successCount === 0) {
    console.warn("⚠️ No problems could be fetched from any platform");
    // Return some sample problems so the app doesn't break completely
    return createSampleProblems();
  }

  console.log(
    `🎉 Successfully loaded ${problems.length} total problems from ${successCount} platform(s)`,
  );
  return problems;
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
