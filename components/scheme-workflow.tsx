'use client';

import { useEffect, useState } from 'react';

type WorkflowState = {
  analyzed: boolean;
  matched: boolean;
  confirmed: boolean;
};

type AnalysisResponse = { analysis: Record<string, unknown> | null };
type CostingResponse = { id?: string; costing: Record<string, unknown> | null; stale?: boolean };
type LearningResponse = {
  latestForScheme?: { schemeCostEstimateId: string; revokedAt: string | null } | null;
};

async function read<T>(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function SchemeWorkflow({ schemeId }: { schemeId: string }) {
  const [state, setState] = useState<WorkflowState>({ analyzed: false, matched: false, confirmed: false });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const query = encodeURIComponent(schemeId);
      const [analysis, costing, learning] = await Promise.all([
        read<AnalysisResponse>('/api/scheme-analysis?schemeId=' + query),
        read<CostingResponse>('/api/scheme-costing?schemeId=' + query),
        read<LearningResponse>('/api/learning?schemeId=' + query),
      ]);
      if (!active) return;
      const matched = !!costing?.costing && costing.stale !== true;
      setState({
        analyzed: !!analysis?.analysis,
        matched,
        confirmed: matched && !!costing?.id && learning?.latestForScheme?.schemeCostEstimateId === costing.id && !learning.latestForScheme.revokedAt,
      });
    };
    void load();
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ schemeId?: string }>).detail;
      if (detail?.schemeId === schemeId) void load();
    };
    window.addEventListener('scheme-analysis-updated', onChanged);
    window.addEventListener('scheme-costing-updated', onChanged);
    window.addEventListener('scheme-learning-updated', onChanged);
    return () => {
      active = false;
      window.removeEventListener('scheme-analysis-updated', onChanged);
      window.removeEventListener('scheme-costing-updated', onChanged);
      window.removeEventListener('scheme-learning-updated', onChanged);
    };
  }, [schemeId]);

  const steps = [
    { label: '导入方案', done: true },
    { label: 'AI分析', done: state.analyzed },
    { label: '匹配价格', done: state.matched },
    { label: '人工确认', done: state.confirmed },
    { label: '带入定价台', done: false },
  ];
  const current = steps.findIndex((step) => !step.done);
  return (
    <ol className="scheme-workflow" aria-label="方案处理步骤">
      {steps.map((step, index) => (
        <li key={step.label} className={step.done ? 'workflow-done' : index === current ? 'workflow-current' : 'workflow-pending'} aria-current={index === current ? 'step' : undefined}>
          <span>{step.done ? '✓' : index === current ? '●' : '○'}</span>{index + 1} {step.label}
        </li>
      ))}
    </ol>
  );
}
