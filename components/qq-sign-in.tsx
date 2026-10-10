'use client';

import { useState } from 'react';
import { Sparkles, CheckCircle2, UserPlus, LogIn, ShieldCheck, ChevronRight } from 'lucide-react';

interface QQSignInProps {
  onSuccess: () => void;
  className?: string;
  triggerText?: string;
  variant?: 'primary' | 'outline' | 'compact';
}

export function QQSignIn({
  onSuccess,
  className = '',
  triggerText = 'QQ 注册 / 快捷登录',
  variant = 'primary',
}: QQSignInProps) {
  const [showModal, setShowModal] = useState(false);
  const [qq, setQq] = useState('');
  const [nickname, setNickname] = useState('');
  const [department, setDepartment] = useState('带队研学导师');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successTip, setSuccessTip] = useState('');

  const cleanQq = qq.trim().replace(/@qq\.com$/i, '');
  const isValidQq = /^\d{5,12}$/.test(cleanQq);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValidQq) {
      setError('请输入正确的 5~12 位数字 QQ 账号');
      return;
    }

    setBusy(true);
    setError('');
    setSuccessTip('');

    try {
      const res = await fetch('/api/auth/qq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qq: cleanQq,
          nickname: nickname.trim(),
          department,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; user?: any };
      if (!res.ok) throw new Error(data.error || 'QQ 注册/登录失败');

      setSuccessTip('✓ 注册登记成功，正在为您进入工作台…');
      setTimeout(() => {
        setShowModal(false);
        onSuccess();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12b7f5] hover:bg-[#0ea4dc] text-white text-xs font-semibold shadow-xs transition-all ${className}`}
          title="使用 QQ 账号注册或登录"
        >
          <span className="text-sm">🐧</span>
          <span>{triggerText}</span>
        </button>
      ) : variant === 'outline' ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#12b7f5]/40 hover:border-[#12b7f5] bg-white hover:bg-[#12b7f5]/5 text-[#0d92c7] text-xs font-semibold shadow-xs transition-all ${className}`}
          title="使用 QQ 账号注册或登录"
        >
          <span className="text-base">🐧</span>
          <span>{triggerText}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#12b7f5] hover:bg-[#0ea4dc] text-white text-xs font-bold shadow-sm transition-all hover:shadow-md ${className}`}
          title="使用 QQ 账号快捷注册并加入研学工作台"
        >
          <span className="text-base leading-none">🐧</span>
          <span>{triggerText}</span>
        </button>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-stone-200 w-full max-w-md p-6 sm:p-7 space-y-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center text-lg font-bold transition-colors"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>

            {/* 弹窗头部 */}
            <div className="text-center space-y-2 pt-1">
              <div className="relative inline-block">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#12b7f5] to-[#49ccfd] text-white flex items-center justify-center mx-auto text-3xl shadow-md shadow-[#12b7f5]/20">
                  🐧
                </div>
                {isValidQq && (
                  <img
                    src={`https://q1.qlogo.cn/g?b=qq&nk=${cleanQq}&s=100`}
                    alt="QQ头像"
                    className="w-8 h-8 rounded-full absolute -bottom-1 -right-1 border-2 border-white shadow-sm object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                QQ 团队注册 · 快捷登录
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                无需复杂密码，输入 QQ 账号一键完成实名登记，自动同步个人方案库、排期日历与协作者权限。
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* QQ 号码 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex justify-between items-center">
                  <span>QQ 号码 / QQ 邮箱 <strong className="text-red-500">*</strong></span>
                  {isValidQq && (
                    <span className="text-[11px] text-[#12b7f5] font-semibold">
                      已识别：{cleanQq}@qq.com
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="例如：914426 或 914426@qq.com"
                    value={qq}
                    onChange={(e) => {
                      setQq(e.target.value);
                      setError('');
                    }}
                    className="w-full text-sm font-semibold p-3 pr-12 rounded-xl border border-stone-200 bg-stone-50/70 focus:bg-white focus:outline-none focus:border-[#12b7f5] focus:ring-2 focus:ring-[#12b7f5]/15 transition-all text-stone-800"
                  />
                  {isValidQq && (
                    <img
                      src={`https://q1.qlogo.cn/g?b=qq&nk=${cleanQq}&s=40`}
                      alt="QQ头像"
                      className="w-7 h-7 rounded-full absolute right-3 top-2.5 border border-stone-200 object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 姓名 / 称呼 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  带队导师姓名 / 团队称呼 <span className="text-stone-400 font-normal">（推荐填写）</span>
                </label>
                <input
                  type="text"
                  placeholder="例如：王导师 / 李策划 / 张老师"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/70 focus:bg-white focus:outline-none focus:border-[#12b7f5] focus:ring-2 focus:ring-[#12b7f5]/15 transition-all text-stone-800"
                />
              </div>

              {/* 职责岗位 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  团队岗位 / 业务角色
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/70 focus:bg-white focus:outline-none focus:border-[#12b7f5] text-stone-800 font-medium"
                >
                  <option value="带队研学导师">带队研学导师（负责现场带团与活动执行）</option>
                  <option value="课程方案策划">课程方案策划（负责研学教案与定价核算）</option>
                  <option value="物资后勤保障">物资后勤保障（负责物料采购与备货核对）</option>
                  <option value="研学项目总监">研学项目总监 / 运营主管</option>
                </select>
              </div>

              {/* 错误与成功反馈 */}
              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                  <span className="font-bold">✕</span>
                  <span>{error}</span>
                </div>
              )}
              {successTip && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-semibold">{successTip}</span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 text-xs py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 font-semibold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-2/3 text-xs py-3 rounded-xl bg-[#12b7f5] hover:bg-[#0ea4dc] text-white font-bold shadow-md shadow-[#12b7f5]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? (
                    '正在登记注册…'
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> 注册并登录工作台
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* 底部保障提示 */}
            <div className="bg-[#f8f7f2] p-3 rounded-xl border border-stone-200/80 text-[11px] text-stone-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-stone-700">
                <ShieldCheck className="w-3.5 h-3.5 text-[#27563c]" />
                团队安全授权保障
              </div>
              <p>
                完成登记后，管理员在权限中心可将您的 QQ 邮箱（{cleanQq || 'xxx'}@qq.com）一键设为编辑人员，日历与物资排期自动解锁。
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
