import React from 'react';

/**
 * Family 风格左侧手绘卡通吉祥物集群 (Left Illustration Cluster)
 * 核心角色：浅蓝蓬蓬小稻米怪兽（豆豆眼、欢快奔跑的小短腿）
 * 环绕元素：金黄麦穗金币、红心、研学教案折角便签、清泉水滴、绿芽、彩色撒花 confetti
 */
export function MascotClusterLeft({ className = '' }: { className?: string }) {
  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 340 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-sm"
      >
        <g className="animate-mascot-float">
          {/* 背景散落装饰 1: 研学教案折角便签 */}
          <g transform="translate(15, 75) rotate(-12)">
            <rect x="0" y="0" width="46" height="56" rx="6" fill="#f6f4ef" stroke="#e5d5c3" strokeWidth="2" />
            <path d="M34 0 L46 12 L34 12 Z" fill="#e5d5c3" />
            {/* 便签文字线 */}
            <line x1="8" y1="16" x2="28" y2="16" stroke="#d5c8b5" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="8" y1="26" x2="38" y2="26" stroke="#d5c8b5" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="8" y1="36" x2="32" y2="36" stroke="#d5c8b5" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="8" y1="46" x2="22" y2="46" stroke="#d5c8b5" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* 背景散落装饰 2: 软萌淡蓝云朵 */}
          <g transform="translate(10, 195) scale(0.9)">
            <path
              d="M15 30 A15 15 0 0 1 45 30 A12 12 0 0 1 65 30 A10 10 0 0 1 65 42 L12 42 A12 12 0 0 1 15 30 Z"
              fill="#64c6ff"
              fillOpacity="0.35"
            />
          </g>

          {/* 背景散落装饰 3: 绿意盎然的田间小嫩叶 */}
          <g transform="translate(48, 40) rotate(-25)">
            <path
              d="M0 24 C0 10 14 0 24 0 C24 14 14 24 0 24 Z"
              fill="#00c978"
              stroke="#343433"
              strokeWidth="2"
            />
            <path d="M0 24 C10 16 16 10 24 0" stroke="#343433" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* 背景散落装饰 4: 饱满大金币/稻谷粒 */}
          <g transform="translate(105, 30)">
            <circle cx="18" cy="18" r="16" fill="#ffcd6c" stroke="#343433" strokeWidth="2" />
            <circle cx="18" cy="18" r="12" fill="#ffd98a" stroke="#d48f00" strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="18" cy="18" r="5" fill="#d48f00" />
          </g>

          {/* 背景散落装饰 5: 温暖红色小爱心 */}
          <g transform="translate(205, 115) rotate(15)">
            <path
              d="M14 4 C10 0 4 1 2 6 C-1 12 6 18 14 24 C22 18 29 12 26 6 C24 1 18 0 14 4 Z"
              fill="#ff3e00"
              stroke="#343433"
              strokeWidth="2"
            />
          </g>

          {/* 背景散落装饰 6: 清澈泉水水滴 */}
          <g transform="translate(225, 80) rotate(35)">
            <path
              d="M10 0 C10 0 0 14 0 20 A10 10 0 0 0 20 20 C20 14 10 0 10 0 Z"
              fill="#00b2ff"
              stroke="#343433"
              strokeWidth="2"
            />
            <circle cx="7" cy="19" r="2.5" fill="#ffffff" />
          </g>

          {/* 背景散落装饰 7: 澄澈蓝色菱形水晶 */}
          <g transform="translate(210, 205)">
            <path d="M12 0 L24 14 L12 28 L0 14 Z" fill="#0086fc" stroke="#343433" strokeWidth="2" />
            <path d="M12 4 L20 14 L12 24 L4 14 Z" fill="#64c6ff" />
          </g>

          {/* 背景散落装饰 8: 橙色小太阳果实 */}
          <circle cx="130" cy="235" r="14" fill="#ff3e00" stroke="#343433" strokeWidth="2" />

          {/* 核心主角吉祥物：可爱的蓝色方块蓬蓬稻米小精灵 */}
          <g id="blue-mascot" transform="translate(55, 70)">
            {/* 头顶三颗亮黄色闪光星 */}
            <g transform="translate(18, -12)">
              <polygon points="6,0 8,4 12,6 8,8 6,12 4,8 0,6 4,4" fill="#ffcd6c" />
              <polygon points="18,-4 19,-1 22,0 19,1 18,4 17,1 14,0 17,-1" fill="#ffbb26" />
              <polygon points="28,2 29,4 32,5 29,6 28,8 27,6 25,5 27,4" fill="#ffcd6c" />
            </g>

            {/* 正在奔跑的双腿 (黑色小细腿 + 黄色圆球小鞋子) */}
            {/* 前腿 (大跨步) */}
            <g className="origin-top animate-mascot-wiggle">
              <path d="M40 100 Q46 118 64 126" stroke="#343433" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <ellipse cx="68" cy="128" rx="8" ry="6" fill="#ffcd6c" stroke="#343433" strokeWidth="2" transform="rotate(15 68 128)" />
            </g>
            {/* 后腿 (后蹬飞跑) */}
            <g>
              <path d="M22 96 Q10 114 -2 118" stroke="#343433" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <ellipse cx="-4" cy="119" rx="8" ry="5.5" fill="#ffcd6c" stroke="#343433" strokeWidth="2" transform="rotate(-20 -4 119)" />
            </g>

            {/* 蓬蓬外边缘云朵波浪体 (Sky Blue) */}
            <path
              d="M15 15 
                 C8 2 28 -2 36 6 
                 C44 -2 64 2 68 12 
                 C78 4 94 14 96 28 
                 C108 34 108 52 100 62 
                 C110 74 102 92 88 94 
                 C84 106 66 108 56 102 
                 C46 110 26 108 20 98 
                 C6 102 -2 86 4 72 
                 C-4 60 0 42 10 36 
                 C4 24 10 14 15 15 Z"
              fill="#64c6ff"
              stroke="#343433"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* 身体内部核心圆角方形底色 */}
            <rect
              x="22"
              y="22"
              width="64"
              height="64"
              rx="18"
              fill="#00b2ff"
              stroke="#343433"
              strokeWidth="2"
            />

            {/* 两颗呆萌黑豆豆大眼睛 */}
            <circle cx="44" cy="52" r="5" fill="#121212" />
            <circle cx="42.5" cy="50.5" r="1.5" fill="#ffffff" />

            <circle cx="68" cy="52" r="5" fill="#121212" />
            <circle cx="66.5" cy="50.5" r="1.5" fill="#ffffff" />

            {/* 软萌粉嫩小腮红 */}
            <ellipse cx="36" cy="62" rx="4.5" ry="2.5" fill="#ff58ae" fillOpacity="0.75" />
            <ellipse cx="76" cy="62" rx="4.5" ry="2.5" fill="#ff58ae" fillOpacity="0.75" />

            {/* 微微抿起的小嘴巴 */}
            <path d="M52 60 Q56 64 60 60" stroke="#121212" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* 欢快摆动的双手 */}
            <path d="M12 56 Q-4 62 -8 54" stroke="#343433" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="-8" cy="54" r="3.5" fill="#343433" />

            <path d="M86 52 Q100 48 104 56" stroke="#343433" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="104" cy="56" r="3.5" fill="#343433" />
          </g>

          {/* 缤纷彩色散落 Confetti (撒花纸屑) */}
          <circle cx="75" cy="20" r="3" fill="#ff3e00" />
          <circle cx="180" cy="45" r="4" fill="#00c978" />
          <circle cx="195" cy="165" r="3.5" fill="#ffcd6c" />
          <circle cx="35" cy="160" r="2.5" fill="#9f4fff" />
          <rect x="150" y="220" width="5" height="5" rx="1.5" fill="#64c6ff" transform="rotate(45 150 220)" />
          <rect x="230" y="145" width="6" height="6" rx="1.5" fill="#ff58ae" transform="rotate(25 230 145)" />
          <path d="M165 95 L172 95 L168 102 Z" fill="#00c978" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Family 风格右侧手绘卡通吉祥物集群 (Right Illustration Cluster)
 * 核心角色：
 * 1. 绿色半圆书包怪兽（微笑着背着研学小包包大步迈进）
 * 2. 橙红花朵小精灵（圆润花瓣身躯、弯弯笑眼）
 * 3. 金黄三角饭团/草垛怪兽（两颗黑豆豆眼、小细腿）
 * 环绕元素：小蜜蜂、橘猫小头像、蓝色探究放大镜、彩带波浪线、草木绿叶、Confetti
 */
