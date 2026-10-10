import { authReply, getGoogleUser, sameOrigin } from '@/lib/google-auth';
import { getDb } from '@/db';

export const dynamic = 'force-dynamic';

let reminderSchemaReady: Promise<void> | undefined;

async function ensureRemindersSchema(db: ReturnType<typeof getDb>) {
  if (!reminderSchemaReady) {
    reminderSchemaReady = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS learning_event_reminders (
        id TEXT PRIMARY KEY NOT NULL,
        event_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        event_date TEXT NOT NULL,
        target_emails TEXT NOT NULL,
        remind_before_days INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'scheduled',
        last_notified_at TEXT,
        created_at TEXT NOT NULL
      )`).run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_learning_event_reminders_date ON learning_event_reminders(event_date)').run();
    })();
  }
  try {
    await reminderSchemaReady;
  } catch (error) {
    reminderSchemaReady = undefined;
    throw error;
  }
}

async function handle(request: Request) {
  try {
    const db = getDb();
    await ensureRemindersSchema(db);
    const method = request.method.toUpperCase();

    // GET: 获取活动的提醒配置记录
    if (method === 'GET') {
      const url = new URL(request.url);
      const eventId = url.searchParams.get('eventId');
      if (eventId) {
        const row = await db
          .prepare('SELECT * FROM learning_event_reminders WHERE event_id = ? ORDER BY created_at DESC LIMIT 1')
          .bind(eventId)
          .first();
        return authReply({ reminder: row });
      }
      const rows = await db
        .prepare('SELECT * FROM learning_event_reminders ORDER BY event_date ASC, created_at DESC LIMIT 50')
        .all();
      return authReply({ reminders: rows.results ?? [] });
    }

    if (!sameOrigin(request)) {
      return authReply({ error: '请求来源无效' }, 403);
    }

    const user = await getGoogleUser(request, getDb);
    if (!user) {
      return authReply({ error: '请先登录管理员账号' }, 401);
    }

    // POST: 创建/更新活动邮件提醒
    if (method === 'POST') {
      if (!request.headers.get('content-type')?.startsWith('application/json')) {
        return authReply({ error: '请求格式无效' }, 415);
      }
      const body = (await request.json()) as Record<string, unknown>;
      const eventId = String(body.eventId ?? '');
      const eventName = String(body.eventName ?? '').trim();
      const eventDate = String(body.eventDate ?? '').trim();
      const targetEmails = String(body.targetEmails ?? '').trim();
      const remindBeforeDays = Number(body.remindBeforeDays ?? 1) || 1;

      if (!eventId || !eventName || !eventDate || !targetEmails) {
        return authReply({ error: '请填写活动信息及提醒接收人邮箱' }, 400);
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await db
        .prepare(
          `INSERT INTO learning_event_reminders (id, event_id, event_name, event_date, target_emails, remind_before_days, status, last_notified_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`
        )
        .bind(id, eventId, eventName, eventDate, targetEmails, remindBeforeDays, now, now)
        .run();

      // 构建邮件模版
      const emailSubject = encodeURIComponent(`【江南农耕研学】活动预约提醒：${eventName}（${eventDate}）`);
      const emailBody = encodeURIComponent(
        `各位老师/团队成员：\n\n` +
          `江南农耕文化园研学工作台提醒您，活动【${eventName}】将于 ${eventDate} 开展。\n\n` +
          `• 活动日期：${eventDate}\n` +
          `• 场地：${String(body.place ?? '文化园基地')}\n` +
          `• 参与人数：${String(body.people ?? '按排期确定')} 人\n\n` +
          `请提前清点研学教具、水靴、镰刀及手工物料包，核对车辆入园时间与安全预案。\n\n` +
          `研学运营工作台祝活动圆满顺利！\n` +
          `---\n` +
          `江南农耕研学 · OPERATIONS HUB`
      );

      const mailtoUrl = `mailto:${encodeURIComponent(targetEmails)}?subject=${emailSubject}&body=${emailBody}`;

      return authReply({
        ok: true,
        reminderId: id,
        mailtoUrl,
        message: '预约提醒已成功记录！',
      });
    }

    return authReply({ error: '不支持的方法' }, 405);
  } catch (error) {
    return authReply(
      { error: error instanceof Error ? error.message : '邮件提醒服务暂不可用' },
      500
    );
  }
}

export { handle as GET, handle as POST };
