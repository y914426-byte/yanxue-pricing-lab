'use client';

import React from 'react';

// ==========================================
// 1. 黑白花可爱小奶牛 (Cute Dairy Cow 🐄)
// 参考用户壁画：黑白花斑、粉鼻头、圆圆小角、大眼睛、嘴里叼着绿草
// ==========================================
export function CuteCow({ className = 'w-16 h-16', chewing = true }: { className?: string; chewing?: boolean }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="可爱小奶牛">
      {/* 奶牛身体与轮廓 */}
      <ellipse cx="90" cy="95" rx="58" ry="46" fill="#FFFFFF" stroke="#2D312E" strokeWidth="5" />
      {/* 身上黑斑块 */}
      <path d="M52 68 C45 80, 52 105, 68 108 C80 110, 85 92, 75 78 Z" fill="#363A37" />
      <path d="M100 80 C95 95, 115 112, 128 102 C135 94, 125 75, 110 76 Z" fill="#363A37" />
      <path d="M72 120 C80 135, 105 130, 98 118 Z" fill="#363A37" />

      {/* 尾巴与毛刷 */}
      <path d="M35 88 Q20 85 24 110" stroke="#2D312E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M22 108 Q16 122 25 126 Q30 118 26 108 Z" fill="#363A37" stroke="#2D312E" strokeWidth="3" />

      {/* 腿 */}
      {/* 后左腿 */}
      <rect x="52" y="125" width="14" height="24" rx="7" fill="#FFFFFF" stroke="#2D312E" strokeWidth="4.5" />
      <path d="M52 140 H66 V148 C66 148 52 148 52 148 Z" fill="#363A37" />
      {/* 后右腿 */}
      <rect x="75" y="125" width="14" height="24" rx="7" fill="#FFFFFF" stroke="#2D312E" strokeWidth="4.5" />
      <path d="M75 140 H89 V148 C89 148 75 148 75 148 Z" fill="#363A37" />
      {/* 前左腿 */}
      <rect x="105" y="125" width="14" height="24" rx="7" fill="#FFFFFF" stroke="#2D312E" strokeWidth="4.5" />
      <path d="M105 140 H119 V148 C119 148 105 148 105 148 Z" fill="#363A37" />
      {/* 前右腿 */}
      <rect x="124" y="125" width="14" height="24" rx="7" fill="#FFFFFF" stroke="#2D312E" strokeWidth="4.5" />
      <path d="M124 140 H138 V148 C138 148 124 148 124 148 Z" fill="#363A37" />

      {/* 小奶牛乳房与粉红肚皮 */}
      <ellipse cx="68" cy="128" rx="8" ry="5" fill="#FFAEC9" stroke="#2D312E" strokeWidth="3" />

      {/* 牛头 */}
      <g>
        {/* 牛耳 */}
        {/* 左耳 */}
        <path d="M112 45 C98 38, 96 58, 115 54 Z" fill="#FFFFFF" stroke="#2D312E" strokeWidth="4" />
        <path d="M108 46 C102 42, 102 54, 112 51 Z" fill="#FFAEC9" />
        {/* 右耳 */}
        <path d="M165 42 C180 34, 182 56, 162 52 Z" fill="#363A37" stroke="#2D312E" strokeWidth="4" />
        <path d="M167 44 C175 40, 175 51, 166 49 Z" fill="#FFAEC9" />

        {/* 牛角 */}
        <path d="M122 35 C120 22, 130 20, 132 30 Z" fill="#F4D06F" stroke="#2D312E" strokeWidth="4" />
        <path d="M152 33 C156 20, 165 22, 161 31 Z" fill="#F4D06F" stroke="#2D312E" strokeWidth="4" />

        {/* 头颅主体 */}
        <ellipse cx="140" cy="58" rx="30" ry="28" fill="#FFFFFF" stroke="#2D312E" strokeWidth="4.5" />
        {/* 头部斑块 */}
        <path d="M142 31 C158 32, 168 45, 165 60 C156 55, 148 42, 142 31 Z" fill="#363A37" />

        {/* 大眼睛 */}
        <ellipse cx="128" cy="52" rx="4.5" ry="6" fill="#2D312E" />
        <circle cx="126" cy="50" r="1.8" fill="#FFFFFF" />
        <ellipse cx="152" cy="50" rx="4.5" ry="6" fill="#2D312E" />
        <circle cx="150" cy="48" r="1.8" fill="#FFFFFF" />

        {/* 大粉鼻子与吻部 */}
        <ellipse cx="145" cy="74" rx="22" ry="15" fill="#FFB7B2" stroke="#2D312E" strokeWidth="4" />
        {/* 鼻孔 */}
        <ellipse cx="138" cy="74" rx="3.5" ry="5" fill="#E26D68" />
        <ellipse cx="152" cy="74" rx="3.5" ry="5" fill="#E26D68" />

        {/* 腮红 */}
        <ellipse cx="120" cy="62" rx="4.5" ry="3" fill="#FF9E99" opacity="0.6" />
        <ellipse cx="166" cy="60" rx="4.5" ry="3" fill="#FF9E99" opacity="0.6" />

        {/* 嘴里叼着的嫩绿草叶 */}
        {chewing && (
          <g>
            <path d="M136 82 Q126 95 130 110" stroke="#388E3C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M130 96 C118 90, 116 104, 128 100 Z" fill="#66BB6A" stroke="#2D312E" strokeWidth="2" />
            <path d="M129 104 C120 112, 134 118, 135 107 Z" fill="#81C784" stroke="#2D312E" strokeWidth="2" />
          </g>
        )}
      </g>
    </svg>
  );
}

