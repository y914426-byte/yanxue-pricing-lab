'use client';

import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Printer,
  FileText,
  Check,
  X,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { ActivityDetail } from '@/lib/calendar-ai-smart';
import {
  exportEventsToExcel,
  exportEventsToCSV,
  printActivityDocument
} from '@/lib/calendar-excel';
import { downloadEventICS, downloadBatchICS } from '@/lib/calendar-ics';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent?: ActivityDetail | null;
  monthStr: string;
  monthEvents: ActivityDetail[];
  allEvents: ActivityDetail[];
}

export function CalendarExportModal({
  isOpen,
  onClose,
  currentEvent,
  monthStr,
  monthEvents,
  allEvents,
}: CalendarExportModalProps) {
  const [scope, setScope] = useState<'current' | 'month' | 'all'>(
    currentEvent ? 'current' : 'month'
  );
  const [copiedMd, setCopiedMd] = useState(false);

  if (!isOpen) return null;

  // 根据选定范围获取目标事件列表
  const targetEvents: ActivityDetail[] =
    scope === 'current' && currentEvent
      ? [currentEvent]
      : scope === 'month'
      ? monthEvents
      : allEvents;

  const [y, m] = monthStr.split('-');
  const scopeTitle =
    scope === 'current' && currentEvent
      ? currentEvent.name
      : scope === 'month'
      ? `${y}年${m}月排期日程`
      : '全周期研学排期总表';

  // 1. 导出 Excel 表格
  const handleExportExcel = () => {
    exportEventsToExcel(targetEvents, `研学排期-${scopeTitle}`);
  };

  // 2. 导出 CSV 表格
  const handleExportCSV = () => {
    exportEventsToCSV(targetEvents, `研学排期-${scopeTitle}`);
  };

  // 3. 导出 ICS 系统日历
  const handleExportICS = () => {
    if (scope === 'current' && currentEvent) {
      downloadEventICS(currentEvent as any);
    } else {
      downloadBatchICS(targetEvents as any, `研学排期-${scopeTitle}`);
    }
  };

  // 4. 打印 A4 出团单
  const handlePrint = () => {
    if (scope === 'current' && currentEvent) {
      printActivityDocument(currentEvent);
    } else if (targetEvents.length > 0) {
      printActivityDocument(targetEvents[0]);
    }
  };

  // 5. 复制 Markdown / 纯文本通报
  const handleCopyMarkdown = async () => {
    const mdLines = [
      `# 🌾 江南农耕研学 · 出团日程通报（${scopeTitle}）`,
      `> 导出时间：${new Date().toLocaleString()} | 场次总计：${targetEvents.length} 场\n`,
    ];

    targetEvents.forEach((e, i) => {
      mdLines.push(`### ${i + 1}. ${e.name}（${e.date}）`);
      mdLines.push(`- **研学对象**：${e.audience || '未指定'} | **规模**：${e.people} 人`);
      mdLines.push(`- **活动场地**：${e.place || '待定'}`);
      if (e.flow) {
        mdLines.push(`- **日程流程**：\n  ${e.flow.replace(/\n/g, '\n  ')}`);
      }
      if (e.materials && e.materials.length > 0) {
        mdLines.push(`- **物资准备**：`);
        e.materials.forEach((m) => {
          mdLines.push(`  - [${m.done ? 'x' : ' '}] ${m.name} × ${m.qty}${m.note ? ' (' + m.note + ')' : ''}`);
        });
      }
      if (e.precautions) {
        mdLines.push(`- **注意事项**：\n  ${e.precautions.replace(/\n/g, '\n  ')}`);
      }
      mdLines.push('');
    });

    const fullText = mdLines.join('\n');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullText);
      }
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2500);
    } catch {
      alert('复制失败，请重试');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-stone-200 w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗头部 */}
        <div className="px-6 py-4 border-b border-stone-200 bg-gradient-to-r from-[#faf9f5] to-emerald-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
                <span>📥 日历全能一键导出中心</span>
              </h3>
              <p className="text-xs text-stone-500">
                支持 Excel 报表、手机系统日历、A4 打印工作单等多种通用格式
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

        {/* 导出范围选择 */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-700 block">
              1. 选择导出数据范围：
            </span>
            <div className="grid grid-cols-3 gap-2">
              {currentEvent && (
                <button
                  onClick={() => setScope('current')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    scope === 'current'
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-900 shadow-2xs'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-white'
                  }`}
                >
                  当前活动
                </button>
              )}
              <button
                onClick={() => setScope('month')}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  scope === 'month'
                    ? 'border-emerald-800 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-white'
                }`}
              >
                本月排期（{monthEvents.length} 场）
              </button>
              <button
                onClick={() => setScope('all')}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  scope === 'all'
                    ? 'border-emerald-800 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-white'
                }`}
              >
                全部排期（{allEvents.length} 场）
              </button>
            </div>
          </div>

          {/* 格式导出卡片网格 */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-stone-700 block">
              2. 选择导出目标格式：
            </span>

            {/* Excel 导出 */}
            <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold text-stone-900 block">
                    导出标准 Excel 排期报表 (.xlsx / .xls)
                  </strong>
                  <p className="text-[11px] text-stone-600">
                    含活动名、对象、规模、场地、时间流程、物资准备、注意事项，样式美观支持 WPS/Office
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-2xs transition-colors"
                >
                  导出 Excel
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-2 py-1.5 rounded-lg border border-emerald-300 hover:bg-white text-emerald-800 text-xs font-medium"
                  title="导出纯文本 CSV 格式"
                >
                  CSV
                </button>
              </div>
            </div>

            {/* 系统日历导出 */}
            <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-amber-100" />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold text-stone-900 block">
                    同步到手机/电脑系统日历 (.ics)
                  </strong>
                  <p className="text-[11px] text-stone-600">
                    一键导入苹果 iPhone/Mac、安卓、Outlook，内置出团前 1 天与 2 小时提醒闹钟
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportICS}
                className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-2xs flex-shrink-0 transition-colors"
              >
                下载 .ics
              </button>
            </div>

            {/* A4 打印工作单 */}
            <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-white transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-700 text-white flex items-center justify-center flex-shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold text-stone-900 block">
                    A4 出团执行单 / 另存为 PDF
                  </strong>
                  <p className="text-[11px] text-stone-600">
                    标准纸质交接单，含时间轴、物资清点框与三方签字栏，适合出团随行携带
                  </p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold flex-shrink-0 transition-colors"
              >
                调起打印
              </button>
            </div>

            {/* Markdown / 纯文本通报 */}
            <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-white transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-bold text-stone-900 block">
                    复制 Markdown / 纯文本通报
                  </strong>
                  <p className="text-[11px] text-stone-600">
                    格式整洁规范，适合直接粘贴至飞书文档、企业微信群或周报中
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyMarkdown}
                className="px-3.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold flex items-center gap-1 flex-shrink-0 transition-colors"
              >
                {copiedMd ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{copiedMd ? '已复制！' : '复制文本'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 底部关闭 */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            已就绪：将导出共 {targetEvents.length} 场研学活动
          </span>
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-xl border border-stone-200 hover:bg-white text-stone-600 font-medium"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
