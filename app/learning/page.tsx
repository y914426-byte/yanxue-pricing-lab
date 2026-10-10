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
    <div className="min-h-screen bg-[#fbfaf9] flex flex-col text-[#121212]">
      <GlobalNav active="learning" />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 w-full flex-1 space-y-8">
        {/* 顶部标题区 (Family 绘本排版) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-[#e5d5c3] gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f6f4ef] text-[#343433] text-xs font-semibold tracking-wider mb-2 border border-[#e5d5c3]">
              <Sparkles className="w-3.5 h-3.5 text-[#d48f00]" />
              研学智能算法映射 · 知识体系
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#121212] tracking-tight">
              研学成本知识库
            </h1>
            <p className="text-sm text-[#474645] mt-2 max-w-3xl leading-relaxed">
              沉淀您在多次研学方案测算中纠偏确认的活动与成本项目对应关系。AI 在解析导入新方案时，将优先自动匹配高频成本映射，越用越精准。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#f6f4ef] text-[#121212] border border-[#e5d5c3] rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#00c978] animate-pulse" />
              规则生效域：当前团队与个人账号
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={busy}
              className="bg-white border-[#e5d5c3] text-[#121212] hover:bg-[#f6f4ef] rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
              刷新知识库
            </Button>
          </div>
        </div>

        {/* 提示消息 */}
        {error && (
          <div className="p-4 rounded-[10px] bg-[#ff2b3a]/10 border border-[#ff2b3a]/25 text-[#ff2b3a] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-[#ff2b3a] hover:opacity-80 text-sm font-bold cursor-pointer">×</button>
          </div>
        )}
        {message && (
          <div className="p-4 rounded-[10px] bg-[#00c978]/10 border border-[#00c978]/30 text-[#008f55] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#00c978]" />
              <span className="font-semibold">{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-[#008f55] hover:opacity-80 text-sm font-bold cursor-pointer">×</button>
          </div>
        )}

        {!data ? (
          <div className="p-16 text-center rounded-[10px] bg-white border border-[#e5d5c3]">
            <RefreshCw className="w-8 h-8 text-[#121212] animate-spin mx-auto mb-3 opacity-60" />
            <p className="text-sm font-semibold text-[#474645]">正在同步读取研学成本映射知识库…</p>
          </div>
        ) : (
          <>
            {/* 核心指标统计卡片 (KPI) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="p-5 rounded-[10px] bg-white border border-[#e5d5c3] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#7e7e7d]">
                  <span>已沉淀成本映射</span>
                  <BookOpen className="w-4 h-4 text-[#121212]" />
                </div>
                <div className="text-3xl font-extrabold text-[#121212] pt-1">
                  {stats.total} <small className="text-xs font-normal text-[#7e7e7d]">条</small>
                </div>
                <p className="text-[11px] text-[#7e7e7d]">覆盖全部研学主题方案</p>
              </div>

              <div className="p-5 rounded-[10px] bg-white border border-[#e5d5c3] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#7e7e7d]">
                  <span>高频核心映射</span>
                  <Sparkles className="w-4 h-4 text-[#d48f00]" />
                </div>
                <div className="text-3xl font-extrabold text-[#d48f00] pt-1">
                  {stats.high} <small className="text-xs font-normal text-[#7e7e7d]">条</small>
                </div>
                <p className="text-[11px] text-[#7e7e7d]">AI 自动优先直接套用</p>
              </div>

              <div className="p-5 rounded-[10px] bg-white border border-[#e5d5c3] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#7e7e7d]">
                  <span>平均算法置信度</span>
                  <TrendingUp className="w-4 h-4 text-[#00c978]" />
                </div>
                <div className="text-3xl font-extrabold text-[#00c978] pt-1">
                  {stats.avgConfidence}%
                </div>
                <p className="text-[11px] text-[#7e7e7d]">综合正向确认权重</p>
              </div>

              <div className="p-5 rounded-[10px] bg-white border border-[#e5d5c3] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#7e7e7d]">
                  <span>标准归一化活动</span>
                  <Database className="w-4 h-4 text-[#121212]" />
                </div>
                <div className="text-3xl font-extrabold text-[#121212] pt-1">
                  {data.standardActivities.length} <small className="text-xs font-normal text-[#7e7e7d]">项</small>
                </div>
                <p className="text-[11px] text-[#7e7e7d]">含 {data.aliases.length} 个别名规则</p>
              </div>
            </div>

            {/* 业务情况描述与如何使用指南卡片 */}
            <div className="bg-white rounded-[10px] border border-[#e5d5c3] overflow-hidden transition-all">
              <div className="p-5 sm:p-6 bg-[#fbfaf9] border-b border-[#e5d5c3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-[#121212] text-white flex items-center justify-center">
                    <Workflow className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#121212] flex items-center gap-2">
                      <span>研学业务情况描述与操作指南</span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-[4px] bg-[#f2f0ed] text-[#343433] border border-[#e5d5c3]">
                        业务闭环解析
                      </span>
                    </h3>
                    <p className="text-xs text-[#474645] mt-0.5">
                      了解知识库在研学教案、成本测算与团队协同中的具体应用情况及全流程使用方法
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e5d5c3] bg-white hover:bg-[#f6f4ef] text-[#121212] text-xs font-semibold transition-all self-start sm:self-auto cursor-pointer"
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
                    <div className="flex items-center gap-2 text-xs font-bold text-[#7e7e7d] uppercase tracking-wider">
                      <Lightbulb className="w-4 h-4 text-[#d48f00]" />
                      <span>业务情况描述 · 这个功能在什么场景下发挥作用？</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-[10px] bg-[#fbfaf9] border border-[#f2f0ed] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#121212] text-white text-xs font-bold flex items-center justify-center">
                            1
                          </span>
                          <strong className="text-sm font-bold text-[#121212]">
                            非标教案活动繁杂易漏项
                          </strong>
                        </div>
                        <p className="text-xs text-[#474645] leading-relaxed">
                          不同学校或老师策划的教案表述各异（如“水稻收割体验” vs “秋季稻谷脱粒”）。传统系统无法自动联想所需农具、有机大米耗材或手工包，导致成本漏算亏本。AI 能自动归一识别并关联对应物资。
                        </p>
                      </div>

                      <div className="p-4 rounded-[10px] bg-[#fbfaf9] border border-[#f2f0ed] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#121212] text-white text-xs font-bold flex items-center justify-center">
                            2
                          </span>
                          <strong className="text-sm font-bold text-[#121212]">
                            隐性成本提前预防少踩坑
                          </strong>
                        </div>
                        <p className="text-xs text-[#474645] leading-relaxed">
                          研学出团除显性门票餐饮外，常有导师带队劳务、大巴空驶过桥费、户外防蚊医药包及保险等隐性支出。本系统识别行程后，能依据经验建议完整的成本架构，彻底避免现场临时补采购。
                        </p>
                      </div>

                      <div className="p-4 rounded-[10px] bg-[#fbfaf9] border border-[#f2f0ed] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#121212] text-white text-xs font-bold flex items-center justify-center">
                            3
                          </span>
                          <strong className="text-sm font-bold text-[#121212]">
                            团队知识沉淀与经验传承
                          </strong>
                        </div>
                        <p className="text-xs text-[#474645] leading-relaxed">
                          老策划师的定价核算经验以往只停留在个人脑海中。现在团队成员每一次在定价台中修正纠偏，都会沉淀为组织级共享资产，新入职导师导入新案时能直接套用高频规则，效率翻倍。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 第二部分：如何使用这个功能 (4步闭环工作流程) */}
                  <div className="space-y-3 pt-3 border-t border-[#f2f0ed]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#7e7e7d] uppercase tracking-wider">
                      <Workflow className="w-4 h-4 text-[#121212]" />
                      <span>如何使用这个功能 · 4 步标准化工作流指南</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Step 1 */}
                      <div className="p-4 rounded-[10px] bg-white border border-[#e5d5c3] hover:border-[#121212] transition-all space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#64c6ff]/15 text-[#0086fc]">
                              STEP 01
                            </span>
                            <span className="text-xs text-[#7e7e7d]">方案导入</span>
                          </div>
                          <strong className="text-sm font-bold text-[#121212] block">
                            上传 Word 或 TXT 教案
                          </strong>
                          <p className="text-xs text-[#474645] leading-relaxed">
                            前往「方案导入」页面上传客户策划方案文档，系统使用本地安全 Worker 自动抽离行程与活动正文。
                          </p>
                        </div>
                        <a
                          href="/scheme-import"
                          className="pt-2 border-t border-[#f2f0ed] inline-flex items-center gap-1 text-[11px] font-semibold text-[#121212] hover:text-[#ff3e00] hover:underline"
                        >
                          前往导入方案 <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Step 2 */}
                      <div className="p-4 rounded-[10px] bg-white border border-[#e5d5c3] hover:border-[#121212] transition-all space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#ffbb26]/25 text-[#9a6700]">
                              STEP 02
                            </span>
                            <span className="text-xs text-[#7e7e7d]">智能联想</span>
                          </div>
                          <strong className="text-sm font-bold text-[#121212] block">
                            AI 结构识别与知识匹配
                          </strong>
                          <p className="text-xs text-[#474645] leading-relaxed">
                            在方案详情页点击智能分析，AI 自动提取出活动列表，并从知识库中直接匹配已沉淀的高频耗材。
                          </p>
                        </div>
                        <span className="pt-2 border-t border-[#f2f0ed] text-[11px] text-[#7e7e7d]">
                          全自动秒级结构化提取
                        </span>
                      </div>

                      {/* Step 3 */}
                      <div className="p-4 rounded-[10px] bg-white border border-[#e5d5c3] hover:border-[#121212] transition-all space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#00c978]/15 text-[#008f55]">
                              STEP 03
                            </span>
                            <span className="text-xs text-[#7e7e7d]">校对核算</span>
                          </div>
                          <strong className="text-sm font-bold text-[#121212] block">
                            定价台核对并「确认并学习」
                          </strong>
                          <p className="text-xs text-[#474645] leading-relaxed">
                            导师在「研学定价台」微调单价、勾选所需物料后，点击底部的【确认并学习】，操作自动回流沉淀。
                          </p>
                        </div>
                        <a
                          href="/pricing"
                          className="pt-2 border-t border-[#f2f0ed] inline-flex items-center gap-1 text-[11px] font-semibold text-[#121212] hover:text-[#ff3e00] hover:underline"
                        >
                          前往研学定价台 <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Step 4 */}
                      <div className="p-4 rounded-[10px] bg-white border border-[#e5d5c3] hover:border-[#121212] transition-all space-y-2 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#9f4fff]/15 text-[#9f4fff]">
                              STEP 04
                            </span>
                            <span className="text-xs text-[#7e7e7d]">规则生效</span>
                          </div>
                          <strong className="text-sm font-bold text-[#121212] block">
                            知识库进化与团队共享
                          </strong>
                          <p className="text-xs text-[#474645] leading-relaxed">
                            当某映射正向确认达到 3 次且置信度 ≥ 70%，自动升级为高频核心映射；可在本页进行改名或停用维护。
                          </p>
                        </div>
                        <span className="pt-2 border-t border-[#f2f0ed] text-[11px] text-[#00c978] font-semibold">
                          ✓ 当前页面实时维护管理
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 团队共享机制提示条 */}
                  <div className="p-3.5 rounded-[10px] bg-[#f6f4ef] border border-[#e5d5c3] text-xs text-[#343433] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#d48f00] flex-shrink-0" />
                      <span>
                        <strong>团队共享机制</strong>：系统当前映射规则已对接团队协同权限，团队各导师核算学习的知识自动汇总生效，越用越聪明！
                      </span>
                    </div>
                    <span className="text-[11px] text-[#121212] font-semibold flex-shrink-0">
                      管理员可通过顶栏【团队权限】配置成员
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 规则机制与生效说明卡片 */}
            <div className="p-6 rounded-[10px] bg-white border border-[#e5d5c3] flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f2f0ed] text-[#121212] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-5 h-5 text-[#343433]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#121212]">
                    成本知识库运作机制说明
                  </h3>
                  <p className="text-xs text-[#474645] leading-relaxed max-w-3xl">
                    在研学方案测算页面点击「确认并学习」后，活动与成本的对应关系会自动同步在此。
                    系统设定高频推荐门槛为：正向确认至少 <strong>{data.thresholds.positiveCount} 次</strong>，且确认率占比达到 <strong>{percent(data.thresholds.confidence)}</strong>。
                    映射仅用于自动化建议匹配，不改变具体价格金额，随时可在下方自定义调整或禁用。
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <span className="px-3 py-1.5 rounded-full bg-[#f2f0ed] border border-[#e5d5c3] text-[11px] font-semibold text-[#474645]">
                  阈值：≥{data.thresholds.positiveCount}次确认
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#f2f0ed] border border-[#e5d5c3] text-[11px] font-semibold text-[#474645]">
                  置信度：≥{percent(data.thresholds.confidence)}
                </span>
              </div>
            </div>

            {/* 核心板块：已学习活动与成本关系表格 */}
            <section className="bg-white rounded-[10px] border border-[#e5d5c3] overflow-hidden">
              {/* 表格顶栏控制条 */}
              <div className="p-5 sm:p-6 border-b border-[#f2f0ed] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#fbfaf9]">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-[#121212] flex items-center gap-2">
                      <span>已学习活动与成本关系</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f2f0ed] text-[#343433] border border-[#e5d5c3]">
                        {filteredTemplates.length} / {data.templates.length} 条
                      </span>
                    </h2>
                  </div>
                  <p className="text-xs text-[#7e7e7d]">
                    修改成本名称后点击保存即可生效；可按需禁用不合适的历史推荐。
                  </p>
                </div>

                {/* 搜索与筛选交互条 */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 text-[#7e7e7d] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="搜索活动名或成本项..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-full border border-[#e5d5c3] bg-white focus:outline-none focus:border-[#121212] transition-all placeholder:text-[#7e7e7d]"
                    />
                  </div>

                  <div className="flex items-center bg-[#f2f0ed] p-1 rounded-full border border-[#e5d5c3]">
                    <button
                      onClick={() => setFilterLevel('all')}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                        filterLevel === 'all'
                          ? 'bg-white text-[#121212]'
                          : 'text-[#474645] hover:text-[#121212]'
                      }`}
                    >
                      全部 ({stats.total})
                    </button>
                    <button
                      onClick={() => setFilterLevel('high')}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                        filterLevel === 'high'
                          ? 'bg-white text-[#d48f00]'
                          : 'text-[#474645] hover:text-[#121212]'
                      }`}
                    >
                      高频 ({stats.high})
                    </button>
                    <button
                      onClick={() => setFilterLevel('low')}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                        filterLevel === 'low'
                          ? 'bg-white text-[#121212]'
                          : 'text-[#474645] hover:text-[#121212]'
                      }`}
                    >
                      普通 ({stats.low})
                    </button>
                    <button
                      onClick={() => setFilterLevel('disabled')}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                        filterLevel === 'disabled'
                          ? 'bg-white text-[#7e7e7d]'
                          : 'text-[#474645] hover:text-[#121212]'
                      }`}
                    >
                      已禁用 ({stats.disabled})
                    </button>
                  </div>
                </div>
              </div>

              {/* 表格主体 */}
              {filteredTemplates.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#7e7e7d] space-y-2">
                  <BookOpen className="w-8 h-8 text-[#7e7e7d]/40 mx-auto" />
                  <p className="font-semibold text-sm text-[#343433]">没有匹配的成本映射记录</p>
                  <p>请调整搜索关键词或筛选条件，或在方案详情页点击“确认并学习”沉淀新映射。</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#fbfaf9] border-b border-[#e5d5c3] text-[#343433] font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-3.5 px-5 w-[240px]">研学活动及客群</th>
                        <th className="py-3.5 px-5 min-w-[280px]">标准成本对应名称</th>
                        <th className="py-3.5 px-5 w-[200px]">确认频次与置信度</th>
                        <th className="py-3.5 px-5 w-[130px]">算法推荐级别</th>
                        <th className="py-3.5 px-5 w-[180px] text-right">管理操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2f0ed]">
                      {filteredTemplates.map((template) => {
                        const isModified = names[template.id] !== undefined && names[template.id] !== template.costName;
                        const isRecentlySaved = savedId === template.id;

                        return (
                          <tr
                            key={template.id}
                            className={`hover:bg-[#fbfaf9] transition-colors ${
                              template.isDisabled ? 'bg-[#f2f0ed]/40 opacity-60' : ''
                            }`}
                          >
                            {/* 1. 活动名称 */}
                            <td className="py-4 px-5 align-top">
                              <div className="space-y-1.5">
                                <strong className="text-sm font-bold text-[#121212] block leading-snug">
                                  {template.activityName}
                                </strong>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-[4px] bg-[#f2f0ed] text-[#343433] text-[10px] font-bold border border-[#e5d5c3]">
                                    {groupLabel(template.groupType)}
                                  </span>
                                  <span className="text-[11px] text-[#7e7e7d]">
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
                                    className={`w-full text-xs font-medium px-3 py-2 rounded-[8px] border transition-all ${
                                      isModified
                                        ? 'border-[#d48f00] bg-[#ffbb26]/10 text-[#121212]'
                                        : 'border-[#e5d5c3] bg-white focus:bg-white text-[#121212]'
                                    } focus:outline-none focus:border-[#121212]`}
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
                                <div className="flex items-center gap-2 text-[11px] text-[#7e7e7d]">
                                  <span className="px-1.5 py-0.5 rounded-[4px] bg-[#f2f0ed] text-[#474645] font-medium border border-[#e5d5c3]/60">
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
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f2f0ed] text-[#121212] border border-[#e5d5c3] text-[11px] font-semibold">
                                  <span className="text-[#00c978]">✓ {template.positiveCount} 确认</span>
                                  <span className="text-[#e5d5c3]">|</span>
                                  <span className="text-[#7e7e7d]">✕ {template.negativeCount} 忽略</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 rounded-full bg-[#e5d5c3]/50 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        template.confidenceScore >= 0.7
                                          ? 'bg-[#00c978]'
                                          : 'bg-[#d48f00]'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.round(template.confidenceScore * 100))}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold text-[#474645]">
                                    置信度 {percent(template.confidenceScore)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 4. 推荐级别 */}
                            <td className="py-4 px-5 align-top">
                              {template.isDisabled ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f2f0ed] text-[#7e7e7d] text-[11px] font-bold border border-[#e5d5c3]">
                                  <EyeOff className="w-3 h-3" /> 已停用
                                </span>
                              ) : template.level === 'high' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffbb26]/25 text-[#9a6700] border border-[#ffbb26]/40 text-[11px] font-bold">
                                  <Sparkles className="w-3 h-3 text-[#d48f00]" /> 历史高频
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f2f0ed] text-[#474645] border border-[#e5d5c3] text-[11px] font-bold">
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
                                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                                    isRecentlySaved
                                      ? 'bg-[#00c978] text-white border-[#00c978]'
                                      : isModified
                                        ? 'bg-[#121212] text-white border-[#121212] hover:bg-[#2b2b2b]'
                                        : 'bg-white text-[#121212] border-[#e5d5c3] hover:bg-[#f6f4ef]'
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
                                  className={`text-xs px-2.5 py-1.5 rounded-full font-medium cursor-pointer ${
                                    template.isDisabled
                                      ? 'text-[#00c978] hover:bg-[#00c978]/10'
                                      : 'text-[#7e7e7d] hover:text-[#ff2b3a] hover:bg-[#ff2b3a]/10'
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
            <section className="bg-white rounded-[10px] border border-[#e5d5c3] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f2f0ed] gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#121212]" />
                    <h2 className="text-lg font-bold text-[#121212]">活动标准化与别名归一</h2>
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#f2f0ed] text-[#343433] text-[10px] font-bold border border-[#e5d5c3]">
                      人工校验规则
                    </span>
                  </div>
                  <p className="text-xs text-[#7e7e7d]">
                    例如将不同方案里的“萌宠农场 DIY”、“投喂小动物”统一归一为“动物农场体验”，以便沉淀统一成本模型。
                  </p>
                </div>
              </div>

              {/* 新增别名输入框 */}
              <div className="p-4 rounded-[10px] bg-[#fbfaf9] border border-[#f2f0ed] flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[11px] font-bold text-[#474645] block">
                    各方案中出现的活动别名
                  </label>
                  <input
                    value={alias.aliasName}
                    maxLength={120}
                    placeholder="例如：萌宠乐园DIY手工"
                    onChange={(e) => setAlias({ ...alias, aliasName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-[8px] border border-[#e5d5c3] bg-white focus:outline-none focus:border-[#121212]"
                  />
                </div>
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[11px] font-bold text-[#474645] block">
                    映射归入的标准活动名称
                  </label>
                  <input
                    value={alias.canonicalName}
                    maxLength={120}
                    placeholder="例如：动物农场手工制作"
                    onChange={(e) => setAlias({ ...alias, canonicalName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-[8px] border border-[#e5d5c3] bg-white focus:outline-none focus:border-[#121212]"
                  />
                </div>
                <Button
                  disabled={busy || !alias.aliasName.trim() || !alias.canonicalName.trim()}
                  onClick={() => void saveAlias()}
                  className="bg-[#121212] hover:bg-[#2b2b2b] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-all whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> 保存标准化别名
                </Button>
              </div>

              {/* 已有标准活动列表 */}
              {data.standardActivities.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7e7e7d]">
                  暂无自定义标准活动。可在上方手动添加，或在研学方案详情页确认活动归类。
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.standardActivities.map((activity) => (
                    <div
                      key={activity.normalizedCanonicalName}
                      className="p-4 rounded-[10px] border border-[#e5d5c3] bg-white hover:border-[#121212] transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#f2f0ed]">
                        <strong className="text-sm font-bold text-[#121212]">
                          🎯 {activity.canonicalName}
                        </strong>
                        <span className="text-[11px] font-semibold text-[#7e7e7d]">
                          {activity.aliases.length} 个别名归属
                        </span>
                      </div>

                      {activity.aliases.length === 0 ? (
                        <p className="text-xs text-[#7e7e7d]">作为独立标准活动，暂无重定向别名。</p>
                      ) : (
                        <div className="space-y-2">
                          {activity.aliases.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-[8px] bg-[#fbfaf9] border border-[#f2f0ed] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="font-semibold text-[#121212] truncate">{item.aliasName}</span>
                                <span className="text-[#7e7e7d]">→</span>
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
                                  className="text-xs py-1 px-2 rounded-[6px] border border-[#e5d5c3] bg-white flex-1 min-w-[100px] focus:outline-none focus:border-[#121212]"
                                />
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy || !aliasCanonicalNames[item.id]?.trim()}
                                  onClick={() => void updateAlias(item)}
                                  className="text-[11px] h-7 px-2.5 rounded-full border-[#e5d5c3] text-[#121212] hover:bg-[#f6f4ef]"
                                >
                                  更新
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => void deleteAlias(item.id)}
                                  className="text-[11px] h-7 px-2.5 rounded-full text-[#ff2b3a] hover:bg-[#ff2b3a]/10"
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
            <section className="bg-white rounded-[10px] border border-[#e5d5c3] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#f2f0ed]">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#121212]" />
                  <h2 className="text-lg font-bold text-[#121212]">最近学习与纠偏批次</h2>
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#f2f0ed] border border-[#e5d5c3] text-[10px] font-bold text-[#474645]">
                    支持回滚
                  </span>
                </div>
                <span className="text-xs text-[#7e7e7d]">若某次方案测算误确认，可在此撤销该批次权重</span>
              </div>

              {data.recentBatches.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7e7e7d]">
                  暂无学习记录批次。在方案测算详情中完成“确认并学习”后将生成记录。
                </div>
              ) : (
                <div className="divide-y divide-[#f2f0ed]">
                  {data.recentBatches.map((batch) => (
                    <div
                      key={batch.batchId}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <strong className="text-sm font-semibold text-[#121212]">
                          {new Date(batch.createdAt).toLocaleString('zh-CN')}
                        </strong>
                        <div className="text-[11px] text-[#7e7e7d] flex items-center gap-2">
                          <span>方案编号：<code className="text-[#121212] font-mono bg-[#f2f0ed] px-1 py-0.5 rounded">{batch.schemeId}</code></span>
                          <span>·</span>
                          <span>{batch.relationCount} 条学习关系</span>
                          {batch.revokedAt && (
                            <span className="text-[#ff2b3a] font-bold">（已撤销回滚）</span>
                          )}
                        </div>
                      </div>

                      {!batch.revokedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void revoke(batch.batchId)}
                          className="text-xs border-[#ff2b3a]/30 text-[#ff2b3a] hover:bg-[#ff2b3a]/10 rounded-full cursor-pointer"
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
