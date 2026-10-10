/**
 * iCalendar (RFC 5545) 工具模块
 * 用于生成手机（iOS / Android）及电脑（Mac 日历 / Windows 日历 / Google Calendar / Outlook）原生识别的 .ics 日历文件
 * 支持日程提醒闹钟（提前1天、提前2小时弹窗通知）
 */

export interface CalendarEventItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  audience?: string;
  people?: number;
  place?: string;
  status?: string;
  flow?: string;
  materials?: Array<{ name: string; done?: boolean }>;
  note?: string;
}

function formatDateToICS(dateStr: string, timeStr = '090000'): string {
  // dateStr: YYYY-MM-DD -> YYYYMMDDT090000
  const clean = dateStr.replace(/-/g, '');
  return `${clean}T${timeStr}`;
}

function formatEndDateToICS(dateStr: string, timeStr = '170000'): string {
  const clean = dateStr.replace(/-/g, '');
  return `${clean}T${timeStr}`;
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * 将单个活动对象转换为 ICS VEVENT 格式
 */
export function generateSingleEventICS(event: CalendarEventItem): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  const dtStart = formatDateToICS(event.date, '090000');
  const dtEnd = formatEndDateToICS(event.date, '170000');
  const uid = `yanxue-${event.id || Date.now()}@yanxue-pricing-lab.pages.dev`;

  const summary = `【农耕研学】${event.name}`;
  const location = event.place || '江南农耕文化园研学基地';

  // 拼接详情说明
  const details = [
    `活动名称：${event.name}`,
    `活动日期：${event.date}`,
    `活动场地：${location}`,
    `参与人群：${event.audience || '未指定'}（预计 ${event.people || 0} 人）`,
    event.flow ? `\n【行程流程】\n${event.flow}` : '',
    event.materials && event.materials.length > 0
      ? `\n【准备物资清单】\n${event.materials.map((m) => `• [${m.done ? '已备' : '待备'}] ${m.name}`).join('\n')}`
      : '',
    event.note ? `\n【特别备注】\n${event.note}` : '',
    `\n---\n来自江南农耕研学数字化运营工作台`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jiangnan Yanxue Operations Hub//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:江南农耕研学排期',
    'X-WR-TIMEZONE:Asia/Shanghai',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(details)}`,
    `LOCATION:${escapeICS(location)}`,
    'STATUS:CONFIRMED',
    // 闹钟 1：提前 1 天早上 09:00 弹窗提醒备货与确认
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:研学出团提醒：明天即将开展“${escapeICS(event.name)}”，请核验物资与场地！`,
    'END:VALARM',
    // 闹钟 2：活动当天提前 2 小时提醒集合
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:研学即将开始：活动“${escapeICS(event.name)}”将于2小时后启动，请就位！`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * 触发浏览器端下载单个活动 .ics 文件
 */
export function downloadEventICS(event: CalendarEventItem) {
  const content = generateSingleEventICS(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `研学日程-${event.date}-${event.name.replace(/[\\/:*?"<>|]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 触发浏览器端下载整月或全部活动的合并 .ics 文件
 */
export function downloadBatchICS(events: CalendarEventItem[], title = '研学排期日历') {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  const vevents = events.map((event) => {
    const dtStart = formatDateToICS(event.date, '090000');
    const dtEnd = formatEndDateToICS(event.date, '170000');
    const uid = `yanxue-${event.id || Math.random()}@yanxue-pricing-lab.pages.dev`;
    const summary = `【农耕研学】${event.name}`;
    const location = event.place || '江南农耕文化园研学基地';

    const details = [
      `活动名称：${event.name}`,
      `活动日期：${event.date}`,
      `场地：${location}`,
      `人数：${event.people || 0} 人`,
      event.flow ? `流程：${event.flow}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(summary)}`,
      `DESCRIPTION:${escapeICS(details)}`,
      `LOCATION:${escapeICS(location)}`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:研学出团提醒：明天即将开展“${escapeICS(event.name)}”`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  const fullContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jiangnan Yanxue Operations Hub//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(title)}`,
    'X-WR-TIMEZONE:Asia/Shanghai',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([fullContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
