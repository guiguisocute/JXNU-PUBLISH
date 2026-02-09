import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Share2,
  X,
} from 'lucide-react';
import { Article } from '../types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import jxnuLogo from '../content/img/JXNUlogo.png';
import { renderSimpleMarkdown } from '../lib/simple-markdown';

interface NoticeDetailModalProps {
  article: Article | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  shareUrl: string;
}

export const NoticeDetailModal: React.FC<NoticeDetailModalProps> = ({
  article,
  onClose,
  onPrev,
  onNext,
  canPrev,
  canNext,
  shareUrl,
}) => {
  const { toast } = useToast();
  const [badgeSrc, setBadgeSrc] = React.useState(jxnuLogo);
  const [nowTs, setNowTs] = React.useState(() => Date.now());
  const openedAtRef = React.useRef(0);

  React.useEffect(() => {
    if (!article) return;
    openedAtRef.current = Date.now();
    setNowTs(Date.now());
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [article]);

  const handleOverlayClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (Date.now() - openedAtRef.current < 250) return;
    onClose();
  }, [onClose]);

  const formatEndTime = React.useCallback((value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, []);

  const getCountdownText = React.useCallback((endAt?: string) => {
    if (!endAt) return '';
    const end = new Date(endAt).getTime();
    if (!Number.isFinite(end)) return '';
    const remain = Math.max(0, end - nowTs);
    const totalSeconds = Math.floor(remain / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分`;
    return `${minutes}分${seconds}秒`;
  }, [nowTs]);

  const timing = React.useMemo(() => {
    if (!article?.startAt || !article?.endAt) return { state: 'none' as const, progress: 0 };
    const now = nowTs;
    const start = new Date(article.startAt).getTime();
    const end = new Date(article.endAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { state: 'none' as const, progress: 0 };
    if (now < start) return { state: 'upcoming' as const, progress: 0 };
    if (now > end) return { state: 'expired' as const, progress: 100 };
    const progress = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
    return { state: 'active' as const, progress };
  }, [article?.endAt, article?.startAt, nowTs]);

  const countdownLabel = React.useMemo(() => `剩余 ${getCountdownText(article?.endAt)}`, [article?.endAt, getCountdownText]);
  const countdownWhiteMix = React.useMemo(() => {
    const ratio = (timing.progress - 50) / 20;
    return Math.max(0, Math.min(1, ratio));
  }, [timing.progress]);

  React.useEffect(() => {
    if (!article) return;
    setBadgeSrc(article.badge || jxnuLogo);
  }, [article]);
  const iconForAttachment = (type?: string, name?: string) => {
    const ext = (type || name?.split('.').pop() || 'file').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return FileImage;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FileArchive;
    if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return FileVideo;
    if (['mp3', 'wav', 'ogg'].includes(ext)) return FileAudio;
    return FileText;
  };

  React.useEffect(() => {
    if (!article) return undefined;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && canPrev) onPrev();
      if (event.key === 'ArrowRight' && canNext) onNext();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [article, canNext, canPrev, onClose, onNext, onPrev]);

  const handleShare = async () => {
    if (!article) return;
    const rawUrl = shareUrl || `${window.location.origin}${window.location.pathname}#${article.guid}`;
    const targetUrl = (() => {
      try {
        const parsed = new URL(rawUrl, window.location.origin);
        const encodedPath = parsed.pathname
          .split('/')
          .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
          .join('/');
        const encodedHash = parsed.hash
          ? `#${encodeURIComponent(decodeURIComponent(parsed.hash.slice(1)))}`
          : '';
        return `${parsed.origin}${encodedPath}${parsed.search}${encodedHash}`;
      } catch {
        return encodeURI(rawUrl);
      }
    })();

    const fallbackCopy = (text: string): boolean => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(targetUrl);
        toast({ description: '复制链接成功' });
        return;
      }
    } catch {
      // Continue to fallback.
    }

    if (fallbackCopy(targetUrl)) {
      toast({ description: '复制链接成功' });
      return;
    }

    window.prompt('复制此链接', targetUrl);
    toast({ description: '无法自动复制，请手动复制链接', variant: 'destructive' });
  };

  const descriptionHtml = React.useMemo(
    () => renderSimpleMarkdown(article?.description || ''),
    [article?.description]
  );

  return (
    <AnimatePresence>
      {article && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 md:p-8"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="mx-auto h-full max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border bg-background shadow-2xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex h-16 items-center justify-between border-b px-4 md:px-6 shrink-0">
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border bg-background overflow-hidden shrink-0">
                  <img
                    src={badgeSrc}
                    alt="院徽"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={() => setBadgeSrc(jxnuLogo)}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {article.author || '未知发布人'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {article.source?.channel || article.feedTitle || '通知来源'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <ScrollArea className="flex-1">
              <div className="mx-auto w-full max-w-3xl min-w-0 p-5 md:p-8">
                <div className="flex flex-wrap gap-2 mb-4">
                  {timing.state === 'active' && (
                    <div className="w-full mb-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold">限时</span>
                        <span className="text-muted-foreground">截止 {formatEndTime(article.endAt)}</span>
                      </div>
                      <div className="relative w-full h-6 rounded-full bg-muted overflow-hidden border border-border/40">
                        <motion.div
                          className="h-full bg-[repeating-linear-gradient(45deg,hsl(var(--primary))_0_8px,hsl(var(--primary)/0.75)_8px_16px)]"
                          style={{ width: `${timing.progress}%` }}
                          animate={{ backgroundPositionX: [0, 24] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                          <span className="relative leading-none">
                            <span className="text-foreground">{countdownLabel}</span>
                            <span className="absolute inset-0 text-primary-foreground transition-opacity" style={{ opacity: countdownWhiteMix }}>
                              {countdownLabel}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {timing.state === 'expired' && (
                    <span className="text-[11px] px-2 py-1 rounded border border-zinc-700/60 bg-zinc-800/70 text-zinc-300 font-bold">已过期</span>
                  )}
                  {article.aiCategory && (
                    <span className="text-[11px] bg-primary text-primary-foreground px-2 py-1 rounded border border-primary/80 font-semibold">{article.aiCategory}</span>
                  )}
                  {(article.tags || []).filter((tag) => String(tag).trim() !== '学院通知').map((tag) => (
                    <span key={tag} className="text-[11px] bg-muted text-foreground px-2 py-1 rounded border">#{tag}</span>
                  ))}
                </div>

                <h2 className="text-3xl md:text-4xl font-black leading-tight mb-4 break-words [overflow-wrap:anywhere]">{article.title}</h2>

                <div
                  className="text-base leading-relaxed text-muted-foreground mb-6 break-words [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />

                {article.attachments && article.attachments.length > 0 && (
                  <section className="mb-6 rounded-xl border bg-muted/20 p-4">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">附件下载</h3>
                    <div className="space-y-2">
                      {article.attachments.map((attachment) => {
                        const Icon = iconForAttachment(attachment.type, attachment.name);
                        return (
                          <a
                            key={`${attachment.url}-${attachment.name}`}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm hover:border-primary/50"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{attachment.name}</p>
                                <p className="text-xs text-muted-foreground">{attachment.type || 'file'}</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-primary text-xs font-bold">
                              下载 <Download className="h-3.5 w-3.5" />
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </section>
                )}

                <article className="prose prose-slate max-w-none text-base leading-relaxed dark:prose-invert overflow-x-hidden prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-code:break-all prose-p:break-words prose-p:[overflow-wrap:anywhere] prose-li:break-words prose-li:[overflow-wrap:anywhere] prose-headings:break-words prose-headings:[overflow-wrap:anywhere] prose-a:break-all prose-img:max-w-full prose-table:block prose-table:max-w-full prose-table:overflow-x-auto">
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </article>

              </div>
            </ScrollArea>

            <footer className="px-4 py-3 md:px-6 border-t bg-background shrink-0">
              <div className="flex items-center justify-center gap-2 lg:hidden mb-3">
                <Button variant="outline" size="icon" onClick={onPrev} disabled={!canPrev} className="h-10 w-10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={onNext} disabled={!canNext} className="h-10 w-10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 lg:hidden">
                <div className="inline-flex items-center gap-1 text-sm text-muted-foreground min-w-0">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span className="truncate">{new Date(article.pubDate).toLocaleString('zh-CN')}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" className="gap-2 h-10 px-3" onClick={handleShare}>
                    <Share2 className="h-4 w-4" /> 分享
                  </Button>
                  <Button onClick={onClose} className="h-10 px-4">关闭</Button>
                </div>
              </div>

              <div className="hidden lg:flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 text-sm text-muted-foreground min-w-0">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span className="truncate">{new Date(article.pubDate).toLocaleString('zh-CN')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={onPrev} disabled={!canPrev} className="h-10 w-10">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={onNext} disabled={!canNext} className="h-10 w-10">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" className="gap-2 h-10 px-3" onClick={handleShare}>
                    <Share2 className="h-4 w-4" /> 分享
                  </Button>
                  <Button onClick={onClose} className="h-10 px-4">关闭</Button>
                </div>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