export function MascotClusterRight({ className = '' }: { className?: string }) {
  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 350 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-sm"
      >
        <g className="animate-mascot-float-alt">
          {/* 背景装饰 1: 蓝色探索波浪线 */}
          <path
            d="M50 45 Q70 25 90 45 T130 45"
            stroke="#00b2ff"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* 背景装饰 2: 萌萌的小蜜蜂 */}
          <g transform="translate(230, 25)">
            {/* 半透明小翅膀 */}
            <ellipse cx="12" cy="4" rx="6" ry="9" fill="#ffffff" stroke="#343433" strokeWidth="1.5" fillOpacity="0.85" transform="rotate(-20 12 4)" />
            <ellipse cx="20" cy="5" rx="6" ry="8" fill="#ffffff" stroke="#343433" strokeWidth="1.5" fillOpacity="0.85" transform="rotate(15 20 5)" />
            {/* 蜜蜂身体 */}
            <ellipse cx="16" cy="14" rx="12" ry="9" fill="#ffcd6c" stroke="#343433" strokeWidth="2" />
            {/* 黑色条纹 */}
            <path d="M12 7 L12 21 M17 5 L17 23 M22 8 L22 20" stroke="#343433" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="13" r="1.5" fill="#343433" />
          </g>

          {/* 背景装饰 3: 橘黄色软萌小猫咪头像 */}
          <g transform="translate(100, 205)">
            {/* 猫耳 */}
            <polygon points="4,10 10,2 16,10" fill="#ffcd6c" stroke="#343433" strokeWidth="1.8" />
            <polygon points="24,10 30,2 36,10" fill="#ffcd6c" stroke="#343433" strokeWidth="1.8" />
            {/* 猫头 */}
            <rect x="2" y="8" width="36" height="26" rx="13" fill="#ffcd6c" stroke="#343433" strokeWidth="2" />
            {/* 猫眼与鼻子 */}
            <circle cx="12" cy="19" r="2" fill="#343433" />
            <circle cx="28" cy="19" r="2" fill="#343433" />
            <polygon points="19,22 21,22 20,24" fill="#ff3e00" />
            {/* 猫胡须 */}
            <line x1="2" y1="20" x2="8" y2="20" stroke="#343433" strokeWidth="1.2" />
            <line x1="32" y1="20" x2="38" y2="20" stroke="#343433" strokeWidth="1.2" />
          </g>

          {/* 背景装饰 4: 蓝色研学探究放大镜 */}
          <g transform="translate(165, 145) rotate(20)">
            <circle cx="14" cy="14" r="12" fill="#ffffff" stroke="#0086fc" strokeWidth="3" />
            <circle cx="14" cy="14" r="8" fill="#64c6ff" fillOpacity="0.25" />
            <line x1="23" y1="23" x2="35" y2="35" stroke="#343433" strokeWidth="4.5" strokeLinecap="round" />
          </g>

          {/* 背景装饰 5: 翠绿回旋箭头小积木 */}
          <g transform="translate(30, 160)">
            <path
              d="M10 24 L2 16 L10 8 L10 13 C22 13 22 24 22 24 C18 19 14 19 10 19 Z"
              fill="#00c978"
              stroke="#343433"
              strokeWidth="2"
            />
          </g>

          {/* 角色 1: 绿色半圆书包怪兽 (Green Sprouts Mascot) */}
          <g id="green-mascot" transform="translate(50, 70)">
            {/* 头顶小嫩芽 */}
            <path d="M35 15 C35 5 44 2 48 2 C48 8 42 15 35 15 Z" fill="#00c978" stroke="#343433" strokeWidth="1.8" />
            <path d="M35 15 C35 7 26 4 22 4 C22 10 28 15 35 15 Z" fill="#00ca48" stroke="#343433" strokeWidth="1.8" />

            {/* 奔跑的双腿与红橙小鞋 */}
            <path d="M22 68 L10 92" stroke="#343433" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="8" cy="94" rx="7" ry="5" fill="#ff3e00" stroke="#343433" strokeWidth="2" />

            <path d="M48 68 L60 90" stroke="#343433" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="62" cy="92" rx="7" ry="5" fill="#ff3e00" stroke="#343433" strokeWidth="2" />

            {/* 身体: 饱满大半圆 */}
            <path
              d="M5 65 C5 28 20 12 35 12 C50 12 65 28 65 65 Z"
              fill="#00c978"
              stroke="#343433"
              strokeWidth="2.5"
            />

            {/* 研学小斜挎包背带 */}
            <path d="M12 36 Q35 52 58 64" stroke="#ffcd6c" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="52" y="58" width="12" height="10" rx="3" fill="#ffbb26" stroke="#343433" strokeWidth="1.5" />

            {/* 呆萌豆豆眼与笑意 */}
            <circle cx="25" cy="40" r="3.8" fill="#121212" />
            <circle cx="45" cy="40" r="3.8" fill="#121212" />
            <path d="M31 48 Q35 52 39 48" stroke="#121212" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* 腮红 */}
            <circle cx="18" cy="46" r="3" fill="#ff58ae" fillOpacity="0.7" />
            <circle cx="52" cy="46" r="3" fill="#ff58ae" fillOpacity="0.7" />

            {/* 欢呼的小手臂 */}
            <path d="M6 46 Q-6 38 -4 28" stroke="#343433" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M64 46 Q74 38 72 28" stroke="#343433" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>

          {/* 角色 2: 橙红色花朵精灵 (Ember Flower Mascot) */}
          <g id="flower-mascot" transform="translate(195, 80)">
            {/* 迈步的双腿 */}
            <path d="M22 62 L15 80" stroke="#343433" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="13" cy="82" rx="5.5" ry="4" fill="#121212" />
            <path d="M38 62 L45 80" stroke="#343433" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="47" cy="82" rx="5.5" ry="4" fill="#121212" />

            {/* 波浪花瓣形状身躯 */}
            <path
              d="M30 6 
                 C38 -2 48 4 50 14 
                 C60 14 66 24 64 34 
                 C70 42 66 54 56 58 
                 C52 68 40 70 30 66 
                 C20 70 8 66 4 56 
                 C-4 48 0 36 6 30 
                 C2 20 12 10 22 12 
                 C24 4 28 6 30 6 Z"
              fill="#ff3e00"
              stroke="#343433"
              strokeWidth="2.5"
            />

            {/* 治愈弯弯笑眼 */}
            <path d="M20 34 Q24 28 28 34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M34 34 Q38 28 42 34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* 微笑小嘴 */}
            <path d="M28 42 Q31 46 34 42" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>

          {/* 角色 3: 金黄圆角三角饭团/草垛怪兽 (Yellow Triangle Mascot) */}
          <g id="triangle-mascot" transform="translate(155, 190)">
            {/* 小细腿站立 */}
            <path d="M22 55 L20 70" stroke="#343433" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="19" cy="72" rx="6" ry="4" fill="#121212" />
            <path d="M38 55 L40 70" stroke="#343433" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="41" cy="72" rx="6" ry="4" fill="#121212" />

            {/* 圆角三角形身材 */}
            <path
              d="M26 6 C28 2 32 2 34 6 L56 46 C58 50 56 56 50 56 L10 56 C4 56 2 50 4 46 Z"
              fill="#ffcd6c"
              stroke="#343433"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />

            {/* 呆萌黑豆豆眼与小嘴 */}
            <circle cx="24" cy="34" r="2.8" fill="#121212" />
            <circle cx="36" cy="34" r="2.8" fill="#121212" />
            <circle cx="30" cy="41" r="1.5" fill="#121212" />
          </g>

          {/* 散落花纸屑 Confetti */}
          <circle cx="145" cy="95" r="4" fill="#ff58ae" />
          <circle cx="215" cy="180" r="3.5" fill="#00c978" />
          <circle cx="270" cy="120" r="4.5" fill="#64c6ff" />
          <circle cx="85" cy="15" r="3" fill="#ffcd6c" />
          <circle cx="185" cy="50" r="3" fill="#9f4fff" />
          <rect x="250" y="80" width="6" height="6" rx="1.5" fill="#ffbb26" transform="rotate(30 250 80)" />
          <path d="M125 155 L131 155 L128 162 Z" fill="#ff3e00" />
        </g>
      </svg>
    </div>
  );
}
