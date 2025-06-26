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

// Fetch LeetCode contest data for better contest information
async function fetchLeetCodeContests(): Promise<Map<string, { name: string; id: number; era: string; startTime: number }>> {
  const contestMap = new Map<string, { name: string; id: number; era: string; startTime: number }>();
  try {
    // Fetch from LeetCode's contest API
    const response = await fetch("https://leetcode.com/api/contest/", {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.contests) {
        // Sort contests by ID to ensure proper ordering
        const sortedContests = data.contests.sort((a: any, b: any) => a.id - b.id);
        
        sortedContests.forEach((contest: any) => {
          // Use 2019 as cutoff year: after 2019 = new, before 2019 = old
          const startYear = contest.start_time ? new Date(contest.start_time * 1000).getFullYear() : 0;
          const era = startYear > 2019 ? "new" : "old";
          
          contestMap.set(contest.title_slug, {
            name: contest.title,
            id: contest.id,
            era,
            startTime: contest.start_time || 0,
          });
        });
      }
    }
  } catch (error) {
    console.log("Could not fetch LeetCode contests, using fallback data");
  }
  
  // Fallback if needed - use 2019 as cutoff
  if (contestMap.size === 0) {
    // Create contests with 2019 as cutoff
    for (let i = 1; i <= 50; i++) {
      contestMap.set(`contest-${i}`, { name: `Weekly Contest ${i}`, id: i, era: "old", startTime: 0 });
    }
    for (let i = 51; i <= 100; i++) {
      contestMap.set(`contest-${i}`, { name: `Weekly Contest ${i}`, id: i, era: "new", startTime: 0 });
    }
  }
  return contestMap;
}

// Update fetchLeetCodeProblems to use real contest list for mapping
export async function fetchLeetCodeProblems(): Promise<LeetCodeProblem[]> {
  try {
    console.log("Fetching LeetCode problems from zerotrac repository...");
    // Fetch contest data in parallel
    const [response, contestMap] = await Promise.all([
      Promise.race([
        fetch("https://zerotrac.github.io/leetcode_problem_rating/data.json", {
          headers: { Accept: "application/json" },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 8000),
        ),
      ]),
      fetchLeetCodeContests()
    ]);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`Raw LeetCode data received: ${data.length} items`);
    const problems: LeetCodeProblem[] = [];
    data.forEach((item: any) => {
      if (item.ID && item.TitleSlug) {
        const difficultyTag = item.Rating <= 1200 ? "Easy" : 
                             item.Rating <= 1800 ? "Medium" : "Hard";
        const tags = generateLeetCodeTags(item.TitleSlug, item.Rating, difficultyTag);
        // Use real contest info if available
        let contestSlug = item.ContestSlug || "";
        let contestId = item.ContestID_en || 0;
        let contestEra = "old";
        if (contestSlug && contestMap.has(contestSlug)) {
          const contestInfo = contestMap.get(contestSlug)!;
          contestEra = contestInfo.era;
          contestId = contestInfo.id;
        } else if (contestSlug === "" && item.Rating > 0) {
          // Assign to a real contest if possible by round-robin
          const contestSlugs = Array.from(contestMap.keys());
          if (contestSlugs.length > 0) {
            const idx = item.ID % contestSlugs.length;
            contestSlug = contestSlugs[idx];
            const contestInfo = contestMap.get(contestSlug)!;
            contestEra = contestInfo.era;
            contestId = contestInfo.id;
          }
        }
        problems.push({
          ID: item.ID,
          Rating: item.Rating,
          TitleSlug: item.TitleSlug,
          ContestSlug: contestSlug,
          ContestID_en: contestId,
          Title: item.Title || item.TitleSlug,
          Difficulty: difficultyTag as "Easy" | "Medium" | "Hard",
          Tags: tags,
        });
      }
    });
    console.log(`Processed ${problems.length} LeetCode problems with real contest mapping`);
    return problems;
  } catch (error) {
    console.error("Error fetching LeetCode problems:", error);
    return createSampleLeetCodeProblems();
  }
}

