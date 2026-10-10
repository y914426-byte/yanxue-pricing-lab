'use client';

import React, { useEffect, useState } from 'react';
import { GlobalNav } from '@/components/global-nav';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Check, 
  Copy, 
  RefreshCw, 
  Users, 
  UserCog, 
  Briefcase,
  AlertCircle,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import type { AuthorizedUser, UserRole } from '@/lib/calendar-auth';

const DEPARTMENTS = [
  '研学策划部',
  '带队导师组',
  '地接运营部',
  '财务与定价组',
  '综合行政部',
];

export default function AdminPermissionsPage() {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  // 表单状态
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState('研学策划部');
  const [newRole, setNewRole] = useState<UserRole>('editor');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calendar-permissions', { cache: 'no-store' });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '获取授权成员失败');
      setUsers(data.users || []);
      setCurrentUserRole(data.currentUserRole);
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : '获取人员权限列表失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    let email = newEmail.trim().toLowerCase();
    if (/^\d{5,12}$/.test(email)) {
      email = `${email}@qq.com`;
    }
    if (!email || !email.includes('@')) {
      setMessage({ text: '请输入有效的邮箱地址（支持 QQ 号自动补全）', type: 'error' });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/calendar-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: newRole,
          display_name: newName.trim(),
          department: newDepartment.trim() || '研学项目组',
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '添加权限失败');

      setMessage({
        text: `✓ 已成功授权成员「${newName.trim() || email}」为 ${
          newRole === 'admin' ? '系统主管理员' : newRole === 'editor' ? '策划编辑人员' : '只读查看人员'
        }！`,
        type: 'success',
      });
      setNewEmail('');
      setNewName('');
      await loadData();
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : '配置权限失败',
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (email: string, targetRole: UserRole) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/calendar-permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: targetRole }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '修改角色失败');

      setMessage({
        text: `✓ 已将「${email}」的角色更新为 ${
          targetRole === 'admin' ? '系统管理员' : targetRole === 'editor' ? '策划编辑' : '只读人员'
        }`,
        type: 'success',
      });
      await loadData();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : '修改角色失败', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (!window.confirm(`确定要移除成员「${email}」的所有编辑与管理权限吗？`)) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/calendar-permissions?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '移除权限失败');

      setMessage({ text: `✓ 已成功收回成员「${email}」的权限`, type: 'success' });
      await loadData();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : '移除权限失败', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleCopyInviteGuide = () => {
    const text = `【江南农耕研学工作台 · 团队协同授权】\n您已被管理员授予系统编辑协作权限。\n工作台地址：https://yanxue-pricing-lab.pages.dev\n请使用已被授权的 QQ 邮箱（或 Google 账号）在页面右上角直接登录，即可开始协同排期、编辑方案与备货物资。`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const editorCount = users.filter((u) => u.role === 'editor').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7f2] text-[#1e2c22]">
      <GlobalNav />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 sm:px-8 py-8 space-y-8">
        {/* 返回与导航 */}
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#27563c] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> 返回工作台首页
          </a>
          <span className="text-xs text-stone-500">
            研学后台管理 · 权限控制中心
          </span>
        </div>

        {/* 顶部标题栏 */}
        <section className="p-8 rounded-3xl bg-gradient-to-br from-[#27563c] via-[#2f6346] to-[#1e4530] text-white shadow-xl shadow-[#27563c]/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white/95 text-xs font-semibold tracking-wider uppercase border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#e5c178]" />
              团队协同配置
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              研学后台团队权限管理
            </h1>
            <p className="text-white/85 text-xs sm:text-sm leading-relaxed">
              在此添加导师、活动策划与地接人员，赋予排期日历编辑、方案库协同以及价格库管理权限。支持 QQ 邮箱快捷授权与一键补全。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleCopyInviteGuide}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-[#e5c178]" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制邀请说明' : '复制团队协作说明'}
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white text-[#27563c] font-bold text-xs shadow-md hover:bg-stone-100 flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新名单
            </button>
          </div>
        </section>

        {/* 统计指标看板 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-white border border-[#e3ded2] shadow-xs space-y-2">
            <span className="text-xs text-stone-500 flex items-center gap-1.5 font-bold">
              <UserCog className="w-4 h-4 text-[#b45309]" /> 管理员总数
            </span>
            <strong className="text-3xl font-black text-stone-900 block">
              {loading ? '…' : `${adminCount + 1}`} <small className="text-xs font-normal text-stone-500">(含主管理员)</small>
            </strong>
            <p className="text-[11px] text-stone-500">拥有全站系统配置与价格库维护权限</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e3ded2] shadow-xs space-y-2">
            <span className="text-xs text-emerald-800 flex items-center gap-1.5 font-bold">
              <Users className="w-4 h-4 text-emerald-800" /> 策划编辑人员
            </span>
            <strong className="text-3xl font-black text-emerald-800 block">
              {loading ? '…' : `${editorCount} 位`}
            </strong>
            <p className="text-[11px] text-stone-500">可安排日历活动、勾选物资备货与协同方案</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e3ded2] shadow-xs space-y-2">
            <span className="text-xs text-stone-600 flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-[#27563c]" /> 当前操作人身份
            </span>
            <strong className="text-lg font-bold text-[#27563c] block truncate">
              {currentUserRole?.displayName || currentUserRole?.email || '系统主管理员'}
            </strong>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-[#b45309]">
              {currentUserRole?.isAdmin ? '★ 系统主管理员' : '策划编辑'}
            </span>
          </div>
        </div>

        {/* 操作提示消息 */}
        {message && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-2.5 border text-xs ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {message.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="font-semibold">{message.text}</span>
          </div>
        )}

        {/* 表单：添加 / 分配新成员权限 */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e3ded2] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-800" />
                新增成员或分配权限
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                支持输入 QQ 邮箱、纯数字 QQ 号（系统自动补全 @qq.com）或 Google 邮箱。
              </p>
            </div>
            <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              即刻生效
            </span>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* 账号输入框 */}
              <div className="sm:col-span-5 relative">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  成员账号（邮箱或纯 QQ 号）
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: 12345678 或 tutor@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-emerald-700 text-xs font-medium"
                />
                {/^\d{5,12}$/.test(newEmail.trim()) && (
                  <button
                    type="button"
                    onClick={() => setNewEmail(`${newEmail.trim()}@qq.com`)}
                    className="absolute right-2 top-8 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[#12b7f5] text-[10px] font-bold border border-blue-200"
                    title="点击快速补全为 QQ 邮箱"
                  >
                    补全 @qq.com
                  </button>
                )}
              </div>

              {/* 导师姓名 */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  导师姓名 / 称呼
                </label>
                <input
                  type="text"
                  placeholder="例如: 李导师"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-emerald-700 text-xs font-medium"
                />
              </div>

              {/* 角色权限选择 */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  分配权限角色
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-white font-bold text-stone-800 focus:outline-none focus:border-emerald-700 text-xs"
                >
                  <option value="editor">✓ 策划编辑 (活动排期/物资备货/方案协同)</option>
                  <option value="admin">★ 系统主管理员 (全权管理/价格库维护)</option>
                  <option value="viewer">👁 只读查看人员 (只读浏览)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              {/* 所属部门 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-stone-500 text-xs flex items-center gap-1 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-stone-400" /> 所属部门：
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DEPARTMENTS.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setNewDepartment(dept)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        newDepartment === dept
                          ? 'bg-emerald-800 text-white border-emerald-800 font-bold shadow-xs'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 whitespace-nowrap self-end sm:self-auto"
              >
                {busy ? '正在授权…' : '＋ 确认并分配编辑权限'}
              </button>
            </div>
          </form>
        </section>

        {/* 成员权限列表 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
              已授权团队成员名单 ({users.length})
            </h2>
            <span className="text-xs text-stone-500">
              可直接在列表切换成员角色或移除权限
            </span>
          </div>

          <div className="divide-y divide-stone-100 border border-stone-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            {users.length === 0 ? (
              <div className="p-12 text-center text-stone-400 space-y-3">
                <p className="text-sm">当前暂无额外配置的协作者。</p>
                <p className="text-xs text-stone-500">
                  在上方输入成员的 QQ 号或邮箱，即可给团队导师、策划人员一键分配编辑功能！
                </p>
              </div>
            ) : (
              users.map((u) => {
                const isQQ = u.email.toLowerCase().endsWith('@qq.com');
                const qqNum = isQQ ? u.email.split('@')[0] : null;

                return (
                  <div
                    key={u.email}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {isQQ && qqNum ? (
                        <img
                          src={`https://q1.qlogo.cn/g?b=qq&nk=${qqNum}&s=40`}
                          alt="QQ"
                          className="w-10 h-10 rounded-full border border-stone-200 object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {u.display_name ? u.display_name.slice(0, 1) : '学'}
                        </div>
                      )}

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-stone-900 font-bold text-sm truncate">
                            {u.email}
                          </strong>
                          {u.display_name && (
                            <span className="text-stone-600 font-medium text-xs">({u.display_name})</span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">
                            {u.department || '研学项目组'}
                          </span>
                          {isQQ ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#12b7f5]/15 text-[#0c8ebd]">
                              🐧 QQ 授权
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">
                              🌐 Google
                            </span>
                          )}
                        </div>
                        <small className="text-stone-400 block text-xs">
                          授权时间：{new Date(u.created_at).toLocaleDateString('zh-CN')} · 授权人：{u.added_by || '主管理员'}
                        </small>
                      </div>
                    </div>

                    {/* 角色快速切换与删除 */}
                    <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                      <select
                        disabled={busy}
                        value={u.role}
                        onChange={(e) => void handleRoleChange(u.email, e.target.value as UserRole)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                          u.role === 'admin'
                            ? 'bg-amber-50 text-[#b45309] border-amber-200'
                            : u.role === 'editor'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}
                      >
                        <option value="editor">✓ 策划编辑</option>
                        <option value="admin">★ 系统管理员</option>
                        <option value="viewer">👁 只读查看</option>
                      </select>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRemove(u.email)}
                        className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                        title="移除该成员权限"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <footer className="global-footer">
        <div className="global-footer-inner">
          <div>
            <strong>江南农耕研学 · 运营工作台</strong>
            <span className="ml-3 text-xs text-[#5d6e62]">
              团队权限与协作者中心
            </span>
          </div>
          <span>© 2026 江南农耕文化研学项目组 · All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
