'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  X,
  Volume2,
  FileText
} from 'lucide-react';
import { ActivityDetail } from '@/lib/calendar-ai-smart';

interface PrecautionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ActivityDetail | null;
  onApplyPrecautions?: (newPrecautions: string) => void;
  canEdit?: boolean;
}

export function PrecautionsModal({
  isOpen,
  onClose,
  event,
  onApplyPrecautions,
  canEdit,
}: PrecautionsModalProps) {
  const [copiedType, setCopiedType] = useState<'parent' | 'mentor' | null>(null);

  if (!isOpen || !event) return null;

  const precautionsText =
    event.precautions ||
    [
      '👟【穿戴防护】请所有营员穿着透气长衣长裤与防滑运动鞋，带遮阳草帽；严禁穿拖鞋、高跟鞋下田。',
      '🌾【农具安全】镰刀等工具刀刃向外，听从主导师指挥，低龄幼儿必须在家长一对一陪同下劳作。',
      '🦟【防暑防虫】基地日照充足，请自备防晒霜与防蚊液，多补充温水，若有头晕等不适第一时间报告。',
      '🌿【生态纪律】爱惜粮食与稻田作物，严禁在田埂与水渠边奔跑推搡，不乱丢垃圾。',
    ].join('\n');

  const lines = precautionsText.split('\n').filter(Boolean);

  const handleCopy = async (type: 'parent' | 'mentor') => {
    let textToCopy = '';
    if (type === 'parent') {
      textToCopy = [
        `📢【${event.name} · 家长行前温馨安全告知】`,
        `亲爱的家长朋友们，为了让孩子们在江南稻浪与田园间安全、快乐地开展研学探索，请大家务必阅读并配合做好以下准备：`,
        `──────────────────────`,
        precautionsText,
        `──────────────────────`,
        `感谢各位家长的支持与配合，预祝孩子收获满满的研学成长！🌾`,
      ].join('\n');
    } else {
      textToCopy = [
        `🛡️【${event.name} · 带班导师出团风控要点】`,
        `全体现场带队老师与领队请注意以下防范细节：`,
        precautionsText,
        `出团现场严密巡视，遇突发情况立即启用随队医药箱并按应急预案处置！`,
      ].join('\n');
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      alert('复制失败，请手动长按复制');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-amber-200/80 w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部警示条 */}
        <div className="px-6 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950 flex items-center gap-1.5">
                <span>⚠️ 行前注意事项与安全防范</span>
              </h3>
              <p className="text-xs text-amber-800">
                {event.name} · {event.audience || '研学营员'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-amber-100 text-amber-700 hover:text-amber-950 flex items-center justify-center text-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容主体 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong>研学安全是第一底线：</strong>
              包含田间劳作、农具规范、过敏预防与穿戴防护要求，可在出团前直接宣读或群发家长。
            </div>
          </div>

          {/* 结构化列表展示 */}
          <div className="space-y-2.5">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#faf8f4] border border-[#ece6d8] text-xs text-stone-800 leading-relaxed flex items-start gap-2.5 hover:border-amber-300 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1">{line}</span>
              </div>
            ))}
          </div>

          {/* 快速复制微信通报文案 */}
          <div className="pt-2">
            <span className="text-xs font-bold text-stone-700 block mb-2">
              📲 微信快速群发：
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => handleCopy('parent')}
                className="p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-amber-300 flex items-center justify-between text-xs transition-colors group shadow-2xs"
              >
                <div className="text-left">
                  <strong className="block text-stone-900 group-hover:text-amber-900">
                    👨‍👩‍👧 复制「家长群温馨须知」
                  </strong>
                  <span className="text-[11px] text-stone-500">语气温和，突出穿戴与防晒准备</span>
                </div>
                {copiedType === 'parent' ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-stone-400 group-hover:text-amber-700 flex-shrink-0" />
                )}
              </button>

              <button
                onClick={() => handleCopy('mentor')}
                className="p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-amber-300 flex items-center justify-between text-xs transition-colors group shadow-2xs"
              >
                <div className="text-left">
                  <strong className="block text-stone-900 group-hover:text-amber-900">
                    🧑‍🏫 复制「导师风控交底单」
                  </strong>
                  <span className="text-[11px] text-stone-500">重点突出农具把控与应急流程</span>
                </div>
                {copiedType === 'mentor' ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-stone-400 group-hover:text-amber-700 flex-shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 底部关闭 */}
        <div className="px-6 py-4 border-t border-stone-200/80 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-500">已就绪 · 共 {lines.length} 条核心注意事项</span>
          <button
            onClick={onClose}
            className="text-xs px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold shadow-xs transition-colors"
          >
            我已知晓
          </button>
        </div>
      </div>
    </div>
  );
}
