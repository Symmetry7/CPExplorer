import { useState } from "react";
import { ProblemFilters as IFilters } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Search, Filter, X, Check, Settings, ChevronDown, Type, Hash } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProblemFiltersProps {
  filters: IFilters;
  selectedTags: string[];
  availableTags: string[];
  availableContestTypes: string[];
  availableProblemTypes: string[];
  availableContestEras: string[];
  onFiltersChange: (filters: Partial<IFilters>) => void;
  onTagsChange: (tags: string[]) => void;
  totalProblems: number;
  filteredCount: number;
}

export function ProblemFilters({
  filters,
  selectedTags,
  availableTags,
  availableContestTypes,
  availableProblemTypes,
  availableContestEras,
  onFiltersChange,
  onTagsChange,
  totalProblems,
  filteredCount,
}: ProblemFiltersProps) {
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [manualRatingMode, setManualRatingMode] = useState(false);
  const isMobile = useIsMobile();

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    onTagsChange(newTags);
  };

  const toggleRatingMode = () => {
    console.log('Toggling rating mode from:', manualRatingMode, 'to:', !manualRatingMode);
    setManualRatingMode(!manualRatingMode);
  };

  const clearFilters = () => {
    onFiltersChange({
      platform: "all",
      difficulty: "all",
      searchQuery: "",
      minRating: undefined,
      maxRating: undefined,
      contestType: "all",
      problemType: "all",
      contestEra: "all",
      questionNumber: "all",
      leetcodeHandle: "",
      codeforcesHandle: "",
    });
    onTagsChange([]);
  };

  const handleRatingChange = (field: 'minRating' | 'maxRating', value: string) => {
    if (manualRatingMode) {
      // Free text input - allow any number in the 800-4000 range
      const numValue = parseInt(value);
      if (value === '' || (numValue >= 800 && numValue <= 4000)) {
        onFiltersChange({
          [field]: value === '' ? undefined : numValue
        });
      }
    } else {
      // Step-based input - enforce steps and limits
      const numValue = parseInt(value);
      if (numValue < 800) {
        onFiltersChange({ [field]: 800 });
      } else if (numValue > 4000) {
        onFiltersChange({ [field]: 4000 });
      } else {
        onFiltersChange({
          [field]: value ? numValue : undefined,
        });
      }
    }
  };

  const hasActiveFilters =
    filters.platform !== "all" ||
    filters.difficulty !== "all" ||
    filters.searchQuery ||
    filters.minRating ||
    filters.maxRating ||
    filters.contestType !== "all" ||
    filters.problemType !== "all" ||
    filters.contestEra !== "all" ||
    filters.questionNumber !== "all" ||
    filters.leetcodeHandle ||
    filters.codeforcesHandle ||
    selectedTags.length > 0;

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search problems..."
            value={filters.searchQuery || ""}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Mobile: Stack filters vertically, Desktop: Horizontal layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          <Select
            value={filters.platform || "all"}
            onValueChange={(value) =>
              onFiltersChange({ platform: value as any })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="leetcode">LeetCode</SelectItem>
              <SelectItem value="codeforces">Codeforces</SelectItem>
            </SelectContent>
          </Select>

          {/* LeetCode Q1-Q4 Filter */}
          {filters.platform === "leetcode" && (
            <Select
              value={filters.questionNumber || "all"}
              onValueChange={(value) => onFiltersChange({ questionNumber: value as any })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Question Number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Questions</SelectItem>
                <SelectItem value="Q1">Q1</SelectItem>
                <SelectItem value="Q2">Q2</SelectItem>
                <SelectItem value="Q3">Q3</SelectItem>
                <SelectItem value="Q4">Q4</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Difficulty Filter - Only for LeetCode */}
          {filters.platform === "leetcode" && (
            <Select
              value={filters.difficulty || "all"}
              onValueChange={(value) => onFiltersChange({ difficulty: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Codeforces Contest Type Filter */}
          {(filters.platform === "codeforces" ||
            filters.platform === "all") && (
            <Select
              value={filters.contestType || "all"}
              onValueChange={(value) =>
                onFiltersChange({ contestType: value as any })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Contest Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contests</SelectItem>
                <SelectItem value="div1">Div. 1</SelectItem>
                <SelectItem value="div2">Div. 2</SelectItem>
                <SelectItem value="div3">Div. 3</SelectItem>
                <SelectItem value="div4">Div. 4</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Codeforces Problem Type Filter */}
          {(filters.platform === "codeforces" ||
            filters.platform === "all") && (
            <Select
              value={filters.problemType || "all"}
              onValueChange={(value) =>
                onFiltersChange({ problemType: value as any })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Problem Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="A">Problem A</SelectItem>
                <SelectItem value="B">Problem B</SelectItem>
                <SelectItem value="C">Problem C</SelectItem>
                <SelectItem value="D">Problem D</SelectItem>
                <SelectItem value="E">Problem E</SelectItem>
                <SelectItem value="F">Problem F</SelectItem>
                <SelectItem value="G">Problem G</SelectItem>
                <SelectItem value="H">Problem H</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Contest Era Filter - Only for Codeforces */}
          {(filters.platform === "codeforces" ||
            filters.platform === "all") && (
            <Select
              value={filters.contestEra || "all"}
              onValueChange={(value) =>
                onFiltersChange({ contestEra: value as any })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Contest Era" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Eras</SelectItem>
                <SelectItem value="new">After 2022</SelectItem>
                <SelectItem value="old">Before 2022</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Advanced Filters Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 w-full">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Advanced</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
                <SheetDescription>
                  Customize your problem search with detailed filters
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Rating Range */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Rating Range</Label>
                    <Button
                      type="button"
                      variant={manualRatingMode ? "default" : "outline"}
                      size="sm"
                      onClick={toggleRatingMode}
                      className="h-8 px-2 text-xs"
                    >
                      {manualRatingMode ? (
                        <>
                          <Hash className="h-3 w-3 mr-1" />
                          Step Mode
                        </>
                      ) : (
                        <>
                          <Type className="h-3 w-3 mr-1" />
                          Manual
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label
                        htmlFor="minRating"
                        className="text-xs text-muted-foreground"
                      >
                        Min Rating
                      </Label>
                      <Input
                        id="minRating"
                        type="number"
                        step={manualRatingMode ? "1" : "100"}
                        min="800"
                        max="4000"
                        placeholder={manualRatingMode ? "800" : "800"}
                        value={filters.minRating || ""}
                        onChange={(e) => handleRatingChange('minRating', e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="maxRating"
                        className="text-xs text-muted-foreground"
                      >
                        Max Rating
                      </Label>
                      <Input
                        id="maxRating"
                        type="number"
                        step={manualRatingMode ? "1" : "100"}
                        min="800"
                        max="4000"
                        placeholder={manualRatingMode ? "4000" : "4000"}
                        value={filters.maxRating || ""}
                        onChange={(e) => handleRatingChange('maxRating', e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  {manualRatingMode && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Manual Mode
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Enter any rating value (800-4000)
                      </p>
                    </div>
                  )}
                  
                  {!manualRatingMode && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Step Mode
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Increases by 100 (800, 900, 1000, etc.)
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* User Handles */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">User Handles</Label>
                  <div className="space-y-3">
                    <div>
                      <Label
                        htmlFor="leetcodeHandle"
                        className="text-xs text-muted-foreground"
                      >
                        LeetCode Handle
                      </Label>
                      <Input
                        id="leetcodeHandle"
                        placeholder="Enter your LeetCode username"
                        value={filters.leetcodeHandle || ""}
                        onChange={(e) => onFiltersChange({ leetcodeHandle: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="codeforcesHandle"
                        className="text-xs text-muted-foreground"
                      >
                        Codeforces Handle
                      </Label>
                      <Input
                        id="codeforcesHandle"
                        placeholder="Enter your Codeforces handle"
                        value={filters.codeforcesHandle || ""}
                        onChange={(e) => onFiltersChange({ codeforcesHandle: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add your handles to see which problems you've solved
                  </p>
                </div>

                <Separator />

                {/* Tags */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Tags ({selectedTags.length} selected)
                  </Label>

                  <Popover open={isTagsOpen} onOpenChange={setIsTagsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isTagsOpen}
                        className="w-full justify-between"
                      >
                        {selectedTags.length > 0
                          ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`
                          : "Select tags..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search tags..." />
                        <CommandEmpty>No tags found.</CommandEmpty>
                        <CommandList className="max-h-64">
                          <CommandGroup>
                            {availableTags.map((tag) => (
                              <CommandItem
                                key={tag}
                                value={tag}
                                onSelect={() => handleTagToggle(tag)}
                                className="cursor-pointer hover:bg-accent"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedTags.includes(tag)
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {tag}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Selected Tags */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedTags.map((tag, index) => (
                        <Badge
                          key={`selected-tag-${index}-${tag}`}
                          variant="secondary"
                          className="text-xs gap-1"
                        >
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleTagToggle(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Clear Filters */}
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredCount.toLocaleString()} of{" "}
                    {totalProblems.toLocaleString()} problems
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Active filters:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.platform !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {filters.platform}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFiltersChange({ platform: "all" })}
                />
              </Badge>
            )}
            {filters.difficulty !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {filters.difficulty}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFiltersChange({ difficulty: "all" })}
                />
              </Badge>
            )}
            {filters.contestType !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {filters.contestType}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFiltersChange({ contestType: "all" })}
                />
              </Badge>
            )}
            {filters.problemType !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Problem {filters.problemType}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFiltersChange({ problemType: "all" })}
                />
              </Badge>
            )}
            {filters.contestEra !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {filters.contestEra === "new" ? "New Contests" : "Old Contests"}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFiltersChange({ contestEra: "all" })}
                />
              </Badge>
            )}
            {selectedTags.slice(0, isMobile ? 2 : 3).map((tag, index) => (
              <Badge
                key={`active-tag-${index}-${tag}`}
                variant="secondary"
                className="gap-1"
              >
                {tag}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleTagToggle(tag)}
                />
              </Badge>
            ))}
            {selectedTags.length > (isMobile ? 2 : 3) && (
              <Badge variant="secondary">+{selectedTags.length - (isMobile ? 2 : 3)} more</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="sm:ml-auto text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredCount.toLocaleString()} problems
      </div>
    </div>
  );
}
