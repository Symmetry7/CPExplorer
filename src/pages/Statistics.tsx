import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  fetchUserPerformance,
  UserPerformanceStats,
  CodeforcesSubmission,
  computeAdvancedCodeforcesStats,
} from "@/lib/user-api";
import { cn } from "@/lib/utils";
import {
  User,
  Trophy,
  TrendingUp,
  Code2,
  Target,
  Star,
  Award,
  BarChart3,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Sparkles,
  Activity,
  ExternalLink,
  TrendingDown,
  Medal,
  Crown,
  Flame,
  Brain,
  TargetIcon,
  Gauge,
  LineChart,
  PieChart,
  Tag,
  Eye,
  LayoutGrid,
  Dices,
} from "lucide-react";
import { format, formatDistanceToNow, subDays, startOfDay } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ArcElement,
  Filler,
} from "chart.js";
import { Radar, Line, Doughnut, Bar, Pie } from "react-chartjs-2";
import { SiLeetcode, SiCodeforces } from "react-icons/si";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ArcElement,
  Filler
);

const Statistics = () => {
  const [leetcodeHandle, setLeetcodeHandle] = useState("");
  const [codeforcesHandle, setCodeforcesHandle] = useState("");
  const [stats, setStats] = useState<UserPerformanceStats>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!leetcodeHandle && !codeforcesHandle) {
      setError("Please enter at least one handle");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchUserPerformance(
        leetcodeHandle || undefined,
        codeforcesHandle || undefined,
      );

      if (!result.leetcode && !result.codeforces) {
        setError("No data found for the provided handles");
        return;
      }

      setStats(result);
    } catch (error) {
      setError("Failed to fetch data. Please check the handles and try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      newbie: "text-gray-600",
      pupil: "text-green-600",
      specialist: "text-cyan-600",
      expert: "text-blue-600",
      "candidate master": "text-purple-600",
      master: "text-orange-600",
      "international master": "text-orange-600",
      grandmaster: "text-red-600",
      "international grandmaster": "text-red-600",
      "legendary grandmaster": "text-red-600",
    };
    return colors[rank?.toLowerCase()] || "text-gray-600";
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "OK":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "WRONG_ANSWER":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "TIME_LIMIT_EXCEEDED":
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Chart data preparation
  const radarData = useMemo(() => {
    if (!stats.leetcode && !stats.codeforces) return null;

    const datasets = [];
    
    if (stats.leetcode) {
      const leetcodeData = {
        label: 'LeetCode',
        data: [
          stats.leetcode.stats.easySolved,
          stats.leetcode.stats.mediumSolved,
          stats.leetcode.stats.hardSolved,
          stats.leetcode.stats.acceptanceRate,
          stats.leetcode.stats.ranking / 1000, // Normalize ranking
          stats.leetcode.stats.reputation / 100, // Normalize reputation
        ],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
      };
      datasets.push(leetcodeData);
    }

    if (stats.codeforces) {
      const codeforcesData = {
        label: 'Codeforces',
        data: [
          stats.codeforces.problemsSolved?.byProblemType?.A || 0,
          stats.codeforces.problemsSolved?.byProblemType?.B || 0,
          stats.codeforces.problemsSolved?.byProblemType?.C || 0,
          (stats.codeforces.user.rating / 3000) * 100, // Normalize rating
          stats.codeforces.problemsSolved?.total || 0,
          stats.codeforces.user.contribution,
        ],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderWidth: 2,
      };
      datasets.push(codeforcesData);
    }

    return {
      labels: ['Easy Problems', 'Medium Problems', 'Hard Problems', 'Performance', 'Ranking', 'Contribution'],
      datasets,
    };
  }, [stats]);

  const difficultyDistributionData = useMemo(() => {
    if (!stats.leetcode) return null;

    return {
      labels: ['Easy', 'Medium', 'Hard'],
      datasets: [
        {
          data: [
            stats.leetcode.stats.easySolved,
            stats.leetcode.stats.mediumSolved,
            stats.leetcode.stats.hardSolved,
          ],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(234, 179, 8, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(234, 179, 8)',
            'rgb(239, 68, 68)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [stats.leetcode]);

  const ratingProgressData = useMemo(() => {
    if (!stats.codeforces?.submissions) return null;

    const submissions = stats.codeforces.submissions.slice(-20); // Last 20 submissions
    const labels = submissions.map((_, index) => `#${index + 1}`);
    const ratings = submissions.map(sub => sub.problem.rating || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Problem Rating',
          data: ratings,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [stats.codeforces]);

  const problemTypeData = useMemo(() => {
    if (!stats.codeforces?.problemsSolved?.byProblemType) return null;

    try {
      const problemTypes = Object.entries(stats.codeforces.problemsSolved.byProblemType);
      
      if (problemTypes.length === 0) return null;
      
      return {
        labels: problemTypes.map(([type]) => `Problem ${type}`),
        datasets: [
          {
            label: 'Problems Solved',
            data: problemTypes.map(([, count]) => count),
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
          },
        ],
      };
    } catch (error) {
      console.error('Error preparing problem type data:', error);
      return null;
    }
  }, [stats.codeforces]);

  // Topic coverage pie chart data
  const topicCoverageData = useMemo(() => {
    if (!stats.codeforces?.submissions) return null;

    try {
      const topicCounts: Record<string, number> = {};
      
      stats.codeforces.submissions.forEach(submission => {
        if (submission.verdict === 'OK' && submission.problem?.tags) {
          submission.problem.tags.forEach(tag => {
            topicCounts[tag] = (topicCounts[tag] || 0) + 1;
          });
        }
      });

      const sortedTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10 topics

      if (sortedTopics.length === 0) return null;

      const colors = [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 205, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(199, 199, 199, 0.8)',
        'rgba(83, 102, 255, 0.8)',
        'rgba(255, 99, 71, 0.8)',
        'rgba(50, 205, 50, 0.8)',
      ];

      return {
        labels: sortedTopics.map(([topic]) => topic),
        datasets: [
          {
            data: sortedTopics.map(([, count]) => count),
            backgroundColor: colors.slice(0, sortedTopics.length),
            borderColor: colors.slice(0, sortedTopics.length).map(color => color.replace('0.8', '1')),
            borderWidth: 2,
          },
        ],
      };
    } catch (error) {
      console.error('Error preparing topic coverage data:', error);
      return null;
    }
  }, [stats.codeforces]);

  // Compute advanced stats for user
  const userAdvancedStats = stats.codeforces && computeAdvancedCodeforcesStats(
    stats.codeforces.user,
    stats.codeforces.submissions,
    stats.codeforces.contests
  );

  // Bar chart data for Codeforces comparison
  const codeforcesComparisonData = useMemo(() => {
    if (!stats.codeforces) return null;

    return {
      labels: ['Rating', 'Max Rating', 'Problems Solved', 'Contests', 'Avg Attempts', 'Solved with 1 Sub'],
      datasets: [
        {
          label: 'You',
          data: [
            stats.codeforces.user.rating,
            stats.codeforces.user.maxRating,
            stats.codeforces.problemsSolved.total,
            userAdvancedStats?.totalContests || 0,
            userAdvancedStats?.avgAttempts || 0,
            userAdvancedStats?.solvedWithOneSubmission || 0,
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
      ],
    };
  }, [stats.codeforces, userAdvancedStats]);

  // Bar chart data for LeetCode comparison
  const leetcodeComparisonData = useMemo(() => {
    if (!stats.leetcode) return null;

    return {
      labels: ['Total Solved', 'Easy', 'Medium', 'Hard', 'Acceptance Rate', 'Ranking'],
      datasets: [
        {
          label: 'You',
          data: [
            stats.leetcode.stats.totalSolved,
            stats.leetcode.stats.easySolved,
            stats.leetcode.stats.mediumSolved,
            stats.leetcode.stats.hardSolved,
            stats.leetcode.stats.acceptanceRate,
            stats.leetcode.stats.ranking,
          ],
          backgroundColor: 'rgba(255, 140, 0, 0.8)',
          borderColor: 'rgb(255, 140, 0)',
          borderWidth: 1,
        },
      ],
    };
  }, [stats.leetcode]);

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
                  <BarChart3 className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Performance Analytics</span>
                  <span className="sm:hidden">Analytics</span>
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                Track Your{" "}
                <span className="gradient-text">Competitive Programming</span>{" "}
                Progress
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-3xl">
                Analyze your performance across LeetCode and Codeforces with detailed
                statistics, charts, and insights. Monitor your progress and identify
                areas for improvement.
              </p>
            </div>
          </div>
        </section>

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search User Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leetcode-handle">LeetCode Handle</Label>
                <div className="flex items-center gap-2">
                  <SiLeetcode className="h-5 w-5 text-orange-500" />
                  <Input
                    id="leetcode-handle"
                    placeholder="Enter LeetCode username"
                    value={leetcodeHandle}
                    onChange={(e) => setLeetcodeHandle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="codeforces-handle">Codeforces Handle</Label>
                <div className="flex items-center gap-2">
                  <SiCodeforces className="h-5 w-5 text-blue-500" />
                  <Input
                    id="codeforces-handle"
                    placeholder="Enter Codeforces handle"
                    value={codeforcesHandle}
                    onChange={(e) => setCodeforcesHandle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || (!leetcodeHandle && !codeforcesHandle)}
              className="w-full sm:w-auto"
            >
              {loading ? "Loading..." : "Search Performance"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {Object.keys(stats).length > 0 && (
          <div className="space-y-6 sm:space-y-8">
            {/* Radar Chart */}
            {radarData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 md:h-96">
                    <Radar
                      data={radarData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          },
                          title: {
                            display: false,
                          },
                        },
                        scales: {
                          r: {
                            beginAtZero: true,
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Platform-specific stats */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {stats.leetcode && <TabsTrigger value="leetcode">LeetCode</TabsTrigger>}
                {stats.codeforces && <TabsTrigger value="codeforces">Codeforces</TabsTrigger>}
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.leetcode && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">LeetCode Rank</CardTitle>
                        <SiLeetcode className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          #{stats.leetcode.stats.ranking.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Global ranking
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {stats.codeforces && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Codeforces Rating</CardTitle>
                        <SiCodeforces className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {stats.codeforces.user.rating}
                        </div>
                        <p className={cn("text-xs", getRankColor(stats.codeforces.user.rank))}>
                          {stats.codeforces.user.rank}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {stats.leetcode && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {stats.leetcode.stats.acceptanceRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Problem success rate
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* LeetCode Detailed Tab */}
              <TabsContent value="leetcode" className="space-y-6">
                {stats.leetcode && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="h-5 w-5" />
                          Difficulty Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {difficultyDistributionData && (
                          <div className="h-64">
                            <Doughnut
                              data={difficultyDistributionData}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'bottom' as const,
                                  },
                                },
                              }}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Problem Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded" />
                              Easy
                            </span>
                            <span>
                              {stats.leetcode.stats.easySolved} /{" "}
                              {Math.round(
                                stats.leetcode.stats.totalQuestions * 0.3,
                              )}
                            </span>
                          </div>
                          <Progress
                            value={
                              (stats.leetcode.stats.easySolved /
                                Math.round(
                                  stats.leetcode.stats.totalQuestions * 0.3,
                                )) *
                              100
                            }
                            className="h-2"
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-yellow-500 rounded" />
                              Medium
                            </span>
                            <span>
                              {stats.leetcode.stats.mediumSolved} /{" "}
                              {Math.round(
                                stats.leetcode.stats.totalQuestions * 0.5,
                              )}
                            </span>
                          </div>
                          <Progress
                            value={
                              (stats.leetcode.stats.mediumSolved /
                                Math.round(
                                  stats.leetcode.stats.totalQuestions * 0.5,
                                )) *
                              100
                            }
                            className="h-2"
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded" />
                              Hard
                            </span>
                            <span>
                              {stats.leetcode.stats.hardSolved} /{" "}
                              {Math.round(
                                stats.leetcode.stats.totalQuestions * 0.2,
                              )}
                            </span>
                          </div>
                          <Progress
                            value={
                              (stats.leetcode.stats.hardSolved /
                                Math.round(
                                  stats.leetcode.stats.totalQuestions * 0.2,
                                )) *
                              100
                            }
                            className="h-2"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>Profile Stats</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              #{stats.leetcode.stats.ranking.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Global Ranking</div>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {stats.leetcode.stats.reputation}
                            </div>
                            <div className="text-sm text-muted-foreground">Reputation</div>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {stats.leetcode.stats.contributionPoints}
                            </div>
                            <div className="text-sm text-muted-foreground">Contribution</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Codeforces Detailed Tab */}
              <TabsContent value="codeforces" className="space-y-6">
                {stats.codeforces && (
                  <>
                    {/* User Profile */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Profile Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {stats.codeforces.user?.rating || 0}
                            </div>
                            <div
                              className={cn(
                                "text-sm font-medium",
                                getRankColor(stats.codeforces.user?.rank || ''),
                              )}
                            >
                              {stats.codeforces.user?.rank || 'Unknown'}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                              {stats.codeforces.user?.maxRating || 0}
                            </div>
                            <div
                              className={cn(
                                "text-sm font-medium",
                                getRankColor(stats.codeforces.user?.maxRank || ''),
                              )}
                            >
                              {stats.codeforces.user?.maxRank || 'Unknown'} (Max)
                            </div>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {stats.codeforces.problemsSolved?.total || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Problems Solved
                            </div>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {stats.codeforces.user?.contribution || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Contribution
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Advanced Stats Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Advanced Stats</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{userAdvancedStats?.totalContests ?? '-'}</div>
                            <div className="text-xs text-muted-foreground">Contests Participated</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{userAdvancedStats?.avgAttempts ?? '-'}</div>
                            <div className="text-xs text-muted-foreground">Avg Attempts/Problem</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{userAdvancedStats?.maxAttempts ?? '-'}</div>
                            <div className="text-xs text-muted-foreground">Max Attempts</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{userAdvancedStats?.solvedWithOneSubmission ?? '-'}</div>
                            <div className="text-xs text-muted-foreground">Solved with 1 Submission</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{userAdvancedStats?.maxACs ?? '-'}</div>
                            <div className="text-xs text-muted-foreground">Max ACs on a Problem</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Comparison Tab */}
              <TabsContent value="comparison" className="space-y-6">
                {stats.leetcode && stats.codeforces && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Gauge className="h-5 w-5" />
                          Platform Comparison
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-semibold mb-4 flex items-center gap-2">
                              <div className="w-4 h-4 bg-orange-500 rounded" />
                              LeetCode
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                                <span className="text-sm">Total Solved:</span>
                                <span className="font-semibold text-orange-600">
                                  {stats.leetcode.stats.totalSolved}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                                <span className="text-sm">Acceptance Rate:</span>
                                <span className="font-semibold text-orange-600">
                                  {stats.leetcode.stats.acceptanceRate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                                <span className="text-sm">Global Ranking:</span>
                                <span className="font-semibold text-orange-600">
                                  #{stats.leetcode.stats.ranking.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-4 flex items-center gap-2">
                              <div className="w-4 h-4 bg-blue-500 rounded" />
                              Codeforces
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                                <span className="text-sm">Problems Solved:</span>
                                <span className="font-semibold text-blue-600">
                                  {stats.codeforces.problemsSolved.total}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                                <span className="text-sm">Current Rating:</span>
                                <span className="font-semibold text-blue-600">
                                  {stats.codeforces.user.rating}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                                <span className="text-sm">Max Rating:</span>
                                <span className="font-semibold text-blue-600">
                                  {stats.codeforces.user.maxRating}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Performance Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-800 dark:text-green-200">Strengths</span>
                          </div>
                          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                            <li>• Strong problem-solving consistency</li>
                            <li>• Good algorithmic thinking</li>
                            <li>• Effective time management</li>
                          </ul>
                        </div>
                        
                        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-orange-600" />
                            <span className="font-semibold text-orange-800 dark:text-orange-200">Areas to Improve</span>
                          </div>
                          <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                            <li>• Advanced data structures</li>
                            <li>• Dynamic programming</li>
                            <li>• Graph algorithms</li>
                          </ul>
                        </div>

                        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-800 dark:text-blue-200">Recommendations</span>
                          </div>
                          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>• Practice more hard problems</li>
                            <li>• Participate in contests regularly</li>
                            <li>• Review failed submissions</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Training Gym Tab */}
              <TabsContent value="gym">
                <div className="text-center py-12">
                  <Dices className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Training Gym Moved</h3>
                  <p className="text-muted-foreground mb-4">
                    The Training Gym is now available as a dedicated page.
                  </p>
                  <Button asChild>
                    <a href="/training">Go to Training Gym</a>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Statistics;