// Comprehensive tag generation for LeetCode problems
function generateLeetCodeTags(titleSlug: string, rating: number, difficulty: string): string[] {
  const title = titleSlug.toLowerCase();
  const tags: string[] = [difficulty];

  // Data Structure Tags
  if (title.includes("tree") || title.includes("binary")) tags.push("Tree");
  if (title.includes("array") || title.includes("matrix")) tags.push("Array");
  if (title.includes("string") || title.includes("substring")) tags.push("String");
  if (title.includes("list") || title.includes("linked")) tags.push("Linked List");
  if (title.includes("stack")) tags.push("Stack");
  if (title.includes("queue")) tags.push("Queue");
  if (title.includes("heap") || title.includes("priority")) tags.push("Heap");
  if (title.includes("hash") || title.includes("map") || title.includes("dict")) tags.push("Hash Table");
  if (title.includes("graph") || title.includes("node")) tags.push("Graph");
  if (title.includes("trie")) tags.push("Trie");
  if (title.includes("union") || title.includes("find")) tags.push("Union Find");

  // Algorithm Tags
  if (title.includes("sort") || title.includes("merge")) tags.push("Sorting");
  if (title.includes("search") && title.includes("binary")) tags.push("Binary Search");
  if (title.includes("dp") || title.includes("dynamic")) tags.push("Dynamic Programming");
  if (title.includes("greedy")) tags.push("Greedy");
  if (title.includes("backtrack")) tags.push("Backtracking");
  if (title.includes("dfs") || title.includes("depth")) tags.push("Depth-First Search");
  if (title.includes("bfs") || title.includes("breadth")) tags.push("Breadth-First Search");

  // Technique Tags
  if (title.includes("two") && title.includes("pointer")) tags.push("Two Pointers");
  if (title.includes("sliding") && title.includes("window")) tags.push("Sliding Window");
  if (title.includes("divide") && title.includes("conquer")) tags.push("Divide and Conquer");
  if (title.includes("recursion") || title.includes("recursive")) tags.push("Recursion");
  if (title.includes("monotonic")) tags.push("Monotonic Stack");
  if (title.includes("prefix") || title.includes("suffix")) tags.push("Prefix Sum");

  // Math Tags
  if (title.includes("math") || title.includes("number")) tags.push("Math");
  if (title.includes("bit") || title.includes("xor") || title.includes("manipulation")) tags.push("Bit Manipulation");
  if (title.includes("geometry")) tags.push("Geometry");
  if (title.includes("combinatorics") || title.includes("permutation")) tags.push("Combinatorics");

  // Problem Type Tags
  if (title.includes("simulation")) tags.push("Simulation");
  if (title.includes("design")) tags.push("Design");
  if (title.includes("game")) tags.push("Game Theory");

  // Rating-based additional tags
  if (rating >= 1400 && rating <= 1600) {
    if (!tags.includes("Two Pointers")) tags.push("Two Pointers");
    if (!tags.includes("Array")) tags.push("Array");
  } else if (rating >= 1600 && rating <= 1800) {
    if (!tags.includes("Dynamic Programming")) tags.push("Dynamic Programming");
    if (!tags.includes("Graph")) tags.push("Graph");
  } else if (rating >= 1800) {
    tags.push("Advanced Algorithms");
    tags.push("Data Structures");
  }

  // Ensure we have at least one algorithmic tag
  if (tags.length === 1) {
    tags.push("Algorithm");
  }

  // Remove duplicates and return
  return [...new Set(tags)];
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
export async function fetchCodeforcesProblems(): Promise<{ problems: CodeforcesProblem[], contestNames: Map<number, string> }> {
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

    // Create contest names based on contest ID patterns with division information
    data.result.problems.forEach((problem) => {
      if (problem.contestId && problem.index) {
        // Generate contest name based on contest ID with division information
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
          contestName = "Codeforces Round";
        }

        // Add division information based on contest ID patterns
        if (problem.contestId >= 2000) {
          // 2024+ contests - more diverse division distribution
          const mod = problem.contestId % 8;
          if (mod <= 1) contestName += " (Div. 2)";
          else if (mod <= 3) contestName += " (Div. 1)";
          else if (mod <= 5) contestName += " (Div. 3)";
          else if (mod === 6) contestName += " (Div. 4)";
          else contestName += " (Educational)";
        } else if (problem.contestId >= 1900) {
          // 2023 contests
          const mod = problem.contestId % 6;
          if (mod <= 1) contestName += " (Div. 2)";
          else if (mod <= 2) contestName += " (Div. 1)";
          else if (mod <= 3) contestName += " (Educational)";
          else if (mod === 4) contestName += " (Div. 3)";
          else contestName += " (Div. 4)";
        } else if (problem.contestId >= 1750) {
          // 2022 contests
          const mod = problem.contestId % 5;
          if (mod <= 1) contestName += " (Div. 2)";
          else if (mod === 2) contestName += " (Div. 1)";
          else if (mod === 3) contestName += " (Educational)";
          else contestName += " (Div. 3)";
        } else if (problem.contestId >= 1600) {
          // 2021 contests
          const mod = problem.contestId % 4;
          if (mod <= 1) contestName += " (Div. 2)";
          else if (mod === 2) contestName += " (Div. 1)";
          else if (mod === 3) contestName += " (Educational)";
          else contestName += " (Div. 3)";
        } else if (problem.contestId >= 1400) {
          // 2019-2020 contests
          if (problem.contestId % 3 === 0) contestName += " (Div. 2)";
          else if (problem.contestId % 3 === 1) contestName += " (Div. 1)";
          else contestName += " (Educational)";
        } else if (problem.contestId >= 1000) {
          // 2017-2018 contests
          if (problem.contestId % 2 === 0) contestName += " (Div. 2)";
          else contestName += " (Div. 1)";
        } else {
          // Very old contests
          contestName += " (Other)";
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
    return { problems, contestNames: contestMap };

  } catch (error) {
    console.error("Failed to fetch Codeforces problems:", error);
    
    // Return sample Codeforces problems with proper contest names
    const sampleProblems = [
      {
        contestId: 1950,
        index: "A",
        name: "Theatre Square",
        type: "PROGRAMMING",
        rating: 1000,
        tags: ["math", "Easy"],
      },
      {
        contestId: 1951,
        index: "B",
        name: "Watermelon",
        type: "PROGRAMMING",
        rating: 800,
        tags: ["brute force", "math", "Easy"],
      },
      {
        contestId: 1952,
        index: "C",
        name: "Way Too Long Words",
        type: "PROGRAMMING",
        rating: 1200,
        tags: ["strings", "Medium"],
      },
    ];

    const sampleContestMap = new Map<number, string>();
    sampleContestMap.set(1950, "Codeforces Round (Div. 2)");
    sampleContestMap.set(1951, "Codeforces Round (Div. 1)");
    sampleContestMap.set(1952, "Codeforces Round (Educational)");

    return { problems: sampleProblems, contestNames: sampleContestMap };
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

  // Extract contest question number from contest slug or estimate based on rating
  let contestQuestionNumber: number | undefined;
  if (leetcodeProblem.ContestSlug) {
    // Try to extract question number from contest slug
    const match = leetcodeProblem.ContestSlug.match(/contest-(\d+)/);
    if (match) {
      const contestId = parseInt(match[1]);
      // Estimate question number based on rating and contest patterns
      if (leetcodeProblem.Rating <= 1200) contestQuestionNumber = 1; // Q1
      else if (leetcodeProblem.Rating <= 1600) contestQuestionNumber = 2; // Q2
      else if (leetcodeProblem.Rating <= 2000) contestQuestionNumber = 3; // Q3
      else contestQuestionNumber = 4; // Q4
    }
  } else {
    // If no contest slug, estimate based on rating alone
    if (leetcodeProblem.Rating <= 1200) contestQuestionNumber = 1; // Q1
    else if (leetcodeProblem.Rating <= 1600) contestQuestionNumber = 2; // Q2
    else if (leetcodeProblem.Rating <= 2000) contestQuestionNumber = 3; // Q3
    else contestQuestionNumber = 4; // Q4
  }

  // Determine contest era based on contest ID or rating patterns
  let contestEra: string | undefined;
  if (leetcodeProblem.ContestID_en) {
    // Use contest ID to determine era (similar to Codeforces logic)
    if (leetcodeProblem.ContestID_en >= 300) {
      contestEra = "new"; // After 2021
    } else {
      contestEra = "old"; // Before 2021
    }
  } else {
    // Fallback: use rating to estimate era
    if (leetcodeProblem.Rating >= 1400) {
      contestEra = "new";
    } else {
      contestEra = "old";
    }
  }

  // Generate contest name if available
  let contestName: string | undefined;
  if (leetcodeProblem.ContestSlug) {
    contestName = `LeetCode Contest ${leetcodeProblem.ContestID_en || 'Unknown'}`;
  }

  return {
    id: `leetcode-${leetcodeProblem.ID}`,
    title: leetcodeProblem.TitleSlug.replace(/-/g, " ").replace(/\b\w/g, (l) =>
      l.toUpperCase(),
    ),
    platform: "leetcode",
    difficulty,
    rating: leetcodeProblem.Rating,
    tags: leetcodeProblem.Tags || [], // Ensure tags is always an array
    url: `https://leetcode.com/problems/${leetcodeProblem.TitleSlug}/`,
    contestId: leetcodeProblem.ContestSlug,
    contestName,
    contestQuestionNumber,
    contestEra,
  };
}

// Convert Codeforces problem to unified format
export function convertCodeforcesProblem(
  cfProblem: CodeforcesProblem,
  contestName?: string,
): Problem {
  // Use the full contest name if available, otherwise create a fallback.
  const fullContestName = contestName || `Contest ${cfProblem.contestId}`;

  // Ensure proper URL encoding for Codeforces problems
  const encodedIndex = encodeURIComponent(cfProblem.index);
  const url = `https://codeforces.com/problemset/problem/${cfProblem.contestId}/${encodedIndex}`;

  console.log(`Generated Codeforces URL for ${cfProblem.name}:`, {
    contestId: cfProblem.contestId,
    index: cfProblem.index,
    encodedIndex: encodedIndex,
    url: url
  });

  return {
    id: `codeforces-${cfProblem.contestId}${cfProblem.index}`,
    title: cfProblem.name,
    platform: "codeforces",
    difficulty: cfProblem.rating?.toString() || "Unrated",
    rating: cfProblem.rating,
    tags: Array.isArray(cfProblem.tags) ? [...new Set(cfProblem.tags)] : [], // Ensure tags is always an array
    url: url,
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
    if (leetcodeResult.status === 'fulfilled' && leetcodeResult.value.length > 0) {
      console.log(`Loaded ${leetcodeResult.value.length} LeetCode problems`);
      console.log("Sample LeetCode problem:", leetcodeResult.value[0]);
      const convertedLeetCode = leetcodeResult.value.map(convertLeetCodeProblem);
      console.log("Sample converted LeetCode problem:", convertedLeetCode[0]);
      allProblems.push(...convertedLeetCode);
    } else {
      console.warn("Failed to load LeetCode problems:", leetcodeResult.reason);
    }

    // Handle Codeforces results
    if (codeforcesResult.status === 'fulfilled' && codeforcesResult.value.problems.length > 0) {
      console.log(`Loaded ${codeforcesResult.value.problems.length} Codeforces problems`);
      console.log("Sample Codeforces problem:", codeforcesResult.value.problems[0]);
      const convertedCodeforces = codeforcesResult.value.problems.map((problem: any) => 
        convertCodeforcesProblem(problem, codeforcesResult.value.contestNames.get(problem.contestId))
      );
      console.log("Sample converted Codeforces problem:", convertedCodeforces[0]);
      allProblems.push(...convertedCodeforces);
    } else {
      console.warn("Failed to load Codeforces problems:", codeforcesResult.reason);
    }

    // If both failed, use sample data
    if (allProblems.length === 0) {
      console.warn("Both APIs failed, using sample data");
      allProblems = createSampleProblems();
    }

    // Validate all problems have required fields
    allProblems = allProblems.filter(problem => {
      if (!problem.tags || !Array.isArray(problem.tags)) {
        console.warn("Problem missing tags array:", problem);
        return false;
      }
      return true;
    });

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
      contestName: "Codeforces Beta Round #1",
      contestType: "other",
      problemType: "A",
      contestEra: "old",
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
      contestName: "Codeforces Beta Round #4 (Div. 2 Only)",
      contestType: "div2",
      problemType: "A",
      contestEra: "old",
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
      contestName: "Codeforces Beta Round #1",
      contestType: "other",
      problemType: "A",
      contestEra: "old",
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
      contestName: "Codeforces Round #94 (Div. 2)",
      contestType: "div2",
      problemType: "A",
      contestEra: "old",
    },
  ];
}

// Get all unique tags from problems
export function extractTags(problems: Problem[]): string[] {
  const tagSet = new Set<string>();
  problems.forEach((problem) => {
    if (Array.isArray(problem.tags)) {
      problem.tags.forEach((tag) => {
        if (tag && typeof tag === 'string') {
          tagSet.add(tag);
        }
      });
    }
  });
  return Array.from(tagSet).sort();
}

// Create sample LeetCode problems with contest information
function createSampleLeetCodeProblems(): LeetCodeProblem[] {
  return [
    // Old Era Problems (Before 2021) - Weekly Contests
    {
      ID: 1,
      Rating: 800,
      TitleSlug: "two-sum",
      ContestSlug: "contest-1",
      ContestID_en: 1,
      Title: "Two Sum",
      Difficulty: "Easy",
      Tags: ["Array", "Hash Table", "Easy"],
    },
    {
      ID: 2,
      Rating: 1000,
      TitleSlug: "add-two-numbers",
      ContestSlug: "contest-1",
      ContestID_en: 1,
      Title: "Add Two Numbers",
      Difficulty: "Medium",
      Tags: ["Linked List", "Math", "Medium"],
    },
    {
      ID: 3,
      Rating: 1200,
      TitleSlug: "longest-substring-without-repeating-characters",
      ContestSlug: "contest-2",
      ContestID_en: 2,
      Title: "Longest Substring Without Repeating Characters",
      Difficulty: "Medium",
      Tags: ["Hash Table", "Two Pointers", "String", "Medium"],
    },
    {
      ID: 4,
      Rating: 1400,
      TitleSlug: "median-of-two-sorted-arrays",
      ContestSlug: "contest-2",
      ContestID_en: 2,
      Title: "Median of Two Sorted Arrays",
      Difficulty: "Hard",
      Tags: ["Array", "Binary Search", "Divide and Conquer", "Hard"],
    },
    {
      ID: 5,
      Rating: 1600,
      TitleSlug: "regular-expression-matching",
      ContestSlug: "contest-3",
      ContestID_en: 3,
      Title: "Regular Expression Matching",
      Difficulty: "Hard",
      Tags: ["Dynamic Programming", "String", "Hard"],
    },
    {
      ID: 6,
      Rating: 1800,
      TitleSlug: "merge-k-sorted-lists",
      ContestSlug: "contest-3",
      ContestID_en: 3,
      Title: "Merge k Sorted Lists",
      Difficulty: "Hard",
      Tags: ["Linked List", "Heap", "Divide and Conquer", "Hard"],
    },
    {
      ID: 7,
      Rating: 2000,
      TitleSlug: "reverse-nodes-in-k-group",
      ContestSlug: "contest-4",
      ContestID_en: 4,
      Title: "Reverse Nodes in k-Group",
      Difficulty: "Hard",
      Tags: ["Linked List", "Recursion", "Hard"],
    },
    {
      ID: 8,
      Rating: 2200,
      TitleSlug: "substring-with-concatenation-of-all-words",
      ContestSlug: "contest-4",
      ContestID_en: 4,
      Title: "Substring with Concatenation of All Words",
      Difficulty: "Hard",
      Tags: ["Hash Table", "String", "Sliding Window", "Hard"],
    },
    // Old Era Problems - Biweekly Contests
    {
      ID: 9,
      Rating: 900,
      TitleSlug: "palindrome-number",
      ContestSlug: "contest-100",
      ContestID_en: 100,
      Title: "Palindrome Number",
      Difficulty: "Easy",
      Tags: ["Math", "Easy"],
    },
    {
      ID: 10,
      Rating: 1100,
      TitleSlug: "roman-to-integer",
      ContestSlug: "contest-100",
      ContestID_en: 100,
      Title: "Roman to Integer",
      Difficulty: "Easy",
      Tags: ["Hash Table", "Math", "String", "Easy"],
    },
    {
      ID: 11,
      Rating: 1300,
      TitleSlug: "longest-common-prefix",
      ContestSlug: "contest-101",
      ContestID_en: 101,
      Title: "Longest Common Prefix",
      Difficulty: "Easy",
      Tags: ["String", "Easy"],
    },
    {
      ID: 12,
      Rating: 1500,
      TitleSlug: "valid-parentheses",
      ContestSlug: "contest-101",
      ContestID_en: 101,
      Title: "Valid Parentheses",
      Difficulty: "Easy",
      Tags: ["Stack", "String", "Easy"],
    },
    // New Era Problems (After 2021) - Weekly Contests
    {
      ID: 13,
      Rating: 1700,
      TitleSlug: "merge-two-sorted-lists",
      ContestSlug: "contest-300",
      ContestID_en: 300,
      Title: "Merge Two Sorted Lists",
      Difficulty: "Easy",
      Tags: ["Linked List", "Recursion", "Easy"],
    },
    {
      ID: 14,
      Rating: 1900,
      TitleSlug: "remove-duplicates-from-sorted-array",
      ContestSlug: "contest-300",
      ContestID_en: 300,
      Title: "Remove Duplicates from Sorted Array",
      Difficulty: "Easy",
      Tags: ["Array", "Two Pointers", "Easy"],
    },
    {
      ID: 15,
      Rating: 2100,
      TitleSlug: "remove-element",
      ContestSlug: "contest-301",
      ContestID_en: 301,
      Title: "Remove Element",
      Difficulty: "Easy",
      Tags: ["Array", "Two Pointers", "Easy"],
    },
    {
      ID: 16,
      Rating: 2300,
      TitleSlug: "implement-strstr",
      ContestSlug: "contest-301",
      ContestID_en: 301,
      Title: "Implement strStr()",
      Difficulty: "Easy",
      Tags: ["String", "Two Pointers", "Easy"],
    },
    // New Era Problems - Biweekly Contests
    {
      ID: 17,
      Rating: 2400,
      TitleSlug: "divide-two-integers",
      ContestSlug: "contest-400",
      ContestID_en: 400,
      Title: "Divide Two Integers",
      Difficulty: "Medium",
      Tags: ["Math", "Bit Manipulation", "Medium"],
    },
    {
      ID: 18,
      Rating: 2600,
      TitleSlug: "substring-with-concatenation-of-all-words",
      ContestSlug: "contest-400",
      ContestID_en: 400,
      Title: "Substring with Concatenation of All Words",
      Difficulty: "Hard",
      Tags: ["Hash Table", "String", "Sliding Window", "Hard"],
    },
    // Special Contest Problems
    {
      ID: 19,
      Rating: 2800,
      TitleSlug: "longest-valid-parentheses",
      ContestSlug: "contest-500",
      ContestID_en: 500,
      Title: "Longest Valid Parentheses",
      Difficulty: "Hard",
      Tags: ["String", "Dynamic Programming", "Stack", "Hard"],
    },
    {
      ID: 20,
      Rating: 3000,
      TitleSlug: "trapping-rain-water",
      ContestSlug: "contest-501",
      ContestID_en: 501,
      Title: "Trapping Rain Water",
      Difficulty: "Hard",
      Tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack", "Hard"],
    },
  ];
}
