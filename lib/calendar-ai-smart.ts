/**
 * 江南农耕研学 · 智能化活动助手 (AI Copilot & Smart Engine)
 * 提供智能化活动流程生成、物资用量科学测算、研学注意事项与安全告知、微信群文案提炼等功能
 */

export interface ActivityDetail {
  id?: string;
  name: string;
  date: string;
  audience?: string;
  people?: number;
  place?: string;
  status?: string;
  flow?: string;
  materials?: Array<{ name: string; qty: string; note: string; done: boolean }>;
  precautions?: string;
  note?: string;
}

/**
 * 研学经典场景预设库与智能匹配规则
 */
const SCENARIO_KNOWLEDGE = [
  {
    keywords: ['割水稻', '水稻', '秋收', '稻田', '收割', '打谷', '稻草'],
    theme: '水稻田间收割与秋收劳动实践',
    defaultFlow: [
      '09:00 研学团队到达农耕基地，营员整队与主导师开营破冰',
      '09:30 江南农耕文化馆导览：认识水稻生长周期与二十四节气',
      '10:15 安全劳作讲解：割稻镰刀规范使用与田间防护指引',
      '10:30 金秋稻浪劳作实践：分工割稻、传统脱粒与扎稻草人',
      '12:00 享用江南特色农家生态午餐（品尝新大米与土灶菜）',
      '13:30 传统农具工坊体验：风车车谷、石磨碾米与米食手作',
      '14:45 亲子/团队花束手作或稻草编织创意手作工坊',
      '15:30 研学收获总结、颁发「小小新农人」结营证书与返程',
    ].join('\n'),
    materials: (people: number) => [
      { name: '儿童防割劳作手套', qty: `${Math.ceil(people * 0.5)} 副`, note: '按参与儿童人手一副', done: false },
      { name: '成人防护劳作手套', qty: `${Math.ceil(people * 0.5)} 副`, note: '带队老师与家长陪护用', done: false },
      { name: '安全割稻小镰刀', qty: `${Math.max(10, Math.ceil(people * 0.25))} 把`, note: '按组轮流体验，钝角安全刃', done: false },
      { name: '农耕遮阳防晒草帽', qty: `${people} 顶`, note: '人手一顶田间防晒', done: false },
      { name: '稻草捆扎麻绳与材料包', qty: `${Math.ceil(people * 0.4)} 袋`, note: '扎稻草与花束材料包', done: false },
      { name: '无线扩音小蜜蜂', qty: '3-4 台', note: '主导师及带班老师配备', done: false },
      { name: '随队便携急救医药箱', qty: '2 套', note: '含创可贴、碘伏、藿香正气水、风油精', done: true },
      { name: '研学营地队旗与手举牌', qty: '2 面', note: '集合与行进引导', done: false },
      { name: '桶装饮用水与补给站', qty: '4 桶', note: '现场设补水站', done: false },
    ],
    precautions: [
      '👟【穿戴建议】请所有参与者穿着透气长袖长裤（稻芒易引起皮肤微刺痒）、穿防滑运动鞋或软底鞋，严禁穿拖鞋、高跟鞋进入田间。',
      '🌾【农具安全】镰刀等农用器具须在带班导师指导下使用，刀刃向外，严禁持镰刀奔跑或嬉戏；幼儿园及低龄儿童须在家长一对一陪同下体验。',
      '🦟【防虫防晒】田间日照充足，已备遮阳草帽，请自备防晒霜、驱蚊液；如有花粉过敏或草籽敏感史，请提前告知带队老师。',
      '💧【补水休息】活动过程中若有出汗过多、头晕等身体不适，请第一时间向就近导师报告，切勿硬撑。',
      '🌿【生态爱护】一粥一饭当思来之不易，割稻脱粒请爱惜粮食，不随意践踏未收割的试验田，垃圾入篓。',
    ].join('\n'),
  },
  {
    keywords: ['花束', '插花', '花艺', '植物', '押花', '拓印', '标本'],
    theme: '植物美育与田园花束手作工坊',
    defaultFlow: [
      '09:30 集合签到，自然美育导师介绍江南花木与节气芳香',
      '10:00 田园自然寻宝：采撷田边野趣花草与植物叶片',
      '11:00 植物美学感知：色彩搭配与花材修剪养护技巧',
      '12:00 农家生态午餐与午间静息',
      '13:30 亲子花艺与稻谷干花束手工创作',
      '14:45 作品展示、分享创作心声与合影留念',
      '15:30 领取专属手作作品与伴手礼返程',
    ].join('\n'),
    materials: (people: number) => [
      { name: '花束手作包（包装纸/丝带/内衬）', qty: `${people} 套`, note: '人手一份', done: false },
      { name: '儿童安全花艺剪刀', qty: `${Math.ceil(people * 0.4)} 把`, note: '圆头钝口安全型', done: false },
      { name: '干花花材与稻穗备用包', qty: `${Math.ceil(people * 0.3)} 扎`, note: '备用替换花材', done: false },
      { name: '花束手提袋（打包带回）', qty: `${people} 个`, note: '成品方便携带', done: false },
      { name: '手作长条操作桌椅', qty: `${Math.ceil(people / 6)} 张`, note: '每张桌坐6人', done: false },
    ],
    precautions: [
      '✂️【剪刀安全】花艺剪刀使用完毕请及时归入刀套，低年级学员需在老师或家长协助下修剪粗枝。',
      '🌸【过敏预防】接触花草前确认是否对特定花粉敏感，若有打喷嚏、皮肤发红请及时告知导师洗手处理。',
      '✨【成品保护】制作完成的花束作品请统一贴上姓名贴并放入手提袋，避免挤压破损。',
    ].join('\n'),
  },
  {
    keywords: ['泥田', '抓鱼', '捉泥鳅', '摸鱼', '水上', '龙虾'],
    theme: '泥田野趣劳作与生态捉鱼体验',
    defaultFlow: [
      '09:30 研学集合破冰，学习淡水湿地与鱼稻共生生态原理',
      '10:15 更换下田连体防滑水裤或涉水鞋，安全动作示范',
      '10:30 泥田野趣挑战：徒手捉泥鳅/稻田摸鱼实践',
      '12:00 冲洗整理，享用生态农家风味午餐',
      '13:30 鱼篓编织手作或生态水族瓶微景观制作',
      '15:00 评选今日「捕鱼小达人」，分发生态战利品与证书',
      '15:30 团队合影返程',
    ].join('\n'),
    materials: (people: number) => [
      { name: '儿童下田防水服/水鞋', qty: `${people} 套`, note: '按码数分类备足', done: false },
      { name: '活水捉鱼网兜与便携小水桶', qty: `${Math.ceil(people * 0.5)} 个`, note: '亲子一组', done: false },
      { name: '温水冲洗区毛巾与吹风机', qty: '6 套', note: '出水后更衣保暖', done: false },
      { name: '备用干爽衣物与塑料防水袋', qty: `${people} 个`, note: '湿衣收纳打包', done: false },
    ],
    precautions: [
      '🌊【防滑防滑】泥田泥质较深且滑，入田时脚步放平缓慢行进，严禁在池边打闹推搡。',
      '👕【备用衣物】请每位营员必须自备一套从内到外的换洗衣物与拖鞋，活动后及时更衣防感冒。',
      '👁️【眼部卫生】手上沾泥严禁揉眼睛，现场配备净水洗眼液与流动清水冲洗台。',
    ].join('\n'),
  },
];

