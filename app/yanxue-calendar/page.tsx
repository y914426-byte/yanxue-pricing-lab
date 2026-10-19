'use client';

import { useEffect, useMemo, useState } from 'react';
import { GoogleSignIn } from '@/components/google-sign-in';
import { QQSignIn } from '@/components/qq-sign-in';
import { GlobalNav } from '@/components/global-nav';
import { downloadEventICS, downloadBatchICS } from '@/lib/calendar-ics';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Copy, 
  Calculator, 
  Sparkles,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  Bell,
  Mail,
  ShieldCheck,
  UserPlus,
  Download,
  ClipboardCheck,
  Camera,
  MessageSquare,
  Share2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Check,
  Send,
  Eye,
  Filter,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { PermissionManagementModal } from '@/components/permission-management-modal';
import { getBeijingToday, getBeijingMonth, isBeijingToday, isActivityCompleted } from '@/lib/beijing-time';
import { ActivityReviewDrawer } from '@/components/ActivityReviewDrawer';
import { canUploadActivityPhotos } from '@/lib/calendar-permissions';
import { CalendarShareModal } from '@/components/calendar/CalendarShareModal';
import { PrecautionsModal } from '@/components/calendar/PrecautionsModal';
import { CalendarExportModal } from '@/components/calendar/CalendarExportModal';
import {
  smartGenerateFlow,
  smartGenerateMaterials,
  smartGeneratePrecautions,
} from '@/lib/calendar-ai-smart';
import { exportEventsToExcel } from '@/lib/calendar-excel';

type M = { name: string; qty: string; note: string; done: boolean };
type E = {
  id: string;
  date: string;
  name: string;
  audience: string;
  people: number;
  place: string;
  status: string;
  flow: string;
  materials: M[];
  precautions?: string;
  note: string;
};
type A = { user: { displayName: string; email: string } | null; clientId: string | null };

const labels: Record<string, string> = {
  confirmed: '已确定',
  pending: '待确认',
  booking: '预约中',
  completed: '已完成',
  cancelled: '已取消',
};

const blank = (): E => ({
  id: '',
  date: getBeijingToday(),
  name: '',
  audience: '',
  people: 0,
  place: '江南农耕文化园',
  status: 'pending',
  flow: '09:00 研学团队到达并分组整队\n09:30 农耕文化馆导览与节气讲解\n10:30 水稻田间劳作与收割实践\n12:00 农家生态午餐\n13:30 传统农具体验与碾米手作\n15:00 研学成果总结与颁发证书\n15:30 返程',
  materials: [
    { name: '农耕防晒遮阳草帽', qty: '按人均 1 顶', note: '防晒必备', done: false },
    { name: '水稻收割物料与手套', qty: '按人均 1 份', note: '劳作手作', done: false },
    { name: '随队便携急救医药箱', qty: '1 箱', note: '应急防护', done: true },
  ],
  precautions: '👟【穿戴建议】请所有营员穿着透气长衣长裤与防滑运动鞋，带遮阳草帽。\n🌾【农具安全】镰刀等工具刀刃向外，听从主导师指挥，低幼儿童需家长陪同劳作。\n🦟【防暑防虫】基地日照充足，请自备防晒霜与驱蚊液，多补充温水，若有不适立即报告。',
  note: '',
});

const quickMaterialPresets = [
  { name: '农耕防晒遮阳草帽', qty: '按人均 1 顶', note: '田间防晒防中暑' },
  { name: '水稻收割手工材料包', qty: '按人均 1 份', note: '割稻手套与草绳' },
  { name: '随队便携急救医药箱', qty: '1 箱', note: '创可贴碘伏防暑药' },
  { name: '无线扩音麦克风套件', qty: '2 套', note: '主讲导师与带班' },
  { name: '研学班级队旗与分组背心', qty: '4 组', note: '班级红黄蓝绿分组' },
  { name: '天然矿泉水与饮用水', qty: '2 箱', note: '全员补水' },
  { name: '研学探究手册与结营证书', qty: '按人均 1 份', note: '活动结营颁发' },
];

