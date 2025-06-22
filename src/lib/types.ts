// LeetCode Problem Types
export interface LeetCodeProblem {
  ID: number;
  Rating: number;
  TitleSlug: string;
  ContestSlug: string;
  ContestID_en: number;
  Title?: string;
  Difficulty?: "Easy" | "Medium" | "Hard";
  Tags?: string[];
}

// Codeforces Problem Types
export interface CodeforcesProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  rating?: number;
  tags: string[];
  solvedCount?: number;
}

export interface CodeforcesResponse {
  status: "OK" | "FAILED";
  comment?: string;
  result: {
    problems: CodeforcesProblem[];
    problemStatistics: ProblemStatistics[];
  };
}

export interface ProblemStatistics {
  contestId: number;
  index: string;
  solvedCount: number;
}

// Unified Problem Interface
export interface Problem {
  id: string;
  title: string;
  platform: "leetcode" | "codeforces";
  difficulty?: string | number;
  rating?: number;
  tags: string[];
  url: string;
  solvedCount?: number;
  contestId?: string | number;
  // Codeforces specific
  contestType?: string;
  problemType?: string;
  contestEra?: string;
  // LeetCode specific
  contestQuestionNumber?: number; // 1, 2, 3, 4 for Q1, Q2, Q3, Q4
  contestName?: string; // For displaying the full contest name
}

// Filter Types
export interface ProblemFilters {
  platform?: "all" | "leetcode" | "codeforces";
  difficulty?: "all" | "easy" | "medium" | "hard" | string;
  minRating?: number;
  maxRating?: number;
  tags?: string[];
  searchQuery?: string;
  // Codeforces specific filters
  contestType?:
    | "all"
    | "div1"
    | "div2"
    | "div3"
    | "div4"
    | "educational"
    | "global"
    | "other";
  problemType?: "all" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
  contestEra?: "all" | "new" | "old";
  // LeetCode specific filter
  questionNumber?: "all" | "Q1" | "Q2" | "Q3" | "Q4";
}

// UI State Types
export interface ProblemState {
  problems: Problem[];
  filteredProblems: Problem[];
  loading: boolean;
  error: string | null;
  filters: ProblemFilters;
  selectedTags: string[];
  availableTags: string[];
  availableContestTypes: string[];
  availableProblemTypes: string[];
  availableContestEras: string[];
}
