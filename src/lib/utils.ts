import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple function to check if a problem is solved by the user
// This is a placeholder - in a real app, you'd fetch this data from APIs
export function isProblemSolved(
  problemId: string,
  platform: "leetcode" | "codeforces",
  leetcodeHandle?: string,
  codeforcesHandle?: string
): boolean {
  // For now, we'll use a simple hash-based approach to simulate solved status
  // In a real implementation, you'd fetch the user's solved problems from the respective APIs
  
  if (!leetcodeHandle && !codeforcesHandle) {
    return false;
  }

  if (platform === "leetcode" && leetcodeHandle) {
    // Simple hash-based simulation for LeetCode
    const hash = problemId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash) % 10 < 3; // 30% chance of being solved
  }

  if (platform === "codeforces" && codeforcesHandle) {
    // Simple hash-based simulation for Codeforces
    const hash = problemId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash) % 10 < 4; // 40% chance of being solved
  }

  return false;
}
