'use client';

import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Star, 
  Users, 
  ArrowRight,
  FileCheck,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { parseReviewContent, ParsedReviewResult } from '@/lib/review-parser';

export interface ReviewImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  planParticipants?: number;
  eventTitle?: string;
  onApply: (data: {
    actualParticipants: number | '';
    overallRating: number;
    highlights: string;
    issues: string;
    optimizations: string;
    actionStatus: 'open' | 'in_progress' | 'resolved';
  }) => void;
}

const SAMPLE_TEXT = `【环洲幼儿园秋收亲子营执行复盘】
活动日期：2026-10-18
实到人数：48人（原计划50人，因生病请假2人）
整体评价：非常顺畅，导师配合默契，给5星好评！

一、现场亮点与值得保持的做法 (Keep)
1. 水稻收割安全宣讲采用了自编的5句顺口溜口诀，现场小朋友和家长记得非常清楚，全程零划伤事故。
2. 土灶午餐的稻香煲仔饭和时令土鸡汤反响极好，家长在微信群自发发圈安利。
3. 下午编织稻草人环节亲子互动热烈，作品拍照打卡出片率高。

二、现场发现的卡点与物料损耗 (Problem)
1. 中午洗手池水龙头只有2个，午饭前排队洗手耽误了近15分钟。
2. 农场配发的儿童草帽系带容易脱落，刮风时有3顶被吹落到水渠中弄湿。
3. 返程时间遇到下班晚高峰，大巴车延误了20分钟才到达集合点。

三、下次出团改进建议与落地行动 (Try)
1. 立即增购2组便携移动水龙头，确保下次活动有至少6个出水口供洗手。
2. 草帽采购更换为防风卡扣加强款，并提前备好备用草帽10顶。
3. 返程时间统一前调20分钟（15:40开始集合清点），避开主干道晚高峰拥堵。`;