// ==========================================
// 2. 萌萌小雏鸡 (Fluffy Yellow Chick 🐥)
// 胖嘟嘟黄色身躯、橙色小尖嘴、萌萌大眼睛、可爱两足
// ==========================================
export function CuteChick({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="萌黄小雏鸡">
      {/* 雏鸡两只小脚 */}
      <path d="M48 95 L48 108 M44 108 L52 108" stroke="#E67E22" strokeWidth="4" strokeLinecap="round" />
      <path d="M68 95 L68 108 M64 108 L72 108" stroke="#E67E22" strokeWidth="4" strokeLinecap="round" />

      {/* 翅膀 (后侧微露) */}
      <ellipse cx="78" cy="68" rx="14" ry="18" fill="#F9CA24" stroke="#2D312E" strokeWidth="4" transform="rotate(25 78 68)" />

      {/* 圆滚滚胖身体 */}
      <ellipse cx="58" cy="65" rx="36" ry="34" fill="#FFDA79" stroke="#2D312E" strokeWidth="4.5" />

      {/* 头顶呆毛 */}
      <path d="M56 32 Q62 20 68 24 Q60 28 58 32" fill="#FFC048" stroke="#2D312E" strokeWidth="3" />

      {/* 眼睛 */}
      <circle cx="48" cy="52" r="5" fill="#2D312E" />
      <circle cx="46" cy="50" r="1.8" fill="#FFFFFF" />

      {/* 可爱小橙嘴 */}
      <path d="M38 58 L24 64 L38 70 Z" fill="#FF793F" stroke="#2D312E" strokeWidth="3.5" strokeLinejoin="round" />

      {/* 脸颊粉嫩小腮红 */}
      <ellipse cx="54" cy="66" rx="5" ry="3.5" fill="#FF9E99" opacity="0.7" />

      {/* 身前小翅膀 */}
      <path d="M65 58 C78 62, 80 78, 66 76 C60 74, 58 64, 65 58 Z" fill="#FFC048" stroke="#2D312E" strokeWidth="3.5" />
    </svg>
  );
}

