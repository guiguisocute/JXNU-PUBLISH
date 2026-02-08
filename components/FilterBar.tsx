import React from 'react';
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArticleCategory } from '../types';
import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeFilters: string[];
  onToggleFilter: (filter: string) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = React.memo(({
  activeFilters,
  onToggleFilter,
  onReset,
}) => {
  const filters = [
    ArticleCategory.NOTICE,
    ArticleCategory.COMPETITION,
    ArticleCategory.VOLUNTEER,
    ArticleCategory.SECOND_CLASS,
    ArticleCategory.FORM,
    ArticleCategory.OTHER,
  ];

  return (
    <div className="flex justify-center sticky top-0 z-20 py-3 pointer-events-none">
      <div className="w-full md:w-auto flex items-center bg-background/80 backdrop-blur-md border rounded-full shadow-lg pointer-events-auto mx-3 md:mx-4 overflow-hidden p-1">
        <div className="h-7 sm:h-8 px-3 hidden sm:flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          <Filter className="h-3.5 w-3.5" />
          分类筛选
        </div>
        <Separator orientation="vertical" className="h-4 mx-1 hidden sm:block" />
        <Button 
          variant={activeFilters.length === 0 ? "secondary" : "ghost"}
          size="sm"
          onClick={onReset} 
          className="h-7 sm:h-8 rounded-full px-3 sm:px-4 text-[11px] sm:text-xs font-bold shrink-0"
        >
          全部
        </Button>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pr-6">
            {filters.map((filter) => (
              <Button 
                key={filter} 
                variant={activeFilters.includes(filter) ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onToggleFilter(filter)}
                className={cn(
                  "h-7 sm:h-8 rounded-full px-3 sm:px-4 text-[11px] sm:text-xs font-bold whitespace-nowrap",
                  activeFilters.includes(filter) && "bg-muted text-foreground"
                )}
              >
                {filter}
              </Button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background/95 to-transparent md:hidden" />
        </div>
      </div>
    </div>
  );
});

FilterBar.displayName = 'FilterBar';
