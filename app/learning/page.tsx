'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlobalNav } from '@/components/global-nav';
import { groupLabel } from '@/lib/scheme-learning';
import {
  Search,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Tag,
  Database,
  CalendarCheck,
  Check,
  Lightbulb,
  ArrowRight,
  Workflow,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

type Template = {
  id: string;
  activityName: string;
  groupType: string;
  costName: string;
  category: string;
  billingHint: string;
  positiveCount: number;
  negativeCount: number;
  confidenceScore: number;
  level: 'high' | 'low';
  isDisabled: boolean;
  schemeCount: number;
};

type Alias = {
  id: string;
  aliasName: string;
  normalizedAliasName: string;
  canonicalName: string;
  isActive: boolean;
};

type StandardActivity = {
  canonicalName: string;
  normalizedCanonicalName: string;
  aliases: Alias[];
};

type Batch = {
  batchId: string;
  schemeId: string;
  createdAt: string;
  revokedAt: string | null;
  relationCount: number;
};

type KnowledgeResponse = {
  templates: Template[];
  aliases: Alias[];
  standardActivities: StandardActivity[];
  recentBatches: Batch[];
  thresholds: { positiveCount: number; confidence: number };
};

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || '操作失败，请重试');
  return data;
}

function percent(value: number) {
  return Math.round(value * 100) + '%';
}

