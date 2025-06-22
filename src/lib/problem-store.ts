import { Problem, ProblemFilters, ProblemState } from "./types";
import { fetchAllProblems, extractTags } from "./api";

class ProblemStore {
  private state: ProblemState = {
    problems: [],
    filteredProblems: [],
    loading: false,
    error: null,
    filters: {
      platform: "all",
      difficulty: "all",
      searchQuery: "",
      tags: [],
      contestType: "all",
      problemType: "all",
      contestEra: "all",
    },
    selectedTags: [],
    availableTags: [],
    availableContestTypes: [],
    availableProblemTypes: [],
    availableContestEras: [],
  };

  private subscribers: Array<() => void> = [];

  constructor() {
    this.loadProblems();
  }

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((callback) => callback());
  }

  getState(): ProblemState {
    return { ...this.state };
  }

  async loadProblems() {
    this.state.loading = true;
    this.state.error = null;
    this.notify();

    try {
      console.log("Problem store: Starting to load problems...");
      const problems = await fetchAllProblems();

      if (problems.length === 0) {
        this.state.error =
          "No problems could be loaded. Please check your internet connection and try again.";
      } else {
        this.state.problems = problems;
        this.state.availableTags = extractTags(problems);
        this.state.availableContestTypes = extractContestTypes(problems);
        this.state.availableProblemTypes = extractProblemTypes(problems);
        this.state.availableContestEras = extractContestEras(problems);
        this.applyFilters();
        console.log(
          `Problem store: Successfully loaded ${problems.length} problems`,
        );
      }

      this.state.loading = false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load problems";
      console.error("Problem store error:", errorMessage);
      this.state.error = `${errorMessage}. Please refresh the page to try again.`;
      this.state.loading = false;
    }

    this.notify();
  }

  setFilters(filters: Partial<ProblemFilters>) {
    this.state.filters = { ...this.state.filters, ...filters };
    this.applyFilters();
    this.notify();
  }

  setSelectedTags(tags: string[]) {
    this.state.selectedTags = tags;
    this.state.filters.tags = tags;
    this.applyFilters();
    this.notify();
  }

  private applyFilters() {
    let filtered = [...this.state.problems];

    // Platform filter
    if (this.state.filters.platform && this.state.filters.platform !== "all") {
      filtered = filtered.filter(
        (p) => p.platform === this.state.filters.platform,
      );
    }

    // Search query filter
    if (this.state.filters.searchQuery) {
      const query = this.state.filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Rating filter
    if (this.state.filters.minRating !== undefined) {
      filtered = filtered.filter(
        (p) => p.rating && p.rating >= this.state.filters.minRating!,
      );
    }
    if (this.state.filters.maxRating !== undefined) {
      filtered = filtered.filter(
        (p) => p.rating && p.rating <= this.state.filters.maxRating!,
      );
    }

    // Difficulty filter (works for all platforms)
    if (
      this.state.filters.difficulty &&
      this.state.filters.difficulty !== "all"
    ) {
      filtered = filtered.filter((p) => {
        if (p.platform === "leetcode") {
          // For LeetCode, use the difficulty field directly
          return p.difficulty?.toString().toLowerCase() === this.state.filters.difficulty;
        } else if (p.platform === "codeforces") {
          // For Codeforces, use rating-based difficulty
          const difficultyRanges: Record<string, [number, number]> = {
            easy: [0, 1200],
            medium: [1200, 1800],
            hard: [1800, 3500],
          };
          const range = difficultyRanges[this.state.filters.difficulty];
          if (range && p.rating) {
            return p.rating >= range[0] && p.rating <= range[1];
          }
        }
        return false;
      });
    }

    // Tags filter
    if (this.state.filters.tags && this.state.filters.tags.length > 0) {
      filtered = filtered.filter((p) =>
        this.state.filters.tags!.every((tag) => p.tags.includes(tag)),
      );
    }

    // Contest type filter (Codeforces only)
    if (
      this.state.filters.contestType &&
      this.state.filters.contestType !== "all"
    ) {
      filtered = filtered.filter(
        (p) =>
          p.platform === "codeforces" &&
          p.contestType === this.state.filters.contestType,
      );
    }

    // Problem type filter (Codeforces only)
    if (
      this.state.filters.problemType &&
      this.state.filters.problemType !== "all"
    ) {
      filtered = filtered.filter(
        (p) =>
          p.platform === "codeforces" &&
          p.problemType === this.state.filters.problemType,
      );
    }

    // Contest era filter (Codeforces only)
    if (
      this.state.filters.contestEra &&
      this.state.filters.contestEra !== "all"
    ) {
      filtered = filtered.filter(
        (p) =>
          p.platform === "codeforces" &&
          p.contestEra === this.state.filters.contestEra,
      );
    }

    // LeetCode Q1-Q4 filter
    if (
      this.state.filters.questionNumber &&
      this.state.filters.questionNumber !== "all"
    ) {
      const qMap = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
      const targetQuestionNumber = qMap[this.state.filters.questionNumber as keyof typeof qMap];
      filtered = filtered.filter(
        (p) =>
          p.platform === "leetcode" &&
          p.contestQuestionNumber === targetQuestionNumber
      );
    }

    // Sort by difficulty: Easy -> Medium -> Hard
    filtered.sort((a, b) => {
      const getDifficultyValue = (problem: any) => {
        if (problem.platform === "leetcode") {
          const difficultyMap = { "Easy": 1, "Medium": 2, "Hard": 3 };
          return difficultyMap[problem.difficulty as keyof typeof difficultyMap] || 2;
        } else if (problem.platform === "codeforces") {
          // For Codeforces, use rating to determine difficulty
          if (!problem.rating) return 2;
          if (problem.rating < 1200) return 1; // Easy
          if (problem.rating < 1800) return 2; // Medium
          return 3; // Hard
        }
        return 2; // Default to Medium
      };

      return getDifficultyValue(a) - getDifficultyValue(b);
    });

    this.state.filteredProblems = filtered;
  }

  getStats() {
    const total = this.state.problems.length;
    const leetcode = this.state.problems.filter(
      (p) => p.platform === "leetcode",
    ).length;
    const codeforces = this.state.problems.filter(
      (p) => p.platform === "codeforces",
    ).length;
    const filtered = this.state.filteredProblems.length;

    return {
      total,
      leetcode,
      codeforces,
      filtered,
      loading: this.state.loading,
    };
  }
}

// Extract contest types from problems and group by division
function extractContestTypes(problems: Problem[]): string[] {
  const typeSet = new Set<string>();
  problems.forEach((problem) => {
    if (problem.platform === "codeforces" && problem.contestType) {
      typeSet.add(problem.contestType);
    }
  });
  return Array.from(typeSet).sort();
}

// Extract problem types from problems
function extractProblemTypes(problems: Problem[]): string[] {
  const typeSet = new Set<string>();
  problems.forEach((problem) => {
    if (problem.platform === "codeforces" && problem.problemType) {
      typeSet.add(problem.problemType);
    }
  });
  return Array.from(typeSet).sort();
}

// Extract contest eras from problems
function extractContestEras(problems: Problem[]): string[] {
  const eraSet = new Set<string>();
  problems.forEach((problem) => {
    if (problem.platform === "codeforces" && problem.contestEra) {
      eraSet.add(problem.contestEra);
    }
  });
  return Array.from(eraSet).sort();
}

export const problemStore = new ProblemStore();
