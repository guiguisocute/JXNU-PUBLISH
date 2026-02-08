
export interface Enclosure {
  link: string;
  type: string;
}

export interface NoticeAttachment {
  name: string;
  url: string;
  type?: string;
}

export interface NoticeSource {
  channel?: string;
  sender?: string;
}

// 媒体URL双格式：支持代理和直连两种模式
export interface MediaUrl {
  original: string;   // 原始URL，用于直连模式
  proxied: string;    // 代理URL，通过服务器代理访问
}

export enum ArticleCategory {
  NOTICE = '通知公告',
  COMPETITION = '竞赛相关',
  VOLUNTEER = '志愿实习',
  SECOND_CLASS = '二课活动',
  FORM = '问卷填表',
  OTHER = '其它分类',
}

export interface Article {
  title: string;
  pubDate: string;
  link: string;
  guid: string;
  author: string;
  thumbnail: MediaUrl;       // 缩略图双URL格式
  description: string;
  content: string;
  enclosure: Enclosure;
  feedTitle?: string;
  aiCategory?: string;       // Stored classification
  tags?: string[];
  attachments?: NoticeAttachment[];
  source?: NoticeSource;
  badge?: string;
  startAt?: string;
  endAt?: string;
  pinned?: boolean;
}

export interface Feed {
  url: string;
  title: string;
  description: string;
  image: MediaUrl;           // Feed头像双URL格式
  items: Article[];
  category?: string;
  isSub?: boolean;
}

// 订阅源配置元信息（不含文章内容，用于首屏快速渲染左侧列表）
export interface FeedMeta {
  id: string;
  category: string;
  isSub: boolean;
  customTitle?: string;
  schoolSlug?: string;
  sourceChannel?: string;
  hiddenInSidebar?: boolean;
  canProxyImages?: boolean;
}

export interface FeedStats {
  feedName: string;
  articleCount: number;
}

export interface FeedSummary {
  id: string;
  articleCount: number;
}

// --- Image Proxy Settings ---
// 代理模式：
// - 'all': 全部代理（媒体通过服务器加载，适合无法直接访问图片源的用户）
// - 'none': 不代理（媒体从用户浏览器直连，不消耗服务器流量）
export type ImageProxyMode = 'all' | 'none';

// --- 媒体URL选择工具函数 ---
/**
 * 根据代理模式从MediaUrl中选择合适的URL
 * @param media - 媒体URL对象或字符串（兼容旧数据）
 * @param proxyMode - 当前代理模式
 * @returns 选择后的URL字符串
 */
export const selectMediaUrl = (
  media: MediaUrl | string | undefined,
  proxyMode: ImageProxyMode
): string => {
  if (!media) return '';
  
  // 兼容旧数据：如果是字符串，直接返回
  if (typeof media === 'string') return media;
  
  // 根据代理模式选择URL
  if (proxyMode === 'none') {
    return media.original;  // 用户直连，不消耗服务器流量
  } else {
    return media.proxied;   // 'all' 走代理
  }
};

/**
 * 构建代理URL
 * @param originalUrl - 原始媒体URL
 * @returns 代理URL路径
 */
export const buildProxiedUrl = (originalUrl: string): string => {
  if (!originalUrl || !originalUrl.startsWith('http')) {
    return originalUrl || '';
  }
  return `/api/media/proxy?url=${encodeURIComponent(originalUrl)}`;
};

/**
 * 创建MediaUrl对象
 * @param originalUrl - 原始媒体URL
 * @returns MediaUrl对象
 */
export const createMediaUrl = (originalUrl: string): MediaUrl => {
  return {
    original: originalUrl || '',
    proxied: buildProxiedUrl(originalUrl)
  };
};
