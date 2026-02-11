import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PanelLeft, 
  PanelRight, 
  Filter, 
  Search,
  RefreshCw, 
  ArrowUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArticleCard } from './ArticleCard';
import { FilterBar } from './FilterBar';
import { Feed, Article } from '../types';
import { cn } from "@/lib/utils";

interface ArticleListProps {
  selectedFeed: Feed;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  selectedDate: Date | null;
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (open: boolean) => void;
  activeFilters: string[];
  activeTagFilters: string[];
  nowTs: number;
  handleFilterToggle: (filter: string) => void;
  onCategorySelect: (category: string) => void;
  onTagSelect: (tag: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onResetFilters: () => void;
  paginatedArticlesWithCategory: any[];
  readArticleIds: Set<string>;
  handleArticleSelect: (article: Article) => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  filteredArticlesCount: number;
  isLoadingMoreHistory: boolean;
  canLoadMoreHistory: boolean;
  showScrollToTop: boolean;
  handleScrollToTop: () => void;
  articleListRef: React.RefObject<HTMLDivElement>;
  visiblePageTokens: (number | string)[];
  feedId: string;
  initialScrollPosition?: number;
  onScrollPositionChange?: (feedId: string, position: number) => void;
  loadedCount?: number;
  totalCount?: number;
}

const ArticleListComponent: React.FC<ArticleListProps> = ({
  selectedFeed,
  isSidebarOpen,
  setIsSidebarOpen,
  selectedDate,
  isRightSidebarOpen,
  setIsRightSidebarOpen,
  activeFilters,
  activeTagFilters,
  nowTs,
  handleFilterToggle,
  onCategorySelect,
  onTagSelect,
  searchQuery,
  onSearchQueryChange,
  onResetFilters,
  paginatedArticlesWithCategory,
  readArticleIds,
  handleArticleSelect,
  onRefresh,
  isRefreshing,
  currentPage,
  setCurrentPage,
  totalPages,
  filteredArticlesCount,
  isLoadingMoreHistory,
  canLoadMoreHistory,
  showScrollToTop,
  handleScrollToTop,
  articleListRef,
  visiblePageTokens,
  feedId,
  initialScrollPosition = 0,
  onScrollPositionChange,
  loadedCount,
  totalCount
}) => {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const touchStartRef = React.useRef<number>(0);
  const rafRef = React.useRef<number | null>(null);
  const prevPageRef = React.useRef(currentPage);
  const prevSearchRef = React.useRef(searchQuery);
  const prevFilterKeyRef = React.useRef(`${activeFilters.join('|')}::${activeTagFilters.join('|')}`);
  const prevSelectedDateRef = React.useRef<number | null>(selectedDate ? selectedDate.getTime() : null);

  const getViewport = React.useCallback(() => {
    return articleListRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
  }, [articleListRef]);

  // 恢复滚动位置
  React.useLayoutEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const targetPosition = initialScrollPosition ?? 0;
    const frame = requestAnimationFrame(() => {
      viewport.scrollTop = targetPosition;
    });
    return () => cancelAnimationFrame(frame);
  }, [feedId, initialScrollPosition, getViewport]);

  // 保存滚动位置（滚动时）
  React.useEffect(() => {
    const viewport = getViewport();
    if (!viewport || !onScrollPositionChange) return;
    const handleScroll = () => {
      onScrollPositionChange(feedId, viewport.scrollTop);
    };
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [feedId, onScrollPositionChange, getViewport]);

  React.useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;
    if (prevPageRef.current === currentPage) return;

    viewport.scrollTo({ top: 0, behavior: 'smooth' });
    prevPageRef.current = currentPage;
  }, [currentPage, getViewport]);

  React.useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const nextFilterKey = `${activeFilters.join('|')}::${activeTagFilters.join('|')}`;
    const searchChanged = prevSearchRef.current !== searchQuery;
    const filterChanged = prevFilterKeyRef.current !== nextFilterKey;
    if (!searchChanged && !filterChanged) return;

    viewport.scrollTo({ top: 0, behavior: 'smooth' });
    prevSearchRef.current = searchQuery;
    prevFilterKeyRef.current = nextFilterKey;
  }, [activeFilters, activeTagFilters, getViewport, searchQuery]);

  React.useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const nextSelectedDateTs = selectedDate ? selectedDate.getTime() : null;
    if (prevSelectedDateRef.current === nextSelectedDateTs) return;

    viewport.scrollTo({ top: 0, behavior: 'smooth' });
    prevSelectedDateRef.current = nextSelectedDateTs;
  }, [getViewport, selectedDate]);

  const hasSearchOrFilter = searchQuery.trim().length > 0 || activeFilters.length > 0 || activeTagFilters.length > 0 || Boolean(selectedDate);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (articleListRef.current?.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
    } else {
      touchStartRef.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === 0 || isRefreshing) return;
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartRef.current;

    if (distance > 0 && articleListRef.current?.scrollTop === 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      
      rafRef.current = requestAnimationFrame(() => {
        const pull = Math.min(distance * 0.4, 100);
        setPullDistance(pull);
      });

      if (distance > 5 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      if (pullDistance !== 0) setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 60) {
      onRefresh().finally(() => {
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
    touchStartRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  return (
    <div
      className="h-full flex flex-col animate-in fade-in duration-500"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="h-16 px-4 md:px-8 flex items-center justify-between bg-background/80 backdrop-blur-md border-b sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {!isSidebarOpen && (
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="shrink-0">
              <PanelLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="overflow-hidden">
            <h2 className="text-lg font-black truncate uppercase tracking-tight">{selectedFeed.title}</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest hidden sm:block">
              {selectedDate ? (
                `筛选日期: ${selectedDate.toLocaleDateString()}`
              ) : (
                <span className="flex items-center gap-2">
                  <span>最新内容</span>
                  {totalCount && totalCount > 0 && activeFilters.length === 0 && (
                    <>
                      <span className="w-px h-3 bg-border/60" />
                      <span className="font-black text-foreground/80">
                        已加载 {loadedCount} <span className="text-muted-foreground/50 mx-0.5">/</span> {totalCount}
                      </span>
                    </>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex relative items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="搜索标题或正文..."
              className="w-72 h-9 text-xs pl-9"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-9 w-9 p-0 rounded-full border-0 shadow-none hover:bg-muted"
            onClick={() => setIsSearchOpen(true)}
            title="搜索"
            aria-label="打开搜索"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant={isRightSidebarOpen ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="md:hidden h-9 w-9 p-0 rounded-full border-0 shadow-none hover:bg-muted"
            title={isRightSidebarOpen ? '关闭筛选' : '打开筛选'}
            aria-label={isRightSidebarOpen ? '关闭筛选' : '打开筛选'}
          >
            {isRightSidebarOpen ? <PanelRight className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          </Button>
          <Button
            variant={isRightSidebarOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="hidden md:flex text-[10px] font-black uppercase tracking-widest h-8"
          >
            {isRightSidebarOpen ? <PanelRight className="w-3.5 h-3.5 mr-2" /> : <Filter className="w-3.5 h-3.5 mr-2" />}
            {isRightSidebarOpen ? '关闭侧栏' : '筛选'}
          </Button>
        </div>
      </header>

        <FilterBar
          activeFilters={activeFilters}
          onToggleFilter={handleFilterToggle}
          onReset={() => handleFilterToggle('__reset__')} // Note: Logic handled in App.tsx
        />

      <ScrollArea ref={articleListRef as any} className="flex-1 bg-muted/10">
        <div className="p-4 md:p-8">
          {/* Pull-to-refresh indicator */}
          <div
            className="lg:hidden flex items-center justify-center text-xs text-primary overflow-hidden transition-all duration-300 ease-out"
            style={{
              height: isRefreshing ? 40 : pullDistance,
              opacity: isRefreshing || pullDistance > 0 ? 1 : 0
            }}
          >
            {isRefreshing ? (
              <div className="flex items-center gap-2 font-bold">
                <RefreshCw className="animate-spin h-4 w-4" />
                <span>正在刷新...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-bold">
                <ArrowUp className={cn("w-4 h-4 transition-transform duration-300", pullDistance >= 60 && "rotate-180")} />
                <span>{pullDistance >= 60 ? '释放刷新' : '下拉刷新'}</span>
              </div>
            )}
          </div>

          {filteredArticlesCount === 0 ? (
            <div className="max-w-3xl mx-auto rounded-2xl border bg-background/90 p-8 text-center space-y-3">
              <p className="text-sm font-black uppercase tracking-wider">没有匹配的内容</p>
              <p className="text-xs text-muted-foreground">
                {hasSearchOrFilter ? '当前搜索词或筛选条件（含日期）没有命中结果，试试清空后再看。' : '当前源暂无可展示的内容。'}
              </p>
              {hasSearchOrFilter && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResetFilters}
                    className="h-8 text-xs font-bold"
                  >
                    清空筛选条件
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-flow-row grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {paginatedArticlesWithCategory.map(article => (
                <ArticleCard
                  key={article.guid || article.link}
                  article={article}
                  isSelected={false}
                  isRead={readArticleIds.has(article.guid || article.link)}
                  onClick={() => handleArticleSelect(article)}
                  onCategoryClick={onCategorySelect}
                  onTagClick={onTagSelect}
                  activeCategoryFilters={activeFilters}
                  activeTagFilters={activeTagFilters}
                  nowTs={nowTs}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full px-6 font-bold"
                >
                  上一页
                </Button>
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-full border">
                  {visiblePageTokens.map(token => {
                    if (typeof token === 'string') return <span key={token} className="w-8 text-center text-muted-foreground">···</span>;
                    return (
                      <Button
                        key={`page-${token}`}
                        variant={currentPage === token ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setCurrentPage(token as number)}
                        className="h-8 w-8 rounded-full text-xs font-bold"
                      >
                        {token}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full px-6 font-bold"
                >
                  下一页
                </Button>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  共 {filteredArticlesCount} 篇文章 • 第 {currentPage} / {totalPages || 1} 页
                </p>
                {!selectedDate && totalCount && loadedCount && totalCount > loadedCount && activeFilters.length === 0 && (
                  <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                    仅显示已加载内容，翻页会自动预加载更多
                  </p>
                )}
              </div>
            </div>
          )}

          {(isLoadingMoreHistory || canLoadMoreHistory) && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center rounded-md border px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse bg-background">
                {isLoadingMoreHistory ? '正在加载历史内容...' : '滑动到底部加载更多'}
              </div>
            </div>
          )}

        </div>

        <footer className="px-4 pt-8 pb-[max(72px,calc(env(safe-area-inset-bottom)+56px))] text-center text-[11px] leading-5 text-muted-foreground">
          <span>© 2026 </span>
          <a
            href="https://blog.guiguisocute.cloud/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            guiguisocute
          </a>
          <span>. All Rights Reserved. </span>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            RSS
          </a>
          <br />
          <span>Powered by </span>
          <a
            href="https://github.com/guiguisocute/JXNU-PUBLISH"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            JXNU-PUBLISH
          </a>
          <span> &amp; </span>
          <a
            href="https://openclaw.ai/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            OpenClaw
          </a>
        </footer>
      </ScrollArea>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="m-4 rounded-xl border bg-background p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder="搜索标题或正文..."
                  className="h-10 text-sm"
                />
                <Button variant="outline" size="sm" onClick={() => setIsSearchOpen(false)}>关闭</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showScrollToTop && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed right-6 z-30 bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))]"
          >
            <Button
              size="icon"
              onClick={handleScrollToTop}
              className="w-12 h-12 rounded-full shadow-xl hover:scale-110 transition-transform"
            >
              <ArrowUp className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ArticleList = React.memo(ArticleListComponent);
ArticleList.displayName = 'ArticleList';
