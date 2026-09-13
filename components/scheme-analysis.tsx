'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SchemeAnalysis } from '@/lib/scheme-analysis-schema';

const groupLabels: Record<SchemeAnalysis['summary']['groupType'], string> = {
  student: '学生团',
  family: '家庭团',
  senior: '老年团',
  adult: '成人团',
  company: '企业团',
  custom: '自定义团体',
  unknown: '待确认',
};

function valueOrPending(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '待确认' : String(value);
}

function peopleText(participants: SchemeAnalysis['participants']) {
  const parts = [
    ['学生', participants.students],
    ['儿童', participants.children],
    ['成人', participants.adults],
    ['家长', participants.parents],
    ['老师', participants.teachers],
    ['工作人员', participants.staff],
  ].filter((item): item is [string, number] => item[1] !== null);
  if (parts.length) return parts.map(([label, value]) => value + label).join(' + ');
  return participants.total === null ? '待确认' : participants.total + '人';
}

export function SchemeAnalysisPanel({ schemeId }: { schemeId: string }) {
  const [analysis, setAnalysis] = useState<SchemeAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/scheme-analysis?schemeId=' + encodeURIComponent(schemeId), {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          analysis: SchemeAnalysis | null;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || '读取分析结果失败');
        if (!controller.signal.aborted) setAnalysis(data.analysis);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : '读取分析结果失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, [schemeId]);

  async function runAnalysis() {
    if (busy) return;
    if (
      analysis &&
      !window.confirm(
        '重新分析将再次调用 AI。已有分析记录不会删除。是否继续？',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/scheme-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          analysis ? { schemeId, force: true } : { schemeId },
        ),
      });
      const data = (await response.json()) as {
        analysis?: SchemeAnalysis;
        error?: string;
      };
      if (!response.ok || !data.analysis)
        throw new Error(
          data.error || '智能分析暂时失败，原方案没有受到影响，请稍后重试。',
        );
      setAnalysis(data.analysis);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '智能分析暂时失败，原方案没有受到影响，请稍后重试。',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel ai-analysis" aria-labelledby="ai-analysis-heading">
      <div className="ai-analysis-heading">
        <div>
          <span className="eyebrow">AI 成本结构识别</span>
          <h2 id="ai-analysis-heading">智能成本分析</h2>
          <p>只识别活动和可能的成本项目，不生成价格或报价。</p>
        </div>
        <Button disabled={busy || !loaded} onClick={() => void runAnalysis()}>
          {busy ? '正在分析方案…' : analysis ? '重新分析' : '智能分析成本'}
        </Button>
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {analysis && (
        <div className="ai-analysis-content">
          <section>
            <h3>方案基本信息</h3>
            <div className="analysis-facts">
              <span>团体：{groupLabels[analysis.summary.groupType]}</span>
              <span>项目：{valueOrPending(analysis.summary.projectName)}</span>
              <span>地点：{valueOrPending(analysis.summary.location)}</span>
              <span>日期：{valueOrPending(analysis.summary.travelDate)}</span>
              <span>天数：{analysis.summary.days === null ? '待确认' : analysis.summary.days + '天'}</span>
              <span>人数：{peopleText(analysis.participants)}</span>
            </div>
            {analysis.participants.notes.length > 0 && (
              <p className="analysis-note">
                人数备注：{analysis.participants.notes.join('；')}
              </p>
            )}
          </section>

          <section>
            <h3>识别活动</h3>
            {analysis.activities.length ? (
              <div className="activity-list">
                {analysis.activities.map((activity, index) => (
                  <article key={activity.name + index}>
                    <strong>{valueOrPending(activity.time)}</strong>
                    <div>
                      <span>{activity.name}</span>
                      <small>
                        {activity.category} ·{' '}
                        {activity.durationMinutes === null
                          ? '时长待确认'
                          : activity.durationMinutes + '分钟'}{' '}
                        · {activity.confidence} 置信度
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="analysis-note">未识别到明确活动，请补充方案正文。</p>
            )}
          </section>

          <section>
            <h3>成本识别</h3>
            {analysis.costCandidates.length ? (
              <div className="analysis-table-wrap">
                <table className="analysis-table">
                  <thead>
                    <tr>
                      <th>成本项目</th>
                      <th>分类</th>
                      <th>对应活动</th>
                      <th>来源</th>
                      <th>数量</th>
                      <th>价格</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.costCandidates.map((cost, index) => (
                      <tr key={cost.name + index}>
                        <td>
                          <strong>{cost.name}</strong>
                          <small>{cost.reason}</small>
                        </td>
                        <td>{cost.category}</td>
                        <td>{valueOrPending(cost.relatedActivity)}</td>
                        <td>
                          {cost.source === 'explicit' ? '方案明确' : 'AI建议'}
                        </td>
                        <td>
                          {cost.quantity === null
                            ? '待确认'
                            : cost.quantity + (cost.unit ?? '')}
                        </td>
                        <td>待匹配</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="analysis-note">未识别到可能的成本项目。</p>
            )}
          </section>

          {(analysis.missingInfo.length > 0 || analysis.warnings.length > 0) && (
            <section className="analysis-followups">
              {analysis.missingInfo.length > 0 && (
                <div>
                  <h3>待确认信息</h3>
                  <ul>
                    {analysis.missingInfo.map((item, index) => (
                      <li key={item + index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.warnings.length > 0 && (
                <div>
                  <h3>分析提示</h3>
                  <ul>
                    {analysis.warnings.map((item, index) => (
                      <li key={item + index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}

