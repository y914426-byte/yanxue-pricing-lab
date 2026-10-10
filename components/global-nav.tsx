'use client';

import React, { useEffect, useRef, useState } from 'react';
import { QQSignIn } from '@/components/qq-sign-in';
import { 
  User, 
  LogOut, 
  ShieldCheck, 
  ChevronDown, 
  Sparkles, 
  UserPlus, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PermissionManagementModal } from '@/components/permission-management-modal';

export type NavTab = 
  | 'overview' 
  | 'pricing' 
  | 'calendar' 
  | 'materials' 
  | 'schemes' 
  | 'import' 
  | 'learning' 
  | 'prices';

interface GlobalNavProps {
  active?: NavTab;
  extraRight?: React.ReactNode;
  hideCta?: boolean;
}

type UserAccount = {
  displayName: string;
  email: string;
  isQQ?: boolean;
  avatarUrl?: string;
  role?: string;
  department?: string;
  isAdmin?: boolean;
  canEdit?: boolean;
};

export function GlobalNav({ active = 'overview', extraRight, hideCta = false }: GlobalNavProps) {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const navItems = [
    { key: 'overview', label: '运营总览', href: '/' },
    { key: 'pricing', label: '研学定价台', href: '/pricing' },
    { key: 'calendar', label: '活动日历', href: '/yanxue-calendar' },
    { key: 'materials', label: '物资中心', href: '/yanxue-calendar/materials' },
    { key: 'schemes', label: '研学方案库', href: '/schemes' },
    { key: 'import', label: '方案导入', href: '/scheme-import' },
    { key: 'learning', label: '成本知识库', href: '/learning' },
    { key: 'prices', label: '价格数据库', href: '/prices' },
  ];

  const checkScroll = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  const scrollByAmount = (offset: number) => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 200);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (navRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      navRef.current.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  const fetchAccount = async () => {
    try {
      const res = await fetch('/api/account', { cache: 'no-store' });
      const data = (await res.json()) as any;
      if (res.ok && data?.user) {
        setAccount(data.user);
      } else {
        setAccount(null);
      }
    } catch {
      setAccount(null);
    }
  };

  useEffect(() => {
    void fetchAccount();
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  // 页面激活标签自动平滑滚动居中
  useEffect(() => {
    if (navRef.current) {
      const activeEl = navRef.current.querySelector('.global-nav-link.active') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      checkScroll();
    }
  }, [active]);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAccount(null);
      setShowUserMenu(false);
      window.location.reload();
    } catch (e) {
      alert('退出登录失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  // 如果在日历页面，避免与页面自身的“新建活动”冲突
  const showDefaultCta = !hideCta && active !== 'calendar';

  return (
    <header className="global-topbar relative z-40">
      <div className="global-topbar-inner">
        <a className="global-brand group" href="/" title="返回江南农耕研学工作台首页">
          <span className="global-brand-mark relative overflow-hidden group-hover:scale-105 transition-transform">
            耕
          </span>
          <div className="global-brand-text">
            <strong>江南农耕研学</strong>
            <small>数字化运营工作台 · OPERATIONS HUB</small>
          </div>
        </a>

        {/* 带有平滑横向滑动轨道的导航栏 */}
        <div className="global-nav-container">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByAmount(-180)}
              className="nav-scroll-btn mr-1 shadow-xs"
              title="向左滑动"
              aria-label="向左滑动导航"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <nav 
            ref={navRef} 
            onScroll={checkScroll} 
            onWheel={handleWheel}
            className="global-nav" 
            aria-label="全局导航"
          >
            {navItems.map((item) => {
              const isActive = active === item.key;
              return (
                <a
                  key={item.key}
                  href={item.href}
                  className={`global-nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByAmount(180)}
              className="nav-scroll-btn ml-1 shadow-xs"
              title="向右滑动"
              aria-label="向右滑动导航"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="global-topbar-actions flex items-center gap-2">
          {extraRight}

          {/* 权限配置专属入口：清爽药丸徽标，仅管理员可见 */}
          {account?.isAdmin && (
            <button
              type="button"
              onClick={() => setShowPermModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eaf4ed] hover:bg-[#d8ebe0] text-[#1e5838] border border-[#c3ded0] font-semibold text-xs shadow-2xs transition-all hover:scale-[1.02]"
              title="研学后台团队权限管理：配置其他成员编辑功能"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1e5838]" />
              <span>团队权限</span>
            </button>
          )}

          {showDefaultCta && (
            <a
              className="global-btn-cta"
              href="/yanxue-calendar?action=new"
              title="排期并安排新活动"
            >
              <span>＋</span> 排期新活动
            </a>
          )}

          {/* 全局账号状态与 QQ 登录中心 */}
          {account ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50 transition-all text-xs shadow-xs"
                title="查看当前登录账号"
              >
                {account.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.displayName}
                    className="w-6 h-6 rounded-full object-cover border border-stone-200"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#27563c] text-white flex items-center justify-center text-[11px] font-bold">
                    {account.displayName.slice(0, 1)}
                  </div>
                )}
                <span className="font-bold text-stone-800 max-w-[90px] truncate">
                  {account.displayName}
                </span>
                {account.isAdmin ? (
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-[#b45309] text-[10px] font-bold border border-amber-200/80">
                    管理员
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded bg-[#edf5ef] text-[#27563c] text-[10px] font-bold">
                    已登录
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {/* 用户信息下拉菜单 */}
              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-stone-200 shadow-xl p-4 space-y-3 animate-in fade-in z-50 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                    {account.avatarUrl ? (
                      <img
                        src={account.avatarUrl}
                        alt={account.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-stone-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#27563c] text-white flex items-center justify-center font-bold text-sm">
                        {account.displayName.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <strong className="block text-sm font-bold text-stone-900 truncate">
                        {account.displayName}
                      </strong>
                      <span className="text-[11px] text-stone-500 truncate block">
                        {account.email}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-stone-600 bg-[#f8f7f2] p-2.5 rounded-xl border border-stone-200/60">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400">账号通道：</span>
                      <span className="font-bold text-stone-700">
                        {account.isQQ ? '🐧 QQ 企鹅认证' : '🌐 Google 账户'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400">所属部门：</span>
                      <span className="font-bold text-stone-700">
                        {account.department || '研学项目组'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400">系统权限：</span>
                      <span className={`font-bold ${account.isAdmin ? 'text-[#b45309]' : 'text-[#27563c]'}`}>
                        {account.isAdmin ? '★ 系统主管理员' : account.canEdit ? '✓ 团队编辑人员' : '只读查看人员'}
                      </span>
                    </div>
                  </div>

                  {/* 管理员专属功能按钮 */}
                  {account.isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowPermModal(true);
                      }}
                      className="w-full py-2.5 px-3 text-left rounded-xl bg-amber-50 hover:bg-amber-100 text-[#b45309] font-bold text-xs border border-amber-200/90 transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#b45309]" />
                        配置团队成员与编辑权限
                      </span>
                      <span className="text-[10px] bg-amber-200/80 text-[#b45309] px-1.5 py-0.5 rounded-md">
                        管理
                      </span>
                    </button>
                  )}

                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleSignOut}
                      className="w-full py-2 text-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> 退出并切换账号
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <QQSignIn
              theme="compact"
              text="QQ 账号登录"
              onSuccess={fetchAccount}
            />
          )}
        </div>
      </div>

      <PermissionManagementModal
        isOpen={showPermModal}
        onClose={() => setShowPermModal(false)}
        onUpdated={fetchAccount}
      />
    </header>
  );
}
