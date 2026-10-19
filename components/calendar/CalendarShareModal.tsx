'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Link as LinkIcon,
  X,
  Calendar,
  AlertTriangle,
  PackageCheck,
  Clock,
  Send
} from 'lucide-react';
import {
  ActivityDetail,
  smartGenerateWechatText,
  smartGenerateDailyWechatText
} from '@/lib/calendar-ai-smart';

interface CalendarShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: ActivityDetail | null;
  dailyDate?: string;
  dailyEvents?: ActivityDetail[];
  onToggleMaterialDone?: (event: ActivityDetail, index: number) => Promise<void> | void;
}

export function CalendarShareModal({
  isOpen,
  onClose,
  event,
  dailyDate,
  dailyEvents = [],
  onToggleMaterialDone,
}: CalendarShareModalProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'poster' | 'link'>('text');
  const [textStyle, setTextStyle] = useState<'parent' | 'mentor' | 'base'>('parent');
  const [includeFlow, setIncludeFlow] = useState(true);
  const [includeMaterials, setIncludeMaterials] = useState(true);
  const [materialsFilter, setMaterialsFilter] = useState<'all' | 'pendingOnly'>('all');
  const [includePrecautions, setIncludePrecautions] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 判断是单活动还是具体某天
  const isDailyMode = !event && !!dailyDate;

  // 微信分享文案生成
  const shareText = useMemo(() => {
    if (isDailyMode && dailyDate) {
      return smartGenerateDailyWechatText(dailyDate, dailyEvents);
    }
    if (!event) return '';
    return smartGenerateWechatText(event, {
      style: textStyle,
      includeFlow,
      includeMaterials,
      materialsFilter,
      includePrecautions,
      includeLink,
    });
  }, [
    isDailyMode,
    dailyDate,
    dailyEvents,
    event,
    textStyle,
    includeFlow,
    includeMaterials,
    materialsFilter,
    includePrecautions,
    includeLink,
  ]);

  // 直达链接
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    if (isDailyMode && dailyDate) {
      return `${origin}/yanxue-calendar?date=${encodeURIComponent(dailyDate)}`;
    }
    if (event) {
      return `${origin}/yanxue-calendar?eventId=${encodeURIComponent(event.id || '')}&date=${encodeURIComponent(event.date || '')}`;
    }
    return window.location.href;
  }, [isDailyMode, dailyDate, event]);

  // 复制文案到剪贴板
  const handleCopyText = async (customContent?: string) => {
    const toCopy = customContent || shareText;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(toCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = toCopy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('复制失败，请手动长按全选复制');
    }
  };

  // 调用系统原生分享（适配移动端和微信内置浏览器）
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event ? `研学日程：${event.name}` : `研学日程通告 ${dailyDate}`,
          text: shareText.slice(0, 300) + '...',
          url: shareUrl,
        });
      } catch (err) {
        // 用户取消或不支持
      }
    } else {
      await handleCopyText();
    }
  };

  // 生成微信海报长图 (Canvas)
  const generatePoster = () => {
    setGeneratingPoster(true);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setGeneratingPoster(false);
      return;
    }

    const width = 750;
    // 动态计算高度
    const curEvent = event || (dailyEvents[0] as ActivityDetail) || {
      name: '研学排期通告',
      date: dailyDate || '',
      place: '江南农耕文化园',
      people: 0,
      flow: '',
      materials: [],
      precautions: '',
    };

    const mats = curEvent.materials || [];
    const height = Math.max(1200, 950 + mats.length * 36);

    canvas.width = width;
    canvas.height = height;

    // 1. 背景绘制 (新中式微黄雅纸底纹)
    ctx.fillStyle = '#faf8f2';
    ctx.fillRect(0, 0, width, height);

    // 2. 头部墨绿装饰横幅
    const grad = ctx.createLinearGradient(0, 0, width, 220);
    grad.addColorStop(0, '#1b4332');
    grad.addColorStop(1, '#2d6a4f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 220);

    // 装饰圆斑
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(width - 50, 60, 140, 0, Math.PI * 2);
    ctx.fill();

    // 顶部品牌文字
    ctx.fillStyle = '#d8f3dc';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('🌾 江南农耕研学 · 出团协同通报', 40, 60);

    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
    const displayTitle = curEvent.name.length > 20 ? curEvent.name.slice(0, 20) + '...' : curEvent.name;
    ctx.fillText(displayTitle, 40, 115);

    // 副标题/规模
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fefae0';
    ctx.fillText(`📅 日期：${curEvent.date}   👥 规模：${curEvent.people || 0}人   📍 场地：${curEvent.place || '研学园区'}`, 40, 165);

    let currentY = 260;

    // 绘制信息卡片函数
    const drawCard = (title: string, yPos: number, cardHeight: number, iconEmoji: string) => {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.04)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(40, yPos, width - 80, cardHeight, 16);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // 边框
      ctx.strokeStyle = '#e7e2d7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 卡片标题
      ctx.fillStyle = '#1b4332';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`${iconEmoji} ${title}`, 65, yPos + 40);
    };

    // 3. 流程卡片
    if (curEvent.flow) {
      const flowLines = curEvent.flow.split('\n').filter(Boolean).slice(0, 6);
      const flowCardHeight = 65 + flowLines.length * 36;
      drawCard('活动日程时间轴', currentY, flowCardHeight, '⏰');

      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#2d3748';
      flowLines.forEach((line, i) => {
        ctx.fillStyle = '#2d6a4f';
        ctx.fillText('•', 70, currentY + 75 + i * 36);
        ctx.fillStyle = '#2d3748';
        ctx.fillText(line.slice(0, 36), 90, currentY + 75 + i * 36);
      });
      currentY += flowCardHeight + 24;
    }

    // 4. 物资与待办清单卡片
    if (mats.length > 0) {
      const displayMats = mats.slice(0, 8);
      const matCardHeight = 70 + displayMats.length * 38;
      const doneNum = mats.filter((m) => m.done).length;
      drawCard(`物资准备清单 (已备 ${doneNum}/${mats.length})`, currentY, matCardHeight, '🎒');

      displayMats.forEach((m, i) => {
        const itemY = currentY + 75 + i * 38;
        ctx.font = 'bold 22px sans-serif';
        ctx.fillStyle = m.done ? '#2d6a4f' : '#b45309';
        ctx.fillText(m.done ? '☑' : '☐', 70, itemY);

        ctx.font = '20px sans-serif';
        ctx.fillStyle = m.done ? '#718096' : '#1a202c';
        const matText = `${m.name} × ${m.qty}${m.note ? ' (' + m.note + ')' : ''}`;
        ctx.fillText(matText.slice(0, 32), 105, itemY);
      });
      currentY += matCardHeight + 24;
    }

    // 5. 注意事项卡片
    const prec = curEvent.precautions || '请着防滑运动鞋与长裤，遵从导师指引，注意农具与田间安全。';
    const precLines = prec.split('\n').filter(Boolean).slice(0, 4);
    const precHeight = 70 + precLines.length * 36;
    drawCard('行前注意事项与安全防范', currentY, precHeight, '⚠️');

    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#92400e';
    precLines.forEach((p, i) => {
      ctx.fillText(p.slice(0, 38), 70, currentY + 75 + i * 36);
    });
    currentY += precHeight + 30;

    // 6. 底部二维码与版权
    ctx.fillStyle = '#718096';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📲 微信扫码或点击链接即可实时查看与勾选待办', width / 2, currentY + 20);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#a0aec0';
    ctx.fillText('江南农耕研学 · 数字化履约运营工作台', width / 2, currentY + 50);
    ctx.textAlign = 'left';

    const url = canvas.toDataURL('image/png');
    setPosterUrl(url);
    setGeneratingPoster(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-[#e3ded2] w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-[#f1eee5] bg-gradient-to-r from-[#faf9f5] to-emerald-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-sm">
              <Share2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>{isDailyMode ? `📅 ${dailyDate} 单日排期分享` : '📲 微信出团日程分享与待办协同'}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold">
                  微信极速直达
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                {event ? event.name : `包含当日共 ${dailyEvents.length} 场研学活动`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-200/70 text-stone-400 hover:text-stone-700 flex items-center justify-center text-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 模式选项卡 */}
        <div className="flex items-center border-b border-[#f1eee5] px-6 bg-stone-50/50">
          <button
            onClick={() => setActiveTab('text')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <span>微信群排版文案</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('poster');
              if (!posterUrl) generatePoster();
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'poster'
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-700" />
            <span>微信长图海报</span>
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-emerald-700" />
            <span>直达链接与原生分享</span>
          </button>
        </div>

        {/* 主体内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'text' && (
            <>
              {/* 文案定制控制条 */}
              {!isDailyMode && (
                <div className="space-y-3 p-3.5 bg-[#fbfaf7] rounded-xl border border-[#e7e2d7]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> 针对受众智能适配风格：
                    </span>
                    <div className="flex rounded-lg border border-stone-200 p-0.5 bg-stone-100 text-xs">
                      <button
                        onClick={() => setTextStyle('parent')}
                        className={`px-2.5 py-1 rounded font-medium transition-colors ${
                          textStyle === 'parent' ? 'bg-white text-emerald-900 shadow-xs font-bold' : 'text-stone-600'
                        }`}
                      >
                        👨‍👩‍👧 家长温馨版
                      </button>
                      <button
                        onClick={() => setTextStyle('mentor')}
                        className={`px-2.5 py-1 rounded font-medium transition-colors ${
                          textStyle === 'mentor' ? 'bg-white text-emerald-900 shadow-xs font-bold' : 'text-stone-600'
                        }`}
                      >
                        🧑‍🏫 导师执行版
                      </button>
                      <button
                        onClick={() => setTextStyle('base')}
                        className={`px-2.5 py-1 rounded font-medium transition-colors ${
                          textStyle === 'base' ? 'bg-white text-emerald-900 shadow-xs font-bold' : 'text-stone-600'
                        }`}
                      >
                        🏡 基地保障版
                      </button>
                    </div>
                  </div>

                  {/* 包含模块快速开关 */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-stone-600">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFlow}
                        onChange={(e) => setIncludeFlow(e.target.checked)}
                        className="rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <span>行程流程</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeMaterials}
                        onChange={(e) => setIncludeMaterials(e.target.checked)}
                        className="rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <span>物资清单</span>
                    </label>
                    {includeMaterials && (
                      <select
                        value={materialsFilter}
                        onChange={(e) => setMaterialsFilter(e.target.value as any)}
                        className="text-[11px] p-1 rounded border border-stone-200 bg-white"
                      >
                        <option value="all">全量物资</option>
                        <option value="pendingOnly">仅未备齐待办</option>
                      </select>
                    )}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includePrecautions}
                        onChange={(e) => setIncludePrecautions(e.target.checked)}
                        className="rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <span>注意事项</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeLink}
                        onChange={(e) => setIncludeLink(e.target.checked)}
                        className="rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <span>直达链接</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 实时可交互待办清单勾选区（若有活动） */}
              {event && event.materials && event.materials.length > 0 && (
                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                    <span className="flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-emerald-800" />
                      现场物资准备实时待办（可直接打勾更新）：
                    </span>
                    <span className="text-emerald-800">
                      已就绪 {event.materials.filter((m) => m.done).length} / {event.materials.length} 项
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {event.materials.map((m, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          m.done
                            ? 'bg-emerald-100/60 border-emerald-300 text-emerald-900 line-through'
                            : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={m.done}
                            onChange={() => onToggleMaterialDone && onToggleMaterialDone(event, idx)}
                            className="rounded text-emerald-800 focus:ring-emerald-700"
                          />
                          <span className="truncate max-w-[140px] font-medium">{m.name}</span>
                        </div>
                        <span className="text-[11px] text-stone-500">{m.qty}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 微信群文案气泡模拟预览 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                  <span>📱 微信聊天界面效果预览：</span>
                  <span className="text-emerald-800">已自动优化换行、缩进与Emoji排版</span>
                </div>
                <div className="relative">
                  <textarea
                    rows={12}
                    readOnly
                    value={shareText}
                    className="w-full text-xs p-4 rounded-2xl border border-stone-200 bg-[#f9f8f4] text-stone-900 font-mono leading-relaxed focus:outline-none select-all shadow-inner"
                  />
                  {copied && (
                    <div className="absolute inset-0 bg-emerald-900/90 rounded-2xl flex flex-col items-center justify-center text-white space-y-2 animate-in fade-in duration-200">
                      <Check className="w-10 h-10 text-emerald-300" />
                      <span className="text-sm font-bold">微信排版文案已成功复制！</span>
                      <span className="text-xs text-emerald-200">直接在微信群聊天框中「粘贴」即可发送</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'poster' && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-stone-600">
                专为微信朋友圈、微信群分享生成的高清长图海报，带日程安排、待办清单与安全注意事项。
              </p>
              {posterUrl ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="max-h-[500px] overflow-y-auto rounded-xl border border-stone-200 shadow-md">
                    <img
                      src={posterUrl}
                      alt="微信排期海报"
                      className="w-full max-w-md object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={posterUrl}
                      download={`研学出团海报-${event ? event.name : dailyDate}.png`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm"
                    >
                      <Download className="w-4 h-4" /> 一键下载海报图片 (PNG)
                    </a>
                    <button
                      onClick={generatePoster}
                      className="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs text-stone-700"
                    >
                      重新生成
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <button
                    onClick={generatePoster}
                    disabled={generatingPoster}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{generatingPoster ? '正在绘制海报…' : '立即生成微信长图海报'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'link' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#faf9f5] border border-[#e7e2d7] space-y-3">
                <span className="text-xs font-bold text-stone-900 block flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-emerald-800" /> 微信直达卡片链接
                </span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  通过微信将此链接发送给带队老师、家长或基地人员，对方点击后将自动展开该活动的详细卡片与行前待办，无需任何复杂翻找！
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-stone-200 bg-white select-all text-stone-800"
                  />
                  <button
                    onClick={() => handleCopyText(shareUrl)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1 flex-shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" /> 复制链接
                  </button>
                </div>
              </div>

              {/* 原生呼起微信分享 */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-amber-700" /> 手机端极速分享 (Web Share)
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    在手机微信或移动端浏览器中，支持直接唤起系统分享面板发送给朋友。
                  </p>
                </div>
                <button
                  onClick={handleNativeShare}
                  className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 flex-shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" /> 唤起分享
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部全能按钮栏 */}
        <div className="px-6 py-4 border-t border-[#f1eee5] bg-stone-50 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            {isDailyMode ? `当前正分享 ${dailyDate} 的全部排期` : `已就绪：${event?.name || ''}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-xl border border-stone-200 hover:bg-white text-stone-600 font-medium"
            >
              关闭
            </button>
            <button
              onClick={() => handleCopyText()}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '已复制微信文案！' : '一键复制微信文案'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
