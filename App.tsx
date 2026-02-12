import React from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock3, Sparkles, Tags, X } from 'lucide-react';
import { Article, Feed, FeedMeta, MediaUrl, NoticeAttachment } from './types';
import { LeftSidebar, CategoryNode } from './components/LeftSidebar';
import { ArticleList } from './components/ArticleList';
import { Dashboard } from './components/Dashboard';
import { CalendarWidget } from './components/CalendarWidget';
import { NoticeDetailModal } from './components/NoticeDetailModal';
import { createMediaUrl } from './types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { cn } from './lib/utils';

const isSummaryFeedMeta = (meta: FeedMeta): boolean => meta.id.startsWith('school-') && meta.id.endsWith('-all');

type NoticeItem = {
  id: string;
  schoolSlug: string;
  schoolName: string;
  subscriptionId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  pinned: boolean;
  cover: string;
  badge: string;
  extraUrl: string;
  startAt: string;
  endAt: string;
  published: string;
  source: { channel?: string; sender?: string };
  attachments: NoticeAttachment[];
  contentMarkdown: string;
  contentHtml: string;
};

type ConclusionItem = {
  defaultMarkdown: string;
  defaultHtml: string;
  byDate: Record<string, { markdown: string; html: string }>;
};

type CompiledContent = {
  generatedAt: string;
  updatedCount?: number;
  previousNoticeCount?: number;
  totalNotices?: number;
  schools: Array<{ slug: string; name: string; shortName?: string; icon?: string }>;
  subscriptions: Array<{
    id: string;
    schoolSlug: string;
    schoolName: string;
    title: string;
    number?: string;
    url: string;
    icon: string;
    enabled: boolean;
    order: number;
  }>;
  notices: NoticeItem[];
  conclusionBySchool: Record<string, ConclusionItem>;
};

type SearchItem = {
  id: string;
  schoolSlug: string;
  subscriptionId?: string;
  title: string;
  description: string;
  contentPlainText: string;
};

const READ_KEY = 'jxnu_publish_read_ids';

