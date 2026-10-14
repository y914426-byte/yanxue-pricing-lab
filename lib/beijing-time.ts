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

/**
 * 获取当前东八区（北京时间）的 YYYY-MM-DD 与 HH:mm
 */
export function getShanghaiNow(): { dateStr: string; timeStr: string } {
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return {
      dateStr: `${map.year}-${map.month}-${map.day}`,
      timeStr: `${map.hour}:${map.minute}`,
    };
  } catch {
    const today = getBeijingToday();
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return {
      dateStr: today,
      timeStr: `${hours}:${minutes}`,
    };
  }
}

/**
 * 判断日历中的某场活动是否已经结束（用于展示“活动复盘”与“上传照片”入口）
 * @param eventDate 活动日期 YYYY-MM-DD
 * @param endTime 可选活动结束时间 HH:mm（如未提供，则默认为当天 17:30 以后或按日期判断）
 * @param status 可选活动状态字段（如 completed 或 '已结束'）
 */
export function isActivityCompleted(
  eventDate: string,
  endTime?: string | null,
  status?: string | null
): boolean {
  if (status === 'completed' || status === '已完成' || status === '已结束') return true;
  if (!eventDate) return false;

  const { dateStr: todayShanghai, timeStr: nowTimeShanghai } = getShanghaiNow();

  // 昨天及以前的活动（如昨天的活动）直接判定为已结束
  if (eventDate < todayShanghai) return true;

  // 今天的活动，若已指定结束时间且当前时间已超过该结束时间，判定为已结束
  if (eventDate === todayShanghai && endTime) {
    return nowTimeShanghai >= endTime;
  }

  return false;
}
