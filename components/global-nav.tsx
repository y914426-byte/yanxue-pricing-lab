'use client';

import React from 'react';

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

export function GlobalNav({ active = 'overview', extraRight, hideCta = false }: GlobalNavProps) {
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

  // 如果在日历页面，为了避免与页面自身的“新建活动”冲突，默认不重复展示通用新建按钮
  const showDefaultCta = !hideCta && active !== 'calendar';

  return (
    <header className="global-topbar">
      <div className="global-topbar-inner">
        <a className="global-brand" href="/" title="返回江南农耕研学工作台首页">
          <span className="global-brand-mark">耕</span>
          <div className="global-brand-text">
            <strong>江南农耕研学</strong>
            <small>运营工作台 · OPERATIONS HUB</small>
          </div>
        </a>

        <nav className="global-nav" aria-label="全局导航">
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

        <div className="global-topbar-actions">
          {extraRight}
          {showDefaultCta && (
            <a
              className="global-btn-cta"
              href="/yanxue-calendar?action=new"
              title="排期并安排新活动"
            >
              <span>＋</span> 排期新活动
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
