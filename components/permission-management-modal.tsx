'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Check, 
  Copy, 
  RefreshCw, 
  X, 
  Users, 
  UserCog, 
  Briefcase,
  AlertCircle
} from 'lucide-react';
import type { AuthorizedUser, UserRole } from '@/lib/calendar-auth';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const DEPARTMENTS = [
  '研学策划部',
  '带队导师组',
  '地接运营部',
  '财务与定价组',
  '综合行政部',
];

export function PermissionManagementModal({ isOpen, onClose, onUpdated }: PermissionModalProps) {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  // 表单状态
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState('研学策划部');
  const [newRole, setNewRole] = useState<UserRole>('editor');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calendar-permissions', { cache: 'no-store' });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '获取授权成员失败');
      setUsers(data.users || []);
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : '获取授权人员列表失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadUsers();
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
          newRole === 'admin' ? '系统管理员' : newRole === 'editor' ? '策划编辑人员' : '只读人员'
        }`,
        type: 'success',
      });
      setNewEmail('');
      setNewName('');
      await loadUsers();
      if (onUpdated) onUpdated();
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

      setMessage({ text: `✓ 已将「${email}」的角色更新为 ${targetRole === 'admin' ? '管理员' : targetRole === 'editor' ? '策划编辑' : '只读人员'}`, type: 'success' });
      await loadUsers();
      if (onUpdated) onUpdated();
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
      await loadUsers();
      if (onUpdated) onUpdated();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-2xl bg-white rounded-[10px] border border-[#e5d5c3] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 (Ink Black 墨黑庄重大气) */}
        <div className="px-6 py-5 bg-[#121212] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-[#ffcd6c]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                研学后台团队权限管理
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-[#ffcd6c]">
                  管理员配置中心
                </span>
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                在此给其他导师与策划人员分配编辑功能或管理员权限，支持 QQ 与 Google 登录。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 主体可滚动区域 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs bg-[#fbfaf9]">
          {/* 权限说明与数据看板 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-[10px] bg-white border border-[#e5d5c3] space-y-1">
              <span className="text-[11px] text-[#7e7e7d] flex items-center gap-1">
                <UserCog className="w-3.5 h-3.5 text-[#d48f00]" /> 管理员数量
              </span>
              <strong className="text-xl font-bold text-[#121212] block">
                {loading ? '…' : `${adminCount + 1}`} <small className="text-xs font-normal text-[#7e7e7d]">(含主管理员)</small>
              </strong>
            </div>

            <div className="p-3.5 rounded-[10px] bg-white border border-[#e5d5c3] space-y-1">
              <span className="text-[11px] text-[#00c978] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#00c978]" /> 策划编辑人员
              </span>
              <strong className="text-xl font-bold text-[#121212] block">
                {loading ? '…' : `${editorCount} 位`}
              </strong>
            </div>

            <div className="p-3.5 rounded-[10px] bg-white border border-[#e5d5c3] flex flex-col justify-between">
              <span className="text-[11px] text-[#7e7e7d]">协同快速指引</span>
              <button
                type="button"
                onClick={handleCopyInviteGuide}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f6f4ef] hover:bg-[#ede9e2] text-[#121212] font-semibold text-xs border border-[#e5d5c3] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00c978]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制邀请说明' : '复制团队协作说明'}
              </button>
            </div>
          </div>

          {/* 操作提示消息 */}
          {message && (
            <div
              className={`p-3.5 rounded-[10px] flex items-center gap-2 border ${
                message.type === 'success'
                  ? 'bg-[#00c978]/10 text-[#008f55] border-[#00c978]/30'
                  : 'bg-[#ff2b3a]/10 text-[#ff2b3a] border-[#ff2b3a]/25'
              }`}
            >
              {message.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span className="font-semibold">{message.text}</span>
            </div>
          )}

          {/* 表单：添加 / 分配新成员权限 */}
          <div className="p-5 rounded-[10px] bg-white border border-[#e5d5c3] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#121212] flex items-center gap-2 text-sm">
                <UserPlus className="w-4 h-4 text-[#121212]" />
                新增成员或分配权限
              </h3>
              <span className="text-[11px] text-[#7e7e7d]">
                支持 QQ 邮箱、纯 QQ 号或 Google 邮箱
              </span>
            </div>

            <form onSubmit={handleAdd} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* 账号输入框 */}
                <div className="sm:col-span-5 relative">
                  <input
                    type="text"
                    required
                    placeholder="成员邮箱或 QQ 号 (如: 12345678)"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full p-2.5 rounded-[8px] border border-[#e5d5c3] bg-white focus:outline-none focus:border-[#121212] text-xs font-medium"
                  />
                  {/^\d{5,12}$/.test(newEmail.trim()) && (
                    <button
                      type="button"
                      onClick={() => setNewEmail(`${newEmail.trim()}@qq.com`)}
                      className="absolute right-2 top-2 px-2 py-0.5 rounded-[4px] bg-[#64c6ff]/15 hover:bg-[#64c6ff]/25 text-[#0086fc] text-[10px] font-bold border border-[#64c6ff]/30 transition-colors"
                      title="点击快速补全为 QQ 邮箱"
                    >
                      补全 @qq.com
                    </button>
                  )}
                </div>

                {/* 姓名称呼 */}
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="导师称呼/姓名"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2.5 rounded-[8px] border border-[#e5d5c3] bg-white focus:outline-none focus:border-[#121212] text-xs font-medium"
                  />
                </div>

                {/* 角色权限选择 */}
                <div className="sm:col-span-4">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full p-2.5 rounded-[8px] border border-[#e5d5c3] bg-white font-bold text-[#121212] focus:outline-none focus:border-[#121212] text-xs"
                  >
                    <option value="editor">✓ 策划编辑 (方案/排期/物资)</option>
                    <option value="admin">★ 系统主管理员 (全权管理)</option>
                    <option value="viewer">👁 只读查看人员 (只读浏览)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* 所属部门 */}
                <div className="flex items-center gap-2">
                  <span className="text-[#7e7e7d] text-[11px] flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-[#7e7e7d]" /> 所属部门：
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPARTMENTS.map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setNewDepartment(dept)}
                        className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium border transition-colors cursor-pointer ${
                          newDepartment === dept
                            ? 'bg-[#121212] text-white border-[#121212] font-bold'
                            : 'bg-white text-[#474645] border-[#e5d5c3] hover:bg-[#f6f4ef]'
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
                  className="px-5 py-2.5 rounded-full bg-[#121212] hover:bg-[#2b2b2b] text-white font-semibold text-xs transition-all disabled:opacity-50 whitespace-nowrap self-end sm:self-auto cursor-pointer"
                >
                  {busy ? '正在授权…' : '＋ 确认并分配权限'}
                </button>
              </div>
            </form>
          </div>

          {/* 成员权限列表 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#121212] text-xs uppercase tracking-wider flex items-center gap-2">
                已授权团队成员名单 ({users.length})
              </h3>
              <button
                type="button"
                onClick={loadUsers}
                disabled={loading}
                className="text-[#121212] hover:text-[#ff3e00] hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> 刷新名单
              </button>
            </div>

            <div className="divide-y divide-[#f2f0ed] border border-[#e5d5c3] rounded-[10px] overflow-hidden bg-white">
              {users.length === 0 ? (
                <div className="p-8 text-center text-[#7e7e7d] space-y-2">
                  <p>当前暂无额外配置的协作者。</p>
                  <p className="text-[11px] text-[#7e7e7d]">
                    在上方输入成员的 QQ 号或邮箱，即可给导师、策划分配编辑功能！
                  </p>
                </div>
              ) : (
                users.map((u) => {
                  const isQQ = u.email.toLowerCase().endsWith('@qq.com');
                  const qqNum = isQQ ? u.email.split('@')[0] : null;

                  return (
                    <div
                      key={u.email}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fbfaf9] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isQQ && qqNum ? (
                          <img
                            src={`https://q1.qlogo.cn/g?b=qq&nk=${qqNum}&s=40`}
                            alt="QQ"
                            className="w-9 h-9 rounded-full border border-[#e5d5c3] object-cover flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#121212] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {u.display_name ? u.display_name.slice(0, 1) : '学'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-[#121212] font-bold text-xs truncate">
                              {u.email}
                            </strong>
                            {u.display_name && (
                              <span className="text-[#474645] font-medium">({u.display_name})</span>
                            )}
                            <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#f2f0ed] text-[#474645] border border-[#e5d5c3]/60">
                              {u.department || '研学项目组'}
                            </span>
                            {isQQ ? (
                              <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#64c6ff]/15 text-[#0086fc]">
                                🐧 QQ 授权
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#f2f0ed] text-[#474645]">
                                🌐 Google
                              </span>
                            )}
                          </div>
                          <small className="text-[#7e7e7d] block mt-0.5 text-[11px]">
                            授权时间：{new Date(u.created_at).toLocaleDateString('zh-CN')} · 授权人：{u.added_by || '主管理员'}
                          </small>
                        </div>
                      </div>

                      {/* 角色快速切换与删除 */}
                      <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                        <select
                          disabled={busy}
                          value={u.role}
                          onChange={(e) => void handleRoleChange(u.email, e.target.value as UserRole)}
                          className={`p-1.5 rounded-full border text-xs font-bold transition-all ${
                            u.role === 'admin'
                              ? 'bg-[#ffbb26]/20 text-[#9a6700] border-[#ffbb26]/40'
                              : u.role === 'editor'
                              ? 'bg-[#00c978]/15 text-[#008f55] border-[#00c978]/30'
                              : 'bg-[#f2f0ed] text-[#474645] border-[#e5d5c3]'
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
                          className="p-1.5 rounded-full text-[#7e7e7d] hover:text-[#ff2b3a] hover:bg-[#ff2b3a]/10 transition-colors cursor-pointer"
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
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="px-6 py-3.5 bg-white border-t border-[#e5d5c3] flex items-center justify-between text-xs">
          <span className="text-[#7e7e7d]">
            💡 权限修改即刻生效，成员重新登录或刷新页面即可获得对应功能权限。
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#f6f4ef] border border-[#e5d5c3] hover:bg-[#ede9e2] text-[#121212] font-semibold transition-colors cursor-pointer"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
}
