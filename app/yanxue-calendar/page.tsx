'use client';

import { useEffect, useMemo, useState } from 'react';
import { GoogleSignIn } from '@/components/google-sign-in';
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
  Download
} from 'lucide-react';

type M = { name: string; qty: string; note: string; done: boolean };
type E = { id: string; date: string; name: string; audience: string; people: number; place: string; status: string; flow: string; materials: M[]; note: string };
type A = { user: { displayName: string; email: string } | null; clientId: string | null };
type PermUser = { email: string; role: string; display_name: string; added_by: string; created_at: string };

const labels: Record<string, string> = {
  confirmed: '已确定',
  pending: '待确认',
  booking: '预约中',
  completed: '已完成',
  cancelled: '已取消',
};

const blank = (): E => ({
  id: '',
  date: new Date().toISOString().slice(0, 10),
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
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [current, setCurrent] = useState<E | null>(null);
  const [form, setForm] = useState<E>(blank());
  const [editing, setEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [error, setError] = useState('');
  const [account, setAccount] = useState<A | undefined>();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  // 权限管理弹窗相关状态
  const [showPermissions, setShowPermissions] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<PermUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'editor' | 'admin'>('editor');
  const [newName, setNewName] = useState('');
  const [permBusy, setPermBusy] = useState(false);
  const [permMsg, setPermMsg] = useState('');

  // 邮件预约提醒相关状态
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderDays, setReminderDays] = useState(1);
  const [reminderStatus, setReminderStatus] = useState('');

  const load = async () => {
    try {
      const r = await fetch('/api/learning-calendar', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEvents(d.events || []);
      setCanEdit(!!d.canEdit);
      setIsAdmin(!!d.isAdmin);
      setUserRole(d.userRole || 'viewer');
      setError('');
    } catch (e) {
      const m = e instanceof Error ? e.message : '读取失败';
      setError(
        m.includes('no such table: learning_calendar_events')
          ? '日历数据表尚未初始化，请先应用 0009_learning_calendar.sql 迁移。'
          : m
      );
    }
  };

  const loadPermissions = async () => {
    try {
      setPermBusy(true);
      const r = await fetch('/api/calendar-permissions', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setAuthorizedUsers(d.users || []);
      setPermMsg('');
    } catch (e) {
      setPermMsg(e instanceof Error ? e.message : '获取协作者列表失败');
    } finally {
      setPermBusy(false);
    }
  };

  const addPermissionUser = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      alert('请输入有效的邮箱地址');
      return;
    }
    try {
      setPermBusy(true);
      const r = await fetch('/api/calendar-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
          display_name: newName,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setNewEmail('');
      setNewName('');
      setPermMsg('✓ 权限已成功更新！');
      await loadPermissions();
    } catch (e) {
      alert(e instanceof Error ? e.message : '授权添加失败');
    } finally {
      setPermBusy(false);
    }
  };

  const removePermissionUser = async (email: string) => {
    if (!confirm(`确定要移除 ${email} 的编辑权限吗？`)) return;
    try {
      setPermBusy(true);
      const r = await fetch(`/api/calendar-permissions?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await loadPermissions();
    } catch (e) {
      alert(e instanceof Error ? e.message : '移除失败');
    } finally {
      setPermBusy(false);
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
      const d = await r.json();
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
      const d = await r.json();
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
    // 检查 url query 是否有 action=new
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('action') === 'new') {
        setForm(blank());
        setEditing(true);
      }
    }
  }, []);

  const monthEvents = useMemo(() => events.filter((e) => e.date.startsWith(month)), [events, month]);
  const list = useMemo(
    () =>
      monthEvents.filter(
        (e) =>
          (!query ||
            `${e.name} ${e.audience} ${e.place} ${e.flow} ${e.note} ${e.materials
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
      const d = await r.json();
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
      const d = await r.json();
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
      const d = await r.json();
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
      const d = await r.json();
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
    const d = await r.json();
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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => {
                  setShowPermissions(true);
                  void loadPermissions();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 shadow-sm transition-colors"
                title="管理团队协作者的编辑与管理权限"
              >
                <Users className="w-3.5 h-3.5 text-[#27563c]" />
                <span>团队权限管理</span>
              </button>
            )}

            <button
              onClick={() => downloadBatchICS(monthEvents, `${y}年${m}月-研学排期日历`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 shadow-sm transition-colors"
              title="一键导出到 iPhone、Mac、Android、Outlook 手机/电脑系统日历"
            >
              <Download className="w-3.5 h-3.5 text-[#d97706]" />
              <span>同步系统日历 (.ics)</span>
            </button>

            {canEdit && (
              <button
                onClick={() => {
                  setForm(blank());
                  setEditing(true);
                }}
                className="global-btn-cta"
              >
                <Plus className="w-4 h-4" /> 新建活动
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
            ) : account?.clientId ? (
              <GoogleSignIn
                clientId={account.clientId}
                onSuccess={() => {
                  void (async () => {
                    await loadAccount();
                    await load();
                  })();
                }}
              />
            ) : null}

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
          <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={load} className="underline text-xs hover:text-red-900">重新加载</button>
          </div>
        )}

        {/* 月度统计卡片：清爽高雅配色 */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-xs font-medium text-stone-500">本月活动场次</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-serif font-bold text-stone-900">{stats.total}</span>
              <span className="text-xs text-stone-500">场</span>
            </div>
          </div>
          <div className="p-5 rounded-xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-xs font-medium text-stone-500">预计参与总人数</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-serif font-bold text-[#27563c]">{stats.people.toLocaleString()}</span>
              <span className="text-xs text-stone-500">人</span>
            </div>
          </div>
          <div className="p-5 rounded-xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-xs font-medium text-stone-500">已确定活动</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-serif font-bold text-emerald-700">{stats.confirmed}</span>
              <span className="text-xs text-stone-500">场</span>
            </div>
          </div>
          <div className="p-5 rounded-xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-xs font-medium text-stone-500">待跟进预约</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-serif font-bold text-[#d97706]">{stats.pending}</span>
              <span className="text-xs text-stone-500">场</span>
            </div>
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
              onClick={() => setMonth(new Date().toISOString().slice(0, 7))}
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

          <div className="flex items-center gap-2">
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
                const isToday = date === new Date().toISOString().slice(0, 10);

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
                            isToday ? 'bg-[#27563c] text-white' : 'text-[#5d6e62]'
                          }`}
                        >
                          {n}
                        </span>
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
                    )}

                    <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-none">
                      {es.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setCurrent(e)}
                          className={`w-full text-left p-1.5 rounded-lg text-[11px] leading-tight block border transition-all ${
                            e.status === 'confirmed'
                              ? 'bg-[#edf5ef] text-[#27563c] border-[#c9e3d2]'
                              : e.status === 'pending'
                              ? 'bg-[#fef7ec] text-[#d97706] border-[#f7dfbe]'
                              : e.status === 'booking'
                              ? 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]'
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

                      <div className="flex items-center gap-3 flex-shrink-0">
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

        {/* 活动详情模态弹窗 */}
        {current && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCurrent(null)}
          >
            <article
              className="bg-white rounded-2xl border border-[#e3ded2] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => setCurrent(null)}
              >
                ×
              </button>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      current.status === 'confirmed'
                        ? 'bg-[#edf5ef] text-[#27563c]'
                        : current.status === 'pending'
                        ? 'bg-[#fef7ec] text-[#d97706]'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {labels[current.status]}
                  </span>
                  <span className="text-xs text-[#5d6e62]">{current.date}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-[#1e2c22]">{current.name}</h2>
                <div className="flex items-center gap-4 text-xs text-[#5d6e62]">
                  <span>👥 对象：{current.audience || '未填写'}</span>
                  <span>标定人数：{current.people} 人</span>
                  <span>📍 场地：{current.place || '场地待定'}</span>
                </div>
              </div>

              {/* 快捷状态变更 */}
              {canEdit && (current.status === 'pending' || current.status === 'booking') && (
                <div className="p-3 bg-[#fef7ec] border border-[#f7dfbe] rounded-xl flex items-center justify-between">
                  <span className="text-xs text-[#8c5717]">当前活动处于【待跟进】状态</span>
                  <button
                    onClick={() => void updateStatusDirect(current, 'confirmed')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#27563c] text-white hover:bg-[#1e4530]"
                  >
                    ✓ 一键确认为“已确定活动”
                  </button>
                </div>
              )}

              {/* 活动流程 */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[#1e2c22] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#27563c]" /> 活动流程与日程安排
                </h3>
                <div className="p-4 rounded-xl bg-[#f8f7f2] border border-[#e3ded2] text-xs leading-relaxed space-y-1.5">
                  {current.flow ? (
                    current.flow.split('\n').map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-[#27563c] font-bold">•</span>
                        <span>{line}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[#8b998e]">暂无填写的活动流程</span>
                  )}
                </div>
              </div>

              {/* 物资准备清单 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#1e2c22] flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-[#27563c]" /> 物资准备清单
                  </h3>
                  <span className="text-xs font-bold text-[#27563c]">
                    已备 {current.materials.filter((x) => x.done).length} / {current.materials.length}{' '}
                    项 (
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

                {/* 进度条 */}
                <div className="w-full bg-[#f1eee5] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#27563c] h-full transition-all duration-300"
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

                {canEdit && current.materials.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => void setAllMaterials(current, true)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-[#27563c]"
                    >
                      全部标记为已准备
                    </button>
                    <button
                      onClick={() => void setAllMaterials(current, false)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-[#5d6e62]"
                    >
                      全部重置
                    </button>
                  </div>
                )}

                <div className="divide-y divide-[#f1eee5] border-t border-[#f1eee5]">
                  {current.materials.length === 0 ? (
                    <p className="py-4 text-xs text-[#8b998e]">暂未添加物资需求。</p>
                  ) : (
                    current.materials.map((m, i) => (
                      <label
                        key={i}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-[#faf9f5] px-2 rounded-lg"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={m.done}
                            disabled={!canEdit}
                            onChange={() => void updateMaterials(current, i)}
                            className="rounded text-[#27563c] focus:ring-[#27563c]"
                          />
                          <span
                            className={
                              m.done ? 'line-through text-[#8b998e]' : 'font-semibold text-[#1e2c22]'
                            }
                          >
                            {m.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[#5d6e62]">
                          <span>{m.qty}</span>
                          {m.note && <small className="text-[#8b998e]">（{m.note}）</small>}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {current.note && (
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#1e2c22]">备注说明</h3>
                  <p className="text-xs text-[#5d6e62] p-3 rounded-lg bg-[#f8f7f2] border border-[#e3ded2]">
                    {current.note}
                  </p>
                </div>
              )}

              {/* 活动开始预约提醒与系统日历同步 */}
              <div className="space-y-3 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-[#d97706]" /> 活动预约出团提醒 & 系统日历同步
                  </h3>
                  <span className="text-[11px] text-amber-800 font-medium">支持 iPhone/Mac/Windows 日历闹钟与邮件通告</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* 手机/电脑日历同步 */}
                  <div className="p-3 bg-white rounded-lg border border-amber-200/60 space-y-2">
                    <span className="text-xs font-bold text-stone-900 block flex items-center gap-1">
                      <span>📱</span> 手机 / 电脑系统日历 (.ics)
                    </span>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      一键生成标准 .ics 文件，苹果 iOS、Mac、安卓系统日历、Outlook 均可原生导入，已内置出团前 1 天与 2 小时响铃提醒。
                    </p>
                    <button
                      onClick={() => downloadEventICS(current)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-[#e5c178]" /> 添加到系统日历 (.ics)
                    </button>
                  </div>

                  {/* 邮箱出团提醒 */}
                  <div className="p-3 bg-white rounded-lg border border-amber-200/60 space-y-2">
                    <span className="text-xs font-bold text-stone-900 block flex items-center gap-1">
                      <span>✉️</span> 预约出团邮件通知
                    </span>
                    <div className="space-y-1.5">
                      <input
                        placeholder="接收邮箱（如带队导师/基地联系人）"
                        value={reminderEmail}
                        onChange={(e) => setReminderEmail(e.target.value)}
                        className="w-full text-xs p-2 rounded border border-stone-200 bg-stone-50 focus:bg-white"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={reminderDays}
                          onChange={(e) => setReminderDays(Number(e.target.value))}
                          className="text-xs p-1.5 rounded border border-stone-200 bg-stone-50 text-stone-800 font-medium"
                        >
                          <option value={1}>提前 1 天提醒</option>
                          <option value={3}>提前 3 天提醒</option>
                          <option value={0}>当天早晨提醒</option>
                        </select>
                        <button
                          onClick={() => void sendEmailReminder(current)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-semibold shadow-sm transition-colors"
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

              {/* 动作区 */}
              <div className="pt-4 border-t border-[#f1eee5] flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => sendToPricing(current)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white shadow-sm"
                  >
                    <Calculator className="w-3.5 h-3.5" /> 带入定价台测算
                  </button>
                </div>
                  >
                    <Calculator className="w-3.5 h-3.5" /> 带入定价台测算
                  </button>
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setForm(current);
                        setCurrent(null);
                        setEditing(true);
                      }}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#e3ded2] hover:bg-[#f8f7f2] text-[#1e2c22]"
                    >
                      编辑内容
                    </button>
                    <button
                      onClick={() => duplicate(current)}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#e3ded2] hover:bg-[#f8f7f2] text-[#1e2c22] inline-flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> 复制副本
                    </button>
                    <button
                      onClick={() => remove(current.id)}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 删除
                    </button>
                  </div>
                )}
              </div>
            </article>
          </div>
        )}

        {/* 新增 / 编辑活动弹窗 */}
        {editing && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <article
              className="bg-white rounded-2xl border border-[#e3ded2] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-2xl"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                ×
              </button>

              <div>
                <span className="text-xs font-bold text-[#5d6e62] uppercase">ACTIVITY EDITOR</span>
                <h2 className="text-2xl font-extrabold text-[#1e2c22]">
                  {form.id ? '编辑研学活动' : '安排新研学活动'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                  <span>活动日期</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                  />
                </label>

                <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                  <span>活动状态</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
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
                <span>活动名称</span>
                <input
                  maxLength={80}
                  placeholder="例如：江南水稻探秘研学实践一日营"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                  <span>研学对象（年级/团型）</span>
                  <input
                    placeholder="例如：小学 3-5 年级 / 亲子家庭"
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                  />
                </label>

                <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                  <span>预估参与人数（人）</span>
                  <input
                    type="number"
                    min="0"
                    value={form.people}
                    onChange={(e) => setForm({ ...form, people: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                  />
                </label>
              </div>

              <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                <span>活动场地</span>
                <input
                  value={form.place}
                  onChange={(e) => setForm({ ...form, place: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                />
              </label>

              <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                <span>活动流程（每行一项时间与内容）</span>
                <textarea
                  rows={4}
                  value={form.flow}
                  onChange={(e) => setForm({ ...form, flow: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
                />
              </label>

              {/* 物资编辑与快捷预设 */}
              <div className="space-y-3 pt-2 border-t border-[#f1eee5]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#1e2c22]">物资清单</span>
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
                    ＋ 添加一行
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

                <div className="space-y-2">
                  {form.materials.map((m, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-2 p-2 bg-[#f8f7f2] rounded-lg items-center text-xs"
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
                        className="col-span-5 p-1.5 rounded border border-[#e3ded2] bg-white"
                      />
                      <input
                        placeholder="数量要求"
                        value={m.qty}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            materials: form.materials.map((x, j) =>
                              j === i ? { ...x, qty: e.target.value } : x
                            ),
                          })
                        }
                        className="col-span-3 p-1.5 rounded border border-[#e3ded2] bg-white"
                      />
                      <input
                        placeholder="备注"
                        value={m.note}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            materials: form.materials.map((x, j) =>
                              j === i ? { ...x, note: e.target.value } : x
                            ),
                          })
                        }
                        className="col-span-3 p-1.5 rounded border border-[#e3ded2] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            materials: form.materials.filter((_, j) => j !== i),
                          })
                        }
                        className="col-span-1 text-red-500 hover:text-red-700 text-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="text-xs font-bold text-[#1e2c22] space-y-1 block">
                <span>备注</span>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white"
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

        {/* 协作者权限管理弹窗 */}
        {showPermissions && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPermissions(false)}
          >
            <article
              className="bg-white rounded-2xl border border-stone-200 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 text-2xl"
                onClick={() => setShowPermissions(false)}
              >
                ×
              </button>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>TEAM ACCESS CONTROL</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                  团队协作者与编辑权限管理
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  方便您随时给带队导师、研学策划或其他运营人员增加排期日历与物资的编辑权限，无需改动云端配置。
                </p>
              </div>

              {/* 授权新成员卡片 */}
              <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/80 space-y-3">
                <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-800" /> 授权新协作者账户
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <input
                    placeholder="成员 Google 邮箱 (必填，如 mentor@gmail.com)"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="sm:col-span-6 p-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-emerald-700"
                  />
                  <input
                    placeholder="导师姓名/称呼 (选填)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="sm:col-span-3 p-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-emerald-700"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'editor' | 'admin')}
                    className="sm:col-span-3 p-2 rounded-lg border border-stone-200 bg-white font-medium focus:outline-none focus:border-emerald-700 text-stone-800"
                  >
                    <option value="editor">活动策划/编辑员</option>
                    <option value="admin">系统管理员</option>
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-stone-500">
                    💡 提示：该成员使用所填邮箱登录 Google 后，将自动获得日历编辑与物资标记权限。
                  </span>
                  <button
                    disabled={permBusy}
                    onClick={addPermissionUser}
                    className="px-4 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {permBusy ? '正在处理…' : '＋ 确认并赋予权限'}
                  </button>
                </div>
              </div>

              {permMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
                  <span>{permMsg}</span>
                </div>
              )}

              {/* 已授权成员列表 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    已授权的协作者名单 ({authorizedUsers.length})
                  </h3>
                  <button
                    onClick={loadPermissions}
                    disabled={permBusy}
                    className="text-xs text-emerald-800 hover:underline"
                  >
                    刷新名单
                  </button>
                </div>

                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white shadow-inner">
                  {authorizedUsers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-400">
                      暂无添加的额外协作者（当前仅主管理员拥有编辑权限）。在上方输入邮箱即可一键授权。
                    </div>
                  ) : (
                    authorizedUsers.map((u) => (
                      <div
                        key={u.email}
                        className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-stone-50/80 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-stone-900 font-medium">{u.email}</strong>
                            {u.display_name && (
                              <span className="text-stone-500 text-[11px]">（{u.display_name}）</span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.role === 'admin'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {u.role === 'admin' ? '管理员' : '策划编辑'}
                            </span>
                          </div>
                          <small className="text-stone-400 block mt-0.5 text-[11px]">
                            授权时间：{new Date(u.created_at).toLocaleDateString('zh-CN')} · 授权人：{u.added_by || '管理员'}
                          </small>
                        </div>
                        <button
                          disabled={permBusy}
                          onClick={() => void removePermissionUser(u.email)}
                          className="text-xs text-stone-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                        >
                          移除权限
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowPermissions(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium"
                >
                  完成并关闭
                </button>
              </div>
            </article>
          </div>
        )}
      </main>

      <footer className="global-footer">
        <div className="global-footer-inner">
          <div>
            <strong>江南农耕研学 · 活动排期日历</strong>
            <span className="ml-3 text-xs text-[#5d6e62]">
              日程排期 · 团队跟踪 · 物资清单
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