export function ReviewImportModal({
  isOpen,
  onClose,
  planParticipants,
  eventTitle,
  onApply,
}: ReviewImportModalProps) {
  const [tab, setTab] = useState<'text' | 'file'>('text');
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 识别提取出的结果预览
  const [parsedResult, setParsedResult] = useState<ParsedReviewResult | null>(null);

  if (!isOpen) return null;

  // 填入示例复盘文本
  const handleInsertSample = () => {
    setInputText(SAMPLE_TEXT);
    setError('');
  };

  // 触发智能解析
  const handleParse = async () => {
    setError('');
    setLoading(true);
    try {
      if (tab === 'file') {
        if (!file) {
          setError('请先选择要导入的 Word 文档 (.docx) 或文本文件');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (planParticipants) {
          formData.append('planParticipants', String(planParticipants));
        }

        const res = await fetch('/api/calendar/reviews/parse-doc', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '解析文件失败');
        setParsedResult(data.parsed);
      } else {
        if (!inputText.trim()) {
          setError('请先粘贴或输入需要识别的复盘文字内容');
          setLoading(false);
          return;
        }

        // 优先使用本地解析引擎，零延迟响应
        const res = parseReviewContent(inputText, planParticipants);
        setParsedResult(res);
      }
    } catch (err: any) {
      setError(err.message || '识别解析失败，请检查文本或文件格式');
    } finally {
      setLoading(false);
    }
  };

  // 文件选择处理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError('');
    }
  };

  // 应用并注入到复盘表单
  const handleConfirmApply = () => {
    if (!parsedResult) return;
    onApply({
      actualParticipants: parsedResult.actualParticipants,
      overallRating: parsedResult.overallRating,
      highlights: parsedResult.highlights,
      issues: parsedResult.issues,
      optimizations: parsedResult.optimizations,
      actionStatus: parsedResult.actionStatus,
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-gradient-to-r from-emerald-50/70 via-stone-50 to-amber-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900">
                  智能导入与自动识别复盘情况
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-300">
                  支持 Word (.docx) / 粘贴文字
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                自动抽取实际到场人数、顺畅度评分、Keep 亮点、Problem 卡点及 Try 优化措施
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 弹窗主体 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 输入源切换与操作 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTab('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    tab === 'text'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>模式一：直接粘贴文字</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('file')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    tab === 'file'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-amber-700" />
                  <span>模式二：上传 Word / 文本文档</span>
                </button>
              </div>

              {tab === 'text' && (
                <button
                  type="button"
                  onClick={handleInsertSample}
                  className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold underline underline-offset-2 flex items-center gap-1"
                >
                  <span>✨ 填入示例复盘文本体验</span>
                </button>
              )}
            </div>

            {/* 模式一：文本输入框 */}
            {tab === 'text' ? (
              <div className="relative">
                <textarea
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在此粘贴复盘文字、微信群汇报、复盘会会议纪要或随手记内容…&#10;系统将自动提取实到人数、满意度星级以及【亮点/问题/优化措施】KPT 各要点。"
                  className="w-full text-xs font-mono leading-relaxed p-4 rounded-xl border border-stone-300 bg-stone-50/60 focus:bg-white focus:border-emerald-700 focus:outline-none transition resize-y"
                />
                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 text-xs"
                    title="清空内容"
                  >
                    清空
                  </button>
                )}
              </div>
            ) : (
              /* 模式二：文件上传区 */
              <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center hover:border-emerald-600 transition bg-stone-50/40">
                <input
                  type="file"
                  id="reviewDocFile"
                  accept=".docx,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="reviewDocFile"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-stone-800">
                    {file ? file.name : '点击选择或拖拽 Word (.docx) / 纯文本文件'}
                  </div>
                  <p className="text-xs text-stone-500">
                    支持 Microsoft Word (.docx)、.txt、.md 格式，无需手动排版复制
                  </p>
                  {file && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <FileCheck className="w-3.5 h-3.5" /> 已选择文件：{(file.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </label>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 开始识别按钮 */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParse}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#27563c] hover:bg-[#1e4530] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>正在识别与解析语义…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>🤖 立即智能解析识别</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 解析识别结果核对面板 */}
          {parsedResult && (
            <div className="pt-4 border-t border-stone-200/80 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-emerald-900">
                    {parsedResult.summary}
                  </span>
                </div>
                <span className="text-xs text-emerald-700 hidden sm:inline">
                  请核对下方识别字段，可直接修改
                </span>
              </div>

              {/* 核心指标字段 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                    <span>实际到场人数</span>
                    {parsedResult.confidence.participants && (
                      <span className="text-[10px] text-emerald-700 font-normal">已识别</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={parsedResult.actualParticipants}
                    onChange={(e) =>
                      setParsedResult({
                        ...parsedResult,
                        actualParticipants: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    placeholder="实到人数"
                    className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                    <span>执行顺畅度评分</span>
                    {parsedResult.confidence.rating && (
                      <span className="text-[10px] text-emerald-700 font-normal">已识别</span>
                    )}
                  </label>
                  <select
                    value={parsedResult.overallRating}
                    onChange={(e) =>
                      setParsedResult({
                        ...parsedResult,
                        overallRating: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-emerald-700 font-medium"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ 5分 (极度顺畅)</option>
                    <option value={4}>⭐⭐⭐⭐ 4分 (执行良好)</option>
                    <option value={3}>⭐⭐⭐ 3分 (基本达标)</option>
                    <option value={2}>⭐⭐ 2分 (存在卡点)</option>
                    <option value={1}>⭐ 1分 (重大问题)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    <span>优化闭环推进状态</span>
                  </label>
                  <select
                    value={parsedResult.actionStatus}
                    onChange={(e) =>
                      setParsedResult({
                        ...parsedResult,
                        actionStatus: e.target.value as any,
                      })
                    }
                    className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-emerald-700 font-medium"
                  >
                    <option value="open">🔴 待优化跟进</option>
                    <option value="in_progress">🟡 优化推进中</option>
                    <option value="resolved">🟢 已落实闭环</option>
                  </select>
                </div>
              </div>

              {/* KPT 详细条目 */}
              <div className="space-y-3">
                {/* 亮点 Keep */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>✅ 识别亮点 (Keep)</span>
                    </label>
                    {parsedResult.confidence.highlights && (
                      <span className="text-[10px] text-emerald-700">自动结构化排版</span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={parsedResult.highlights}
                    onChange={(e) =>
                      setParsedResult({
                        ...parsedResult,
                        highlights: e.target.value,
                      })
                    }
                    placeholder="未提取到明确亮点，可在此手动补充"
                    className="w-full text-xs p-2.5 rounded-lg border border-emerald-300 bg-white focus:outline-none focus:border-emerald-700 leading-relaxed"
                  />
                </div>

                {/* 问题 Problem */}
                <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>⚠️ 识别问题与卡点 (Problem)</span>
                    </label>
                    {parsedResult.confidence.issues && (
                      <span className="text-[10px] text-rose-700">自动结构化排版</span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={parsedResult.issues}
                    onChange={(e) =>
                      setParsedResult({
                        ...parsedResult,
                        issues: e.target.value,
                      })
                    }
                    placeholder="未提取到明确问题，可在此手动补充"
                    className="w-full text-xs p-2.5 rounded-lg border border-rose-300 bg-white focus:outline-none focus:border-rose-600 leading-relaxed"
                  />
                </div>

                {/* 优化 Try */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                      <span>🚀 识别优化方案与行动项 (Try)</span>
                    </label>
                    {parsedResult.confidence.optimizations && (
                      <span className="text-[10px] text-indigo-700">自动结构化排版</span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={parsedResult.optimizations}
                    onChange={(e) =>
                      setParsedResult({
                        ...parsedResult,
                        optimizations: e.target.value,
                      })
                    }
                    placeholder="未提取到明确优化方案，可在此手动补充"
                    className="w-full text-xs p-2.5 rounded-lg border border-indigo-300 bg-white focus:outline-none focus:border-indigo-600 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 rounded-lg transition"
          >
            取消
          </button>

          {parsedResult ? (
            <button
              type="button"
              onClick={handleConfirmApply}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold shadow-md transition"
            >
              <Check className="w-4 h-4" />
              <span>✓ 确认并一键填入复盘表单</span>
            </button>
          ) : (
            <span className="text-xs text-stone-400">
              请在上方输入文字或上传 Word 文档后点击解析
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