// ==========================================
// 3. 微笑大南瓜 (Smiley Pumpkin 🎃)
// 丰满橙色南瓜、绿色果柄、可爱笑脸 (壁画同款)
// ==========================================
export function CutePumpkin({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="微笑大南瓜">
      {/* 绿果柄 */}
      <path d="M70 38 C68 20, 82 12, 80 26 C79 32, 74 38, 70 38 Z" fill="#27AE60" stroke="#2D312E" strokeWidth="4" />
      {/* 南瓜顶小卷须 */}
      <path d="M78 30 Q92 24 90 35" stroke="#2ECC71" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* 南瓜瓣 - 两侧 */}
      <ellipse cx="38" cy="72" rx="26" ry="34" fill="#F39C12" stroke="#2D312E" strokeWidth="4.5" />
      <ellipse cx="102" cy="72" rx="26" ry="34" fill="#F39C12" stroke="#2D312E" strokeWidth="4.5" />
      {/* 南瓜瓣 - 中两侧 */}
      <ellipse cx="52" cy="72" rx="26" ry="37" fill="#E67E22" stroke="#2D312E" strokeWidth="4.5" />
      <ellipse cx="88" cy="72" rx="26" ry="37" fill="#E67E22" stroke="#2D312E" strokeWidth="4.5" />
      {/* 南瓜瓣 - 正中心 */}
      <ellipse cx="70" cy="73" rx="24" ry="38" fill="#F39C12" stroke="#2D312E" strokeWidth="4.5" />

      {/* 微笑脸庞 */}
      {/* 眼睛 */}
      <circle cx="56" cy="68" r="4.5" fill="#2D312E" />
      <circle cx="84" cy="68" r="4.5" fill="#2D312E" />
      {/* 萌萌微笑 */}
      <path d="M62 78 Q70 88 78 78" stroke="#2D312E" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* 腮红 */}
      <ellipse cx="48" cy="75" rx="5" ry="3" fill="#D35400" opacity="0.4" />
      <ellipse cx="92" cy="75" rx="5" ry="3" fill="#D35400" opacity="0.4" />
    </svg>
  );
}

