import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProblemCard } from "@/components/problem/ProblemCard";
import { ProblemFilters } from "@/components/problem/ProblemFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { problemStore } from "@/lib/problem-store";
import { Problem, ProblemState } from "@/lib/types";
import { isProblemSolved } from "@/lib/utils";
import {
  Code2,
  RefreshCw,
  TrendingUp,
  Filter,
  AlertCircle,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

const PROBLEMS_PER_PAGE = 20;

const Index = () => {
  const [state, setState] = useState<ProblemState>(problemStore.getState());
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const unsubscribe = problemStore.subscribe(() => {
      const newState = problemStore.getState();
      setState(newState);
    });

    // Preload problems immediately
    problemStore.preloadProblems();

    return unsubscribe;
  }, []);

  const stats = problemStore.getStats();

  const handleFiltersChange = (filters: any) => {
    problemStore.setFilters(filters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleTagsChange = (tags: string[]) => {
    problemStore.setSelectedTags(tags);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    problemStore.loadProblems();
  };

  // Pagination
  const totalPages = Math.ceil(
    state.filteredProblems.length / PROBLEMS_PER_PAGE,
  );
  const startIndex = (currentPage - 1) * PROBLEMS_PER_PAGE;
  const endIndex = startIndex + PROBLEMS_PER_PAGE;
  const currentProblems = state.filteredProblems.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        {/* Hero Section */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-code-500/10 to-primary/10 rounded-2xl" />
          <div className="relative bg-card/50 backdrop-blur-sm border rounded-2xl p-6 sm:p-8 md:p-12">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Problem Discovery Platform</span>
                  <span className="sm:hidden">Platform</span>
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                Discover{" "}
                <span className="gradient-text">Competitive Programming</span>{" "}
                Problems
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-3xl">
                Explore thousands of problems from LeetCode and Codeforces with
                advanced filtering, difficulty ratings, and comprehensive
                search. Find the perfect problems to enhance your coding skills.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={handleRefresh}
                  disabled={state.loading}
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${state.loading ? "animate-spin" : ""}`}
                  />
                  {state.loading ? "Loading..." : "Refresh Problems"}
                </Button>
                <Link to="/statistics">
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <TrendingUp className="h-5 w-5" />
                    View Statistics
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Problems
              </CardTitle>
              <Code2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  stats.total.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all platforms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                LeetCode
              </CardTitle>
              <Target className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  stats.leetcode.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                With difficulty ratings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Codeforces
              </CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  stats.codeforces.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                With tags and ratings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Filtered Results
              </CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.filtered.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Current filters applied
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Filters */}
        <ProblemFilters
          filters={state.filters}
          availableTags={state.availableTags}
          selectedTags={state.selectedTags}
          availableContestTypes={state.availableContestTypes}
          availableProblemTypes={state.availableProblemTypes}
          availableContestEras={state.availableContestEras}
          onFiltersChange={handleFiltersChange}
          onTagsChange={handleTagsChange}
          totalProblems={stats.total}
          filteredCount={stats.filtered}
        />

        {/* Problems List */}
        <section>
          {state.loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-48">
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : state.error ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : currentProblems.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No problems found matching your filters. Try adjusting your search criteria.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentProblems.map((problem) => (
                  <ProblemCard 
                    key={problem.id} 
                    problem={problem} 
                    isSolved={isProblemSolved(
                      problem.id,
                      problem.platform,
                      state.filters.leetcodeHandle,
                      state.filters.codeforcesHandle
                    )}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default Index;
