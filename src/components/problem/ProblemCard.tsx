import { Problem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExternalLink, Star, Users, Trophy, CheckCircle } from "lucide-react";

interface ProblemCardProps {
  problem: Problem;
  className?: string;
  hideRating?: boolean;
  contestMode?: boolean;
  isSolved?: boolean;
}

export function ProblemCard({ problem, className, hideRating = false, contestMode = false, isSolved = false }: ProblemCardProps) {
  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "leetcode":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
      case "codeforces":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  const getDifficultyColor = (
    platform: string,
    difficulty?: string | number,
  ) => {
    if (platform === "leetcode") {
      switch (difficulty) {
        case "Easy":
          return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
        case "Medium":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
        case "Hard":
          return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
      }
    } else if (platform === "codeforces" && typeof difficulty === "string") {
      const rating = parseInt(difficulty);
      if (rating < 1200)
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      if (rating < 1600)
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      if (rating < 1900)
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
      if (rating < 2200)
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
  };

  const formatRating = (rating?: number) => {
    if (!rating) return "Unrated";
    return rating.toString();
  };

  const formatSolvedCount = (count?: number) => {
    if (!count) return "0";
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all duration-200",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium",
                  getPlatformColor(problem.platform),
                )}
              >
                {problem.platform === "leetcode" ? "LeetCode" : "Codeforces"}
              </Badge>
              {isSolved && (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 text-xs gap-1"
                >
                  <CheckCircle className="h-3 w-3" />
                  Solved
                </Badge>
              )}
              {!hideRating && !contestMode && (
                <>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      getDifficultyColor(problem.platform, problem.difficulty),
                    )}
                  >
                    {problem.difficulty}
                  </Badge>
                  {problem.rating && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Star className="h-3 w-3" />
                      {formatRating(problem.rating)}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <h3 className="font-semibold leading-tight mb-2 group-hover:text-primary transition-colors text-sm sm:text-base">
              {problem.title}
            </h3>
          </div>
        </div>
      </CardHeader>

      {!contestMode && (
        <CardContent className="space-y-4">
          {/* Tags */}
          {problem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {[...new Set(problem.tags)].slice(0, 3).map((tag, index) => (
                <Badge
                  key={`${problem.id}-tag-${index}-${tag}`}
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
              {[...new Set(problem.tags)].length > 3 && (
                <Badge
                  key={`${problem.id}-more-tags`}
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  +{[...new Set(problem.tags)].length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              {problem.contestType && problem.platform === 'codeforces' && (
                <div className="flex items-center gap-1" title={problem.contestType}>
                  <Trophy className="h-4 w-4" />
                  <span className="truncate max-w-[120px] sm:max-w-[150px]">{problem.contestType}</span>
                </div>
              )}
              {problem.contestId && problem.platform === 'leetcode' && (
                  <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span>{problem.contestId}</span>
                </div>
              )}
              {problem.solvedCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{formatSolvedCount(problem.solvedCount)}</span>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-full sm:w-auto"
              asChild
            >
              <a 
                href={problem.url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => {
                  console.log(`Opening ${problem.platform} problem:`, {
                    title: problem.title,
                    url: problem.url,
                    platform: problem.platform
                  });
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Solve
              </a>
            </Button>
          </div>
        </CardContent>
      )}

      {contestMode && (
        <CardContent className="pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 w-full justify-center"
            asChild
          >
            <a 
              href={problem.url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => {
                console.log(`Opening ${problem.platform} problem (contest mode):`, {
                  title: problem.title,
                  url: problem.url,
                  platform: problem.platform
                });
              }}
            >
              <ExternalLink className="h-4 w-4" />
              Open Problem
            </a>
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
