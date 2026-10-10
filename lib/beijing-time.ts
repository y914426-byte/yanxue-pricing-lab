/**
 * 东八区（北京时间 Asia/Shanghai, UTC+8）日期与时间工具函数
 * 确保全站活动日历、排期、运营速览与物资中心严格以北京时间记录与计算，
 * 彻底杜绝使用 new Date().toISOString() 导致在凌晨 00:00~08:00 判定为昨天的跨时区 Bug。
 */

/**
 * 获取东八区（北京时间）日期字符串 (YYYY-MM-DD)
 * @param date 可选指定日期，默认当前时间
 * @returns 形如 "2026-10-11"
 */
export function getBeijingToday(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    // 降级方案：手动加 8 小时偏移
    const beijingTime = new Date(date.getTime() + 8 * 3600 * 1000);
    return beijingTime.toISOString().slice(0, 10);
  }
}

/**
 * 获取东八区（北京时间）月份字符串 (YYYY-MM)
 * @param date 可选指定日期，默认当前时间
 * @returns 形如 "2026-10"
 */
export function getBeijingMonth(date: Date = new Date()): string {
  return getBeijingToday(date).slice(0, 7);
}

/**
 * 获取东八区（北京时间）的完整时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function getBeijingDateTimeString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(date).replace(/\//g, '-');
  } catch {
    const beijingTime = new Date(date.getTime() + 8 * 3600 * 1000);
    return beijingTime.toISOString().replace('T', ' ').slice(0, 19);
  }
}

/**
 * 解析并判断给定的日期字符串是否为东八区的“今天”
 */
export function isBeijingToday(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr === getBeijingToday();
}
