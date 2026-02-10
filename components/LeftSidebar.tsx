import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  List, 
  LayoutGrid, 
  ChevronLeft, 
  ChevronRight, 
  Folder, 
  FolderOpen,
  Sun,
  Moon,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeedItem } from './FeedItem';
import { Feed, FeedMeta, MediaUrl } from '../types';
import { cn } from "@/lib/utils";
import { proxyImageUrl, getMediaUrl } from '../services/rssService';
import jxnuLogo from '../content/img/JXNUlogo.png';

export interface CategoryNode {
  name: string;
  path: string;
  feeds: FeedMeta[];
  children: Map<string, CategoryNode>;
  depth: number;
}

interface LeftSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  handleBackToDashboard: () => void;
  errorMsg: string | null;
  sidebarMode: 'list' | 'grid';
  setSidebarMode: (mode: 'list' | 'grid') => void;
  openFolderPath: string | null;
  setOpenFolderPath: (path: string | null) => void;
  groupedFeeds: Map<string, CategoryNode>;
  feedContentCache: Record<string, Feed>;
  feedSummaryMap: Record<string, number>;
  feedAvatarCache: Record<string, MediaUrl>;
  selectedFeedMeta: FeedMeta | null;
  loadingFeedId: string | null;
  handleFeedSelect: (feed: FeedMeta) => void;
  collapsedCategories: Set<string>;
  toggleCategoryCollapse: (path: string) => void;
  loading: boolean;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  generatedAt: string;
  updatedCount: number;
}

const getNodeByPath = (groupedFeeds: Map<string, CategoryNode>, path: string): CategoryNode | null => {
  const parts = path.split('/').filter(Boolean);
  let current: Map<string, CategoryNode> = groupedFeeds;
  let node: CategoryNode | null = null;
  for (const part of parts) {
    node = current.get(part) || null;
    if (!node) return null;
    current = node.children;
  }
  return node;
};

const getFolderPreviews = (
  node: CategoryNode,
  feedContentCache: Record<string, Feed>,
  feedAvatarCache: Record<string, MediaUrl>
): string[] => {
  const previews: string[] = [];
  for (const meta of node.feeds.filter((feed) => !feed.hiddenInSidebar)) {
    if (previews.length >= 4) break;
    const content = feedContentCache[meta.id];
    const cachedAvatar = feedAvatarCache[meta.id];
    const previewUrl = getMediaUrl(content?.image || cachedAvatar);
    previews.push(previewUrl || '/default-placeholder.svg');
  }
  if (previews.length < 4) {
    for (const child of node.children.values()) {
      const childPreviews = getFolderPreviews(child, feedContentCache, feedAvatarCache);
      for (const preview of childPreviews) {
        if (previews.length >= 4) break;
        previews.push(preview);
      }
      if (previews.length >= 4) break;
    }
  }
  return previews;
};