/**
 * 智能匹配场景知识
 */
function findMatchedScenario(name: string) {
  for (const s of SCENARIO_KNOWLEDGE) {
    if (s.keywords.some((k) => name.toLowerCase().includes(k))) {
      return s;
    }
  }
  return SCENARIO_KNOWLEDGE[0];
}

/**
 * 智能生成活动流程安排
 */
export function smartGenerateFlow(eventName: string, audience = '', _people = 0): string {
  const scenario = findMatchedScenario(eventName);
  let flow = scenario.defaultFlow;

  // 根据人群微调
  if (audience.includes('幼') || audience.includes('亲子')) {
    flow = flow.replace('09:00', '09:30').replace('10:15', '10:30');
  }
  return flow;
}

/**
 * 智能按人数与主题科学测算物资
 */
export function smartGenerateMaterials(
  eventName: string,
  _audience = '',
  people = 80
): Array<{ name: string; qty: string; note: string; done: boolean }> {
  const scenario = findMatchedScenario(eventName);
  const count = Math.max(1, people || 80);
  return scenario.materials(count);
}

/**
 * 智能生成注意事项与安全须知
 */
export function smartGeneratePrecautions(
  eventName: string,
  audience = '',
  place = '江南农耕文化园'
): string {
  const scenario = findMatchedScenario(eventName);
  const base = scenario.precautions;

  const extraNotes: string[] = [];
  if (audience.includes('幼') || audience.includes('亲子')) {
    extraNotes.push('👶【幼儿看护】亲子活动中请家长全程看护好幼儿，不离开视线范围，避免走失或靠近水域。');
  }
  if (place.includes('田') || place.includes('水') || place.includes('塘')) {
    extraNotes.push('⚠️【水域警示】基地水渠与河道水深危险，未经导师允许严禁私自下水或跨越防护栏。');
  }

  return extraNotes.length > 0 ? `${base}\n${extraNotes.join('\n')}` : base;
}

