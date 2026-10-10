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
  ChevronRight,
  Calculator,
  Calendar as CalendarIcon,
  PackageCheck,
  BookOpen,
  FileText,
  BookMarked,
  Database,
  LayoutGrid,
  X
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
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [busy, setBusy] = useState(false);

  const desktopNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const navItems = [
    { key: 'overview', label: '运营总览', href: '/', icon: Sparkles, desc: '数据速览与近期动态' },
    { key: 'pricing', label: '研学定价台', href: '/pricing', icon: Calculator, desc: '保本核算与毛利测算' },
    { key: 'calendar', label: '活动日历', href: '/yanxue-calendar', icon: CalendarIcon, desc: '团期排期与日程状态' },
    { key: 'materials', label: '物资中心', href: '/yanxue-calendar/materials', icon: PackageCheck, desc: '备货清单与清点核对' },
    { key: 'schemes', label: '研学方案库', href: '/schemes', icon: BookOpen, desc: '精品农耕教案与课程' },
    { key: 'import', label: '方案导入', href: '/scheme-import', icon: FileText, desc: '快速录入与结构化建档' },
    { key: 'learning', label: '成本知识库', href: '/learning', icon: BookMarked, desc: '定价逻辑与实操指南' },
    { key: 'prices', label: '价格数据库', href: '/prices', icon: Database, desc: '采买单价与参考基准' },
  ];

  const checkScroll = () => {
    if (desktopNavRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = desktopNavRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  const scrollByAmount = (offset: number) => {
    if (desktopNavRef.current) {
      desktopNavRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 200);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (desktopNavRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      desktopNavRef.current.scrollLeft += e.deltaY;
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

  // 桌面端标签自动平滑滚动居中
  useEffect(() => {
    if (desktopNavRef.current) {
      const activeEl = desktopNavRef.current.querySelector('.global-nav-link.active') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      checkScroll();
    }
  }, [active]);

  // 移动端横向滑动标签自动平滑滚动居中
  useEffect(() => {
    if (mobileNavRef.current) {
      const activeEl = mobileNavRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
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
      {/* 顶部主行：Brand + PC滑轨 + 右侧快捷操作区 */}
      <div className="global-topbar-inner">
        {/* 品牌 Brand (移动端紧凑排版，杜绝换行溢出) */}
        <a className="global-brand group flex-shrink-0" href="/" title="返回江南农耕研学工作台首页">
          <span className="global-brand-mark relative overflow-hidden group-hover:scale-105 transition-transform w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-base">
            耕
          </span>
          <div className="global-brand-text">
            <strong className="text-[14px] sm:text-[15px] whitespace-nowrap">江南农耕研学</strong>
            <small className="hidden sm:block">数字化运营工作台 · OPERATIONS HUB</small>
          </div>
        </a>

        {/* 桌面端专用中间平滑横向滑动导航栏 (手机端隐藏，移至第二行全宽展示) */}
        <div className="global-nav-container hidden md:flex">
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
            ref={desktopNavRef} 
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

        {/* 顶栏右侧快捷操作区 */}
        <div className="global-topbar-actions flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {extraRight}

          {/* 权限配置入口：仅管理员可见 */}
          {account?.isAdmin && (
            <button
              type="button"
              onClick={() => setShowPermModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#f6f4ef] hover:bg-[#ede9e2] text-[#121212] border border-[#e5d5c3] font-semibold text-xs transition-all hover:scale-[1.02]"
              title="配置团队成员权限"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#d48f00]" />
              <span className="hidden sm:inline">团队权限</span>
            </button>
          )}

          {/* 排期按钮：手机端紧凑文字 [＋ 排期]，电脑端完整 [＋ 排期新活动] */}
          {showDefaultCta && (
            <a
              className="global-btn-cta btn-dark-pill text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap"
              href="/yanxue-calendar?action=new"
              title="排期并安排新活动"
              style={{ backgroundColor: '#121212', color: '#ffffff' }}
            >
              <span style={{ color: '#ffffff' }}>＋</span>
              <span className="hidden sm:inline" style={{ color: '#ffffff' }}>排期新活动</span>
              <span className="sm:hidden" style={{ color: '#ffffff' }}>排期</span>
            </a>
          )}

          {/* 全局账号状态与 QQ 登录中心 */}
          {account ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 p-1 pr-2 rounded-[8px] sm:rounded-[10px] border border-[#e5d5c3] bg-white hover:bg-[#f6f4ef] transition-all text-xs"
                title="查看当前登录账号"
              >
                {account.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.displayName}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-[#e5d5c3]"
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#121212] text-white flex items-center justify-center text-[10px] sm:text-[11px] font-bold">
                    {account.displayName.slice(0, 1)}
                  </div>
                )}
                <span className="font-bold text-[#121212] max-w-[60px] sm:max-w-[90px] truncate hidden xs:inline">
                  {account.displayName}
                </span>
                <ChevronDown className="w-3 h-3 text-[#7e7e7d]" />
              </button>

              {/* 用户信息下拉菜单 */}
              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-[#ffffff] rounded-[10px] border border-[#e5d5c3] p-4 space-y-3 animate-in fade-in z-50 text-xs shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-[#f2f0ed]">
                    {account.avatarUrl ? (
                      <img
                        src={account.avatarUrl}
                        alt={account.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-[#e5d5c3]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#121212] text-white flex items-center justify-center font-bold text-sm">
                        {account.displayName.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <strong className="block text-sm font-bold text-[#121212] truncate">
                        {account.displayName}
                      </strong>
                      <span className="text-[11px] text-[#7e7e7d] truncate block">
                        {account.email}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-[#474645] bg-[#f2f0ed] p-2.5 rounded-[10px] border border-[#e5d5c3]/60">
                    <div className="flex justify-between items-center">
                      <span className="text-[#7e7e7d]">账号通道：</span>
                      <span className="font-bold text-[#121212]">
                        {account.isQQ ? '🐧 QQ 企鹅认证' : '🌐 Google 账户'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#7e7e7d]">所属部门：</span>
                      <span className="font-bold text-[#121212]">
                        {account.department || '研学项目组'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#7e7e7d]">系统权限：</span>
                      <span className={`font-bold ${account.isAdmin ? 'text-[#d48f00]' : 'text-[#008f55]'}`}>
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
                      className="w-full py-2.5 px-3 text-left rounded-[10px] bg-[#f6f4ef] hover:bg-[#ede9e2] text-[#121212] font-bold text-xs border border-[#e5d5c3] transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#d48f00]" />
                        配置团队成员与编辑权限
                      </span>
                      <span className="text-[10px] bg-[#ffbb26]/30 text-[#9a6700] px-1.5 py-0.5 rounded-[4px] font-bold">
                        管理
                      </span>
                    </button>
                  )}

                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleSignOut}
                      className="w-full py-2 text-center rounded-full border border-[#ff2b3a]/30 text-[#ff2b3a] hover:bg-[#ff2b3a]/10 font-semibold transition-colors flex items-center justify-center gap-1.5"
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
              text="QQ 登录"
              onSuccess={fetchAccount}
            />
          )}

          {/* 手机端独有：全部业务模块九宫格抽屉切换开关 */}
          <button
            type="button"
            onClick={() => setShowMobileDrawer(!showMobileDrawer)}
            className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#f6f4ef] hover:bg-[#ede9e2] border border-[#e5d5c3] text-[#121212] transition-colors ml-0.5"
            title={showMobileDrawer ? '收起功能菜单' : '查看全部8大业务功能'}
            aria-label="切换移动端功能菜单"
          >
            {showMobileDrawer ? (
              <X className="w-4 h-4 text-[#121212]" />
            ) : (
              <LayoutGrid className="w-4 h-4 text-[#121212]" />
            )}
          </button>
        </div>
      </div>

      {/* 手机端第二行：专属全宽横向平滑滑动胶囊导航栏 (解决内容展示少且乱的问题) */}
      <div className="md:hidden border-t border-[#f2f0ed] bg-[#fbfaf9] relative overflow-hidden">
        <div 
          ref={mobileNavRef}
          className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {navItems.map((item) => {
            const isActive = active === item.key;
            return (
              <a
                key={item.key}
                href={item.href}
                data-active={isActive ? 'true' : 'false'}
                className={`whitespace-nowrap px-3.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#121212] text-white border border-[#121212] shadow-xs'
                    : 'bg-[#f2f0ed] text-[#474645] border border-[#e5d5c3]/50 hover:bg-[#ede9e2]'
                }`}
                style={isActive ? { backgroundColor: '#121212', color: '#ffffff' } : {}}
              >
                <span style={isActive ? { color: '#ffffff' } : {}}>{item.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* 手机端点击九宫格图标弹出的全部业务模块抽屉面板 */}
      {showMobileDrawer && (
        <div 
          className="md:hidden fixed inset-x-0 top-[96px] bottom-0 bg-[#121212]/35 backdrop-blur-xs z-50 animate-in fade-in"
          onClick={() => setShowMobileDrawer(false)}
        >
          <div 
            className="bg-[#fbfaf9] border-b border-[#e5d5c3] p-4 max-h-[80vh] overflow-y-auto space-y-3 shadow-2xl rounded-b-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#f2f0ed]">
              <span className="text-xs font-bold text-[#7e7e7d] tracking-wider uppercase">
                全部业务模块 (8 大功能直达)
              </span>
              <span className="text-[11px] text-[#00c978] font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00c978] animate-pulse inline-block" />
                随时切换
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                return (
                  <a
                    key={item.key}
                    href={item.href}
                    onClick={() => setShowMobileDrawer(false)}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      isActive
                        ? 'bg-white border-[#121212] shadow-sm'
                        : 'bg-[#ffffff] border-[#e5d5c3] hover:border-[#121212]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-[#121212] text-white' : 'bg-[#f2f0ed] text-[#121212]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[#121212]">{item.label}</span>
                    </div>
                    <p className="text-[10px] text-[#7e7e7d] mt-2 line-clamp-1">{item.desc}</p>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <PermissionManagementModal
        isOpen={showPermModal}
        onClose={() => setShowPermModal(false)}
        onUpdated={fetchAccount}
      />
    </header>
  );
}