export default function Calendar() {
  const [events, setEvents] = useState<E[]>([]);
  const [month, setMonth] = useState(getBeijingMonth());
  const [current, setCurrent] = useState<E | null>(null);
  const [form, setForm] = useState<E>(blank());
  const [editing, setEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [error, setError] = useState('');
  const [account, setAccount] = useState<A | null | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState(getBeijingToday());
  const [saving, setSaving] = useState(false);

  // 微信分享中心弹窗状态
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareEvent, setShareEvent] = useState<E | null>(null);
  const [shareDailyDate, setShareDailyDate] = useState<string | undefined>(undefined);
  const [shareDailyEvents, setShareDailyEvents] = useState<E[]>([]);

  // 注意事项专属弹窗状态
  const [precautionsModalOpen, setPrecautionsModalOpen] = useState(false);
  const [precautionsEvent, setPrecautionsEvent] = useState<E | null>(null);

  // 全能导出中心弹窗状态
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportCurrentEvent, setExportCurrentEvent] = useState<E | null>(null);
  const [headerMoreOpen, setHeaderMoreOpen] = useState(false);

  // 物资清单过滤状态（当前弹窗内）
  const [materialsFilterTab, setMaterialsFilterTab] = useState<'all' | 'pending' | 'done'>('all');

  // 轻量浮动提示 Toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // 权限管理弹窗状态
  const [showPermissions, setShowPermissions] = useState(false);

  // 邮件预约提醒相关状态
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderDays, setReminderDays] = useState(1);
  const [reminderStatus, setReminderStatus] = useState('');

  // 活动复盘与优化讨论抽屉状态
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [reviewEvent, setReviewEvent] = useState<E | null>(null);
  const [reviewDrawerTab, setReviewDrawerTab] = useState<'review' | 'discussion' | 'photos'>('review');

  const openReviewModal = (event: E, tab: 'review' | 'discussion' | 'photos' = 'review') => {
    setReviewEvent(event);
    setReviewDrawerTab(tab);
    setReviewDrawerOpen(true);
  };

  const isPhotoAdmin = canUploadActivityPhotos(account?.user?.email);

  // 打开具体某天的微信分享
  const openDailyShare = (dateStr: string) => {
    const dayEvents = events.filter((e) => e.date === dateStr);
    setShareEvent(null);
    setShareDailyDate(dateStr);
    setShareDailyEvents(dayEvents);
    setShareModalOpen(true);
  };

  // 打开单个活动的微信分享
  const openEventShare = (event: E) => {
    setShareEvent(event);
    setShareDailyDate(undefined);
    setShareDailyEvents([]);
    setShareModalOpen(true);
  };

  // 打开注意事项专属弹窗
  const openPrecautionsModal = (event: E) => {
    setPrecautionsEvent(event);
    setPrecautionsModalOpen(true);
  };

  // 打开全能导出中心
  const openExportModal = (targetEvent?: E | null) => {
    setExportCurrentEvent(targetEvent || null);
    setExportModalOpen(true);
  };

  // AI 智能一键生成完整活动方案
  const handleAiSmartFill = () => {
    if (!form.name.trim()) {
      alert('请先输入活动名称（例如：环洲幼儿园亲子团割水稻、做花束）');
      return;
    }
    const flow = smartGenerateFlow(form.name, form.audience, form.people);
    const materials = smartGenerateMaterials(form.name, form.audience, form.people);
    const precautions = smartGeneratePrecautions(form.name, form.audience, form.place);

    setForm({
      ...form,
      flow,
      materials,
      precautions,
    });
    showToast('✨ AI 已根据活动主题与人群智能填充流程、物资与注意事项！');
  };

  const load = async () => {
    try {
      const r = await fetch('/api/learning-calendar', { cache: 'no-store' });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error(d.error);
      const loadedEvents: E[] = d.events || [];
      setEvents(loadedEvents);
      setCanEdit(!!d.canEdit);
      setIsAdmin(!!d.isAdmin);
      setUserRole(d.userRole || 'viewer');
      setError('');

      // 微信直达解析：根据 URL 参数自动打开对应活动或日期
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search);
        const targetId = p.get('eventId');
        if (targetId && loadedEvents.length > 0) {
          const found = loadedEvents.find((x) => x.id === targetId);
          if (found) {
            setCurrent(found);
            if (p.get('share') === '1') {
              openEventShare(found);
            }
          }
        }
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : '读取失败';
      setError(
        m.includes('no such table: learning_calendar_events')
          ? '日历数据表尚未初始化，请先应用 0009_learning_calendar.sql 迁移。'
          : m
      );
    }
  };

  const sendEmailReminder = async (event: E) => {
    const target = reminderEmail.trim() || account?.user?.email || '';
    if (!target) {
      alert('请输入接收提醒的邮箱地址');
      return;
    }
    try {
      setReminderStatus('正在生成预约提醒…');
      const r = await fetch('/api/calendar-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date,
          place: event.place,
          people: event.people,
          targetEmails: target,
          remindBeforeDays: reminderDays,
        }),
      });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error(d.error);
      setReminderStatus('✓ 预约提醒已登记，已为您拉起邮件客户端！');
      if (d.mailtoUrl) {
        window.location.href = d.mailtoUrl;
      }
    } catch (e) {
      setReminderStatus(e instanceof Error ? e.message : '提醒发送失败');
    }
  };

  const loadAccount = async () => {
    try {
      const r = await fetch('/api/account', { cache: 'no-store' });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error();
      setAccount(d);
    } catch {
      setAccount(null);
    }
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCanEdit(false);
    await loadAccount();
    await load();
  };

  useEffect(() => {
    void load();
    void loadAccount();
    // 检查 url query 是否有 action=new 或 date
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('action') === 'new') {
        setForm(blank());
        setEditing(true);
      }
      const targetDate = p.get('date');
      if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        setMonth(targetDate.slice(0, 7));
        setSelectedDate(targetDate);
      }
    }
  }, []);

  const monthEvents = useMemo(() => events.filter((e) => e.date.startsWith(month)), [events, month]);
  const list = useMemo(
    () =>
      monthEvents.filter(
        (e) =>
          (!query ||
            `${e.name} ${e.audience} ${e.place} ${e.flow} ${e.note} ${e.precautions || ''} ${e.materials
              .map((x) => x.name + ' ' + x.note)
              .join(' ')}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())) &&
          (statusFilter === 'all' ||
            (statusFilter === 'followup'
              ? e.status === 'pending' || e.status === 'booking'
              : e.status === statusFilter))
      ),
    [monthEvents, query, statusFilter]
  );

  const selectedDayEvents = list.filter((e) => e.date === selectedDate);
  const stats = useMemo(
    () => ({
      total: monthEvents.length,
      people: monthEvents.reduce((s, e) => s + Number(e.people || 0), 0),
      confirmed: monthEvents.filter((e) => e.status === 'confirmed').length,
      pending: monthEvents.filter((e) => e.status === 'pending' || e.status === 'booking').length,
    }),
    [monthEvents]
  );

  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1).getDay();
  const count = new Date(y, m, 0).getDate();
  const days = Array.from({ length: 42 }, (_, i) => {
    const n = i - first + 1;
    return n > 0 && n <= count ? n : null;
  });

  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    const next = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    setMonth(next);
    setSelectedDate(next + '-01');
  };

  const save = async () => {
    if (saving) return;
    setError('');
    if (!form.name.trim()) {
      setError('请填写活动名称');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError('请选择有效日期');
      return;
    }
    const body = form.id ? form : { ...form, id: crypto.randomUUID() };
    try {
      setSaving(true);
      const r = await fetch('/api/learning-calendar', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error(d.error || '保存失败');
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updateStatusDirect = async (event: E, newStatus: string) => {
    const next = { ...event, status: newStatus };
    setCurrent(next);
    try {
      const r = await fetch('/api/learning-calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error(d.error || '状态保存失败');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '状态保存失败');
    }
  };

  const updateMaterials = async (event: E, index: number) => {
    const next = {
      ...event,
      materials: event.materials.map((x, j) => (j === index ? { ...x, done: !x.done } : x)),
    };
    setCurrent(next);
    try {
      const r = await fetch('/api/learning-calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error(d.error || '物资状态保存失败');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '物资状态保存失败');
    }
  };

  const setAllMaterials = async (event: E, done: boolean) => {
    const next = { ...event, materials: event.materials.map((x) => ({ ...x, done })) };
    try {
      const r = await fetch('/api/learning-calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const d = (await r.json()) as any;
      if (!r.ok) throw new Error(d.error || '批量更新物资状态失败');
      setCurrent(next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量更新物资状态失败');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('确定删除这场活动吗？此操作无法撤销。')) return;
    const r = await fetch('/api/learning-calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({id}),
    });
    const d = (await r.json()) as any;
    if (!r.ok) {
      setError(d.error || '删除失败');
      return;
    }
    setCurrent(null);
    await load();
  };

  const duplicate = (event: E) => {
    setCurrent(null);
    setError('');
    setForm({
      ...event,
      id: '',
      name: event.name + '（副本）',
      status: 'pending',
      materials: event.materials.map((x) => ({ ...x, done: false })),
    });
    setEditing(true);
  };

  const sendToPricing = (event: E) => {
    try {
      sessionStorage.setItem(
        'pricing-calendar-draft',
        JSON.stringify({
          title: event.name,
          people: event.people,
          free: 0,
        })
      );
    } catch {}
    window.location.href = '/pricing';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-[#1c1917]">
      <GlobalNav
        active="calendar"
        hideCta={true}
        extraRight={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 紧凑型排期工具下拉菜单，大幅节约顶栏横向空间 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setHeaderMoreOpen(!headerMoreOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 shadow-2xs transition-colors"
                title="打开微信分享、一键导出等工具"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">排期工具</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {headerMoreOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setHeaderMoreOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-stone-200 shadow-xl py-1.5 z-50 text-xs text-stone-700 divide-y divide-stone-100">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setHeaderMoreOpen(false);
                          setShareEvent(null);
                          setShareDailyDate(undefined);
                          setShareDailyEvents(monthEvents);
                          setShareModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors font-medium"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>微信分享本月排期</span>
                      </button>
                      <button
                        onClick={() => {
                          setHeaderMoreOpen(false);
                          openExportModal(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-amber-50 hover:text-amber-900 flex items-center gap-2 transition-colors font-medium"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-600" />
                        <span>日历一键导出中心</span>
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setHeaderMoreOpen(false);
                            setShowPermissions(true);
                            void loadPermissions();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5 text-[#27563c]" />
                          <span>团队权限管理</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {canEdit && (
              <button
                onClick={() => {
                  setForm(blank());
                  setEditing(true);
                }}
                className="global-btn-cta text-xs px-3 py-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">新建活动</span><span className="xs:hidden">新建</span>
              </button>
            )}
          </div>
        }
      />
      <style>{calendarStyles}</style>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* 顶部标题区 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-stone-200/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-emerald-800 mb-1">
              <span>🌾 研学排期 · 履约协同中心</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
              研学排期日历
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              全生命周期统筹出团日程、参与规模、物资备货与手机/电脑日历双重提醒
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {account?.user ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-600 shadow-sm">
                <span>当前登录：<strong className="text-stone-900">{account.user.email}</strong></span>
                {isAdmin ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60">
                    超级管理员
                  </span>
                ) : canEdit ? (
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
                    活动策划/编辑员
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200/60">
                    只读访客
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {account?.clientId && (
                  <GoogleSignIn
                    clientId={account.clientId}
                    onSuccess={() => {
                      void (async () => {
                        await loadAccount();
                        await load();
                      })();
                    }}
                  />
                )}
                <QQSignIn
                  onSuccess={() => {
                    void (async () => {
                      await loadAccount();
                      await load();
                    })();
                  }}
                />
              </div>
            )}

            {account?.user && (
              <button
                className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 shadow-sm transition-colors"
                onClick={signOut}
              >
                切换账号
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={load} className="underline text-xs hover:text-red-900">重新加载</button>
          </div>
        )}

        {/* 月度统计卡片：高对比度、大字号清晰易读 */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-xs hover:border-[#27563c]/40 transition-all flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 block">本月活动场次</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-stone-900">{stats.total}</span>
                <span className="text-xs text-stone-500">场</span>
              </div>
            </div>
            <CalendarIcon className="w-5 h-5 text-[#27563c]" />
          </div>

          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-xs hover:border-[#27563c]/40 transition-all flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 block">预计参与总人数</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-[#27563c]">{stats.people.toLocaleString()}</span>
                <span className="text-xs text-stone-500">人</span>
              </div>
            </div>
            <Users className="w-5 h-5 text-[#27563c]" />
          </div>

          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 block">已确定活动</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-emerald-700">{stats.confirmed}</span>
                <span className="text-xs text-stone-500">场</span>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-xs hover:border-amber-300 transition-all flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-500 block">待跟进预约</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-[#d97706]">{stats.pending}</span>
                <span className="text-xs text-stone-500">场</span>
              </div>
            </div>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
        </section>

        {/* 工具栏 (月份切换、搜索、状态筛选、视图切换) */}
        <div className="p-4 rounded-xl bg-white border border-stone-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              aria-label="上个月"
              onClick={() => shift(-1)}
              className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white flex items-center justify-center text-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-stone-600" />
            </button>
            <strong className="text-base font-serif font-bold text-stone-900 px-2 min-w-[110px] text-center">
              {y} 年 {m} 月
            </strong>
            <button
              aria-label="下个月"
              onClick={() => shift(1)}
              className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white flex items-center justify-center text-sm transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-stone-600" />
            </button>
            <button
              onClick={() => setMonth(getBeijingMonth())}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white text-emerald-800 transition-colors"
            >
              回到本月
            </button>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-md">
            <input
              placeholder="搜索活动名称、场地、流程或物资…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-stone-200 bg-stone-50/70 focus:bg-white focus:outline-none focus:border-emerald-700 transition-colors"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-stone-200 bg-stone-50/70 focus:bg-white text-stone-900"
            >
              <option value="all">全部状态</option>
              <option value="followup">待跟进</option>
              {Object.entries(labels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-stone-200 p-0.5 bg-stone-100 text-xs">
              <button
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  view === 'calendar' ? 'bg-white text-emerald-900 shadow-sm' : 'text-stone-600'
                }`}
                onClick={() => setView('calendar')}
              >
                月历视图
              </button>
              <button
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  view === 'list' ? 'bg-white text-emerald-900 shadow-sm' : 'text-stone-600'
                }`}
                onClick={() => setView('list')}
              >
                列表视图
              </button>
            </div>

            <div className="h-5 w-px bg-stone-200 hidden sm:block" />

            <button
              onClick={() => {
                setShareEvent(null);
                setShareDailyDate(undefined);
                setShareDailyEvents(monthEvents);
                setShareModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-900 shadow-2xs transition-colors"
              title="生成本月研学排期微信通报并分享给团队/微信群"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>微信分享本月排期</span>
            </button>

            <button
              onClick={() => openExportModal(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 shadow-sm transition-colors"
              title="一键导出 Excel 排期报表、手机/电脑系统日历 (.ics)、A4 打印工作单"
            >
              <Download className="w-3.5 h-3.5 text-[#d97706]" />
              <span>日历一键导出</span>
            </button>
          </div>
        </div>

        {/* 月历网格视图 */}
        {view === 'calendar' && (
          <section className="bg-white rounded-2xl border border-[#e3ded2] shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 bg-[#fbfaf7] border-b border-[#e3ded2] text-center text-xs font-bold text-[#5d6e62]">
              {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, i) => (
                <div key={day} className={`py-3 ${i === 0 || i === 6 ? 'text-[#8b998e]' : ''}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-[#f1eee5]">
              {days.map((n, i) => {
                const date = n ? month + '-' + String(n).padStart(2, '0') : '';
                const es = list.filter((e) => e.date === date);
                const isToday = isBeijingToday(date);

                return (
                  <div
                    key={i}
                    className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                      n ? 'hover:bg-[#faf9f5]' : 'bg-[#faf9f6]/40'
                    } ${isToday ? 'bg-[#edf5ef]/30' : ''}`}
                  >
                    {n && (
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            isToday ? 'bg-[#27563c] text-white shadow-xs' : 'text-[#5d6e62]'
                          }`}
                        >
                          {n}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {es.length > 0 && (
                            <button
                              title={`一键微信分享 ${date} 当日排期与待办`}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                openDailyShare(date);
                              }}
                              className="text-stone-400 hover:text-emerald-800 text-xs p-1 hover:bg-emerald-50 rounded transition-colors"
                            >
                              <Share2 className="w-3 h-3 text-emerald-700" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              title={`在此日期安排活动`}
                              onClick={() => {
                                setForm({ ...blank(), date });
                                setEditing(true);
                              }}
                              className="text-[#8b998e] hover:text-[#27563c] text-xs px-1 hover:bg-[#edf5ef] rounded"
                            >
                              ＋
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-none">
                      {es.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setCurrent(e)}
                          className={`w-full text-left p-1.5 rounded-lg text-[11px] leading-tight block border transition-all ${
                            e.status === 'confirmed'
                              ? 'bg-[#edf5ef] text-[#27563c] border-[#c9e3d2] hover:border-emerald-500'
                              : e.status === 'pending'
                              ? 'bg-[#fef7ec] text-[#d97706] border-[#f7dfbe] hover:border-amber-500'
                              : e.status === 'booking'
                              ? 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe] hover:border-blue-500'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          <strong className="block truncate font-bold">{e.name}</strong>
                          <span className="text-[10px] opacity-80 mt-0.5 block truncate">
                            {e.people} 人 · {labels[e.status] || e.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 列表视图 */}
        {view === 'list' && (
          <section className="bg-white rounded-2xl border border-[#e3ded2] shadow-sm overflow-hidden p-4">
            {list.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#5d6e62]">
                当前月份没有符合筛选条件的活动。
              </div>
            ) : (
              <div className="divide-y divide-[#f1eee5]">
                {list
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((e) => (
                    <div
                      key={e.id}
                      onClick={() => setCurrent(e)}
                      className="py-4 px-3 flex items-center justify-between gap-4 hover:bg-[#faf9f5] rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="text-center w-14 flex-shrink-0">
                          <span className="block text-xl font-extrabold text-[#27563c]">
                            {e.date.slice(8)}
                          </span>
                          <small className="text-[10px] text-[#5d6e62] block">
                            {e.date.slice(0, 7)}
                          </small>
                        </div>
                        <div className="min-w-0">
                          <strong className="text-base font-bold text-[#1e2c22] block truncate">
                            {e.name}
                          </strong>
                          <div className="flex items-center gap-3 text-xs text-[#5d6e62] mt-1 flex-wrap">
                            <span>🎯 {e.audience || '对象未填'}</span>
                            <span>👥 {e.people} 人</span>
                            <span>📍 {e.place || '场地未填'}</span>
                            <span>
                              📦 物资：
                              {e.materials.filter((x) => x.done).length}/{e.materials.length} 项
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(ev) => ev.stopPropagation()}>
                        {/* 微信分享按钮 */}
                        <button
                          type="button"
                          onClick={() => openEventShare(e)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-[#27563c] border border-emerald-200 text-xs font-semibold shadow-2xs transition"
                          title="微信分享此活动及待办清单"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>分享</span>
                        </button>

                        {/* 注意事项按钮 */}
                        <button
                          type="button"
                          onClick={() => openPrecautionsModal(e)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold shadow-2xs transition"
                          title="查看行前注意事项与安全防范"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>注意事项</span>
                        </button>

                        {isActivityCompleted(e.date, null, e.status) && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openReviewModal(e, 'review')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold shadow-2xs transition"
                              title="活动执行复盘与团队优化讨论"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5 text-[#27563c]" />
                              <span>复盘</span>
                            </button>
                            {isPhotoAdmin ? (
                              <button
                                type="button"
                                onClick={() => openReviewModal(e, 'photos')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold shadow-2xs transition"
                                title="管理员上传活动现场照片"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openReviewModal(e, 'photos')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 text-xs transition"
                                title="浏览现场照片"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            e.status === 'confirmed'
                              ? 'bg-[#edf5ef] text-[#27563c]'
                              : e.status === 'pending'
                              ? 'bg-[#fef7ec] text-[#d97706]'
                              : e.status === 'booking'
                              ? 'bg-[#eff6ff] text-[#2563eb]'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {labels[e.status] || e.status}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[#8b998e]" />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}

        {/* 活动详情模态弹窗 (全面重构与视觉排版飞跃) */}
        {current && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
            onClick={() => setCurrent(null)}
          >
            <article
              className="bg-white rounded-3xl border border-[#e3ded2] w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-6 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部右上角控制组 */}
              <div className="flex items-center justify-between gap-3 border-b border-[#f1eee5] pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold border shadow-2xs ${
                      current.status === 'confirmed'
                        ? 'bg-[#edf5ef] text-[#27563c] border-[#c9e3d2]'
                        : current.status === 'pending'
                        ? 'bg-[#fef7ec] text-[#d97706] border-[#f7dfbe]'
                        : current.status === 'booking'
                        ? 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]'
                        : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    ● {labels[current.status] || current.status}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
                    <span>{current.date}</span>
                  </span>
                </div>

                {/* 核心快捷操作区：微信分享、注意事项、导出、关闭 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEventShare(current)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm transition-all"
                    title="生成微信群排版文案、长图海报并分享"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>📲 分享活动</span>
                  </button>

                  <button
                    onClick={() => openPrecautionsModal(current)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs transition-all"
                    title="查看行前注意事项与安全防范"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-100" />
                    <span>⚠️ 注意事项</span>
                  </button>

                  <button
                    onClick={() => openExportModal(current)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold shadow-2xs transition-colors"
                    title="一键导出 Excel 排期表、A4 打印工作单、.ics 系统日历"
                  >
                    <Download className="w-3.5 h-3.5 text-[#d97706]" />
                    <span>导出</span>
                  </button>

                  <button
                    className="w-8 h-8 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 text-xl flex items-center justify-center transition-colors ml-1"
                    onClick={() => setCurrent(null)}
                    title="关闭"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* 活动主标题与元信息 */}
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e2c22] leading-snug tracking-tight">
                  {current.name}
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-lg bg-[#faf8f4] border border-[#e8e2d5] text-[#27563c] font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    <span>对象：{current.audience || '亲子/研学团队'}</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#faf8f4] border border-[#e8e2d5] text-stone-800 font-semibold flex items-center gap-1.5">
                    <span>标定规模：<strong className="text-emerald-800 font-bold">{current.people}</strong> 人</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#faf8f4] border border-[#e8e2d5] text-stone-700 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>场地：{current.place || '研学场地待定'}</span>
                  </span>
                </div>
              </div>

              {/* 快捷状态变更 */}
              {canEdit && (current.status === 'pending' || current.status === 'booking') && (
                <div className="p-3.5 bg-[#fef7ec] border border-[#f7dfbe] rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                  <span className="text-xs text-[#8c5717] font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>当前活动处于【待跟进】预约阶段</span>
                  </span>
                  <button
                    onClick={() => void updateStatusDirect(current, 'confirmed')}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-[#27563c] text-white hover:bg-[#1e4530] shadow-2xs transition"
                  >
                    ✓ 一键确认为“已确定活动”
                  </button>
                </div>
              )}

              {/* 活动日程安排 (时间轴 Timeline 视觉升级) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1e2c22] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#27563c]" />
                    <span>活动流程与日程时间轴</span>
                  </h3>
                  <span className="text-[11px] text-[#5d6e62]">按计划推进</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf9f5] border border-[#e5dfd3] text-xs space-y-3">
                  {current.flow ? (
                    <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#c9e3d2]">
                      {current.flow.split('\n').filter(Boolean).map((line, idx) => {
                        const timeMatch = line.match(/^(\d{1,2}:\d{2})\s*(.*)$/);
                        return (
                          <div key={idx} className="relative flex items-start gap-2.5">
                            <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#27563c] ring-4 ring-[#edf5ef]" />
                            {timeMatch ? (
                              <div className="flex-1 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2.5">
                                <span className="font-mono font-bold text-[#27563c] bg-white px-2 py-0.5 rounded border border-[#c9e3d2] shadow-3xs flex-shrink-0">
                                  {timeMatch[1]}
                                </span>
                                <span className="text-stone-800 font-medium leading-relaxed">
                                  {timeMatch[2]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-stone-800 leading-relaxed font-medium">
                                {line}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-[#8b998e]">
                      暂无填写的日程流程，可点击下方「编辑内容」补充或使用 AI 智能补全。
                    </div>
                  )}
                </div>
              </div>

              {/* 物资准备清单 (待办 Checklist 强化版) */}
              <div className="space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#1e2c22] flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-[#27563c]" />
                      <span>物资准备与待办清单</span>
                    </h3>
                    <div className="flex rounded-lg border border-stone-200 p-0.5 bg-stone-100 text-[11px]">
                      <button
                        onClick={() => setMaterialsFilterTab('all')}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                          materialsFilterTab === 'all' ? 'bg-white text-emerald-900 shadow-3xs' : 'text-stone-500'
                        }`}
                      >
                        全部 ({current.materials.length})
                      </button>
                      <button
                        onClick={() => setMaterialsFilterTab('pending')}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                          materialsFilterTab === 'pending' ? 'bg-white text-amber-900 shadow-3xs' : 'text-stone-500'
                        }`}
                      >
                        待办 ({current.materials.filter((x) => !x.done).length})
                      </button>
                      <button
                        onClick={() => setMaterialsFilterTab('done')}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                          materialsFilterTab === 'done' ? 'bg-white text-emerald-900 shadow-3xs' : 'text-stone-500'
                        }`}
                      >
                        已备 ({current.materials.filter((x) => x.done).length})
                      </button>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#27563c] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                    已备齐 {current.materials.filter((x) => x.done).length} / {current.materials.length} 项 (
                    {current.materials.length > 0
                      ? Math.round(
                          (current.materials.filter((x) => x.done).length /
                            current.materials.length) *
                            100
                        )
                      : 0}
                    %)
                  </span>
                </div>

                {/* 渐变进度条 */}
                <div className="w-full bg-[#f1eee5] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#e5dfd3]">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-[#27563c] h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        current.materials.length > 0
                          ? (current.materials.filter((x) => x.done).length /
                              current.materials.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {/* 批量操作控制 */}
                {current.materials.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (canEdit) {
                            void setAllMaterials(current, true);
                          } else {
                            const next = { ...current, materials: current.materials.map((x) => ({ ...x, done: true })) };
                            setCurrent(next);
                            showToast('已临时标记为全部就绪');
                          }
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-[#27563c] font-semibold transition"
                      >
                        ✓ 全部标记为已备齐
                      </button>
                      <button
                        onClick={() => {
                          if (canEdit) {
                            void setAllMaterials(current, false);
                          } else {
                            const next = { ...current, materials: current.materials.map((x) => ({ ...x, done: false })) };
                            setCurrent(next);
                            showToast('已重置为待办');
                          }
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-stone-600 transition"
                      >
                        全部重置为待办
                      </button>
                    </div>

                    <button
                      onClick={() => openEventShare(current)}
                      className="text-emerald-800 hover:text-emerald-950 font-semibold inline-flex items-center gap-1 text-[11px]"
                    >
                      <Share2 className="w-3 h-3" /> 分享待办清单至微信
                    </button>
                  </div>
                )}

                {/* 物资交互清单列表 */}
                <div className="divide-y divide-[#f1eee5] border rounded-2xl border-[#e5dfd3] bg-white overflow-hidden shadow-2xs">
                  {current.materials.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#8b998e]">
                      暂未添加物资需求，可点击下方「编辑内容」选用推荐模板。
                    </p>
                  ) : (
                    current.materials
                      .filter((m) => {
                        if (materialsFilterTab === 'pending') return !m.done;
                        if (materialsFilterTab === 'done') return m.done;
                        return true;
                      })
                      .map((m, i) => {
                        const originalIndex = current.materials.indexOf(m);
                        return (
                          <label
                            key={i}
                            className={`py-3 px-3.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                              m.done ? 'bg-emerald-50/30' : 'hover:bg-[#faf9f5]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={m.done}
                                onChange={() => {
                                  if (canEdit) {
                                    void updateMaterials(current, originalIndex);
                                  } else {
                                    const next = {
                                      ...current,
                                      materials: current.materials.map((x, j) =>
                                        j === originalIndex ? { ...x, done: !x.done } : x
                                      ),
                                    };
                                    setCurrent(next);
                                    showToast(m.done ? '已标为待办' : '已标为已备齐');
                                  }
                                }}
                                className="w-4 h-4 rounded text-[#27563c] focus:ring-[#27563c] transition-colors cursor-pointer"
                              />
                              <span
                                className={`font-semibold truncate ${
                                  m.done ? 'line-through text-stone-400 font-normal' : 'text-[#1e2c22]'
                                }`}
                              >
                                {m.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 flex-shrink-0 text-stone-600">
                              <span className="px-2 py-0.5 rounded bg-stone-100 font-mono font-bold text-stone-800 text-[11px]">
                                {m.qty}
                              </span>
                              {m.note && (
                                <small className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                                  {m.note}
                                </small>
                              )}
                            </div>
                          </label>
                        );
                      })
                  )}
                </div>
              </div>

              {/* 【新增核心】行前注意事项与安全防范专区卡片 */}
              <div className="space-y-2 p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 to-orange-50/60 border border-amber-200/90 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>⚠️ 行前注意事项与安全防范</span>
                  </h3>
                  <button
                    onClick={() => openPrecautionsModal(current)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-3xs flex items-center gap-1 transition"
                  >
                    <span>大字版 / 复制发群</span>
                  </button>
                </div>

                <div className="text-xs text-amber-900 leading-relaxed space-y-1.5 pt-1">
                  {(current.precautions || '👟 穿戴要求：长衣长裤与防滑运动鞋，带遮阳草帽；\n🌾 农具规范：割稻小镰刀刀口向外，严禁追逐，幼儿须家长一对一陪同；\n🦟 防暑防虫：日照充足多饮温水，自备防蚊液。')
                    .split('\n')
                    .filter(Boolean)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-700 font-bold">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                </div>
              </div>

              {current.note && (
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-[#1e2c22]">备注说明</h3>
                  <p className="text-xs text-[#5d6e62] p-3.5 rounded-2xl bg-[#faf9f5] border border-[#e5dfd3] leading-relaxed">
                    {current.note}
                  </p>
                </div>
              )}

              {/* 活动开始预约提醒与系统日历同步 */}
              <div className="space-y-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-[#d97706]" /> 活动预约出团提醒 & 系统日历同步
                  </h3>
                  <span className="text-[11px] text-amber-800 font-medium">支持 iPhone/Mac/Windows 日历闹钟与邮件通告</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* 手机/电脑日历同步 */}
                  <div className="p-3.5 bg-white rounded-xl border border-amber-200/60 space-y-2">
                    <span className="text-xs font-bold text-stone-900 block flex items-center gap-1">
                      <span>📱</span> 手机 / 电脑系统日历 (.ics)
                    </span>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      一键生成标准 .ics 文件，苹果 iOS、Mac、安卓系统日历、Outlook 均可原生导入，已内置出团前 1 天与 2 小时响铃提醒。
                    </p>
                    <button
                      onClick={() => downloadEventICS(current as any)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-[#e5c178]" /> 添加到系统日历 (.ics)
                    </button>
                  </div>

                  {/* 邮箱出团提醒 */}
                  <div className="p-3.5 bg-white rounded-xl border border-amber-200/60 space-y-2">
                    <span className="text-xs font-bold text-stone-900 block flex items-center gap-1">
                      <span>✉️</span> 预约出团邮件通知
                    </span>
                    <div className="space-y-1.5">
                      <input
                        placeholder="接收邮箱（如带队导师/基地联系人）"
                        value={reminderEmail}
                        onChange={(e) => setReminderEmail(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={reminderDays}
                          onChange={(e) => setReminderDays(Number(e.target.value))}
                          className="text-xs p-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-800 font-medium"
                        >
                          <option value={1}>提前 1 天提醒</option>
                          <option value={3}>提前 3 天提醒</option>
                          <option value={0}>当天早晨提醒</option>
                        </select>
                        <button
                          onClick={() => void sendEmailReminder(current)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-semibold shadow-2xs transition-colors"
                        >
                          <Mail className="w-3 h-3" /> 发送邮件提醒
                        </button>
                      </div>
                    </div>
                    {reminderStatus && (
                      <p className="text-[11px] text-emerald-800 font-medium pt-0.5">{reminderStatus}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 活动已结束执行复盘与优化讨论入口 */}
              {isActivityCompleted(current.date, null, current.status) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-indigo-50/90 border border-emerald-200/80 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                        ✓
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                          活动已结束 · 执行复盘与优化讨论
                        </h4>
                        <p className="text-[11px] text-emerald-800">
                          根据东八区时间判定该活动已结束，团队可记录亮点、现场问题与下次优化，并沉淀现场照片。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openReviewModal(current, 'review')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#27563c] hover:bg-[#1e4530] text-white text-xs font-semibold shadow-2xs transition"
                    >
                      <ClipboardCheck className="w-4 h-4 text-emerald-200" />
                      <span>📋 记录活动执行复盘</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openReviewModal(current, 'discussion')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold shadow-3xs transition"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>💬 团队优化讨论</span>
                    </button>

                    {isPhotoAdmin ? (
                      <button
                        type="button"
                        onClick={() => openReviewModal(current, 'photos')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold shadow-2xs transition"
                      >
                        <Camera className="w-4 h-4 text-indigo-200" />
                        <span>📷 上传活动照片 (管理员专属)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openReviewModal(current, 'photos')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold shadow-3xs transition"
                      >
                        <Camera className="w-4 h-4 text-indigo-600" />
                        <span>🖼️ 浏览现场照片</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 动作区 (全功能按钮组) */}
              <div className="pt-4 border-t border-[#f1eee5] flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => sendToPricing(current)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white shadow-2xs transition"
                  >
                    <Calculator className="w-3.5 h-3.5" /> 带入定价台测算
                  </button>

                  <button
                    onClick={() => openEventShare(current)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs transition"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-200" /> 微信分享活动
                  </button>

                  <button
                    onClick={() => openExportModal(current)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 shadow-3xs transition"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-500" /> 导出排期与工作单
                  </button>

                  {isActivityCompleted(current.date, null, current.status) && (
                    <button
                      type="button"
                      onClick={() => openReviewModal(current, 'review')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#27563c] hover:bg-[#1e4530] text-white shadow-2xs transition"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" /> 活动复盘
                    </button>
                  )}
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setForm(current);
                        setCurrent(null);
                        setEditing(true);
                      }}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#e3ded2] hover:bg-[#f8f7f2] text-[#1e2c22] transition"
                    >
                      编辑内容
                    </button>
                    <button
                      onClick={() => duplicate(current)}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#e3ded2] hover:bg-[#f8f7f2] text-[#1e2c22] inline-flex items-center gap-1 transition"
                    >
                      <Copy className="w-3.5 h-3.5" /> 复制副本
                    </button>
                    <button
                      onClick={() => remove(current.id)}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 删除
                    </button>
                  </div>
                )}
              </div>
            </article>
          </div>
        )}

        {/* 新增 / 编辑活动弹窗 (增强 AI 智能填充与注意事项管理) */}
        {editing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <article
              className="bg-white rounded-3xl border border-[#e3ded2] w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-5 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute right-5 top-5 text-gray-400 hover:text-gray-700 text-2xl w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center transition"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                ×
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1eee5] pb-3">
                <div>
                  <span className="text-xs font-bold text-[#5d6e62] tracking-wider uppercase">ACTIVITY CO-PLANNER</span>
                  <h2 className="text-2xl font-extrabold text-[#1e2c22]">
                    {form.id ? '编辑研学活动' : '安排新研学活动'}
                  </h2>
                </div>

                {/* AI 智能一键方案生成按键 */}
                <button
                  type="button"
                  onClick={handleAiSmartFill}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white text-xs font-bold shadow-2xs transition"
                  title="根据活动名称与人数，一键自动匹配专业研学流程、物资清单与安全防范注意事项"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>✨ AI 智能一键生成完整方案</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                  <span>活动日期</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                  />
                </label>

                <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                  <span>活动状态</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                  >
                    {Object.entries(labels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                <span className="flex items-center justify-between">
                  <span>活动名称（主题）</span>
                  <span className="text-[11px] text-stone-400 font-normal">支持输入如：水稻收割、亲子花束、泥田抓鱼</span>
                </span>
                <input
                  maxLength={80}
                  placeholder="例如：环洲幼儿园亲子团割水稻、做花束"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                  <span>研学对象（年级/团型）</span>
                  <input
                    placeholder="例如：幼儿园亲子家庭 / 小学 3-5 年级"
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                  />
                </label>

                <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                  <span>预估参与人数（人）</span>
                  <input
                    type="number"
                    min="0"
                    value={form.people}
                    onChange={(e) => setForm({ ...form, people: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                  />
                </label>
              </div>

              <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                <span>活动场地</span>
                <input
                  value={form.place}
                  onChange={(e) => setForm({ ...form, place: e.target.value })}
                  placeholder="例如：稻田餐厅 / 江南农耕文化馆"
                  className="w-full text-xs p-2.5 rounded-xl border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                />
              </label>

              <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                <div className="flex justify-between items-center">
                  <span>活动流程（每行一项时间与内容）</span>
                  <span className="text-[11px] text-[#27563c] font-normal">格式建议：09:00 团队签到破冰</span>
                </div>
                <textarea
                  rows={4}
                  value={form.flow}
                  onChange={(e) => setForm({ ...form, flow: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white font-mono leading-relaxed"
                />
              </label>

              {/* 物资编辑与快捷预设 */}
              <div className="space-y-3 pt-2 border-t border-[#f1eee5]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#1e2c22]">物资清单 (Checklist)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        materials: [...form.materials, { name: '', qty: '', note: '', done: false }],
                      })
                    }
                    className="text-xs px-2.5 py-1 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-[#27563c] font-semibold"
                  >
                    ＋ 添加一行物资
                  </button>
                </div>

                {/* 快捷物资药丸 */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-[#5d6e62] flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3 h-3 text-[#d97706]" /> 常用物资快捷选用：
                  </span>
                  {quickMaterialPresets.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          materials: [
                            ...form.materials,
                            { name: preset.name, qty: preset.qty, note: preset.note, done: false },
                          ],
                        })
                      }
                      className="text-[11px] px-2 py-0.5 rounded-md border border-[#e3ded2] bg-[#fbfaf7] hover:bg-white text-[#27563c]"
                    >
                      ＋ {preset.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {form.materials.map((m, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-2 p-2 bg-[#f8f7f2] rounded-xl items-center text-xs"
                    >
                      <input
                        placeholder="物资名称"
                        value={m.name}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            materials: form.materials.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x
                            ),
                          })
                        }
                        className="col-span-5 p-1.5 rounded-lg border border-[#e3ded2] bg-white"
                      />
                      <input
                        placeholder="数量"
                        value={m.qty}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            materials: form.materials.map((x, j) =>
                              j === i ? { ...x, qty: e.target.value } : x
                            ),
                          })
                        }
                        className="col-span-3 p-1.5 rounded-lg border border-[#e3ded2] bg-white"
                      />
                      <input
                        placeholder="备注要求"
                        value={m.note}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            materials: form.materials.map((x, j) =>
                              j === i ? { ...x, note: e.target.value } : x
                            ),
                          })
                        }
                        className="col-span-3 p-1.5 rounded-lg border border-[#e3ded2] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            materials: form.materials.filter((_, j) => j !== i),
                          })
                        }
                        className="col-span-1 text-red-500 hover:text-red-700 text-center text-base"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 【新增】行前注意事项与安全防范编辑 */}
              <div className="space-y-2 pt-2 border-t border-[#f1eee5]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>行前注意事项与安全防范（分享到微信时家长与导师重点阅读）</span>
                  </span>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          precautions: smartGeneratePrecautions(form.name || '水稻割稻', form.audience, form.place),
                        })
                      }
                      className="text-amber-800 hover:underline"
                    >
                      ✨ 智能一键生成注意事项
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  placeholder="例如：\n👟 穿戴：请穿长袖长裤与防滑运动鞋，带遮阳草帽；\n🌾 安全：镰刀刀口向外，严禁持农具奔跑，幼儿须家长一对一陪同；\n🦟 防暑：基地日照充足，多饮温水，自备防蚊液。"
                  value={form.precautions || ''}
                  onChange={(e) => setForm({ ...form, precautions: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-amber-200 bg-amber-50/40 focus:bg-white text-stone-900 leading-relaxed"
                />
              </div>

              <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                <span>内部特别备注</span>
                <textarea
                  rows={2}
                  placeholder="带队领队电话、大巴车牌号、餐标等内部协同信息"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                />
              </label>

              <div className="pt-3 border-t border-[#f1eee5] flex justify-end gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(false)}
                  className="text-xs px-4 py-2 rounded-xl border border-[#e3ded2] hover:bg-[#f8f7f2]"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  className="text-xs font-bold px-5 py-2 rounded-xl bg-[#27563c] hover:bg-[#1e4530] text-white shadow-sm"
                >
                  {saving ? '保存中…' : '保存活动'}
                </button>
              </div>
            </article>
          </div>
        )}

        {/* 微信分享协同中心弹窗 */}
        <CalendarShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          event={shareEvent}
          dailyDate={shareDailyDate}
          dailyEvents={shareDailyEvents}
          onToggleMaterialDone={(ev, idx) => {
            if (canEdit) {
              void updateMaterials(ev as any, idx);
            } else {
              const nextMats = (ev.materials || []).map((x, j) => (j === idx ? { ...x, done: !x.done } : x));
              const updated = { ...ev, materials: nextMats };
              setShareEvent(updated as any);
              if (current && current.id === ev.id) {
                setCurrent(updated as any);
              }
            }
          }}
        />

        {/* 注意事项专属弹窗 */}
        <PrecautionsModal
          isOpen={precautionsModalOpen}
          onClose={() => setPrecautionsModalOpen(false)}
          event={precautionsEvent}
        />

        {/* 全能一键导出中心弹窗 */}
        <CalendarExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          currentEvent={exportCurrentEvent}
          monthStr={month}
          monthEvents={monthEvents}
          allEvents={events}
        />

        {/* 轻量浮动提示反馈 Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-2xl bg-stone-900/95 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 border border-stone-700">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 协作者权限管理弹窗 */}
        <PermissionManagementModal
          isOpen={showPermissions}
          onClose={() => setShowPermissions(false)}
          onUpdated={load}
        />

        {/* 活动执行复盘与优化讨论抽屉 */}
        <ActivityReviewDrawer
          isOpen={reviewDrawerOpen}
          onClose={() => setReviewDrawerOpen(false)}
          event={reviewEvent}
          currentUser={account?.user}
          initialTab={reviewDrawerTab}
          onSaved={load}
        />
      </main>

      <footer className="global-footer">
        <div className="global-footer-inner">
          <div>
            <strong>江南农耕研学 · 活动排期日历</strong>
            <span className="ml-3 text-xs text-[#5d6e62]">
              日程排期 · 团队跟踪 · 物资清单 · 微信协同
            </span>
          </div>
          <span>© 2026 江南农耕文化研学项目组</span>
        </div>
      </footer>
    </div>
  );
}

const calendarStyles = `
  /* 自定义滚动条 */
  .scrollbar-none::-webkit-scrollbar { display: none; }
  .scrollbar-none { scrollbar-width: none; }
`;
