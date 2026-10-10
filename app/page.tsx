'use client';

import { useEffect, useMemo, useState } from 'react';
import { GlobalNav } from '@/components/global-nav';
import { 
  Calendar as CalendarIcon, 
  Calculator, 
  PackageCheck, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Users, 
  MapPin, 
  PlusCircle, 
  Sparkles,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { MascotClusterLeft, MascotClusterRight } from '@/components/family-mascots';

type Event = {
  id: string;
  date: string;
  name: string;
  people: number;
  place: string;
  status: string;
  materials: { name: string; done: boolean }[];
};

const statusText: Record<string, string> = {
  confirmed: '已确定',
  pending: '待确认',
  booking: '预约中',
  completed: '已完成',
  cancelled: '已取消',
};

// 精品江南农耕研学方案示范
const featuredSchemes = [
  {
    title: '江南稻香探秘 · 水稻全生命周期与农耕手作',
    grade: '小学 1-6 年级 / 亲子家庭',
    duration: '1 日研学 (09:00 - 16:00)',
    highlights: ['水稻田间生态观察', '传统石磨碾米与脱粒', '非遗五彩稻香饭手作'],
    targetPrice: '¥ 198 / 人',
    badge: '秋季爆款',
  },
  {
    title: '二十四节气智慧 · 农事节令与非遗草木染',
    grade: '中小学全学段 / 研学团',
    duration: '1 日研学 (09:30 - 15:30)',
    highlights: ['农耕二十四节气探源', '田间植物采摘识百草', '传统板蓝草木染织体验'],
    targetPrice: '¥ 218 / 人',
    badge: '传统文化',
  },
  {
    title: '小小水利家 · 江南圩田系统与古代水车研造',
    grade: '小学 3 年级以上 / 初中',
    duration: '1 日研学 (09:00 - 16:30)',
    highlights: ['太湖流域圩田水系探究', '古法龙骨水车踩水体验', '鲁班锁与微缩水车模型拼装'],
    targetPrice: '¥ 238 / 人',
    badge: 'STEAM 探究',
  },
];

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/learning-calendar', { cache: 'no-store' })
      .then(async (r) => {
        const d = (await r.json()) as any;
        if (!r.ok) throw new Error(d?.error || '读取日历失败');
        if (active) {
          setEvents(d?.events || []);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : '日历暂不可用');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const month = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);
  const monthEvents = useMemo(() => events.filter((e) => e.date.startsWith(month)), [events, month]);
  const followups = monthEvents.filter((e) => e.status === 'pending' || e.status === 'booking');
  const unready = monthEvents.reduce(
    (n, e) => n + (e.materials || []).filter((m) => !m.done).length,
    0
  );
  const upcoming = events
    .filter((e) => e.date >= today && e.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf9] text-[#121212]">
      <GlobalNav active="overview" />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 sm:px-8 py-8 space-y-10">
        {/* Banner Hero - Family 经典手绘吉祥物绘本跨页 (居中大标题 + 左右童趣萌兽插画簇 + 高对比清晰按钮) */}
        <section className="relative overflow-hidden rounded-[14px] bg-[#ffffff] border border-[#e5d5c3] px-6 py-12 sm:py-16 md:py-20 flex flex-col items-center justify-center text-center">
          {/* 左侧手绘吉祥物插画簇 (稻米小精灵、麦穗金币、教案折角纸片、红心等) */}
          <div className="absolute left-0 lg:left-4 top-1/2 -translate-y-1/2 w-48 sm:w-60 lg:w-72 hidden md:block pointer-events-none opacity-95">
            <MascotClusterLeft />
          </div>

          {/* 右侧手绘吉祥物插画簇 (书包小怪兽、笑眼花花怪、三角饭团小精灵、小蜜蜂、放大镜等) */}
          <div className="absolute right-0 lg:right-4 top-1/2 -translate-y-1/2 w-48 sm:w-60 lg:w-72 hidden md:block pointer-events-none opacity-95">
            <MascotClusterRight />
          </div>

          {/* 居中核心内容区 (绝对居中，留足呼吸感，字迹清晰深邃) */}
          <div className="relative z-10 max-w-xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f6f4ef] text-[#343433] text-xs font-semibold tracking-wider border border-[#e5d5c3]">
              <Sparkles className="w-3.5 h-3.5 text-[#d48f00]" />
              江南农耕文化研学 · 数字化运营平台
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#121212] leading-[1.15]">
              研学运营工作台
            </h1>

            <p className="text-[#474645] text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              覆盖方案策划、精准测算、排期日历与物资备货四大关键环节。让每一场田野农耕研学有据可依、高效协同。
            </p>

            {/* 居中核心 CTA 胶囊按钮组 (高对比度、白字黑底、绝对保证字迹 100% 清晰) */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/pricing"
                className="btn-dark-pill inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-6 py-3 rounded-full transition-all hover:scale-[1.02] shadow-sm"
                style={{ backgroundColor: '#121212', color: '#ffffff' }}
              >
                <Calculator className="w-4 h-4 text-white" />
                <span style={{ color: '#ffffff' }}>开始成本测算</span>
              </a>

              <a
                href="/yanxue-calendar"
                className="btn-sand-pill inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-5 py-3 rounded-full border border-[#e5d5c3] transition-all hover:scale-[1.02]"
                style={{ backgroundColor: '#f6f4ef', color: '#121212' }}
              >
                <CalendarIcon className="w-4 h-4 text-[#d48f00]" />
                <span style={{ color: '#121212' }}>查看排期日历</span>
              </a>

              <a
                href="/scheme-import"
                className="btn-sand-pill inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-5 py-3 rounded-full border border-[#e5d5c3] transition-all hover:scale-[1.02]"
                style={{ backgroundColor: '#f6f4ef', color: '#121212' }}
              >
                <FileText className="w-4 h-4 text-[#0086fc]" />
                <span style={{ color: '#121212' }}>导入新方案</span>
              </a>
            </div>

            {/* 手机端可见的萌系吉祥物徽章 */}
            <div className="flex md:hidden items-center justify-center gap-2 pt-2 text-xs text-[#7e7e7d]">
              <span>🌾 探秘自然</span>
              <span>·</span>
              <span>🌱 躬耕田野</span>
              <span>·</span>
              <span>🎒 快乐研学</span>
            </div>
          </div>
        </section>

        {/* 本月关键运营数据速览 (Family 纸感平铺指标带) */}
        <section className="rounded-[10px] bg-[#ffffff] border border-[#e5d5c3] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-[#f2f0ed] gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00c978] animate-pulse" />
              <h2 className="text-sm font-bold text-[#121212]">本月实时运营速览</h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f6f4ef] text-[#474645] font-semibold border border-[#e5d5c3]">
                {month}
              </span>
            </div>
            <span className="text-xs text-[#7e7e7d]">云端数据自动同步</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-[8px] bg-[#fbfaf9] border border-[#f2f0ed]">
              <span className="text-xs text-[#7e7e7d] block font-medium">本月出团场次</span>
              <strong className="text-2xl sm:text-3xl font-black text-[#121212] block mt-1">
                {loading ? '—' : monthEvents.length} <small className="text-xs font-normal text-[#7e7e7d]">场</small>
              </strong>
            </div>
            <div className="p-4 rounded-[8px] bg-[#fbfaf9] border border-[#f2f0ed]">
              <span className="text-xs text-[#7e7e7d] block font-medium">总服务人数</span>
              <strong className="text-2xl sm:text-3xl font-black text-[#121212] block mt-1">
                {loading ? '—' : monthEvents.reduce((n, e) => n + Number(e.people || 0), 0)}{' '}
                <small className="text-xs font-normal text-[#7e7e7d]">人</small>
              </strong>
            </div>
            <div className="p-4 rounded-[8px] bg-[#fbfaf9] border border-[#f2f0ed]">
              <span className="text-xs text-[#7e7e7d] block font-medium">待确认活动</span>
              <strong className="text-2xl sm:text-3xl font-black text-[#d48f00] block mt-1">
                {loading ? '—' : followups.length} <small className="text-xs font-normal text-[#7e7e7d]">场</small>
              </strong>
            </div>
            <div className="p-4 rounded-[8px] bg-[#fbfaf9] border border-[#f2f0ed]">
              <span className="text-xs text-[#7e7e7d] block font-medium">待备货物资</span>
              <strong className="text-2xl sm:text-3xl font-black text-[#00c978] block mt-1">
                {loading ? '—' : unready} <small className="text-xs font-normal text-[#7e7e7d]">项</small>
              </strong>
            </div>
          </div>
        </section>

        {/* 核心工作区卡片 (Family 纸感微边框规范) */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs font-bold text-[#7e7e7d] tracking-wider uppercase">WORKSPACES</span>
              <h2 className="text-2xl font-bold text-[#121212]">研学运营核心工作区</h2>
              <p className="text-sm text-[#474645] mt-1">覆盖研学活动全生命周期业务流程</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 01 方案库 */}
            <a
              href="/schemes"
              className="group p-6 rounded-[10px] bg-white border border-[#e5d5c3] hover:border-[#121212] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-11 h-11 rounded-full bg-[#64c6ff]/15 text-[#0086fc] flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#7e7e7d]">WORKSPACE 01</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#121212] group-hover:text-[#ff3e00] transition-colors">
                    研学方案库
                  </h3>
                  <p className="text-xs text-[#474645] mt-2 leading-relaxed">
                    沉淀农耕文化精品教案，解析课程目标、行程与物料需求。
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f2f0ed] flex items-center justify-between text-xs font-semibold text-[#121212] group-hover:text-[#ff3e00]">
                <span>进入方案库</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* 02 定价台 */}
            <a
              href="/pricing"
              className="group p-6 rounded-[10px] bg-white border border-[#e5d5c3] hover:border-[#121212] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-11 h-11 rounded-full bg-[#ffbb26]/20 text-[#d48f00] flex items-center justify-center">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#7e7e7d]">WORKSPACE 02</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#121212] group-hover:text-[#ff3e00] transition-colors">
                    研学定价台
                  </h3>
                  <p className="text-xs text-[#474645] mt-2 leading-relaxed">
                    按人/组精准核算成本，实时计算保本售价、毛利率与云端档案。
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f2f0ed] flex items-center justify-between text-xs font-semibold text-[#121212] group-hover:text-[#ff3e00]">
                <span>开始定价测算</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* 03 日历台 */}
            <a
              href="/yanxue-calendar"
              className="group p-6 rounded-[10px] bg-white border border-[#e5d5c3] hover:border-[#121212] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-11 h-11 rounded-full bg-[#00c978]/15 text-[#00c978] flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#7e7e7d]">WORKSPACE 03</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#121212] group-hover:text-[#ff3e00] transition-colors">
                    活动排期日历
                  </h3>
                  <p className="text-xs text-[#474645] mt-2 leading-relaxed">
                    月历与日程列表协同排期，实时掌握预约、确定状态及人员规模。
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f2f0ed] flex items-center justify-between text-xs font-semibold text-[#121212] group-hover:text-[#ff3e00]">
                <span>查看排期日历</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* 04 物资中心 */}
            <a
              href="/yanxue-calendar/materials"
              className="group p-6 rounded-[10px] bg-white border border-[#e5d5c3] hover:border-[#121212] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-11 h-11 rounded-full bg-[#9f4fff]/15 text-[#9f4fff] flex items-center justify-center">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#7e7e7d]">WORKSPACE 04</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#121212] group-hover:text-[#ff3e00] transition-colors">
                    物资准备中心
                  </h3>
                  <p className="text-xs text-[#474645] mt-2 leading-relaxed">
                    按月汇总备货需求，直观勾选准备进度，避免活动现场物料遗漏。
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f2f0ed] flex items-center justify-between text-xs font-semibold text-[#121212] group-hover:text-[#ff3e00]">
                <span>管理备货物资</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          </div>
        </section>

        {/* 运营概览与近期活动 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 指标看板 */}
          <div className="lg:col-span-1 p-6 rounded-[10px] bg-white border border-[#e5d5c3] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#7e7e7d] tracking-wider uppercase">THIS MONTH</span>
                <h3 className="text-xl font-bold text-[#121212]">本月运营概览</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#f2f0ed] text-[#343433] font-semibold border border-[#e5d5c3]">
                {month}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-[8px] bg-[#fbfaf9] border border-[#f2f0ed]">
                <div className="flex items-center justify-between text-[#7e7e7d] mb-1">
                  <span className="text-xs">本月活动</span>
                  <CalendarIcon className="w-4 h-4 text-[#121212]" />
                </div>
                <strong className="block text-2xl font-black text-[#121212]">
                  {loading ? '—' : monthEvents.length} <small className="text-xs font-normal text-[#7e7e7d]">场</small>
                </strong>
              </div>
              <div className="p-3.5 rounded-[8px] bg-[#fbfaf9] border border-[#f2f0ed]">
                <div className="flex items-center justify-between text-[#7e7e7d] mb-1">
                  <span className="text-xs">预计参与</span>
                  <Users className="w-4 h-4 text-[#121212]" />
                </div>
                <strong className="block text-2xl font-black text-[#121212]">
                  {loading ? '—' : monthEvents.reduce((n, e) => n + Number(e.people || 0), 0)}{' '}
                  <small className="text-xs font-normal text-[#7e7e7d]">人</small>
                </strong>
              </div>
              <div className="p-3.5 rounded-[8px] bg-[#fbfaf9] border border-[#f2f0ed]">
                <div className="flex items-center justify-between text-[#7e7e7d] mb-1">
                  <span className="text-xs">待跟进确认</span>
                  <Clock className="w-4 h-4 text-[#d48f00]" />
                </div>
                <strong className="block text-2xl font-black text-[#d48f00]">
                  {loading ? '—' : followups.length} <small className="text-xs font-normal text-[#7e7e7d]">场</small>
                </strong>
              </div>
              <div className="p-3.5 rounded-[8px] bg-[#fbfaf9] border border-[#f2f0ed]">
                <div className="flex items-center justify-between text-[#7e7e7d] mb-1">
                  <span className="text-xs">待准备物资</span>
                  <PackageCheck className="w-4 h-4 text-[#ff3e00]" />
                </div>
                <strong className="block text-2xl font-black text-[#ff3e00]">
                  {loading ? '—' : unready} <small className="text-xs font-normal text-[#7e7e7d]">项</small>
                </strong>
              </div>
            </div>

            <div className="pt-2 border-t border-[#f2f0ed]">
              <a
                href="/yanxue-calendar/materials"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#121212] hover:text-[#ff3e00] hover:underline"
              >
                前往物资中心核对清单 <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 近期活动动态 */}
          <div className="lg:col-span-2 p-6 rounded-[10px] bg-white border border-[#e5d5c3] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#7e7e7d] tracking-wider uppercase">UPCOMING EVENTS</span>
                  <h3 className="text-xl font-bold text-[#121212]">近期活动安排</h3>
                </div>
                <a
                  href="/yanxue-calendar"
                  className="text-xs font-semibold text-[#121212] hover:text-[#ff3e00] hover:underline inline-flex items-center gap-1"
                >
                  查看完整日历 <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {error && (
                <div className="p-3 bg-[#ff2b3a]/10 text-[#ff2b3a] text-xs rounded-[6px] border border-[#ff2b3a]/20">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-12 text-center text-xs text-[#7e7e7d]">正在同步活动数据…</div>
              ) : upcoming.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#f2f0ed] text-[#121212] flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#121212]">近期暂无待举办活动</p>
                  <p className="text-xs text-[#474645] max-w-sm mx-auto">
                    可点击下方按钮安排一场新活动，排期信息将自动同步到日历和物资中心。
                  </p>
                  <a
                    href="/yanxue-calendar"
                    className="btn-dark-pill inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                    style={{ backgroundColor: '#121212', color: '#ffffff' }}
                  >
                    <span style={{ color: '#ffffff' }}>＋ 立即安排活动</span>
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-[#f2f0ed]">
                  {upcoming.map((e) => (
                    <a
                      key={e.id}
                      href={`/yanxue-calendar`}
                      className="group py-3.5 flex items-center justify-between gap-4 hover:bg-[#fbfaf9] px-2.5 -mx-2.5 rounded-[8px] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 text-center flex-shrink-0">
                          <span className="block text-xs font-bold text-[#121212]">
                            {e.date.slice(5).replace('-', '/')}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-sm font-bold text-[#121212] truncate group-hover:text-[#ff3e00] transition-colors">
                            {e.name}
                          </strong>
                          <div className="flex items-center gap-3 text-xs text-[#7e7e7d] mt-0.5">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> {e.people || 0} 人
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {e.place || '场地待定'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            e.status === 'confirmed'
                              ? 'bg-[#00c978]/15 text-[#008f55]'
                              : e.status === 'pending'
                              ? 'bg-[#ffbb26]/25 text-[#9a6700]'
                              : e.status === 'booking'
                              ? 'bg-[#64c6ff]/20 text-[#0070c9]'
                              : 'bg-[#f2f0ed] text-[#474645]'
                          }`}
                        >
                          {statusText[e.status] || e.status}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[#7e7e7d] group-hover:text-[#121212] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#f2f0ed] flex justify-between items-center text-xs text-[#7e7e7d]">
              <span>点击活动可查看流程与物资准备详情</span>
              <a href="/yanxue-calendar" className="text-[#121212] font-semibold hover:text-[#ff3e00] hover:underline">
                ＋ 新增排期
              </a>
            </div>
          </div>
        </section>

        {/* 精品江南农耕研学方案推荐 */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs font-bold text-[#7e7e7d] tracking-wider uppercase">FEATURED CURRICULUM</span>
              <h2 className="text-2xl font-bold text-[#121212]">江南农耕特色研学课程方案</h2>
              <p className="text-sm text-[#474645] mt-1">系统预置典型农耕研学场景，可一键导入并进行成本定价测算</p>
            </div>
            <a
              href="/schemes"
              className="text-xs font-semibold text-[#121212] hover:text-[#ff3e00] hover:underline inline-flex items-center gap-1"
            >
              查看全部方案 <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredSchemes.map((scheme, idx) => (
              <div
                key={idx}
                className="p-6 rounded-[10px] bg-white border border-[#e5d5c3] flex flex-col justify-between space-y-5 hover:border-[#121212] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs px-2.5 py-0.5 rounded-[4px] bg-[#f2f0ed] text-[#343433] font-semibold border border-[#e5d5c3]">
                      {scheme.badge}
                    </span>
                    <span className="text-xs font-bold text-[#121212]">{scheme.targetPrice}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#121212] leading-snug">{scheme.title}</h3>
                  <div className="text-xs text-[#474645] space-y-1">
                    <p>🎯 适合对象：{scheme.grade}</p>
                    <p>⏱ 活动时长：{scheme.duration}</p>
                  </div>
                  <div className="pt-2 border-t border-[#f2f0ed] space-y-1.5">
                    <span className="text-[11px] font-bold text-[#7e7e7d]">核心研学亮点：</span>
                    {scheme.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#343433]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00c978] flex-shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#f2f0ed] flex gap-2">
                  <a
                    href={`/pricing`}
                    className="btn-dark-pill flex-1 py-2.5 text-center text-xs font-semibold rounded-full transition-all hover:scale-[1.01]"
                    style={{ backgroundColor: '#121212', color: '#ffffff' }}
                  >
                    <span style={{ color: '#ffffff' }}>按此方案定价</span>
                  </a>
                  <a
                    href={`/yanxue-calendar`}
                    className="btn-sand-pill py-2.5 px-4 text-xs font-semibold rounded-full border border-[#e5d5c3] transition-all hover:scale-[1.01]"
                    style={{ backgroundColor: '#f6f4ef', color: '#121212' }}
                  >
                    <span style={{ color: '#121212' }}>排期</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="global-footer">
        <div className="global-footer-inner">
          <div>
            <strong>江南农耕研学 · 运营工作台</strong>
            <span className="ml-3 text-xs text-[#7e7e7d]">
              方案策划 · 成本测算 · 排期日历 · 备货跟踪
            </span>
          </div>
          <span>© 2026 江南农耕文化研学项目组 · All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
