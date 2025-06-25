import { useState, useEffect } from "react";
import { problemStore } from "@/lib/problem-store";
import { trainingLevels } from "@/lib/training-levels";
import { Problem } from "@/lib/types";
import { isProblemSolved } from "@/lib/utils";
import { checkLeetCodeSubmission, checkCodeforcesSubmission, getProblemIdentifier } from "@/lib/user-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProblemCard } from "@/components/problem/ProblemCard";
import { Dices, Zap, Timer, Play, Pause, StopCircle, Eye, EyeOff, ExternalLink, Info, Code2, Target, BookOpen, Sparkles, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";

function getRandomElement<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

const TOTAL_TIME = 2 * 60 * 60; // 2 hours in seconds

// Corrected LeetCode training levels based on the image
const leetcodeTrainingLevels = [
  { level: 1, questions: ["Easy", "Easy", "Easy", "Easy"], text: "Q1, Q1, Q1, Q1" },
  { level: 2, questions: ["Easy", "Easy", "Medium", "Medium"], text: "Q1, Q1, Q2, Q2" },
  { level: 3, questions: ["Easy", "Medium", "Medium", "Medium"], text: "Q1, Q2, Q2, Q2" },
  { level: 4, questions: ["Easy", "Medium", "Medium", "Hard"], text: "Q1, Q2, Q2, Q3" },
  { level: 5, questions: ["Easy", "Medium", "Hard", "Hard"], text: "Q1, Q2, Q3, Q4" },
  { level: 6, questions: ["Easy", "Medium", "Hard", "Hard"], text: "Q1, Q2, Q3, Q4" },
  { level: 7, questions: ["Medium", "Medium", "Hard", "Hard"], text: "Q2, Q2, Q3, Q4" },
  { level: 8, questions: ["Hard", "Hard", "Hard", "Hard"], text: "Q3, Q3, Q4, Q4" },
  { level: 9, questions: ["Hard", "Hard", "Hard", "Hard"], text: "Q3, Q4, Q4, Q4" },
  { level: 10, questions: ["Hard", "Hard", "Hard", "Hard"], text: "Q4, Q4, Q4, Q4" },
];

export function TrainingGymPage() {
  const [platform, setPlatform] = useState<"codeforces" | "leetcode">("codeforces");
  const [level, setLevel] = useState<number>(1);
  const [generatedProblems, setGeneratedProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // New state for scoring system
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [isCheckingSubmission, setIsCheckingSubmission] = useState<string | null>(null);
  const [leetcodeHandle, setLeetcodeHandle] = useState("");
  const [codeforcesHandle, setCodeforcesHandle] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && !isTimerPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsTimerRunning(false);
      toast.info("Time's up! The training session has ended.");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isTimerPaused, timeRemaining]);
  
  const handlePlatformChange = (newPlatform: "codeforces" | "leetcode") => {
    setPlatform(newPlatform);
    setLevel(1); // Reset level on platform change
    setGeneratedProblems([]); // Clear problems
    setSolvedProblems(new Set());
    setScore(0);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleGenerateProblems = () => {
    setIsLoading(true);
    setGeneratedProblems([]);

    const allProblems = problemStore.getState().problems;
    const newProblems: Problem[] = [];
    const usedProblemIds = new Set<string>();

    if (platform === "codeforces") {
      const selectedLevelData = trainingLevels.find((l) => l.level === level);
      if (!selectedLevelData) {
        toast.error("Invalid level selected.");
        setIsLoading(false);
        return;
      }

      const cfProblems = allProblems.filter((p) => p.platform === "codeforces" && p.rating);
      const targetRatings = [selectedLevelData.p1, selectedLevelData.p2, selectedLevelData.p3, selectedLevelData.p4];

      for (const rating of targetRatings) {
        let potentialProblems = cfProblems.filter((p) => !usedProblemIds.has(p.id) && p.rating === rating);
        if (potentialProblems.length === 0) {
          potentialProblems = cfProblems.filter((p) => !usedProblemIds.has(p.id) && p.rating && Math.abs(p.rating - rating) <= 50);
        }
        const randomProblem = getRandomElement(potentialProblems);
        if (randomProblem) {
          newProblems.push(randomProblem);
          usedProblemIds.add(randomProblem.id);
        } else {
          toast.warning(`Could not find a suitable problem for rating ~${rating}.`);
        }
      }
    } else {
      const selectedLevelData = leetcodeTrainingLevels.find((l) => l.level === level);
      if (!selectedLevelData) {
        toast.error("Invalid level selected.");
        setIsLoading(false);
        return;
      }

      const lcProblems = allProblems.filter((p) => p.platform === "leetcode" && p.difficulty);
      const targetDifficulties = selectedLevelData.questions;

      for (const difficulty of targetDifficulties) {
        const potentialProblems = lcProblems.filter((p) => !usedProblemIds.has(p.id) && p.difficulty?.toLowerCase() === difficulty.toLowerCase());
        const randomProblem = getRandomElement(potentialProblems);
        if (randomProblem) {
          newProblems.push(randomProblem);
          usedProblemIds.add(randomProblem.id);
        } else {
          toast.warning(`Could not find a suitable problem for difficulty ${difficulty}.`);
        }
      }
    }

    if (newProblems.length < 4) {
      toast.error("Could not generate a full set of 4 problems. The problem database may be too small.");
    }

    setGeneratedProblems(newProblems);
    setIsLoading(false);
    setShowDetails(false);
    setTimeRemaining(TOTAL_TIME);
    setIsTimerRunning(true);
    setIsTimerPaused(false);
    setSolvedProblems(new Set());
    setScore(0);

    if (newProblems.length > 0) {
      toast.success(`Generated a new set of ${newProblems.length} problems for ${platform === "codeforces" ? "Codeforces" : "LeetCode"} Level ${level}! Timer started.`);
    }
  };

  const handleTimerToggle = () => {
    if (generatedProblems.length === 0) {
        toast.error("Generate a problem set first to start the timer.");
        return;
    }
    setIsTimerPaused(!isTimerPaused);
    toast.info(isTimerPaused ? "Timer resumed." : "Timer paused.");
  };

  const handleTimerStop = () => {
    setIsTimerRunning(false);
    setTimeRemaining(TOTAL_TIME);
    setGeneratedProblems([]);
    setSolvedProblems(new Set());
    setScore(0);
    toast.warning("Training session stopped and reset.");
  };

  const handleSolveProblem = async (problem: Problem) => {
    if (solvedProblems.has(problem.id)) {
      toast.info("This problem has already been marked as solved!");
      return;
    }

    const currentHandle = problem.platform === "leetcode" ? leetcodeHandle : codeforcesHandle;
    if (!currentHandle) {
      toast.error(`Please enter your ${problem.platform === "leetcode" ? "LeetCode username" : "Codeforces handle"} to verify solutions.`);
      return;
    }

    setIsCheckingSubmission(problem.id);

    try {
      let isSolved = false;
      const identifier = getProblemIdentifier(problem);

      if (problem.platform === "leetcode" && identifier.titleSlug) {
        isSolved = await checkLeetCodeSubmission(identifier.titleSlug, currentHandle);
      } else if (problem.platform === "codeforces" && identifier.contestId && identifier.problemIndex) {
        isSolved = await checkCodeforcesSubmission(identifier.contestId, identifier.problemIndex, currentHandle);
      }

      if (isSolved) {
        setSolvedProblems(prev => new Set([...prev, problem.id]));
        setScore(prev => prev + 100);
        toast.success(`🎉 Problem solved! +100 points! Total: ${score + 100}/400`);
        
        // Check if all problems are solved
        if (solvedProblems.size + 1 === generatedProblems.length) {
          toast.success("🏆 Congratulations! You've solved all problems in this set!");
        }
      } else {
        toast.error("No recent successful submission found for this problem. Make sure you've solved it recently!");
      }
    } catch (error) {
      toast.error("Error checking submission. Please try again.");
    } finally {
      setIsCheckingSubmission(null);
    }
  };

  const renderProblemDetails = (problem: Problem) => {
    if (!showDetails) return null;
    
    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Problem Details</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">
              {platform === "codeforces" ? "Rating: " : "Difficulty: "}
            </span>
            <Badge variant="secondary" className="ml-1">
              {platform === "codeforces" ? (problem.rating || "N/A") : (problem.difficulty || "N/A")}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Solved: </span>
            <span className="font-medium">
              {problem.solvedCount ? problem.solvedCount.toLocaleString() : "N/A"}
            </span>
          </div>
          <div className="sm:col-span-1">
            <span className="text-muted-foreground">Contest: </span>
            <span className="font-medium text-xs">
              {problem.contestName || problem.contestType || "N/A"}
            </span>
          </div>
        </div>
        
        {/* Tags Section */}
        {problem.tags && problem.tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Topics:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {problem.tags.map((tag, index) => (
                <Badge
                  key={`${problem.id}-detail-tag-${index}-${tag}`}
                  variant="outline"
                  className="text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Solve Button */}
        <div className="pt-3 border-t">
          {solvedProblems.has(problem.id) ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Solved! +100 points</span>
            </div>
          ) : (
            <Button
              onClick={() => handleSolveProblem(problem)}
              disabled={isCheckingSubmission === problem.id}
              className="w-full"
              size="sm"
            >
              {isCheckingSubmission === problem.id ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Solved (+100 pts)
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const getCurrentLevels = () => {
    return platform === "codeforces" ? trainingLevels : leetcodeTrainingLevels;
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
                  <Dices className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Skill Enhancement Zone</span>
                  <span className="sm:hidden">Training Zone</span>
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                The <span className="gradient-text">Training Gym</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-3xl">
                Sharpen your competitive programming skills. Select a platform and level to generate a timed problem set. Good luck!
              </p>
            </div>
          </div>
        </section>

        {/* Controls and Timer Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Controls */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Start a New Session</CardTitle>
                <CardDescription>
                  Choose your platform and difficulty level, then generate your problem set.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">1. Select Platform</label>
                  <Tabs
                    value={platform}
                    onValueChange={(value) => handlePlatformChange(value as "codeforces" | "leetcode")}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="codeforces">
                        <Zap className="h-4 w-4 mr-2" /> Codeforces
                      </TabsTrigger>
                      <TabsTrigger value="leetcode">
                        <Target className="h-4 w-4 mr-2" /> LeetCode
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">2. Select Level</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select
                      value={level.toString()}
                      onValueChange={(value) => setLevel(Number(value))}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a level" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCurrentLevels().map((l) => (
                          <SelectItem key={l.level} value={l.level.toString()}>
                            Level {l.level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {platform === "codeforces" && (
                       <a href="https://docs.google.com/spreadsheets/d/1gdD-syEpfy10Vz1f5UAm5eKiV_UAEdG-C4jrouN57bs/edit?gid=1667320122#gid=1667320122" target="_blank" rel="noopener noreferrer">
                         <Button variant="outline" className="h-full w-full sm:w-auto">
                           <ExternalLink className="h-4 w-4 mr-2" />
                           View Levels
                         </Button>
                       </a>
                    )}
                     {platform === "leetcode" && (
                       <Dialog>
                         <DialogTrigger asChild>
                           <Button variant="outline" className="w-full sm:w-auto">
                             <BookOpen className="h-4 w-4 mr-2" />
                             View Levels
                           </Button>
                         </DialogTrigger>
                         <DialogContent>
                           <DialogHeader>
                             <DialogTitle>LeetCode Training Levels</DialogTitle>
                             <DialogDescription>
                               Each level consists of 4 problems with a specific difficulty combination (Q1=Easy, Q2=Medium, Q3/Q4=Hard).
                             </DialogDescription>
                           </DialogHeader>
                           <div className="space-y-4 py-4">
                             {leetcodeTrainingLevels.map(l => (
                               <div key={l.level} className="flex items-center justify-between">
                                 <span className="font-bold">Level {l.level}</span>
                                 <Badge variant="secondary">{l.text}</Badge>
                               </div>
                             ))}
                           </div>
                         </DialogContent>
                       </Dialog>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">3. Enter Your Handles (Optional)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">LeetCode Username</label>
                      <Input
                        placeholder="Your LeetCode username"
                        value={leetcodeHandle}
                        onChange={(e) => setLeetcodeHandle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Codeforces Handle</label>
                      <Input
                        placeholder="Your Codeforces handle"
                        value={codeforcesHandle}
                        onChange={(e) => setCodeforcesHandle(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add your handles to verify solved problems and earn points
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">4. Start Training</label>
                   <Button
                    onClick={handleGenerateProblems}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    {isLoading ? "Generating..." : `Generate & Start Timer`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timer */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Session Timer
                </CardTitle>
                <CardDescription>A 2-hour timer for your focused practice session.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col items-center justify-center">
                <div className="text-4xl sm:text-6xl font-bold tracking-tighter text-center my-4 font-mono bg-muted p-4 rounded-lg">
                  {formatTime(timeRemaining)}
                </div>
                
                {/* Score Display */}
                {generatedProblems.length > 0 && (
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-primary">
                      {score} / 400 pts
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {solvedProblems.size} of {generatedProblems.length} solved
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
                  <Button
                    onClick={handleTimerToggle}
                    disabled={!isTimerRunning}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {isTimerPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isTimerPaused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    onClick={handleTimerStop}
                    disabled={!isTimerRunning}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop & Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Generated Problems Section */}
        {generatedProblems.length > 0 && (
          <section>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-2xl font-bold">Your Problem Set</h2>
              <Button onClick={() => setShowDetails(!showDetails)} variant="outline">
                {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showDetails ? "Hide Details" : "Show Details"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedProblems.map((problem) => {
                const currentFilters = problemStore.getState().filters;
                return (
                  <div key={problem.id} className="bg-card border rounded-lg p-4">
                    <ProblemCard 
                      problem={problem} 
                      contestMode={true}
                      isSolved={isProblemSolved(
                        problem.id,
                        problem.platform,
                        currentFilters.leetcodeHandle,
                        currentFilters.codeforcesHandle
                      )}
                    />
                    {renderProblemDetails(problem)}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Placeholder for when no problems are generated */}
        {!isLoading && generatedProblems.length === 0 && (
          <section>
            <Alert className="border-dashed">
               <Zap className="h-4 w-4" />
              <AlertTitle>Ready to Train?</AlertTitle>
              <AlertDescription>
                Your personalized problem set will appear here once you generate it.
              </AlertDescription>
            </Alert>
          </section>
        )}
      </div>
    </Layout>
  );
} 

export default TrainingGymPage; 