// ==========================================
// 4. 翠绿大白菜 (Crisp Cabbage 🥬)
// 绿油油的波浪外叶、脆嫩白菜心、白色菜帮与叶脉
// ==========================================
export function CuteCabbage({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="翠绿大白菜">
      {/* 外层深绿叶片 */}
      <path d="M28 85 C14 55, 42 25, 65 35 C38 42, 30 75, 28 85 Z" fill="#2E7D32" stroke="#2D312E" strokeWidth="4" />
      <path d="M102 85 C116 55, 88 25, 65 35 C92 42, 100 75, 102 85 Z" fill="#2E7D32" stroke="#2D312E" strokeWidth="4" />

      {/* 中层青绿叶 */}
      <ellipse cx="65" cy="78" rx="45" ry="42" fill="#4CAF50" stroke="#2D312E" strokeWidth="4.5" />
      {/* 叶片波浪皱褶 */}
      <path d="M30 65 Q45 40 65 42 Q85 40 100 65" stroke="#2E7D32" strokeWidth="3" fill="none" />

      {/* 嫩绿菜心 */}
      <ellipse cx="65" cy="84" rx="28" ry="32" fill="#C8E6C9" stroke="#2D312E" strokeWidth="4" />

      {/* 脆白菜帮 */}
      <path d="M52 115 C54 85, 60 70, 65 70 C70 70, 76 85, 78 115 Z" fill="#FFFFFF" stroke="#2D312E" strokeWidth="3.5" />
      <path d="M65 72 L65 115" stroke="#E0E0E0" strokeWidth="2.5" />
      <path d="M60 88 Q50 82 42 86" stroke="#A5D6A7" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M70 88 Q80 82 88 86" stroke="#A5D6A7" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M62 98 Q52 94 46 98" stroke="#A5D6A7" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M68 98 Q78 94 84 98" stroke="#A5D6A7" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ==========================================
// 5. 胡萝卜竹篮 (Carrot Basket 🥕)
// 竹编条纹小提篮，插满挂着绿叶的新鲜大胡萝卜
// ==========================================
export function CuteCarrotBasket({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="胡萝卜竹篮">
      {/* 背后露出的绿萝卜缨 */}
      {/* 左胡萝卜叶 */}
      <path d="M42 20 Q32 38 48 48" stroke="#2E7D32" strokeWidth="4" strokeLinecap="round" />
      <path d="M36 26 C26 22, 28 35, 40 32 Z" fill="#4CAF50" stroke="#2D312E" strokeWidth="2.5" />
      <path d="M46 15 C52 8, 56 22, 44 26 Z" fill="#66BB6A" stroke="#2D312E" strokeWidth="2.5" />

      {/* 中胡萝卜叶 */}
      <path d="M80 14 Q78 35 80 48" stroke="#2E7D32" strokeWidth="4" strokeLinecap="round" />
      <path d="M72 16 C65 10, 68 25, 78 22 Z" fill="#4CAF50" stroke="#2D312E" strokeWidth="2.5" />
      <path d="M88 16 C95 10, 92 25, 82 22 Z" fill="#66BB6A" stroke="#2D312E" strokeWidth="2.5" />

      {/* 右胡萝卜叶 */}
      <path d="M118 20 Q128 38 112 48" stroke="#2E7D32" strokeWidth="4" strokeLinecap="round" />
      <path d="M124 26 C134 22, 132 35, 120 32 Z" fill="#4CAF50" stroke="#2D312E" strokeWidth="2.5" />
      <path d="M114 15 C108 8, 104 22, 116 26 Z" fill="#66BB6A" stroke="#2D312E" strokeWidth="2.5" />

      {/* 胡萝卜实体 - 3 根饱满大胡萝卜 */}
      {/* 左胡萝卜 */}
      <g transform="rotate(-10 50 60)">
        <path d="M40 38 C40 38, 62 38, 62 45 C60 62, 54 85, 51 90 C48 85, 42 62, 40 45 Z" fill="#FF7043" stroke="#2D312E" strokeWidth="3.5" />
        <path d="M44 48 H52 M46 60 H56 M44 72 H50" stroke="#D84315" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* 中胡萝卜 */}
      <g>
        <path d="M70 38 C70 38, 92 38, 92 45 C90 64, 84 88, 81 92 C78 88, 72 64, 70 45 Z" fill="#FF5722" stroke="#2D312E" strokeWidth="3.5" />
        <path d="M74 48 H84 M76 60 H88 M74 72 H82" stroke="#D84315" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* 右胡萝卜 */}
      <g transform="rotate(10 110 60)">
        <path d="M100 38 C100 38, 122 38, 122 45 C120 62, 114 85, 111 90 C108 85, 102 62, 100 45 Z" fill="#FF7043" stroke="#2D312E" strokeWidth="3.5" />
        <path d="M104 48 H112 M106 60 H116 M104 72 H110" stroke="#D84315" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* 竹编竹篮本体 */}
      <path d="M25 65 L135 65 L125 125 L35 125 Z" fill="#BCAAA4" stroke="#2D312E" strokeWidth="4.5" strokeLinejoin="round" />
      {/* 竹篮经纬编织纹理 */}
      <path d="M25 65 H135 M27 80 H133 M30 95 H130 M32 110 H128" stroke="#8D6E63" strokeWidth="3" />
      <path d="M50 65 L56 125 M75 65 L77 125 M100 65 L98 125 M120 65 L116 125" stroke="#8D6E63" strokeWidth="3" />
      {/* 篮子边缘厚边 */}
      <rect x="22" y="60" width="116" height="10" rx="4" fill="#A1887F" stroke="#2D312E" strokeWidth="4" />
    </svg>
  );
}

