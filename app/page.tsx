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
    <div className="min-h-screen flex flex-col bg-[#f6f8f6] text-[#18281e]">
      <GlobalNav active="overview" />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 sm:px-8 py-8 space-y-10">
        {/* Banner Hero - 清爽通透的现代研学工作台横幅 */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a6d4b] via-[#337b56] to-[#1f563b] text-white p-8 sm:p-10 shadow-lg shadow-[#2a6d4b]/12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white/95 text-xs font-semibold tracking-wider uppercase border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#f6d788]" />
              江南农耕文化园 · 研学数字化运营平台
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              研学运营工作台
            </h1>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed">
              覆盖方案策划、精准测算、排期日历与物资备货四大关键环节。让每一场农耕研学活动有据可依、高效协同。
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-[1.02]"
                style={{ color: '#ffffff', backgroundColor: '#c4791d' }}
              >
                <Calculator className="w-4 h-4 text-white" /> 开始成本测算
              </a>
              <a
                href="/yanxue-calendar"
                className="inline-flex items-center gap-2 text-white font-semibold text-sm px-5 py-2.5 rounded-xl border border-white/30 shadow-sm transition-all hover:scale-[1.02] hover:bg-white/20"
                style={{ color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.16)' }}
              >
                <CalendarIcon className="w-4 h-4 text-[#f6d788]" /> 查看排期日历 & 提醒
              </a>
              <a
                href="/scheme-import"
                className="inline-flex items-center gap-2 text-white font-semibold text-sm px-5 py-2.5 rounded-xl border border-white/25 transition-all hover:scale-[1.02] hover:bg-white/20"
                style={{ color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
              >
                <FileText className="w-4 h-4 text-[#f6d788]" /> 导入新方案
              </a>
            </div>
          </div>

          {/* 右侧：本月关键运营数据速览 (高信息可读性) */}
          <div className="w-full lg:w-80 flex-shrink-0 p-5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/15">
              <span className="text-xs font-bold text-white/90">本月运营速览</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-[#e5c178] font-bold">
                {month}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-white/70 block">本月出团场次</span>
                <strong className="text-2xl font-black text-white">
                  {loading ? '—' : monthEvents.length} <small className="text-xs font-normal">场</small>
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-white/70 block">总服务人数</span>
                <strong className="text-2xl font-black text-[#e5c178]">
                  {loading ? '—' : monthEvents.reduce((n, e) => n + Number(e.people || 0), 0)}{' '}
                  <small className="text-xs font-normal">人</small>
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-white/70 block">待确认活动</span>
                <strong className="text-xl font-bold text-amber-300">
                  {loading ? '—' : followups.length} <small className="text-xs font-normal">场</small>
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-white/70 block">待备货物资</span>
                <strong className="text-xl font-bold text-emerald-300">
                  {loading ? '—' : unready} <small className="text-xs font-normal">项</small>
                </strong>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
              <span>云端数据实时同步</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </section>

        {/* 核心工作区卡片 */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs font-bold text-[#5d6e62] tracking-wider uppercase">WORKSPACES</span>
              <h2 className="text-2xl font-bold text-[#1e2c22]">研学运营核心工作区</h2>
              <p className="text-sm text-[#5d6e62] mt-1">覆盖研学活动全生命周期业务流程</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 01 方案库 */}
            <a
              href="/schemes"
              className="group p-6 rounded-2xl bg-white border border-[#e0e9e3] hover:border-[#2b6c4b] shadow-xs hover:shadow-[0_8px_24px_rgba(43,108,75,0.08)] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-11 h-11 rounded-xl bg-[#eef6f1] text-[#2b6c4b] flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#8b998e]">WORKSPACE 01</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1e2c22] group-hover:text-[#2b6c4b] transition-colors">
                    研学方案库
                  </h3>
                  <p className="text-xs text-[#5d6e62] mt-2 leading-relaxed">
                    沉淀农耕文化精品教案，解析课程目标、行程与物料需求。
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#eaf1ec] flex items-center justify-between text-xs font-bold text-[#2b6c4b]">
                <span>进入方案库</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* 02 定价台 */}
            <a
              href="/pricing"
              className="group p-6 rounded-2xl bg-white border border-[#e0e9e3] hover:border-[#2b6c4b] shadow-xs hover:shadow-[0_8px_24px_rgba(43,108,75,0.08)] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-11 h-11 rounded-xl bg-[#fef7ee] text-[#d97706] flex items-center justify-center">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#8b998e]">WORKSPACE 02</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1e2c22] group-hover:text-[#2b6c4b] transition-colors">
                    研学定价台
                  </h3>
                  <p className="text-xs text-[#5d6e62] mt-2 leading-relaxed">
                    按人/组精准核算成本，实时计算保本售价、毛利率与云端档案。
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#eaf1ec] flex items-center justify-between text-xs font-bold text-[#2b6c4b]">
                <span>开始定价测算</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* 03 日历台 */}
            <a
              href="/yanxue-calendar"
              className="group p-6 rounded-2xl bg-white border border-[#e0e9e3] hover:border-[#2b6c4b] shadow-xs hover:shadow-[0_8px_24px_rgba(43,108,75,0.08)] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-11 h-11 rounded-xl bg-[#eef6f1] text-[#2b6c4b] flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#8b998e]">WORKSPACE 03</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1e2c22] group-hover:text-[#2b6c4b] transition-colors">
                    活动排期日历
                  </h3>
                  <p className="text-xs text-[#5d6e62] mt-2 leading-relaxed">
                    月历与日程列表协同排期，实时掌握预约、确定状态及人员规模。
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#eaf1ec] flex items-center justify-between text-xs font-bold text-[#2b6c4b]">
                <span>查看排期日历</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* 04 物资中心 */}
            <a
              href="/yanxue-calendar/materials"
              className="group p-6 rounded-2xl bg-white border border-[#e0e9e3] hover:border-[#2b6c4b] shadow-xs hover:shadow-[0_8px_24px_rgba(43,108,75,0.08)] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-11 h-11 rounded-xl bg-[#edf7f1] text-[#16a34a] flex items-center justify-center">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-[#8b998e]">WORKSPACE 04</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1e2c22] group-hover:text-[#2b6c4b] transition-colors">
                    物资准备中心
                  </h3>
                  <p className="text-xs text-[#5d6e62] mt-2 leading-relaxed">
                    按月汇总备货需求，直观勾选准备进度，避免活动现场物料遗漏。
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#eaf1ec] flex items-center justify-between text-xs font-bold text-[#2b6c4b]">
                <span>管理备货物资</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          </div>
        </section>

        {/* 运营概览与近期活动 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 指标看板 */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-[#e0e9e3] shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#5d6e62] tracking-wider uppercase">THIS MONTH</span>
                <h3 className="text-xl font-bold text-[#1e2c22]">本月运营概览</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#eef6f1] text-[#2b6c4b] font-semibold border border-[#c3ded0]">
                {month}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl bg-[#f8faf8] border border-[#e0e9e3]">
                <div className="flex items-center justify-between text-[#5d6e62] mb-1">
                  <span className="text-xs">本月活动</span>
                  <CalendarIcon className="w-4 h-4 text-[#2b6c4b]" />
                </div>
                <strong className="block text-2xl font-extrabold text-[#1e2c22]">
                  {loading ? '—' : monthEvents.length} <small className="text-xs font-normal text-[#5d6e62]">场</small>
                </strong>
              </div>
              <div className="p-3.5 rounded-xl bg-[#f8faf8] border border-[#e0e9e3]">
                <div className="flex items-center justify-between text-[#5d6e62] mb-1">
                  <span className="text-xs">预计参与</span>
                  <Users className="w-4 h-4 text-[#2b6c4b]" />
                </div>
                <strong className="block text-2xl font-extrabold text-[#2b6c4b]">
                  {loading ? '—' : monthEvents.reduce((n, e) => n + Number(e.people || 0), 0)}{' '}
                  <small className="text-xs font-normal text-[#5d6e62]">人</small>
                </strong>
              </div>
              <div className="p-3.5 rounded-xl bg-[#f8faf8] border border-[#e0e9e3]">
                <div className="flex items-center justify-between text-[#5d6e62] mb-1">
                  <span className="text-xs">待跟进确认</span>
                  <Clock className="w-4 h-4 text-[#d97706]" />
                </div>
                <strong className="block text-2xl font-extrabold text-[#d97706]">
                  {loading ? '—' : followups.length} <small className="text-xs font-normal text-[#5d6e62]">场</small>
                </strong>
              </div>
              <div className="p-3.5 rounded-xl bg-[#f8faf8] border border-[#e0e9e3]">
                <div className="flex items-center justify-between text-[#5d6e62] mb-1">
                  <span className="text-xs">待准备物资</span>
                  <PackageCheck className="w-4 h-4 text-[#b45309]" />
                </div>
                <strong className="block text-2xl font-extrabold text-[#b45309]">
                  {loading ? '—' : unready} <small className="text-xs font-normal text-[#5d6e62]">项</small>
                </strong>
              </div>
            </div>

            <div className="pt-2 border-t border-[#eaf1ec]">
              <a
                href="/yanxue-calendar/materials"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2b6c4b] hover:underline"
              >
                前往物资中心核对清单 <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 近期活动动态 */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#e0e9e3] shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#5d6e62] tracking-wider uppercase">UPCOMING EVENTS</span>
                  <h3 className="text-xl font-bold text-[#1e2c22]">近期活动安排</h3>
                </div>
                <a
                  href="/yanxue-calendar"
                  className="text-xs font-bold text-[#2b6c4b] hover:underline inline-flex items-center gap-1"
                >
                  查看完整日历 <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-12 text-center text-xs text-[#5d6e62]">正在同步活动数据…</div>
              ) : upcoming.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#eef6f1] text-[#2b6c4b] flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#1e2c22]">近期暂无待举办活动</p>
                  <p className="text-xs text-[#5d6e62] max-w-sm mx-auto">
                    可点击下方按钮安排一场新活动，排期信息将自动同步到日历和物资中心。
                  </p>
                  <a
                    href="/yanxue-calendar"
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-[#2b6c4b] text-white hover:bg-[#22573c] transition-colors"
                  >
                    ＋ 立即安排活动
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-[#eaf1ec]">
                  {upcoming.map((e) => (
                    <a
                      key={e.id}
                      href={`/yanxue-calendar`}
                      className="group py-3.5 flex items-center justify-between gap-4 hover:bg-[#f8faf8] px-2 -mx-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 text-center flex-shrink-0">
                          <span className="block text-xs font-bold text-[#2b6c4b]">
                            {e.date.slice(5).replace('-', '/')}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-sm font-bold text-[#1e2c22] truncate group-hover:text-[#2b6c4b] transition-colors">
                            {e.name}
                          </strong>
                          <div className="flex items-center gap-3 text-xs text-[#5d6e62] mt-0.5">
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
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            e.status === 'confirmed'
                              ? 'bg-[#eef6f1] text-[#2b6c4b]'
                              : e.status === 'pending'
                              ? 'bg-[#fef7ee] text-[#d97706]'
                              : e.status === 'booking'
                              ? 'bg-[#eff6ff] text-[#2563eb]'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {statusText[e.status] || e.status}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[#8b998e] group-hover:text-[#2b6c4b] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#eaf1ec] flex justify-between items-center text-xs text-[#5d6e62]">
              <span>点击活动可查看流程与物资准备详情</span>
              <a href="/yanxue-calendar" className="text-[#2b6c4b] font-semibold hover:underline">
                ＋ 新增排期
              </a>
            </div>
          </div>
        </section>

        {/* 精品江南农耕研学方案推荐 */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs font-bold text-[#5d6e62] tracking-wider uppercase">FEATURED CURRICULUM</span>
              <h2 className="text-2xl font-bold text-[#1e2c22]">江南农耕特色研学课程方案</h2>
              <p className="text-sm text-[#5d6e62] mt-1">系统预置典型农耕研学场景，可一键导入并进行成本定价测算</p>
            </div>
            <a
              href="/schemes"
              className="text-xs font-bold text-[#2b6c4b] hover:underline inline-flex items-center gap-1"
            >
              查看全部方案 <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredSchemes.map((scheme, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-[#e0e9e3] shadow-xs flex flex-col justify-between space-y-5 hover:border-[#2b6c4b] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#eef6f1] text-[#2b6c4b] font-semibold">
                      {scheme.badge}
                    </span>
                    <span className="text-xs font-bold text-[#d97706]">{scheme.targetPrice}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#1e2c22] leading-snug">{scheme.title}</h3>
                  <div className="text-xs text-[#5d6e62] space-y-1">
                    <p>🎯 适合对象：{scheme.grade}</p>
                    <p>⏱ 活动时长：{scheme.duration}</p>
                  </div>
                  <div className="pt-2 border-t border-[#eaf1ec] space-y-1.5">
                    <span className="text-[11px] font-bold text-[#8b998e]">核心研学亮点：</span>
                    {scheme.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#1e2c22]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2b6c4b] flex-shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#eaf1ec] flex gap-2">
                  <a
                    href={`/pricing`}
                    className="flex-1 py-2 text-center text-xs font-bold rounded-lg bg-[#eef6f1] text-[#2b6c4b] hover:bg-[#2b6c4b] hover:text-white transition-colors"
                  >
                    按此方案定价
                  </a>
                  <a
                    href={`/yanxue-calendar`}
                    className="py-2 px-3 text-xs font-bold rounded-lg border border-[#e0e9e3] hover:bg-[#f8faf8] text-[#1e2c22] transition-colors"
                  >
                    排期
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
            <span className="ml-3 text-xs text-[#5d6e62]">
              方案策划 · 成本测算 · 排期日历 · 备货跟踪
            </span>
          </div>
          <span>© 2026 江南农耕文化研学项目组 · All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
