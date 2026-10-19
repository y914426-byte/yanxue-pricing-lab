/**
 * 研学活动复盘智能文本识别与抽取引擎 (KPT Framework Parser)
 * 支持识别各种格式的复盘总结、微信群聊记录、会议备忘录、Word 提取文本等
 */

export interface ParsedReviewResult {
  actualParticipants: number | '';
  overallRating: number;
  highlights: string;
  issues: string;
  optimizations: string;
  actionStatus: 'open' | 'in_progress' | 'resolved';
  confidence: {
    participants: boolean;
    rating: boolean;
    highlights: boolean;
    issues: boolean;
    optimizations: boolean;
  };
  summary: string;
}

/**
 * 清洗并格式化段落文本为规整的条目列表
 */
function cleanAndFormatBulletPoints(lines: string[]): string {
  const cleaned = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^(keep|problem|try|kpt|亮点|问题|优化|改进|建议|总结)[：:\s]*$/i.test(line));

  if (cleaned.length === 0) return '';

  return cleaned
    .map((line, idx) => {
      // 已经带数字或符号前缀的保持或规范化
      const stripped = line.replace(/^[\d+一二三四五六七八九十]+[、.．:：\s-]\s*/, '').replace(/^[-*•·]\s*/, '');
      return `${idx + 1}. ${stripped}`;
    })
    .join('\n');
}

/**
 * 核心解析函数：自动识别复盘文本中的各项指标与 KPT 模块
 */