// ==========================================
// 6. 可爱小白母鸡 (Gentle White Hen 🐔)
// 纯白羽毛、鲜红鸡冠、小肉髯、温和眼神
// ==========================================
export function CuteHen({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="可爱小白母鸡">
      {/* 鸡爪 */}
      <path d="M55 105 L55 118 M50 118 L60 118" stroke="#E67E22" strokeWidth="4" strokeLinecap="round" />
      <path d="M75 105 L75 118 M70 118 L80 118" stroke="#E67E22" strokeWidth="4" strokeLinecap="round" />

      {/* 鸡尾羽毛翘起 */}
      <path d="M90 70 C108 55, 115 80, 95 90 Z" fill="#FFFFFF" stroke="#2D312E" strokeWidth="4" />
      <path d="M98 62 C115 50, 118 72, 102 80 Z" fill="#F1F2F6" stroke="#2D312E" strokeWidth="3.5" />

      {/* 母鸡身体 */}
      <ellipse cx="65" cy="78" rx="35" ry="30" fill="#FFFFFF" stroke="#2D312E" strokeWidth="4.5" />

      {/* 红色鸡冠 (三联瓣) */}
      <path d="M38 34 C36 24 45 22 47 30 C50 20 60 22 59 32 C64 24 72 28 68 36 Z" fill="#E74C3C" stroke="#2D312E" strokeWidth="3.5" />

      {/* 眼睛 */}
      <circle cx="45" cy="46" r="4.5" fill="#2D312E" />
      <circle cx="43" cy="44" r="1.6" fill="#FFFFFF" />

      {/* 黄嘴巴 */}
      <path d="M34 50 L20 54 L34 60 Z" fill="#F39C12" stroke="#2D312E" strokeWidth="3.5" strokeLinejoin="round" />

      {/* 红色小肉髯 */}
      <ellipse cx="36" cy="64" rx="4.5" ry="7" fill="#E74C3C" stroke="#2D312E" strokeWidth="2.5" />

      {/* 翅膀 */}
      <path d="M60 68 C76 68, 86 85, 70 94 C56 94, 52 80, 60 68 Z" fill="#F5F6FA" stroke="#2D312E" strokeWidth="3.5" />
      <path d="M68 76 Q78 84 72 90" stroke="#DCDDE1" strokeWidth="2.5" strokeLinecap="round" />

      {/* 脸颊粉腮红 */}
      <ellipse cx="50" cy="54" rx="4" ry="3" fill="#FF9E99" opacity="0.6" />
    </svg>
  );
}

