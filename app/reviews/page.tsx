'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { GlobalNav } from '@/components/global-nav';
import { ActivityReviewDrawer } from '@/components/ActivityReviewDrawer';
import { isActivityCompleted } from '@/lib/beijing-time';
import { canUploadActivityPhotos } from '@/lib/calendar-auth';
import { 
  ClipboardCheck, 
  MessageSquare, 
  Camera, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Star, 
  Plus, 
  RefreshCw,
  Users,
  ShieldCheck
} from 'lucide-react';

export default function ActivityReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [keyword, setKeyword] = useState('');
  const [account, setAccount] = useState<any>(null);

  // 抽屉弹窗状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [drawerTab, setDrawerTab] = useState<'review' | 'discussion' | 'photos'>('review');

  // 未复盘的已结束活动（日历中待复盘）
  const [unreviewedEvents, setUnreviewedEvents] = useState<any[]>([]);

  const fetchAccount = async () => {
    try {
      const res = await fetch('/api/account', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data?.user) {
        setAccount(data.user);
      }
    } catch {
      setAccount(null);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const filterParam = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/calendar/reviews${filterParam}`, { cache: 'no-store' });
      const data = await res.json();
      setReviews(data.items || []);

      // 同时也获取日历事件，检测是否有昨天或已结束但尚未复盘的活动
      const calRes = await fetch('/api/learning-calendar', { cache: 'no-store' });
      const calData = await calRes.json();
      if (calData?.events) {
        const reviewedEventIds = new Set((data.items || []).map((r: any) => r.event_id));
        const pending = calData.events.filter((ev: any) => {
          const isDone = isActivityCompleted(ev.date, null, ev.status);
          return isDone && !reviewedEventIds.has(ev.id);
        });
        setUnreviewedEvents(pending);
      }
    } catch (e) {
      console.error('加载复盘中心数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAccount();
  }, []);

  useEffect(() => {
    void fetchReviews();
  }, [statusFilter]);

  // 搜索过滤
  const filteredReviews = useMemo(() => {
    if (!keyword.trim()) return reviews;
    const q = keyword.trim().toLowerCase();
    return reviews.filter((r) => {
      return (
        r.event_title?.toLowerCase().includes(q) ||
        r.highlights?.toLowerCase().includes(q) ||
        r.issues?.toLowerCase().includes(q) ||
        r.optimizations?.toLowerCase().includes(q) ||
        r.event_date?.includes(q)
      );
    });
  }, [reviews, keyword]);

  // 统计指标
  const stats = useMemo(() => {
    const total = reviews.length;
    const totalPhotos = reviews.reduce((acc, cur) => acc + (Number(cur.photo_count) || 0), 0);
    const totalComments = reviews.reduce((acc, cur) => acc + (Number(cur.comment_count) || 0), 0);
    const resolved = reviews.filter((r) => r.action_status === 'resolved').length;
    const open = reviews.filter((r) => r.action_status === 'open' || r.action_status === 'in_progress').length;
    return { total, totalPhotos, totalComments, resolved, open };
  }, [reviews]);

  const handleOpenDrawer = (eventObj: any, tab: 'review' | 'discussion' | 'photos' = 'review') => {
    setSelectedEvent(eventObj);
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const isAdmin = canUploadActivityPhotos(account?.email);

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-stone-800 flex flex-col font-sans">
      <GlobalNav active="reviews" />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* 顶部标题区 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-stone-200/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-emerald-800 mb-1">
              <span>🌾 研学经验智库 · 团队持续进化</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span>活动执行复盘与优化中心</span>
              <span className="text-xs font-sans font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                KPT 框架
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              沉淀历次研学现场亮点、排查问题卡点、追踪行动项闭环，结合现场实况照片打造团队成长资产库
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchReviews}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 shadow-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
            <a
              href="/yanxue-calendar"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#27563c] hover:bg-[#1e4530] text-xs font-semibold text-white shadow-xs transition"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#e5c178]" />
              <span>前往活动日历</span>
            </a>
          </div>
        </div>

        {/* 统计指标卡片 */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 block">已沉淀复盘档案</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-stone-900">{stats.total}</span>
                <span className="text-xs text-stone-500">场</span>
              </div>
            </div>
            <ClipboardCheck className="w-5 h-5 text-[#27563c]" />
          </div>

          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 block">现场实况归档照</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-indigo-700">{stats.totalPhotos}</span>
                <span className="text-xs text-stone-500">张</span>
              </div>
            </div>
            <Camera className="w-5 h-5 text-indigo-600" />
          </div>

          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 block">团队优化讨论</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-amber-700">{stats.totalComments}</span>
                <span className="text-xs text-stone-500">条</span>
              </div>
            </div>
            <MessageSquare className="w-5 h-5 text-amber-600" />
          </div>

          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 block">优化行动项已闭环</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-emerald-700">{stats.resolved}</span>
                <span className="text-xs text-stone-500">/ {stats.resolved + stats.open} 项</span>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </section>

        {/* 提示：有已结束的活动等待发起复盘 */}
        {unreviewedEvents.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⏳</span>
                <span className="text-xs font-bold text-amber-900">
                  发现 {unreviewedEvents.length} 场已结束活动尚未填写复盘记录：
                </span>
              </div>
              <span className="text-[11px] text-amber-800">打铁趁热，沉淀团队实战经验</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {unreviewedEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() =>
                    handleOpenDrawer(
                      { id: ev.id, name: ev.name, title: ev.name, date: ev.date, people: ev.people, place: ev.place },
                      'review'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                >
                  <span>✍️ 复盘：{ev.name} ({ev.date})</span>
                  <ArrowRight className="w-3 h-3 text-amber-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 筛选与搜索工具栏 */}
        <div className="p-4 rounded-xl bg-white border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索活动主题、亮点做法、卡点或下次优化方案…"
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-stone-200 bg-stone-50/70 focus:bg-white focus:outline-none focus:border-[#27563c] transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-stone-500">
              <Filter className="w-3.5 h-3.5" />
              <span>跟进状态：</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs px-3 py-2 rounded-lg border border-stone-200 bg-stone-50/70 focus:bg-white text-stone-900 font-medium"
            >
              <option value="all">全部复盘状态</option>
              <option value="open">🔴 待优化跟进</option>
              <option value="in_progress">🟡 优化推进中</option>
              <option value="resolved">🟢 已落实闭环</option>
            </select>
          </div>
        </div>

        {/* 复盘卡片列表 */}
        {loading ? (
          <div className="py-20 text-center text-xs text-stone-400">
            正在载入活动复盘档案…
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center space-y-3">
            <ClipboardCheck className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-base font-bold text-stone-700">暂无符合条件的活动复盘</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              活动结束后，您可以在活动日历上直接点击「活动复盘记录」或通过上方快捷提示创建复盘。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredReviews.map((item) => (
              <article
                key={item.id}
                onClick={() =>
                  handleOpenDrawer({
                    id: item.event_id,
                    name: item.event_title,
                    title: item.event_title,
                    date: item.event_date,
                    people: item.actual_participants,
                  })
                }
                className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs hover:border-[#27563c]/60 hover:shadow-md transition-all cursor-pointer relative"
              >
                <div>
                  {/* 卡片头部 */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                      <CalendarIcon className="w-3 h-3 text-stone-500" />
                      {item.event_date}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.overall_rating && (
                        <span className="text-xs text-amber-500 font-bold flex items-center">
                          {'★'.repeat(item.overall_rating)}
                          <span className="text-[11px] text-stone-400 ml-1">({item.overall_rating}分)</span>
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.action_status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.action_status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.action_status === 'resolved'
                          ? '🟢 优化已闭环'
                          : item.action_status === 'in_progress'
                          ? '🟡 优化推进中'
                          : '🔴 待优化跟进'}
                      </span>
                    </div>
                  </div>

                  {/* 标题 */}
                  <h2 className="mt-3 text-lg font-bold font-serif text-stone-900 group-hover:text-[#27563c] transition-colors">
                    {item.event_title}
                  </h2>

                  {/* 现场封面照片（如果有） */}
                  {item.cover_photo && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-stone-100 bg-stone-100 relative aspect-16/9">
                      <img
                        src={item.cover_photo}
                        alt={item.event_title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                        loading="lazy"
                      />
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>共 {item.photo_count || 1} 张现场照片</span>
                      </span>
                    </div>
                  )}

                  {/* KPT 结构化展示 */}
                  <div className="mt-3.5 space-y-2 text-xs">
                    {item.highlights && (
                      <div className="rounded-lg bg-emerald-50/70 p-2.5 text-stone-800 border border-emerald-100">
                        <div className="font-bold text-emerald-900 flex items-center gap-1 mb-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>执行亮点 (Keep)</span>
                        </div>
                        <p className="line-clamp-2 leading-relaxed text-stone-700">
                          {item.highlights}
                        </p>
                      </div>
                    )}

                    {item.issues && (
                      <div className="rounded-lg bg-rose-50/70 p-2.5 text-stone-800 border border-rose-100">
                        <div className="font-bold text-rose-900 flex items-center gap-1 mb-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                          <span>现场卡点 (Problem)</span>
                        </div>
                        <p className="line-clamp-2 leading-relaxed text-stone-700">
                          {item.issues}
                        </p>
                      </div>
                    )}

                    {item.optimizations && (
                      <div className="rounded-lg bg-indigo-50/70 p-2.5 text-stone-800 border border-indigo-100">
                        <div className="font-bold text-indigo-900 flex items-center gap-1 mb-0.5">
                          <Lightbulb className="w-3.5 h-3.5 text-indigo-700" />
                          <span>下次优化措施 (Try)</span>
                        </div>
                        <p className="line-clamp-2 leading-relaxed text-stone-700">
                          {item.optimizations}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 卡片底部操作栏 */}
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-stone-600 font-medium">
                      <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                      <span>{item.comment_count ?? 0} 条讨论</span>
                    </span>
                    <span className="flex items-center gap-1 text-stone-600 font-medium">
                      <Camera className="w-3.5 h-3.5 text-stone-400" />
                      <span>{item.photo_count ?? 0} 张照片</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[#27563c] font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
                    <span>查阅与讨论</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* 复盘详情与优化讨论抽屉 */}
      <ActivityReviewDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        event={selectedEvent}
        currentUser={account}
        initialTab={drawerTab}
        onSaved={fetchReviews}
      />
    </div>
  );
}