export function parseReviewContent(rawText: string, planParticipants?: number): ParsedReviewResult {
  if (!rawText || !rawText.trim()) {
    return {
      actualParticipants: planParticipants || '',
      overallRating: 5,
      highlights: '',
      issues: '',
      optimizations: '',
      actionStatus: 'open',
      confidence: {
        participants: false,
        rating: false,
        highlights: false,
        issues: false,
        optimizations: false,
      },
      summary: '未能从空白内容中识别有效信息',
    };
  }

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let actualParticipants: number | '' = '';
  let rating = 5;
  let actionStatus: 'open' | 'in_progress' | 'resolved' = 'open';

  let hasParticipantsConfidence = false;
  let hasRatingConfidence = false;

  // 1. 人数识别 (实到人数)
  const participantPatterns = [
    /(?:实到|实际到场|到场人数|签到人数|实际参加|实到学员|到场学员|到场)[：:\s]*(\d+)\s*(?:人|位|名)?/i,
    /(?:计划\s*\d+\s*人[，,\s]+)?(?:实到|到场)\s*(\d+)\s*(?:人|位|名)?/i,
    /(?:共计|共|计)\s*(\d+)\s*(?:人|位|名)\s*(?:到场|实到|参加)/i,
    /(\d+)\s*(?:人|位|名)\s*(?:实到|到场|签到)/i,
  ];

  for (const line of lines) {
    for (const pat of participantPatterns) {
      const match = line.match(pat);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > 0 && val < 5000) {
          actualParticipants = val;
          hasParticipantsConfidence = true;
          break;
        }
      }
    }
    if (hasParticipantsConfidence) break;
  }

  // 若未匹配到且有计划人数，默认计划人数
  if (actualParticipants === '' && planParticipants) {
    actualParticipants = planParticipants;
  }

  // 2. 顺畅度评分识别 (1~5 星)
  const starMatch = text.match(/(?:⭐|★){1,5}/);
  if (starMatch) {
    rating = starMatch[0].length;
    hasRatingConfidence = true;
  } else {
    const ratingPattern = /(?:评分|星级|顺畅度|整体满意度|执行顺畅度|评价|满意度)[：:\s]*(\d)(?:\s*(?:分|星|\/5|分制))?/i;
    const rMatch = text.match(ratingPattern);
    if (rMatch && rMatch[1]) {
      const rVal = parseInt(rMatch[1], 10);
      if (rVal >= 1 && rVal <= 5) {
        rating = rVal;
        hasRatingConfidence = true;
      }
    } else {
      // 语义推断
      if (/非常顺畅|满分|极佳|极度顺畅|零卡点|超预期|好评如潮/.test(text)) {
        rating = 5;
        hasRatingConfidence = true;
      } else if (/较顺畅|良好|顺利|平稳|基本顺利/.test(text)) {
        rating = 4;
        hasRatingConfidence = true;
      } else if (/达标|及格|一般|普通|尚可/.test(text)) {
        rating = 3;
        hasRatingConfidence = true;
      } else if (/卡点较多|存在卡点|延误严重|混乱|较多问题/.test(text)) {
        rating = 2;
        hasRatingConfidence = true;
      } else if (/重大事故|严重投诉|翻车|严重失误/.test(text)) {
        rating = 1;
        hasRatingConfidence = true;
      }
    }
  }

  // 3. 闭环状态识别
  if (/已落实|已解决|已闭环|已优化完毕|全部完成/.test(text)) {
    actionStatus = 'resolved';
  } else if (/推进中|处理中|采购中|正在对接|正在修改/.test(text)) {
    actionStatus = 'in_progress';
  } else {
    actionStatus = 'open';
  }

  // 4. KPT 模块切分
  // 识别标题位置
  type SectionType = 'highlights' | 'issues' | 'optimizations' | 'other';
  const sectionLines: { type: SectionType; text: string }[] = [];

  let currentSection: SectionType = 'other';

  const isHighlightsHeader = (str: string) =>
    /^(?:【|\[|\()?(?:亮点|keep|保持|执行亮点|值得保持|做得好|正面反馈|优点|表扬)(?:】|\]|\)|：|:|\s*$)/i.test(str) ||
    /^(?:\d+[.、]|\*|-)\s*(?:亮点|keep|值得保持)/i.test(str);

  const isIssuesHeader = (str: string) =>
    /^(?:【|\[|\()?(?:问题|problem|卡点|不足|现场问题|踩坑|隐患|延误|缺点|漏洞)(?:】|\]|\)|：|:|\s*$)/i.test(str) ||
    /^(?:\d+[.、]|\*|-)\s*(?:问题|problem|现场卡点)/i.test(str);

  const isOptimizationsHeader = (str: string) =>
    /^(?:【|\[|\()?(?:优化|try|改进|建议|优化方案|行动项|action|措施|下次改进|整改方案)(?:】|\]|\)|：|:|\s*$)/i.test(str) ||
    /^(?:\d+[.、]|\*|-)\s*(?:优化|try|改进建议)/i.test(str);

  for (const line of lines) {
    if (isHighlightsHeader(line)) {
      currentSection = 'highlights';
      continue;
    }
    if (isIssuesHeader(line)) {
      currentSection = 'issues';
      continue;
    }
    if (isOptimizationsHeader(line)) {
      currentSection = 'optimizations';
      continue;
    }

    // 若当前无标题，检测单行行首是否为分类标识
    if (/^(?:亮点|keep)[：:\s]+(.+)$/i.test(line)) {
      const content = line.replace(/^(?:亮点|keep)[：:\s]+/i, '').trim();
      if (content) sectionLines.push({ type: 'highlights', text: content });
      continue;
    }
    if (/^(?:问题|卡点|problem)[：:\s]+(.+)$/i.test(line)) {
      const content = line.replace(/^(?:问题|卡点|problem)[：:\s]+/i, '').trim();
      if (content) sectionLines.push({ type: 'issues', text: content });
      continue;
    }
    if (/^(?:优化|建议|try|改进|措施)[：:\s]+(.+)$/i.test(line)) {
      const content = line.replace(/^(?:优化|建议|try|改进|措施)[：:\s]+/i, '').trim();
      if (content) sectionLines.push({ type: 'optimizations', text: content });
      continue;
    }

    sectionLines.push({ type: currentSection, text: line });
  }

  const highlightList: string[] = [];
  const issueList: string[] = [];
  const optimizationList: string[] = [];

  for (const item of sectionLines) {
    if (item.type === 'highlights') {
      highlightList.push(item.text);
    } else if (item.type === 'issues') {
      issueList.push(item.text);
    } else if (item.type === 'optimizations') {
      optimizationList.push(item.text);
    } else {
      // 针对无标题段落，根据关键词启发式分类
      const t = item.text;
      // 过滤掉纯人数、日期的句子
      if (/^(?:实到|计划|日期|时间|地点|天气|带队导师)[：:\s]/.test(t)) {
        continue;
      }
      if (/顺利|赞|好评|有序|零划伤|积极|满意|出彩|亮点|表扬|活跃|默契/.test(t) && !/不顺|延误|问题/.test(t)) {
        highlightList.push(t);
      } else if (/问题|卡点|延误|损耗|排队|超标|迟到|不足|缺少|破损|拥堵|混乱|不够|超时/.test(t)) {
        issueList.push(t);
      } else if (/建议|下次|增加|提前|采购|优化|落实|安排|调整|更换|SOP/.test(t)) {
        optimizationList.push(t);
      }
    }
  }

  const formattedHighlights = cleanAndFormatBulletPoints(highlightList);
  const formattedIssues = cleanAndFormatBulletPoints(issueList);
  const formattedOptimizations = cleanAndFormatBulletPoints(optimizationList);

  const confidence = {
    participants: hasParticipantsConfidence,
    rating: hasRatingConfidence,
    highlights: formattedHighlights.length > 0,
    issues: formattedIssues.length > 0,
    optimizations: formattedOptimizations.length > 0,
  };

  const detectedCount = [
    confidence.participants,
    confidence.rating,
    confidence.highlights,
    confidence.issues,
    confidence.optimizations,
  ].filter(Boolean).length;

  const summary = `已成功识别 ${detectedCount} 项核心复盘要素：${[
    confidence.participants ? `实到 ${actualParticipants} 人` : null,
    confidence.rating ? `${rating} 星评价` : null,
    confidence.highlights ? 'Keep 亮点' : null,
    confidence.issues ? 'Problem 问题' : null,
    confidence.optimizations ? 'Try 优化方案' : null,
  ]
    .filter(Boolean)
    .join('、')}`;

  return {
    actualParticipants,
    overallRating: rating,
    highlights: formattedHighlights,
    issues: formattedIssues,
    optimizations: formattedOptimizations,
    actionStatus,
    confidence,
    summary,
  };
}