// ==========================================
// 7. 田园动物与果蔬全景横幅 (FarmPastoralBanner)
// 100% 还原用户照片中的可爱画风：青草地、小雏菊、胡萝卜篮、小奶牛、小雏鸡、南瓜、大白菜、小白鸡
// ==========================================
export function FarmPastoralBanner({ className = '', title, subtitle }: { className?: string; title?: string; subtitle?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-[#FAF6EE] border-2 border-[#E5DECD] shadow-sm select-none ${className}`}>
      {/* 蓝天与阳光微光背景 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FDFBF7] via-[#F8F3E8] to-[#E8F1DC] opacity-80" />

      {/* 柔和远山与田野轮廓 */}
      <svg className="absolute bottom-10 left-0 right-0 w-full h-16 pointer-events-none opacity-20" preserveAspectRatio="none" viewBox="0 0 1200 120">
        <path d="M0 80 Q300 20 600 60 T1200 40 L1200 120 L0 120 Z" fill="#6A9A7B" />
      </svg>

      {/* 翠绿青草地底座 */}
      <div className="absolute bottom-0 left-0 right-0 h-10 sm:h-12 bg-[#7CB342] border-t-4 border-[#558B2F]">
        {/* 草地草尖与小野花 */}
        <div className="relative w-full h-full flex items-center justify-around px-4 opacity-80">
          <span className="text-white text-xs">🌱</span>
          <span className="text-[#FFEB3B] text-xs">🌼</span>
          <span className="text-white text-xs">🌿</span>
          <span className="text-[#FF8A80] text-xs">🌸</span>
          <span className="text-white text-xs">🌱</span>
          <span className="text-[#FFEB3B] text-xs">🌼</span>
          <span className="text-white text-xs">🌿</span>
          <span className="text-[#FF8A80] text-xs">🌸</span>
          <span className="text-white text-xs">🌱</span>
        </div>
      </div>

      {/* 核心动物与蔬果排布容器 */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* 左侧文字与标语 */}
        <div className="space-y-1.5 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] border border-[#C8E6C9] text-[#2E7D32] text-xs font-bold shadow-xs">
            <span>🌾</span> 江南农耕研学 · 自然亲子生态基地
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#2D312E] tracking-tight">
            {title || '快乐农耕 · 伴学童年'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5D6E62] max-w-md">
            {subtitle || '认识五谷杂粮，亲近田园萌宠；每一场研学都是生命与土地的深情对话。'}
          </p>
        </div>

        {/* 右侧萌宠群像 (横向展示：胡萝卜篮 -> 小奶牛 -> 小雏鸡 -> 微笑南瓜 -> 大白菜 -> 小白鸡) */}
        <div className="flex items-end justify-center gap-2 sm:gap-4 pb-2 overflow-x-auto max-w-full">
          {/* 胡萝卜篮 */}
          <div className="flex flex-col items-center hover:scale-105 transition-transform" title="新鲜果蔬采摘">
            <CuteCarrotBasket className="w-12 h-12 sm:w-16 sm:h-16" />
            <span className="text-[10px] font-bold text-[#8D6E63] mt-0.5">采摘篮</span>
          </div>

          {/* 小奶牛 */}
          <div className="flex flex-col items-center hover:scale-105 transition-transform" title="黑白花萌小牛">
            <CuteCow className="w-16 h-14 sm:w-24 sm:h-20" chewing={true} />
            <span className="text-[10px] font-bold text-[#2D312E] mt-0.5">萌小牛</span>
          </div>

          {/* 小雏鸡 */}
          <div className="flex flex-col items-center hover:scale-110 transition-transform" title="雏鸡破壳成长">
            <CuteChick className="w-9 h-9 sm:w-12 sm:h-12" />
            <span className="text-[10px] font-bold text-[#F57C00] mt-0.5">小雏鸡</span>
          </div>

          {/* 微笑大南瓜 */}
          <div className="flex flex-col items-center hover:scale-105 transition-transform" title="丰收微笑南瓜">
            <CutePumpkin className="w-11 h-11 sm:w-14 sm:h-14" />
            <span className="text-[10px] font-bold text-[#E65100] mt-0.5">大南瓜</span>
          </div>

          {/* 翠绿大白菜 */}
          <div className="flex flex-col items-center hover:scale-105 transition-transform" title="田间有机蔬菜">
            <CuteCabbage className="w-11 h-11 sm:w-14 sm:h-14" />
            <span className="text-[10px] font-bold text-[#2E7D32] mt-0.5">大白菜</span>
          </div>

          {/* 可爱小白鸡 */}
          <div className="flex flex-col items-center hover:scale-105 transition-transform" title="农家母鸡咯咯哒">
            <CuteHen className="w-11 h-11 sm:w-14 sm:h-14" />
            <span className="text-[10px] font-bold text-[#C0392B] mt-0.5">白母鸡</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. 萌宠伴学提示卡片 (CuteMascotNotice)
// 结合萌宠表情和对话气泡，提供生动的业务指导
// ==========================================
export function CuteMascotNotice({
  mascot = 'cow',
  title,
  message,
  action,
}: {
  mascot?: 'cow' | 'chick' | 'pumpkin' | 'hen';
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E3DED2] shadow-xs">
      <div className="flex-shrink-0">
        {mascot === 'cow' && <CuteCow className="w-12 h-10 sm:w-14 sm:h-12" />}
        {mascot === 'chick' && <CuteChick className="w-10 h-10 sm:w-12 sm:h-12" />}
        {mascot === 'pumpkin' && <CutePumpkin className="w-10 h-10 sm:w-12 sm:h-12" />}
        {mascot === 'hen' && <CuteHen className="w-10 h-10 sm:w-12 sm:h-12" />}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs sm:text-sm font-extrabold text-[#1E2C22] flex items-center gap-1.5">
          <span>{title}</span>
          <span className="px-1.5 py-0.2 rounded-md bg-[#EDF5EF] text-[#27563C] text-[10px] font-semibold">
            田园小管家
          </span>
        </h4>
        <p className="text-xs text-[#5D6E62] mt-0.5 leading-relaxed">{message}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