export default function LearningPage() {
  const [data, setData] = useState<KnowledgeResponse | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  // 搜索与过滤
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'low' | 'disabled'>('all');

  // 表单状态
  const [alias, setAlias] = useState({ aliasName: '', canonicalName: '' });
  const [names, setNames] = useState<Record<string, string>>({});
  const [aliasCanonicalNames, setAliasCanonicalNames] = useState<Record<string, string>>({});

  async function load() {
    setError('');
    try {
      const next = await request<KnowledgeResponse>('/api/learning');
      setData(next);
      setNames(
        Object.fromEntries(
          next.templates.map((item) => [item.id, item.costName]),
        ),
      );
      setAliasCanonicalNames(
        Object.fromEntries(next.aliases.map((item) => [item.id, item.canonicalName])),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '读取知识库失败');
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  async function updateTemplate(template: Template, disabled?: boolean) {
    const costName = names[template.id]?.trim();
    if (!costName) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/api/activity-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'template_update',
          templateId: template.id,
          costName,
          ...(disabled === undefined ? {} : { disabled }),
        }),
      });
      setSavedId(template.id);
      setTimeout(() => setSavedId(null), 2500);
      setMessage(`✓ 成本映射「${template.activityName} → ${costName}」已更新！`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '更新知识关系失败');
    } finally {
      setBusy(false);
    }
  }

  async function saveAlias() {
    if (!alias.aliasName.trim() || !alias.canonicalName.trim()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          activityName: alias.aliasName,
          canonicalName: alias.canonicalName,
        }),
      });
      setAlias({ aliasName: '', canonicalName: '' });
      setMessage(`✓ 活动别名「${alias.aliasName} → ${alias.canonicalName}」已保存生效！`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存活动别名失败');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAlias(id: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/api/activity-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', aliasId: id }),
      });
      setMessage('✓ 已停用该活动别名。');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '停用活动别名失败');
    } finally {
      setBusy(false);
    }
  }

  async function updateAlias(item: Alias) {
    const canonicalName = aliasCanonicalNames[item.id]?.trim();
    if (!canonicalName) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/api/activity-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', aliasId: item.id, canonicalName }),
      });
      setMessage('✓ 活动别名归属已更新。');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '更新活动别名失败');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(batchId: string) {
    if (!window.confirm('撤销后，这批反馈将不再影响个人知识库。是否继续？')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', batchId }),
      });
      setMessage('✓ 已撤销该学习批次，统计数据已重新计算。');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '撤销学习失败');
    } finally {
      setBusy(false);
    }
  }

  // 过滤后的关系列表
  const filteredTemplates = useMemo(() => {
    if (!data?.templates) return [];
    return data.templates.filter((tpl) => {
      // 级别筛选
      if (filterLevel === 'disabled' && !tpl.isDisabled) return false;
      if (filterLevel === 'high' && (tpl.level !== 'high' || tpl.isDisabled)) return false;
      if (filterLevel === 'low' && (tpl.level !== 'low' || tpl.isDisabled)) return false;

      // 文本搜索
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const currentCost = names[tpl.id] || tpl.costName;
      return (
        tpl.activityName.toLowerCase().includes(q) ||
        currentCost.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        tpl.billingHint.toLowerCase().includes(q)
      );
    });
  }, [data?.templates, searchQuery, filterLevel, names]);

  // 统计指标
  const stats = useMemo(() => {
    if (!data?.templates) return { total: 0, high: 0, low: 0, disabled: 0, avgConfidence: 0 };
    const total = data.templates.length;
    const high = data.templates.filter((t) => t.level === 'high' && !t.isDisabled).length;
    const low = data.templates.filter((t) => t.level === 'low' && !t.isDisabled).length;
    const disabled = data.templates.filter((t) => t.isDisabled).length;
    const avgConfidence = total > 0
      ? Math.round((data.templates.reduce((acc, t) => acc + t.confidenceScore, 0) / total) * 100)
      : 0;
    return { total, high, low, disabled, avgConfidence };
  }, [data?.templates]);

  return (
    <div className="min-h-screen bg-[#f6f8f6] flex flex-col text-[#18281e]">
      <GlobalNav active="learning" />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 w-full flex-1 space-y-8">
        {/* 顶部标题区 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-[#e0e9e3] gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef6f1] text-[#2b6c4b] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#c3ded0]">
              <Sparkles className="w-3.5 h-3.5 text-[#c4791d]" />
              研学智能算法映射 · 知识体系
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#18281e] tracking-tight">
              研学成本知识库
            </h1>
            <p className="text-sm text-[#5d6e62] mt-2 max-w-3xl leading-relaxed">
              沉淀您在多次研学方案测算中纠偏确认的活动与成本项目对应关系。AI 在解析导入新方案时，将优先自动匹配高频成本映射，越用越精准。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#eef6f1] text-[#2b6c4b] border border-[#c3ded0] rounded-xl text-xs font-semibold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-pulse" />
              规则生效域：当前团队与个人账号
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={busy}
              className="bg-white border-[#e0e9e3] text-[#2b6c4b] hover:bg-[#eef6f1] shadow-2xs rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
              刷新知识库
            </Button>
          </div>
        </div>

        {/* 提示消息 */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-sm font-bold">×</button>
          </div>
        )}
        {message && (
          <div className="p-4 rounded-xl bg-[#eef6f1] border border-[#c3ded0] text-[#2b6c4b] text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#16a34a]" />
              <span className="font-medium">{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-[#2b6c4b] hover:text-[#183f28] text-sm font-bold">×</button>
          </div>
        )}

        {!data ? (
          <div className="p-16 text-center rounded-2xl bg-white border border-[#e0e9e3] shadow-xs">
            <RefreshCw className="w-8 h-8 text-[#2b6c4b] animate-spin mx-auto mb-3 opacity-60" />
            <p className="text-sm font-medium text-[#5d6e62]">正在同步读取研学成本映射知识库…</p>
          </div>
        ) : (
          <>
            {/* 核心指标统计卡片 (KPI) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="p-5 rounded-2xl bg-white border border-[#e0e9e3] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#5d6e62]">
                  <span>已沉淀成本映射</span>
                  <BookOpen className="w-4 h-4 text-[#2b6c4b]" />
                </div>
                <div className="text-3xl font-extrabold text-[#18281e] pt-1">
                  {stats.total} <small className="text-xs font-normal text-[#8b998e]">条</small>
                </div>
                <p className="text-[11px] text-[#8b998e]">覆盖全部研学主题方案</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#e0e9e3] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#5d6e62]">
                  <span>高频核心映射</span>
                  <Sparkles className="w-4 h-4 text-[#c4791d]" />
                </div>
                <div className="text-3xl font-extrabold text-[#c4791d] pt-1">
                  {stats.high} <small className="text-xs font-normal text-[#8b998e]">条</small>
                </div>
                <p className="text-[11px] text-[#8b998e]">AI 自动优先直接套用</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#e0e9e3] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#5d6e62]">
                  <span>平均算法置信度</span>
                  <TrendingUp className="w-4 h-4 text-[#16a34a]" />
                </div>
                <div className="text-3xl font-extrabold text-[#16a34a] pt-1">
                  {stats.avgConfidence}%
                </div>
                <p className="text-[11px] text-[#8b998e]">综合正向确认权重</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#e0e9e3] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#5d6e62]">
                  <span>标准归一化活动</span>
                  <Database className="w-4 h-4 text-[#2b6c4b]" />
                </div>
                <div className="text-3xl font-extrabold text-[#18281e] pt-1">
                  {data.standardActivities.length} <small className="text-xs font-normal text-[#8b998e]">项</small>
                </div>
                <p className="text-[11px] text-[#8b998e]">含 {data.aliases.length} 个别名规则</p>
              </div>
            </div>

            {/* 业务情况描述与如何使用指南卡片 */}
            <div className="bg-white rounded-2xl border border-[#e0e9e3] shadow-xs overflow-hidden transition-all">
              <div className="p-5 sm:p-6 bg-gradient-to-r from-[#f0f7f3] via-white to-[#fbfdfb] border-b border-[#eaf1ec] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2b6c4b] text-white flex items-center justify-center shadow-xs">
                    <Workflow className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#18281e] flex items-center gap-2">
                      <span>研学业务情况描述与操作指南</span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#eef6f1] text-[#2b6c4b] border border-[#c3ded0]">
                        业务闭环解析
                      </span>
                    </h3>
                    <p className="text-xs text-[#5d6e62] mt-0.5">
                      了解知识库在研学教案、成本测算与团队协同中的具体应用情况及全流程使用方法
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e0e9e3] bg-white hover:bg-[#f8faf8] text-[#2b6c4b] text-xs font-semibold shadow-2xs transition-all self-start sm:self-auto cursor-pointer"
                >
                  {showGuide ? (
                    <>
                      <span>收起说明</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>查看情况描述与使用指南</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {showGuide && (
                <div className="p-6 space-y-6">
                  {/* 第一部分：业务情况描述 (3个典型业务痛点场景) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#5d6e62] uppercase tracking-wider">
                      <Lightbulb className="w-4 h-4 text-[#c4791d]" />
                      <span>业务情况描述 · 这个功能在什么场景下发挥作用？</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#e0e9e3] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#eef6f1] text-[#2b6c4b] text-xs font-bold flex items-center justify-center">
                            1
                          </span>
                          <strong className="text-sm font-bold text-[#18281e]">
                            非标教案活动繁杂易漏项
                          </strong>
                        </div>
                        <p className="text-xs text-[#5d6e62] leading-relaxed">
                          不同学校或老师策划的教案表述各异（如“水稻收割体验” vs “秋季稻谷脱粒”）。传统系统无法自动联想所需农具、有机大米耗材或手工包，导致成本漏算亏本。AI 能自动归一识别并关联对应物资。
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#e0e9e3] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#fef7ee] text-[#c4791d] text-xs font-bold flex items-center justify-center">
                            2
                          </span>
                          <strong className="text-sm font-bold text-[#18281e]">
                            隐性成本提前预防少踩坑
                          </strong>
                        </div>
                        <p className="text-xs text-[#5d6e62] leading-relaxed">
                          研学出团除显性门票餐饮外，常有导师带队劳务、大巴空驶过桥费、户外防蚊医药包及保险等隐性支出。本系统识别行程后，能依据经验建议完整的成本架构，彻底避免现场临时补采购。
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#e0e9e3] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#edf7f1] text-[#16a34a] text-xs font-bold flex items-center justify-center">
                            3
                          </span>
                          <strong className="text-sm font-bold text-[#18281e]">
                            团队知识沉淀与经验传承
                          </strong>
                        </div>
                        <p className="text-xs text-[#5d6e62] leading-relaxed">
                          老策划师的定价核算经验以往只停留在个人脑海中。现在团队成员每一次在定价台中修正纠偏，都会沉淀为组织级共享资产，新入职导师导入新案时能直接套用高频规则，效率翻倍。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 第二部分：如何使用这个功能 (4步闭环工作流程) */}
                  <div className="space-y-3 pt-3 border-t border-[#eaf1ec]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#5d6e62] uppercase tracking-wider">
                      <Workflow className="w-4 h-4 text-[#2b6c4b]" />
                      <span>如何使用这个功能 · 4 步标准化工作流指南</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Step 1 */}
                      <div className="p-4 rounded-xl bg-white border border-[#e0e9e3] hover:border-[#2b6c4b] shadow-2xs transition-all space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef6f1] text-[#2b6c4b]">
                              STEP 01
                            </span>
                            <span className="text-xs text-[#8b998e]">方案导入</span>
                          </div>
                          <strong className="text-sm font-bold text-[#18281e] block">
                            上传 Word 或 TXT 教案
                          </strong>
                          <p className="text-xs text-[#5d6e62] leading-relaxed">
                            前往「方案导入」页面上传客户策划方案文档，系统使用本地安全 Worker 自动抽离行程与活动正文。
                          </p>
                        </div>
                        <a
                          href="/scheme-import"
                          className="pt-2 border-t border-[#f1f5f2] inline-flex items-center gap-1 text-[11px] font-bold text-[#2b6c4b] hover:underline"
                        >
                          前往导入方案 <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Step 2 */}
                      <div className="p-4 rounded-xl bg-white border border-[#e0e9e3] hover:border-[#2b6c4b] shadow-2xs transition-all space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#fef7ee] text-[#c4791d]">
                              STEP 02
                            </span>
                            <span className="text-xs text-[#8b998e]">智能联想</span>
                          </div>
                          <strong className="text-sm font-bold text-[#18281e] block">
                            AI 结构识别与知识匹配
                          </strong>
                          <p className="text-xs text-[#5d6e62] leading-relaxed">
                            在方案详情页点击智能分析，AI 自动提取出活动列表，并从知识库中直接匹配已沉淀的高频耗材。
                          </p>
                        </div>
                        <span className="pt-2 border-t border-[#f1f5f2] text-[11px] text-[#8b998e]">
                          全自动秒级结构化提取
                        </span>
                      </div>

                      {/* Step 3 */}
                      <div className="p-4 rounded-xl bg-white border border-[#e0e9e3] hover:border-[#2b6c4b] shadow-2xs transition-all space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef6f1] text-[#2b6c4b]">
                              STEP 03
                            </span>
                            <span className="text-xs text-[#8b998e]">校对核算</span>
                          </div>
                          <strong className="text-sm font-bold text-[#18281e] block">
                            定价台核对并「确认并学习」
                          </strong>
                          <p className="text-xs text-[#5d6e62] leading-relaxed">
                            导师在「研学定价台」微调单价、勾选所需物料后，点击底部的【确认并学习】，操作自动回流沉淀。
                          </p>
                        </div>
                        <a
                          href="/pricing"
                          className="pt-2 border-t border-[#f1f5f2] inline-flex items-center gap-1 text-[11px] font-bold text-[#2b6c4b] hover:underline"
                        >
                          前往研学定价台 <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Step 4 */}
                      <div className="p-4 rounded-xl bg-white border border-[#e0e9e3] hover:border-[#2b6c4b] shadow-2xs transition-all space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#edf7f1] text-[#16a34a]">
                              STEP 04
                            </span>
                            <span className="text-xs text-[#8b998e]">规则生效</span>
                          </div>
                          <strong className="text-sm font-bold text-[#18281e] block">
                            知识库进化与团队共享
                          </strong>
                          <p className="text-xs text-[#5d6e62] leading-relaxed">
                            当某映射正向确认达到 3 次且置信度 ≥ 70%，自动升级为高频核心映射；可在本页进行改名或停用维护。
                          </p>
                        </div>
                        <span className="pt-2 border-t border-[#f1f5f2] text-[11px] text-[#16a34a] font-semibold">
                          ✓ 当前页面实时维护管理
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 团队共享机制提示条 */}
                  <div className="p-3.5 rounded-xl bg-[#eef6f1] border border-[#c3ded0] text-xs text-[#1e5838] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#2b6c4b] flex-shrink-0" />
                      <span>
                        <strong>团队共享机制</strong>：系统当前映射规则已对接团队协同权限，团队各导师核算学习的知识自动汇总生效，越用越聪明！
                      </span>
                    </div>
                    <span className="text-[11px] text-[#2b6c4b] font-semibold flex-shrink-0">
                      管理员可通过顶栏【团队权限】配置成员
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 规则机制与生效说明卡片 */}
            <div className="p-6 rounded-2xl bg-white border border-[#e0e9e3] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eef6f1] text-[#2b6c4b] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#18281e]">
                    成本知识库运作机制说明
                  </h3>
                  <p className="text-xs text-[#5d6e62] leading-relaxed max-w-3xl">
                    在研学方案测算页面点击「确认并学习」后，活动与成本的对应关系会自动同步在此。
                    系统设定高频推荐门槛为：正向确认至少 <strong>{data.thresholds.positiveCount} 次</strong>，且确认率占比达到 <strong>{percent(data.thresholds.confidence)}</strong>。
                    映射仅用于自动化建议匹配，不改变具体价格金额，随时可在下方自定义调整或禁用。
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <span className="px-3 py-1.5 rounded-lg bg-[#f8faf8] border border-[#e0e9e3] text-[11px] font-semibold text-[#5d6e62]">
                  阈值：≥{data.thresholds.positiveCount}次确认
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-[#f8faf8] border border-[#e0e9e3] text-[11px] font-semibold text-[#5d6e62]">
                  置信度：≥{percent(data.thresholds.confidence)}
                </span>
              </div>
            </div>

            {/* 核心板块：已学习活动与成本关系表格 */}
            <section className="bg-white rounded-2xl border border-[#e0e9e3] shadow-xs overflow-hidden">
              {/* 表格顶栏控制条 */}
              <div className="p-5 sm:p-6 border-b border-[#eaf1ec] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-[#fbfdfb]">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-[#18281e] flex items-center gap-2">
                      <span>已学习活动与成本关系</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eef6f1] text-[#2b6c4b] border border-[#c3ded0]">
                        {filteredTemplates.length} / {data.templates.length} 条
                      </span>
                    </h2>
                  </div>
                  <p className="text-xs text-[#8b998e]">
                    修改成本名称后点击保存即可生效；可按需禁用不合适的历史推荐。
                  </p>
                </div>

                {/* 搜索与筛选交互条 */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 text-[#8b998e] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="搜索活动名或成本项..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#e0e9e3] bg-[#f8faf8] focus:bg-white focus:outline-none focus:border-[#2b6c4b] transition-all placeholder:text-[#8b998e]"
                    />
                  </div>

                  <div className="flex items-center bg-[#f8faf8] p-1 rounded-xl border border-[#e0e9e3]">
                    <button
                      onClick={() => setFilterLevel('all')}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                        filterLevel === 'all'
                          ? 'bg-white text-[#2b6c4b] shadow-xs'
                          : 'text-[#5d6e62] hover:text-[#18281e]'
                      }`}
                    >
                      全部 ({stats.total})
                    </button>
                    <button
                      onClick={() => setFilterLevel('high')}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                        filterLevel === 'high'
                          ? 'bg-white text-[#c4791d] shadow-xs'
                          : 'text-[#5d6e62] hover:text-[#18281e]'
                      }`}
                    >
                      高频 ({stats.high})
                    </button>
                    <button
                      onClick={() => setFilterLevel('low')}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                        filterLevel === 'low'
                          ? 'bg-white text-[#2b6c4b] shadow-xs'
                          : 'text-[#5d6e62] hover:text-[#18281e]'
                      }`}
                    >
                      普通 ({stats.low})
                    </button>
                    <button
                      onClick={() => setFilterLevel('disabled')}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                        filterLevel === 'disabled'
                          ? 'bg-white text-stone-700 shadow-xs'
                          : 'text-[#5d6e62] hover:text-[#18281e]'
                      }`}
                    >
                      已禁用 ({stats.disabled})
                    </button>
                  </div>
                </div>
              </div>

              {/* 表格主体 */}
              {filteredTemplates.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#8b998e] space-y-2">
                  <BookOpen className="w-8 h-8 text-[#8b998e]/40 mx-auto" />
                  <p className="font-semibold text-sm text-[#5d6e62]">没有匹配的成本映射记录</p>
                  <p>请调整搜索关键词或筛选条件，或在方案详情页点击“确认并学习”沉淀新映射。</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f2f7f3] border-b border-[#e0e9e3] text-[#335c3e] font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-3.5 px-5 w-[240px]">研学活动及客群</th>
                        <th className="py-3.5 px-5 min-w-[280px]">标准成本对应名称</th>
                        <th className="py-3.5 px-5 w-[200px]">确认频次与置信度</th>
                        <th className="py-3.5 px-5 w-[130px]">算法推荐级别</th>
                        <th className="py-3.5 px-5 w-[180px] text-right">管理操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eaf1ec]">
                      {filteredTemplates.map((template) => {
                        const isModified = names[template.id] !== undefined && names[template.id] !== template.costName;
                        const isRecentlySaved = savedId === template.id;

                        return (
                          <tr
                            key={template.id}
                            className={`hover:bg-[#f8faf8] transition-colors ${
                              template.isDisabled ? 'bg-stone-50/60 opacity-60' : ''
                            }`}
                          >
                            {/* 1. 活动名称 */}
                            <td className="py-4 px-5 align-top">
                              <div className="space-y-1.5">
                                <strong className="text-sm font-bold text-[#18281e] block leading-snug">
                                  {template.activityName}
                                </strong>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-[#eef6f1] text-[#2b6c4b] text-[10px] font-bold border border-[#c3ded0]">
                                    {groupLabel(template.groupType)}
                                  </span>
                                  <span className="text-[11px] text-[#8b998e]">
                                    {template.schemeCount} 份方案引用
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 2. 成本关系输入 */}
                            <td className="py-4 px-5 align-top">
                              <div className="space-y-1.5 max-w-md">
                                <div className="relative">
                                  <input
                                    className={`w-full text-xs font-medium px-3 py-2 rounded-xl border transition-all ${
                                      isModified
                                        ? 'border-[#c4791d] bg-amber-50/40 text-[#18281e]'
                                        : 'border-[#e0e9e3] bg-[#f8faf8] focus:bg-white text-[#18281e]'
                                    } focus:outline-none focus:border-[#2b6c4b]`}
                                    aria-label={template.activityName + ' 标准成本名称'}
                                    value={names[template.id] ?? template.costName}
                                    maxLength={120}
                                    disabled={busy}
                                    onChange={(event) =>
                                      setNames({
                                        ...names,
                                        [template.id]: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-[#8b998e]">
                                  <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                                    {template.category}
                                  </span>
                                  <span>·</span>
                                  <span>{template.billingHint}</span>
                                </div>
                              </div>
                            </td>

                            {/* 3. 确认与置信度 */}
                            <td className="py-4 px-5 align-top">
                              <div className="space-y-1.5">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] font-bold">
                                  <span className="text-[#16a34a]">✓ {template.positiveCount} 确认</span>
                                  <span className="text-stone-300">|</span>
                                  <span className="text-stone-400">✕ {template.negativeCount} 忽略</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        template.confidenceScore >= 0.7
                                          ? 'bg-[#16a34a]'
                                          : 'bg-[#c4791d]'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.round(template.confidenceScore * 100))}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold text-[#5d6e62]">
                                    置信度 {percent(template.confidenceScore)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 4. 推荐级别 */}
                            <td className="py-4 px-5 align-top">
                              {template.isDisabled ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200 text-stone-600 text-[11px] font-bold">
                                  <EyeOff className="w-3 h-3" /> 已停用
                                </span>
                              ) : template.level === 'high' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-[#c4791d] border border-amber-200 text-[11px] font-bold">
                                  <Sparkles className="w-3 h-3 text-[#c4791d]" /> 历史高频
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eef6f1] text-[#2b6c4b] border border-[#c3ded0] text-[11px] font-bold">
                                  低频建议
                                </span>
                              )}
                            </td>

                            {/* 5. 操作 */}
                            <td className="py-4 px-5 align-top text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => void updateTemplate(template)}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shadow-xs ${
                                    isRecentlySaved
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : isModified
                                        ? 'bg-[#c4791d] text-white border-[#c4791d] hover:bg-[#a96313]'
                                        : 'bg-white text-[#2b6c4b] border-[#e0e9e3] hover:bg-[#eef6f1]'
                                  }`}
                                >
                                  {isRecentlySaved ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 mr-1" /> 已保存
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5 mr-1" /> {isModified ? '改名保存' : '保存'}
                                    </>
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    void updateTemplate(
                                      template,
                                      !template.isDisabled,
                                    )
                                  }
                                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                                    template.isDisabled
                                      ? 'text-emerald-700 hover:bg-emerald-50'
                                      : 'text-stone-500 hover:text-red-700 hover:bg-red-50'
                                  }`}
                                >
                                  {template.isDisabled ? (
                                    <>
                                      <Eye className="w-3.5 h-3.5 mr-1" /> 启用
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5 mr-1" /> 禁用
                                    </>
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 活动标准化别名管理模块 */}
            <section className="bg-white rounded-2xl border border-[#e0e9e3] p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#eaf1ec] gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#2b6c4b]" />
                    <h2 className="text-lg font-bold text-[#18281e]">活动标准化与别名归一</h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#eef6f1] text-[#2b6c4b] text-[10px] font-bold border border-[#c3ded0]">
                      人工校验规则
                    </span>
                  </div>
                  <p className="text-xs text-[#8b998e]">
                    例如将不同方案里的“萌宠农场 DIY”、“投喂小动物”统一归一为“动物农场体验”，以便沉淀统一成本模型。
                  </p>
                </div>
              </div>

              {/* 新增别名输入框 */}
              <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#e0e9e3] flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[11px] font-bold text-[#5d6e62] block">
                    各方案中出现的活动别名
                  </label>
                  <input
                    value={alias.aliasName}
                    maxLength={120}
                    placeholder="例如：萌宠乐园DIY手工"
                    onChange={(e) => setAlias({ ...alias, aliasName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#e0e9e3] bg-white focus:outline-none focus:border-[#2b6c4b]"
                  />
                </div>
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[11px] font-bold text-[#5d6e62] block">
                    映射归入的标准活动名称
                  </label>
                  <input
                    value={alias.canonicalName}
                    maxLength={120}
                    placeholder="例如：动物农场手工制作"
                    onChange={(e) => setAlias({ ...alias, canonicalName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#e0e9e3] bg-white focus:outline-none focus:border-[#2b6c4b]"
                  />
                </div>
                <Button
                  disabled={busy || !alias.aliasName.trim() || !alias.canonicalName.trim()}
                  onClick={() => void saveAlias()}
                  className="bg-[#2b6c4b] hover:bg-[#22573c] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> 保存标准化别名
                </Button>
              </div>

              {/* 已有标准活动列表 */}
              {data.standardActivities.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8b998e]">
                  暂无自定义标准活动。可在上方手动添加，或在研学方案详情页确认活动归类。
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.standardActivities.map((activity) => (
                    <div
                      key={activity.normalizedCanonicalName}
                      className="p-4 rounded-xl border border-[#e0e9e3] bg-white hover:border-[#2b6c4b]/50 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#eaf1ec]">
                        <strong className="text-sm font-bold text-[#18281e]">
                          🎯 {activity.canonicalName}
                        </strong>
                        <span className="text-[11px] font-semibold text-[#8b998e]">
                          {activity.aliases.length} 个别名归属
                        </span>
                      </div>

                      {activity.aliases.length === 0 ? (
                        <p className="text-xs text-[#8b998e]">作为独立标准活动，暂无重定向别名。</p>
                      ) : (
                        <div className="space-y-2">
                          {activity.aliases.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-lg bg-[#f8faf8] border border-[#e0e9e3] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="font-semibold text-[#18281e] truncate">{item.aliasName}</span>
                                <span className="text-[#8b998e]">→</span>
                                <input
                                  aria-label={item.aliasName + ' 标准活动名称'}
                                  value={aliasCanonicalNames[item.id] ?? item.canonicalName}
                                  maxLength={120}
                                  disabled={busy}
                                  onChange={(e) =>
                                    setAliasCanonicalNames({
                                      ...aliasCanonicalNames,
                                      [item.id]: e.target.value,
                                    })
                                  }
                                  className="text-xs py-1 px-2 rounded-md border border-[#e0e9e3] bg-white flex-1 min-w-[100px] focus:outline-none focus:border-[#2b6c4b]"
                                />
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy || !aliasCanonicalNames[item.id]?.trim()}
                                  onClick={() => void updateAlias(item)}
                                  className="text-[11px] h-7 px-2 border-[#e0e9e3] text-[#2b6c4b] hover:bg-[#eef6f1]"
                                >
                                  更新
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => void deleteAlias(item.id)}
                                  className="text-[11px] h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  停用
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 最近学习批次 */}
            <section className="bg-white rounded-2xl border border-[#e0e9e3] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#eaf1ec]">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#2b6c4b]" />
                  <h2 className="text-lg font-bold text-[#18281e]">最近学习与纠偏批次</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#f8faf8] border border-[#e0e9e3] text-[10px] font-bold text-[#5d6e62]">
                    支持回滚
                  </span>
                </div>
                <span className="text-xs text-[#8b998e]">若某次方案测算误确认，可在此撤销该批次权重</span>
              </div>

              {data.recentBatches.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8b998e]">
                  暂无学习记录批次。在方案测算详情中完成“确认并学习”后将生成记录。
                </div>
              ) : (
                <div className="divide-y divide-[#eaf1ec]">
                  {data.recentBatches.map((batch) => (
                    <div
                      key={batch.batchId}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <strong className="text-sm font-semibold text-[#18281e]">
                          {new Date(batch.createdAt).toLocaleString('zh-CN')}
                        </strong>
                        <div className="text-[11px] text-[#8b998e] flex items-center gap-2">
                          <span>方案编号：<code className="text-[#2b6c4b] font-mono">{batch.schemeId}</code></span>
                          <span>·</span>
                          <span>{batch.relationCount} 条学习关系</span>
                          {batch.revokedAt && (
                            <span className="text-red-500 font-bold">（已撤销回滚）</span>
                          )}
                        </div>
                      </div>

                      {!batch.revokedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void revoke(batch.batchId)}
                          className="text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> 撤销本批次
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