const getVisiblePageTokens = (currentPage: number, totalPages: number): (number | string)[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'e1', totalPages];
  if (currentPage >= totalPages - 3) return [1, 'e1', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, 'e1', currentPage - 1, currentPage, currentPage + 1, 'e2', totalPages];
};

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const markdownToPlainText = (markdown: string): string => {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, (value) => value.trimStart())
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const DailySummaryPanel: React.FC<{
  selectedDate: Date | null;
  selectedSchoolSlug: string | null;
  conclusionBySchool: Record<string, ConclusionItem>;
}> = React.memo(({ selectedDate, selectedSchoolSlug, conclusionBySchool }) => {
  const [isTypingSummary, setIsTypingSummary] = React.useState(false);
  const [dailySummaryText, setDailySummaryText] = React.useState('');
  const [summaryNotFound, setSummaryNotFound] = React.useState(false);
  const typingTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    setDailySummaryText('');
    setSummaryNotFound(false);
    setIsTypingSummary(false);

    if (!selectedDate || !selectedSchoolSlug) return;

    const dateKey = toDateKey(selectedDate);
    const bySchool = conclusionBySchool[selectedSchoolSlug];
    const target = bySchool?.byDate?.[dateKey];

    if (!target?.markdown) {
      setSummaryNotFound(true);
      return;
    }

    const fullText = markdownToPlainText(target.markdown);
    if (!fullText) {
      setSummaryNotFound(true);
      return;
    }

    setIsTypingSummary(true);
    let index = 0;
    const chunk = Math.max(2, Math.ceil(fullText.length / 60));

    typingTimerRef.current = window.setInterval(() => {
      index = Math.min(fullText.length, index + chunk);
      setDailySummaryText(fullText.slice(0, index));
      if (index >= fullText.length) {
        if (typingTimerRef.current) {
          window.clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setIsTypingSummary(false);
      }
    }, 45);
  }, [conclusionBySchool, selectedDate, selectedSchoolSlug]);

  if (dailySummaryText) {
    return (
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>AI 每日总结</span>
        </div>
        <ScrollArea className="max-h-[320px]">
          <div className="p-3 text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
            {dailySummaryText}
            {isTypingSummary && <span className="ml-1 inline-block w-2 animate-pulse">|</span>}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (isTypingSummary) {
    return (
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>AI 每日总结</span>
        </div>
        <div className="p-3 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-primary font-semibold">正在生成每日总结...</span>
        </div>
      </div>
    );
  }

  if (summaryNotFound) {
    return (
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>AI 每日总结</span>
        </div>
        <div className="p-4 text-center text-xs text-muted-foreground">该日期暂无AI总结</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>AI 每日总结</span>
      </div>
      <div className="p-4 text-center text-xs text-muted-foreground">选择日期后自动生成每日总结</div>
    </div>
  );
});
DailySummaryPanel.displayName = 'DailySummaryPanel';

const toArticle = (notice: NoticeItem, fallbackCover = ''): Article => ({
  title: notice.title,
  pubDate: notice.published,
  link: notice.extraUrl || '',
  guid: notice.id,
  author: notice.source?.sender || notice.schoolName,
  thumbnail: createMediaUrl(notice.cover || fallbackCover || ''),
  description: notice.description,
  content: notice.contentHtml,
  enclosure: { link: '', type: '' },
  feedTitle: notice.schoolName,
  aiCategory: notice.category,
  tags: [...notice.tags],
  attachments: notice.attachments,
  source: notice.source,
  badge: notice.badge,
  startAt: notice.startAt,
  endAt: notice.endAt,
  pinned: notice.pinned,
  isPlaceholderCover: !notice.cover,
});

const getTimeWindowState = (startAt?: string, endAt?: string, now = Date.now()): {
  state: 'none' | 'upcoming' | 'active' | 'expired';
  progress: number;
} => {
  if (!startAt || !endAt) return { state: 'none', progress: 0 };
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { state: 'none', progress: 0 };
  if (now < start) return { state: 'upcoming', progress: 0 };
  if (now > end) return { state: 'expired', progress: 100 };
  const progress = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  return { state: 'active', progress };
};

const useCompiledData = () => {
  const [contentData, setContentData] = React.useState<CompiledContent | null>(null);
  const [searchData, setSearchData] = React.useState<SearchItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [contentRes, searchRes] = await Promise.all([
          fetch('/generated/content-data.json'),
          fetch('/generated/search-index.json'),
        ]);
        if (!contentRes.ok) throw new Error(`加载 content-data 失败 (${contentRes.status})`);
        if (!searchRes.ok) throw new Error(`加载 search-index 失败 (${searchRes.status})`);

        const [contentJson, searchJson] = await Promise.all([
          contentRes.json() as Promise<CompiledContent>,
          searchRes.json() as Promise<SearchItem[]>,
        ]);

        if (!mounted) return;
        setContentData(contentJson);
        setSearchData(searchJson);
      } catch (e) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : '加载静态内容失败';
        setError(message);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { contentData, searchData, error };
};

const AppShell: React.FC<{
  mode: 'list' | 'dashboard';
  contentData: CompiledContent;
  searchData: SearchItem[];
}> = ({ mode, contentData, searchData }) => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('theme') === 'dark';
  });
  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = React.useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [sidebarMode, setSidebarMode] = React.useState<'list' | 'grid'>('list');
  const [openFolderPath, setOpenFolderPath] = React.useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = React.useState<Set<string>>(new Set());
  const [loadingFeedId, setLoadingFeedId] = React.useState<string | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [activeFilters, setActiveFilters] = React.useState<string[]>([]);
  const [activeTagFilters, setActiveTagFilters] = React.useState<string[]>([]);
  const [timedOnly, setTimedOnly] = React.useState(false);
  const [hideExpired, setHideExpired] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [activeArticle, setActiveArticle] = React.useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [nowTs, setNowTs] = React.useState(() => Date.now());
  const [tagStatsExpanded, setTagStatsExpanded] = React.useState(false);
  const [isFakeRefreshing, setIsFakeRefreshing] = React.useState(false);
  const articleListRef = React.useRef<HTMLDivElement>(null);

  const [readArticleIds, setReadArticleIds] = React.useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(READ_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  React.useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readArticleIds)));
  }, [readArticleIds]);

  const hasSecondLevelCountdown = React.useMemo(() => {
    return contentData.notices.some((notice) => {
      if (!notice.startAt || !notice.endAt) return false;
      const start = new Date(notice.startAt).getTime();
      const end = new Date(notice.endAt).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
      if (nowTs < start || nowTs > end) return false;
      return end - nowTs < 10 * 60 * 1000;
    });
  }, [contentData.notices, nowTs]);

  React.useEffect(() => {
    if (activeArticle) return;  // modal 打开时暂停全局 timer，防止重渲染清除文字选区
    const intervalMs = hasSecondLevelCountdown ? 1000 : 30000;
    const timer = window.setInterval(() => setNowTs(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [activeArticle, hasSecondLevelCountdown]);

  const schoolFeedEntries = React.useMemo(() => {
    const map = new Map<string, { meta: FeedMeta; feed: Feed }>();
    const subscriptionMap = new Map<string, CompiledContent['subscriptions'][number]>(
      contentData.subscriptions.map((item) => [item.id, item])
    );
    const schoolIconBySlug = new Map<string, string>(
      contentData.schools.map((school) => [school.slug, school.icon || '/img/JXNUlogo.png'])
    );

    for (const school of contentData.schools) {
      const overviewId = `school-${school.slug}-all`;
      const summaryTitle = `${school.name}汇总`;
      map.set(overviewId, {
        meta: {
          id: overviewId,
          category: school.name,
          isSub: false,
          customTitle: summaryTitle,
          schoolSlug: school.slug,
          sourceChannel: summaryTitle,
        },
        feed: {
          url: `/school/${overviewId}`,
          title: summaryTitle,
          description: `${school.name}全部通知流`,
          image: createMediaUrl(school.icon || ''),
          category: school.name,
          items: [],
        },
      });
    }

    for (const subscription of contentData.subscriptions.filter((item) => item.enabled)) {
      const sourceTitle = subscription.title;
      map.set(subscription.id, {
        meta: {
          id: subscription.id,
          category: subscription.schoolName,
          isSub: true,
          customTitle: sourceTitle,
          schoolSlug: subscription.schoolSlug,
          sourceChannel: sourceTitle,
        },
        feed: {
          url: `/school/${subscription.id}`,
          title: sourceTitle,
          description: `${subscription.schoolName} / ${sourceTitle}`,
          image: createMediaUrl(subscription.icon || ''),
          category: subscription.schoolName,
          items: [],
        },
      });
    }

    for (const notice of contentData.notices) {
      const subscription = subscriptionMap.get(notice.subscriptionId);
      if (!subscription || !subscription.enabled) {
        continue;
      }

      const fallbackCover = schoolIconBySlug.get(notice.schoolSlug) || '/img/JXNUlogo.png';

      const feedId = notice.subscriptionId;
      const overviewId = `school-${notice.schoolSlug}-all`;

      map.get(overviewId)?.feed.items.push(toArticle(notice, fallbackCover));
      map.get(feedId)!.feed.items.push(toArticle(notice, fallbackCover));
    }

    const allFeeds = Array.from(map.values());
    allFeeds.forEach(({ feed }) => {
      feed.items.sort((a, b) => { if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(); });
    });

    return allFeeds;
  }, [contentData]);

  const schoolShortNameMap = React.useMemo<Record<string, string>>(
    () => Object.fromEntries(contentData.schools.map((school) => [school.slug, school.shortName || school.name])),
    [contentData.schools]
  );

  const feedConfigs = React.useMemo(() => schoolFeedEntries.map((item) => item.meta), [schoolFeedEntries]);
  const feedContentCache = React.useMemo(
    () => Object.fromEntries(schoolFeedEntries.map((item) => [item.meta.id, item.feed])),
    [schoolFeedEntries]
  );

  const groupedFeeds = React.useMemo(() => {
    const root: Map<string, CategoryNode> = new Map();
    feedConfigs.forEach((meta) => {
      const parts = (meta.category || '').split('/').filter(Boolean);
      if (parts.length === 0) {
        const key = '__uncategorized__';
        if (!root.has(key)) root.set(key, { name: '', path: key, feeds: [], children: new Map(), depth: 0 });
        root.get(key)!.feeds.push(meta);
        return;
      }

      let current = root;
      let currentPath = '';
      let node: CategoryNode | null = null;

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!current.has(part)) {
          current.set(part, {
            name: part,
            path: currentPath,
            feeds: [],
            children: new Map(),
            depth: index,
          });
        }
        node = current.get(part)!;
        current = node.children;
      });

      if (node) node.feeds.push(meta);
    });
    return root;
  }, [feedConfigs]);

  const feedAvatarCache = React.useMemo<Record<string, MediaUrl>>(
    () => Object.fromEntries(feedConfigs.map((meta) => [meta.id, feedContentCache[meta.id]?.image]).filter((entry): entry is [string, MediaUrl] => Boolean(entry[1]))),
    [feedConfigs, feedContentCache]
  );

  const feedSummaryMap = React.useMemo<Record<string, number>>(
    () => Object.fromEntries(feedConfigs.map((meta) => [meta.id, feedContentCache[meta.id]?.items.length ?? 0])),
    [feedConfigs, feedContentCache]
  );

  const selectedFeedMeta = React.useMemo(() => {
    const fallback = feedConfigs[0] || null;
    if (!slug) return fallback;
    return feedConfigs.find((meta) => meta.id === slug)
      || feedConfigs.find((meta) => meta.schoolSlug === slug && isSummaryFeedMeta(meta))
      || feedConfigs.find((meta) => meta.schoolSlug === slug)
      || fallback;
  }, [feedConfigs, slug]);

  const selectedFeed = selectedFeedMeta ? feedContentCache[selectedFeedMeta.id] || null : null;

  const searchMatches = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    const set = new Set<string>();
    for (const row of searchData) {
      const source = `${row.title} ${row.description} ${row.contentPlainText}`.toLowerCase();
      if (source.includes(query)) set.add(row.id);
    }
    return set;
  }, [searchData, searchQuery]);

  const baseArticles = React.useMemo(() => {
    if (!selectedFeed) return [];
    if (!selectedDate) return selectedFeed.items;
    return selectedFeed.items.filter((item) => new Date(item.pubDate).toDateString() === selectedDate.toDateString());
  }, [selectedDate, selectedFeed]);

  const tagStats = React.useMemo(() => {
    const countMap = new Map<string, number>();
    for (const article of baseArticles) {
      for (const tag of article.tags || []) {
        countMap.set(tag, (countMap.get(tag) || 0) + 1);
      }
    }
    return Array.from(countMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
  }, [baseArticles]);

  React.useEffect(() => {
    setTagStatsExpanded(false);
  }, [selectedFeedMeta?.id, selectedDate]);

  const shouldCollapseTagStats = tagStats.length > 6;

  const matchesActiveCriteria = React.useCallback((article: Article) => {
    const timing = getTimeWindowState(article.startAt, article.endAt, nowTs);
    if (timedOnly && timing.state === 'none') return false;
    if (hideExpired && timing.state === 'expired') return false;
    if (searchMatches && !searchMatches.has(article.guid)) return false;
    if (activeFilters.length > 0 && !activeFilters.includes(article.aiCategory || '')) return false;
    if (activeTagFilters.length > 0) {
      const tags = article.tags || [];
      if (!activeTagFilters.every((tag) => tags.includes(tag))) return false;
    }
    return true;
  }, [activeFilters, activeTagFilters, hideExpired, nowTs, searchMatches, timedOnly]);

  const filteredArticles = React.useMemo(() => {
    const toTimestamp = (value: string) => {
      const ts = new Date(value).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };

    return baseArticles
      .filter(matchesActiveCriteria)
      .slice()
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const diff = toTimestamp(b.pubDate) - toTimestamp(a.pubDate);
        if (diff !== 0) return diff;
        return (b.guid || '').localeCompare(a.guid || '', 'zh-CN');
      });
  }, [baseArticles, matchesActiveCriteria]);

  const ARTICLES_PER_PAGE = 12;
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
  const visiblePageTokens = getVisiblePageTokens(currentPage, totalPages);
  const paginatedArticlesWithCategory = React.useMemo(() => {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    return filteredArticles.slice(start, start + ARTICLES_PER_PAGE);
  }, [currentPage, filteredArticles]);

  const articleCountByDate = React.useMemo(() => {
    if (!selectedFeed) return null;
    const map: Record<string, number> = {};
    selectedFeed.items.filter(matchesActiveCriteria).forEach((article) => {
      const key = new Date(article.pubDate).toDateString();
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [matchesActiveCriteria, selectedFeed]);

  const activeIndex = React.useMemo(() => {
    if (!activeArticle) return -1;
    return filteredArticles.findIndex((article) => article.guid === activeArticle.guid);
  }, [activeArticle, filteredArticles]);

  const syncHash = React.useCallback((articleId: string | null) => {
    if (typeof window === 'undefined') return;
    const next = articleId ? `${window.location.pathname}#${articleId}` : window.location.pathname;
    window.history.replaceState(null, '', next);
  }, []);

  const handleFeedSelect = React.useCallback((meta: FeedMeta) => {
    setLoadingFeedId(meta.id);
    setTimeout(() => {
      setLoadingFeedId(null);
      setSelectedDate(null);
      setCurrentPage(1);
      setSearchQuery('');
      setActiveFilters([]);
      setActiveTagFilters([]);
      const routeSlug = isSummaryFeedMeta(meta) && meta.schoolSlug ? meta.schoolSlug : meta.id;
      navigate(`/school/${routeSlug}`);
    }, 120);
  }, [navigate]);

  const handleArticleSelect = React.useCallback((article: Article) => {
    setReadArticleIds((prev) => {
      if (prev.has(article.guid)) return prev;
      const next = new Set(prev);
      next.add(article.guid);
      return next;
    });
    setActiveArticle(article);
    syncHash(article.guid);
  }, [syncHash]);

  const handleFakeRefresh = React.useCallback(async () => {
    if (isFakeRefreshing) return;

    setIsFakeRefreshing(true);
    await new Promise((resolve) => {
      window.setTimeout(resolve, 450);
    });
    setNowTs(Date.now());
    setIsFakeRefreshing(false);
  }, [isFakeRefreshing]);

  const handlePrev = React.useCallback(() => {
    if (activeIndex <= 0) return;
    const nextArticle = filteredArticles[activeIndex - 1];
    setActiveArticle(nextArticle);
    syncHash(nextArticle.guid);
  }, [activeIndex, filteredArticles, syncHash]);

  const handleNext = React.useCallback(() => {
    if (activeIndex < 0 || activeIndex >= filteredArticles.length - 1) return;
    const nextArticle = filteredArticles[activeIndex + 1];
    setActiveArticle(nextArticle);
    syncHash(nextArticle.guid);
  }, [activeIndex, filteredArticles, syncHash]);

  const handleModalClose = React.useCallback(() => {
    setActiveArticle(null);
    syncHash(null);
  }, [syncHash]);

  React.useEffect(() => {
    if (!selectedFeed) return;
    const hash = typeof window !== 'undefined' ? decodeURIComponent(window.location.hash.replace(/^#/, '')) : '';
    if (!hash) return;
    const target = selectedFeed.items.find((item) => item.guid === hash);
    if (!target) return;

    setReadArticleIds((prev) => {
      if (prev.has(target.guid)) return prev;
      const next = new Set(prev);
      next.add(target.guid);
      return next;
    });
    setActiveArticle(target);
  }, [selectedFeed]);

  if (!selectedFeedMeta || !selectedFeed) return <Navigate to="/" replace />;

  return (
    <div className="flex h-[100dvh] bg-background font-sans text-foreground overflow-hidden relative transition-colors duration-300">
      <LeftSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleBackToDashboard={() => navigate('/dashboard')}
        errorMsg={null}
        sidebarMode={sidebarMode}
        setSidebarMode={setSidebarMode}
        openFolderPath={openFolderPath}
        setOpenFolderPath={setOpenFolderPath}
        groupedFeeds={groupedFeeds}
        feedContentCache={feedContentCache}
        feedSummaryMap={feedSummaryMap}
        feedAvatarCache={feedAvatarCache}
        selectedFeedMeta={mode === 'dashboard' ? null : selectedFeedMeta}
        loadingFeedId={loadingFeedId}
        handleFeedSelect={handleFeedSelect}
        collapsedCategories={collapsedCategories}
        toggleCategoryCollapse={(value) => {
          setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
          });
        }}
        loading={false}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        generatedAt={contentData.generatedAt}
        updatedCount={contentData.updatedCount ?? contentData.notices.length}
      />

      <main className="flex-1 flex flex-col h-full bg-background relative overflow-hidden min-w-0">
        <div className="flex-1 min-h-0 overflow-hidden">
          {mode === 'dashboard' ? (
            <Dashboard
              feedEntries={schoolFeedEntries}
              schoolShortNameMap={schoolShortNameMap}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              onBackToDashboard={() => navigate('/')}
            />
          ) : (
            <ArticleList
              selectedFeed={selectedFeed}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              selectedDate={selectedDate}
              isRightSidebarOpen={isRightSidebarOpen}
              setIsRightSidebarOpen={setIsRightSidebarOpen}
              activeFilters={activeFilters}
              activeTagFilters={activeTagFilters}
              nowTs={nowTs}
              handleFilterToggle={(value) => {
                setCurrentPage(1);
                if (value === '__reset__') {
                  setActiveFilters([]);
                  setActiveTagFilters([]);
                  return;
                }
                setActiveFilters((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
              }}
              onCategorySelect={(category) => {
                setCurrentPage(1);
                setActiveFilters((prev) => (prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]));
              }}
              onTagSelect={(tag) => {
                setCurrentPage(1);
                setActiveTagFilters((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
              }}
              searchQuery={searchQuery}
              onSearchQueryChange={(value) => {
                setCurrentPage(1);
                setSearchQuery(value);
              }}
              onResetFilters={() => {
                setCurrentPage(1);
                setSearchQuery('');
                setActiveFilters([]);
                setActiveTagFilters([]);
                setSelectedDate(null);
              }}
              paginatedArticlesWithCategory={paginatedArticlesWithCategory}
              readArticleIds={readArticleIds}
              handleArticleSelect={handleArticleSelect}
              onRefresh={handleFakeRefresh}
              isRefreshing={isFakeRefreshing}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              filteredArticlesCount={filteredArticles.length}
              isLoadingMoreHistory={false}
              canLoadMoreHistory={false}
              showScrollToTop={false}
              handleScrollToTop={() => { }}
              articleListRef={articleListRef}
              visiblePageTokens={visiblePageTokens}
              feedId={selectedFeedMeta.id}
              initialScrollPosition={0}
              loadedCount={selectedFeed.items.length}
              totalCount={selectedFeed.items.length}
            />
          )}
        </div>
      </main>

      <AnimatePresence>
        {isRightSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsRightSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        'fixed inset-y-0 right-0 z-40 w-80 flex flex-col bg-card border-l transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0',
        isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full',
        !isRightSidebarOpen && 'lg:w-0 lg:border-none lg:overflow-hidden'
      )}>
        <div className="p-4 border-b flex items-center justify-between lg:hidden shrink-0">
          <h3 className="text-sm font-black uppercase tracking-widest">侧边面板</h3>
          <Button variant="ghost" size="icon" onClick={() => setIsRightSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-4 flex flex-col gap-6 h-full overflow-y-auto">
          <div className="flex flex-col gap-1">
            <CalendarWidget
              selectedDate={selectedDate}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setCurrentPage(1);
                setActiveTagFilters([]);
                if (date) setIsRightSidebarOpen(true);
              }}
              articleCountByDate={articleCountByDate}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Clock3 className="w-3.5 h-3.5 text-primary" />
                <span>时效过滤</span>
              </div>
              <div className="p-3 flex flex-col gap-2 bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))]">
                <label
                  className={cn(
                    'w-full flex items-center justify-between text-xs px-3 py-2 rounded transition-colors cursor-pointer bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))]',
                    timedOnly ? 'text-primary' : 'text-foreground'
                  )}
                >
                  <span className={cn('font-medium', timedOnly && 'text-primary')}>仅查看限时活动</span>
                  <Switch checked={timedOnly} onCheckedChange={setTimedOnly} aria-label="仅查看限时活动" />
                </label>
                <label
                  className={cn(
                    'w-full flex items-center justify-between text-xs px-3 py-2 rounded transition-colors cursor-pointer bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))]',
                    hideExpired ? 'text-primary' : 'text-foreground'
                  )}
                >
                  <span className={cn('font-medium', hideExpired && 'text-primary')}>隐藏已过期活动</span>
                  <Switch checked={hideExpired} onCheckedChange={setHideExpired} aria-label="隐藏已过期活动" />
                </label>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Tags className="w-3.5 h-3.5 text-primary" />
                <span>标签统计</span>
              </div>
              <div className="p-3 bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))]">
                <div className="relative">
                  <div
                    className={cn(
                      'flex flex-wrap gap-2 transition-[max-height] duration-300',
                      !shouldCollapseTagStats
                        ? 'max-h-none overflow-visible'
                        : tagStatsExpanded
                          ? 'max-h-none overflow-visible'
                          : 'max-h-[104px] overflow-hidden'
                    )}
                  >
                    {tagStats.map((item) => {
                      const active = activeTagFilters.includes(item.tag);
                      return (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => {
                            setCurrentPage(1);
                            setActiveTagFilters((prev) => (prev.includes(item.tag) ? prev.filter((tag) => tag !== item.tag) : [...prev, item.tag]));
                          }}
                          className={cn(
                            'text-xs px-2.5 py-1 rounded border transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))] hover:border-primary/50'
                          )}
                        >
                          #{item.tag} ({item.count})
                        </button>
                      );
                    })}
                    {tagStats.length === 0 && <p className="text-xs text-muted-foreground">暂无标签数据</p>}
                  </div>
                  {!tagStatsExpanded && shouldCollapseTagStats && (
                    <div className="pointer-events-none absolute inset-x-0 -bottom-1.5 h-5 bg-gradient-to-t from-[rgb(255,255,255)] via-[rgba(255,255,255,0.9)] to-transparent dark:from-[hsl(var(--card))] dark:via-[hsl(var(--card)/0.92)]" />
                  )}
                </div>
                {shouldCollapseTagStats && (
                  <button
                    type="button"
                    onClick={() => setTagStatsExpanded((prev) => !prev)}
                    className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {tagStatsExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        <span>收起</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        <span>展开剩余{tagStats.length - 6}项</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <DailySummaryPanel
              selectedDate={selectedDate}
              selectedSchoolSlug={selectedFeedMeta?.schoolSlug || selectedFeedMeta?.id || null}
              conclusionBySchool={contentData.conclusionBySchool}
            />
          </div>
        </div>
      </aside>

      <NoticeDetailModal
        article={activeArticle}
        onClose={handleModalClose}
        onPrev={handlePrev}
        onNext={handleNext}
        canPrev={activeIndex > 0}
        canNext={activeIndex >= 0 && activeIndex < filteredArticles.length - 1}
        shareUrl={
          activeArticle && selectedFeedMeta
            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/school/${isSummaryFeedMeta(selectedFeedMeta) && selectedFeedMeta.schoolSlug ? selectedFeedMeta.schoolSlug : selectedFeedMeta.id}#${activeArticle.guid}`
            : ''
        }
      />
    </div>
  );
};

const App: React.FC = () => {
  const { contentData, searchData, error } = useCompiledData();

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <h1 className="text-xl font-black">内容加载失败</h1>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    );
  }

  if (!contentData) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground font-semibold">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>载入中</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AppShell mode="list" contentData={contentData} searchData={searchData} />} />
      <Route path="/school/:slug" element={<AppShell mode="list" contentData={contentData} searchData={searchData} />} />
      <Route path="/dashboard" element={<AppShell mode="dashboard" contentData={contentData} searchData={searchData} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