/**
 * 一键智能生成微信群分享文案 (支持多种场景定制)
 */
export function smartGenerateWechatText(
  event: ActivityDetail,
  options: {
    style?: 'parent' | 'mentor' | 'base'; // 家长版 | 导师版 | 基地对接版
    includeFlow?: boolean;
    includeMaterials?: boolean;
    materialsFilter?: 'all' | 'pendingOnly';
    includePrecautions?: boolean;
    includeLink?: boolean;
    baseUrl?: string;
  } = {}
): string {
  const {
    style = 'parent',
    includeFlow = true,
    includeMaterials = true,
    materialsFilter = 'all',
    includePrecautions = true,
    includeLink = true,
    baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yanxue-pricing-lab.pages.dev',
  } = options;

  const title = event.name || '研学实践活动';
  const date = event.date || '待定日期';
  const place = event.place || '江南农耕文化园';
  const audience = event.audience || '研学团队';
  const people = event.people || 0;

  const link = `${baseUrl}/yanxue-calendar?eventId=${encodeURIComponent(event.id || '')}&date=${encodeURIComponent(date)}`;

  // 计算物资待办统计
  const mats = event.materials || [];
  const doneCount = mats.filter((m) => m.done).length;
  const targetMats =
    materialsFilter === 'pendingOnly' ? mats.filter((m) => !m.done) : mats;

  // 风格区分
  if (style === 'parent') {
    // 👨‍👩‍👧‍👦 家长与学生亲切版
    const lines = [
      `🌾【出团通知】${title}`,
      `各位家长、老师与小学员们好！我们即将开启精彩的田园农耕研学之旅，请查收出团指南与行前须知：`,
      `──────────────────────`,
      `📅 活动时间：${date}`,
      `📍 集合场地：${place}`,
      `👥 研学团队：${audience}（预计 ${people} 人）`,
    ];

    if (includeFlow && event.flow) {
      lines.push(`\n⏰【精彩行程安排】\n${event.flow}`);
    }

    if (includePrecautions && event.precautions) {
      lines.push(`\n⚠️【重要行前提醒 & 装备建议】\n${event.precautions}`);
    } else if (includePrecautions) {
      lines.push(
        `\n⚠️【重要行前提醒】\n• 穿戴：请穿耐脏长衣长裤与防滑运动鞋，带防晒草帽。\n• 补水：自备水壶，基地设有温水补水站。\n• 安全：严禁追逐打闹，听从主导师指挥。`
      );
    }

    if (includeMaterials && targetMats.length > 0) {
      lines.push(
        `\n🎒【营地配备物资 & 备齐进度（已备 ${doneCount}/${mats.length}）】`
      );
      targetMats.slice(0, 8).forEach((m) => {
        lines.push(`${m.done ? '✅' : '⏳'} ${m.name}（${m.qty}）${m.note ? ' - ' + m.note : ''}`);
      });
      if (targetMats.length > 8) {
        lines.push(`...（更多物资已在系统统筹中）`);
      }
    }

    if (includeLink) {
      lines.push(
        `\n📲【点击直达日历，实时查看流程与待办清单】：\n${link}`
      );
    }

    lines.push(`\n期待与大家在大自然与稻浪间度过充实难忘的一天！🌾✨`);
    return lines.join('\n');
  }

  if (style === 'mentor') {
    // 🧑‍🏫 带班导师与领队执行版
    const lines = [
      `🚩【导师执行通知】${title}`,
      `请全体带班导师、助教与现场领队认真核对以下任务与时间轴：`,
      `──────────────────────`,
      `🗓 日期：${date} | 📍 场地：${place}`,
      `👥 规模：${audience} 共计 ${people} 人`,
    ];

    if (includeFlow && event.flow) {
      lines.push(`\n⏳【执行时间节点】\n${event.flow}`);
    }

    if (includeMaterials && targetMats.length > 0) {
      lines.push(
        `\n📦【物资筹备 Checklist（共 ${mats.length} 项，已备 ${doneCount} 项）】`
      );
      targetMats.forEach((m, idx) => {
        lines.push(
          `${idx + 1}. [${m.done ? '已备' : '待办'}] ${m.name} × ${m.qty} ${m.note ? '(' + m.note + ')' : ''}`
        );
      });
    }

    if (includePrecautions && event.precautions) {
      lines.push(`\n🛡️【安全风控核心要求】\n${event.precautions}`);
    }

    if (includeLink) {
      lines.push(`\n🔗【现场打勾核对系统】：${link}`);
    }

    lines.push(`\n出团前15分钟全员对讲机 1 频集合点名，确保安全零差错！`);
    return lines.join('\n');
  }

  // 🏡 基地对接与服务保障版
  const lines = [
    `🏡【基地保障协同单】${title}`,
    `基地运营保障团队，请配合做好以下到场接待与物资统筹：`,
    `──────────────────────`,
    `📌 接待日期：${date}`,
    `📌 团队对象：${audience}（人数：${people} 人）`,
    `📌 使用场地：${place}`,
  ];

  if (includeFlow && event.flow) {
    lines.push(`\n⏰【场地及就餐时间表】\n${event.flow}`);
  }

  if (includeMaterials && mats.length > 0) {
    lines.push(`\n📦【需基地协助就位物资】`);
    mats.forEach((m) => {
      lines.push(`• ${m.name}：${m.qty} ${m.note ? '（' + m.note + '）' : ''}`);
    });
  }

  if (includeLink) {
    lines.push(`\n🔗【实时排期看板】：${link}`);
  }

  return lines.join('\n');
}