const countAllFeeds = (node: CategoryNode): number => {
  let count = node.feeds.filter((feed) => !feed.hiddenInSidebar).length;
  node.children.forEach(child => { count += countAllFeeds(child); });
  return count;
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  handleBackToDashboard,
  errorMsg,
  sidebarMode,
  setSidebarMode,
  openFolderPath,
  setOpenFolderPath,
  groupedFeeds,
  feedContentCache,
  feedSummaryMap,
  feedAvatarCache,
  selectedFeedMeta,
  loadingFeedId,
  handleFeedSelect,
  collapsedCategories,
  toggleCategoryCollapse,
  loading,
  darkMode,
  setDarkMode,
  generatedAt,
  updatedCount,
}) => {
  const scrollAreaHostRef = React.useRef<HTMLDivElement | null>(null);
  const [nowTs, setNowTs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedSinceGenerated = React.useMemo(() => {
    const generated = new Date(generatedAt).getTime();
    if (!Number.isFinite(generated)) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    const delta = Math.max(0, nowTs - generated);
    const totalSeconds = Math.floor(delta / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds };
  }, [generatedAt, nowTs]);

  const updateHealth = React.useMemo(() => {
    if (elapsedSinceGenerated.hours >= 48) {
      return {
        label: '异常',
        dotClass: 'bg-rose-500',
        pulseClass: 'bg-rose-500/50',
      };
    }

    if (elapsedSinceGenerated.hours >= 24) {
      return {
        label: '需关注',
        dotClass: 'bg-amber-500',
        pulseClass: 'bg-amber-500/50',
      };
    }

    return {
      label: '正常',
      dotClass: 'bg-emerald-500',
      pulseClass: 'bg-emerald-500/50',
    };
  }, [elapsedSinceGenerated.hours]);

  const elapsedLabel = React.useMemo(() => {
    return `上次更新：${elapsedSinceGenerated.hours}h${elapsedSinceGenerated.minutes}m${elapsedSinceGenerated.seconds}s 前`;
  }, [elapsedSinceGenerated.hours, elapsedSinceGenerated.minutes, elapsedSinceGenerated.seconds]);

  React.useEffect(() => {
    const targetId = selectedFeedMeta?.id;
    if (!targetId) return;

    const host = scrollAreaHostRef.current;
    if (!host) return;

    const viewport = host.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;

    const escapedId = targetId.replace(/"/g, '\\"');
    const target = viewport.querySelector(`[data-feed-id="${escapedId}"]`) as HTMLElement | null;
    if (!target) return;

    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [openFolderPath, selectedFeedMeta?.id, sidebarMode]);

  const renderSubfolder = (node: CategoryNode) => {
    const totalCount = countAllFeeds(node);
    return (
      <button
        key={node.path}
        onClick={() => setOpenFolderPath(node.path)}
        className="relative aspect-square border rounded-xl bg-card flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:shadow-md transition-all group"
      >
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <Folder className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center px-2">
          <p className="text-[10px] font-bold text-foreground truncate w-full uppercase tracking-tight">{node.name}</p>
          <p className="text-[9px] text-muted-foreground font-bold">{totalCount} 个源</p>
        </div>
      </button>
    );
  };

  const renderFolder = (node: CategoryNode) => {
    const previews = getFolderPreviews(node, feedContentCache, feedAvatarCache);
    const totalCount = countAllFeeds(node);
    return (
      <div key={node.path} className="w-full">
        <button
          onClick={() => setOpenFolderPath(node.path)}
          className="w-full p-3 bg-card border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all group"
        >
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="aspect-square bg-muted rounded-lg overflow-hidden">
                {previews[i] ? <img src={proxyImageUrl(previews[i])} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full" />}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-foreground truncate uppercase tracking-wider">{node.name}</span>
            <span className="inline-flex items-center h-4 px-1 rounded bg-secondary text-secondary-foreground text-[8px] font-black">{totalCount}</span>
          </div>
        </button>
      </div>
    );
  };

  const renderCategoryNode = (node: CategoryNode): React.ReactNode => {
    const isCollapsed = collapsedCategories.has(node.path);
    const visibleFeeds = node.feeds.filter((feed) => !feed.hiddenInSidebar);
    const hasChildren = node.children.size > 0 || visibleFeeds.length > 0;
    const childrenArray = Array.from(node.children.values());
    const totalFeeds = countAllFeeds(node);
    const summaryFeed = visibleFeeds.find((feed) => feed.id.startsWith('school-') && feed.id.endsWith('-all')) || null;
    const childFeeds = summaryFeed ? visibleFeeds.filter((feed) => feed.id !== summaryFeed.id) : visibleFeeds;
    const summaryCollapseKey = `${node.path}::summary`;
    const isSummaryCollapsed = collapsedCategories.has(summaryCollapseKey);

    return (
      <div key={node.path} className="w-full">
        {node.name && (
          <button
            onClick={() => toggleCategoryCollapse(node.path)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors group"
            style={{ paddingLeft: `${(node.depth) * 8 + 12}px` }}
          >
            <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", !isCollapsed && "rotate-90")} />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate flex-1 text-left group-hover:text-foreground">
              {node.name}
            </span>
            <span className="inline-flex items-center h-4 px-1 rounded border text-[8px] font-bold opacity-50 group-hover:opacity-100">
              {totalFeeds}
            </span>
          </button>
        )}

        {(!node.name || !isCollapsed) && hasChildren && (
          <div className="space-y-0.5">
            {summaryFeed && (
              <div className="relative" key={summaryFeed.id} style={{ paddingLeft: `${(node.depth + (node.name ? 1 : 0)) * 8}px` }}>
                <FeedItem
                  feedMeta={summaryFeed}
                  feedContent={feedContentCache[summaryFeed.id] || null}
                  feedAvatar={feedAvatarCache[summaryFeed.id]}
                  feedArticleCount={feedSummaryMap[summaryFeed.id]}
                  mode="list"
                  isSelected={selectedFeedMeta?.id === summaryFeed.id}
                  isLoading={loadingFeedId === summaryFeed.id}
                  onSelect={handleFeedSelect}
                />
                {childFeeds.length > 0 && (
                  <button
                    type="button"
                    aria-label={isSummaryCollapsed ? '展开汇总群子订阅源' : '折叠汇总群子订阅源'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleCategoryCollapse(summaryCollapseKey);
                    }}
                  >
                    <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', !isSummaryCollapsed && 'rotate-90')} />
                  </button>
                )}
              </div>
            )}

            {!isSummaryCollapsed && childFeeds.map((meta) => {
              const content = feedContentCache[meta.id] || null;
              return (
                <div key={meta.id} style={{ paddingLeft: `${(node.depth + (node.name ? 1 : 0)) * 8}px` }}>
                  <FeedItem
                    feedMeta={meta}
                    feedContent={content}
                    feedAvatar={feedAvatarCache[meta.id]}
                    feedArticleCount={feedSummaryMap[meta.id]}
                    mode="list"
                    isSelected={selectedFeedMeta?.id === meta.id}
                    isLoading={loadingFeedId === meta.id}
                    onSelect={handleFeedSelect}
                  />
                </div>
              );
            })}
            {childrenArray.map((child) => renderCategoryNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 1024 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-card border-r transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        !isSidebarOpen && "lg:w-0 lg:border-none lg:overflow-hidden"
      )}>
        <div className="p-4 border-b flex items-center min-h-[84px]">
          <div className="flex items-center justify-between w-full gap-3">
            <div onClick={handleBackToDashboard} className="cursor-pointer flex items-center gap-2.5 group min-w-0 flex-1">
              <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform overflow-hidden border border-border/40 shrink-0">
                <img src={jxnuLogo} alt="JXNU" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-xl md:text-2xl leading-none font-black tracking-tight whitespace-nowrap">JXNU PUBLISH</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
              <X className="w-5 h-5" />
            </Button>
          </div>
          {errorMsg && <div className="text-[9px] mt-1 py-1 px-2 rounded bg-destructive/10 text-destructive font-bold">{errorMsg}</div>}
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">订阅源</span>
          <div className="flex bg-background border rounded-md p-0.5 shadow-sm">
            <Button
              variant={sidebarMode === 'list' ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 md:h-7 md:w-7 rounded-sm"
              onClick={() => setSidebarMode('list')}
            >
              <List className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </Button>
            <Button
              variant={sidebarMode === 'grid' ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 md:h-7 md:w-7 rounded-sm"
              onClick={() => setSidebarMode('grid')}
            >
              <LayoutGrid className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </Button>
          </div>
        </div>

        <div ref={scrollAreaHostRef} className="flex-1 min-h-0">
        <ScrollArea className="h-full px-3 py-4">
          <div className="space-y-1">
            {sidebarMode === 'grid' ? (
              (() => {
                if (openFolderPath) {
                  const currentNode = getNodeByPath(groupedFeeds, openFolderPath);
                  if (!currentNode) { setOpenFolderPath(null); return null; }
                  const childrenArray = Array.from(currentNode.children.values());
                  return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const parts = openFolderPath.split('/').filter(Boolean);
                          setOpenFolderPath(parts.length <= 1 ? null : parts.slice(0, -1).join('/'));
                        }}
                        className="w-full justify-start gap-2 text-primary font-bold"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="truncate">{currentNode.name}</span>
                      </Button>
                      <div className="grid grid-cols-2 gap-3">
                        {currentNode.feeds.filter((feed) => !feed.hiddenInSidebar).map(meta => {
                          const content = feedContentCache[meta.id] || null;
                          return (
                            <FeedItem
                              key={meta.id}
                              feedMeta={meta}
                              feedContent={content}
                              feedAvatar={feedAvatarCache[meta.id]}
                              feedArticleCount={feedSummaryMap[meta.id]}
                              mode="grid"
                              isSelected={selectedFeedMeta?.id === meta.id}
                              isLoading={loadingFeedId === meta.id}
                              onSelect={handleFeedSelect}
                            />
                          );
                        })}
                        {childrenArray.map(child => renderSubfolder(child))}
                      </div>
                    </motion.div>
                  );
                }
                const rootNodes = Array.from(groupedFeeds.entries());
                const uncategorized = rootNodes.find(([key]) => key === '__uncategorized__');
                const categories = rootNodes.filter(([key]) => key !== '__uncategorized__');
                return (
                  <div className="space-y-6">
                    {uncategorized && uncategorized[1].feeds.filter((feed) => !feed.hiddenInSidebar).length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {uncategorized[1].feeds.filter((feed) => !feed.hiddenInSidebar).map(meta => {
                          const content = feedContentCache[meta.id] || null;
                          return (
                            <FeedItem
                              key={meta.id}
                              feedMeta={meta}
                              feedContent={content}
                              feedAvatar={feedAvatarCache[meta.id]}
                              feedArticleCount={feedSummaryMap[meta.id]}
                              mode="grid"
                              isSelected={selectedFeedMeta?.id === meta.id}
                              isLoading={loadingFeedId === meta.id}
                              onSelect={handleFeedSelect}
                            />
                          );
                        })}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {categories.map(([, node]) => renderFolder(node))}
                    </div>
                  </div>
                );
              })()
            ) : (
              (() => {
                const rootNodes = Array.from(groupedFeeds.entries());
                return rootNodes.map(([key, node]) => {
                  if (key === '__uncategorized__') {
                    return node.feeds.filter((feed) => !feed.hiddenInSidebar).map(meta => {
                      const content = feedContentCache[meta.id] || null;
                      return (
                        <FeedItem
                          key={meta.id}
                          feedMeta={meta}
                          feedContent={content}
                          feedAvatar={feedAvatarCache[meta.id]}
                          feedArticleCount={feedSummaryMap[meta.id]}
                          mode="list"
                          isSelected={selectedFeedMeta?.id === meta.id}
                          isLoading={loadingFeedId === meta.id}
                          onSelect={handleFeedSelect}
                        />
                      );
                    });
                  }
                  return renderCategoryNode(node);
                });
              })()
            )}
            {loading && <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 text-primary animate-spin" /></div>}
          </div>
        </ScrollArea>
        </div>

        <div className="p-3 border-t bg-muted/20 flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-10 w-10 md:h-9 md:w-9" onClick={() => setDarkMode(!darkMode)} title={darkMode ? "切换到浅色模式" : "切换到深色模式"}>
            {darkMode ? <Sun className="w-5 h-5 md:w-4 md:h-4" /> : <Moon className="w-5 h-5 md:w-4 md:h-4" />}
          </Button>
          <div className="relative min-w-0 flex-1 rounded-xl border bg-background/90 px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
                <span className={cn('absolute inline-flex h-full w-full rounded-full animate-ping', updateHealth.pulseClass)} />
                <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', updateHealth.dotClass)} />
              </span>
              <span className="text-[10px] font-black tracking-wider text-muted-foreground">更新状态：{updateHealth.label}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 min-w-0">
              <div className="min-w-0 flex-1 text-[9px] font-bold text-foreground/85 leading-tight truncate" title={elapsedLabel}>
                {elapsedLabel}
              </div>
              <div className="shrink-0 text-[9px] font-black text-primary leading-none" title={`更新 ${updatedCount} 条`}>
                {`更新 ${updatedCount} 条`}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