/**
 * 生成按某一天分享的聚合通报 (具体到某天)
 */
export function smartGenerateDailyWechatText(
  dateStr: string,
  events: ActivityDetail[],
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yanxue-pricing-lab.pages.dev'
): string {
  const count = events.length;
  const totalPeople = events.reduce((s, e) => s + (e.people || 0), 0);
  const link = `${baseUrl}/yanxue-calendar?date=${encodeURIComponent(dateStr)}`;

  const lines = [
    `🌾【江南农耕研学 · 单日出团排期总表】`,
    `📅 排期日期：${dateStr}`,
    `📊 当天场次：共 ${count} 场活动 | 接待总规模：${totalPeople} 人`,
    `──────────────────────`,
  ];

  if (count === 0) {
    lines.push(`今日暂无研学出团排期，团队可进行物资盘点、教案优化或基地维护。`);
  } else {
    events.forEach((ev, idx) => {
      lines.push(`\n🔹【第 ${idx + 1} 场】${ev.name}`);
      lines.push(`   👥 团队：${ev.audience || '未指定'} · ${ev.people || 0}人`);
      lines.push(`   📍 场地：${ev.place || '待定'}`);
      lines.push(`   🏷️ 状态：${ev.status === 'confirmed' ? '已确定' : '待跟进'}`);
      if (ev.flow) {
        const firstLine = ev.flow.split('\n')[0];
        lines.push(`   ⏰ 启动：${firstLine}`);
      }
      if (ev.materials && ev.materials.length > 0) {
        const done = ev.materials.filter((m) => m.done).length;
        lines.push(`   🎒 物资准备：已备 ${done}/${ev.materials.length} 项`);
      }
    });
  }

  lines.push(`\n──────────────────────`);
  lines.push(`📲【点击直达当日排期看板与全员待办】：\n${link}`);
  lines.push(`预祝今日所有场次出团圆满顺利！🌾✨`);

  return lines.join('\n');
}
