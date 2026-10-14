import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { canUploadActivityPhotos, canParticipateInReview } from '@/lib/calendar-auth';

export const dynamic = 'force-dynamic';

let schemaReady: Promise<void> | undefined;

async function ensureReviewsSchema(db: ReturnType<typeof getDb>) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS learning_calendar_reviews (
        id TEXT PRIMARY KEY NOT NULL,
        event_id TEXT NOT NULL UNIQUE,
        event_title TEXT NOT NULL,
        event_date TEXT NOT NULL,
        actual_participants INTEGER,
        overall_rating INTEGER DEFAULT 5,
        highlights TEXT NOT NULL DEFAULT '',
        issues TEXT NOT NULL DEFAULT '',
        optimizations TEXT NOT NULL DEFAULT '',
        action_status TEXT NOT NULL DEFAULT 'open',
        updated_by_email TEXT NOT NULL,
        updated_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`).run();

      await db.prepare(`CREATE TABLE IF NOT EXISTS learning_calendar_review_comments (
        id TEXT PRIMARY KEY NOT NULL,
        event_id TEXT NOT NULL,
        review_id TEXT NOT NULL,
        author_email TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_role TEXT NOT NULL DEFAULT 'member',
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'optimization',
        created_at TEXT NOT NULL
      )`).run();

      await db.prepare(`CREATE TABLE IF NOT EXISTS learning_calendar_photos (
        id TEXT PRIMARY KEY NOT NULL,
        event_id TEXT NOT NULL,
        event_date TEXT NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        uploaded_by_email TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`).run();

      await db.prepare('CREATE INDEX IF NOT EXISTS idx_learning_calendar_reviews_date ON learning_calendar_reviews(event_date DESC)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_learning_calendar_reviews_status ON learning_calendar_reviews(action_status)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_learning_calendar_review_comments_event ON learning_calendar_review_comments(event_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_learning_calendar_photos_event ON learning_calendar_photos(event_id)').run();
    })();
  }
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = undefined;
    throw error;
  }
}

// GET: 获取单场活动复盘详情，或获取「活动复盘中心」全量列表
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    await ensureReviewsSchema(db);

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const statusFilter = searchParams.get('status'); // 'all' | 'open' | 'in_progress' | 'resolved'

    // 1. 获取单场活动的复盘详情
    if (eventId) {
      const review = await db
        .prepare('SELECT * FROM learning_calendar_reviews WHERE event_id = ?')
        .bind(eventId)
        .first();

      const comments = await db
        .prepare('SELECT * FROM learning_calendar_review_comments WHERE event_id = ? ORDER BY created_at ASC')
        .bind(eventId)
        .all();

      const photos = await db
        .prepare('SELECT * FROM learning_calendar_photos WHERE event_id = ? ORDER BY created_at DESC')
        .bind(eventId)
        .all();

      return NextResponse.json({
        review: review ?? null,
        comments: comments?.results ?? [],
        photos: photos?.results ?? [],
      });
    }

    // 2. 获取复盘中心全量列表
    let query = `
      SELECT 
        r.*,
        (SELECT COUNT(*) FROM learning_calendar_review_comments c WHERE c.event_id = r.event_id) AS comment_count,
        (SELECT COUNT(*) FROM learning_calendar_photos p WHERE p.event_id = r.event_id) AS photo_count,
        (SELECT p.image_url FROM learning_calendar_photos p WHERE p.event_id = r.event_id ORDER BY p.created_at DESC LIMIT 1) AS cover_photo
      FROM learning_calendar_reviews r
    `;

    if (statusFilter && statusFilter !== 'all') {
      query += ` WHERE r.action_status = '${statusFilter.replace(/'/g, '')}'`;
    }

    query += ' ORDER BY r.event_date DESC, r.updated_at DESC';

    const list = await db.prepare(query).all();
    return NextResponse.json({ items: list?.results ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取复盘数据失败' },
      { status: 500 }
    );
  }
}

// POST: 保存复盘记录 / 发表团队讨论 / 上传活动照片（照片与删除仅限管理员）
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    await ensureReviewsSchema(db);

    const body = (await req.json()) as Record<string, any>;
    const { action, userEmail, userName } = body;
    const nowIso = new Date().toISOString();

    if (!canParticipateInReview(userEmail)) {
      return NextResponse.json({ error: '请先登录团队账号后再进行复盘操作' }, { status: 401 });
    }

    // 动作 1: 管理员上传活动照片（严格前后端双重拦截）
    if (action === 'upload_photo') {
      if (!canUploadActivityPhotos(userEmail)) {
        return NextResponse.json(
          { error: '权限不足：仅项目主管理员本人可以上传活动现场照片' },
          { status: 403 }
        );
      }
      const { eventId, eventDate, imageUrl, caption } = body;
      if (!eventId || !imageUrl) {
        return NextResponse.json({ error: '缺少活动 ID 或图片内容' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO learning_calendar_photos 
            (id, event_id, event_date, image_url, caption, uploaded_by_email, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, eventId, eventDate || '', imageUrl, caption || '', userEmail, nowIso)
        .run();

      return NextResponse.json({ ok: true, id });
    }

    // 动作 2: 管理员删除活动照片（严格权限拦截）
    if (action === 'delete_photo') {
      if (!canUploadActivityPhotos(userEmail)) {
        return NextResponse.json(
          { error: '权限不足：仅项目主管理员本人可以删除活动照片' },
          { status: 403 }
        );
      }
      const { photoId } = body;
      if (!photoId) {
        return NextResponse.json({ error: '缺少照片 ID' }, { status: 400 });
      }

      await db.prepare('DELETE FROM learning_calendar_photos WHERE id = ?').bind(photoId).run();
      return NextResponse.json({ ok: true });
    }

    // 动作 3: 保存或更新活动执行复盘总结 (KPT结构)
    if (action === 'upsert_review') {
      const {
        eventId,
        eventTitle,
        eventDate,
        actualParticipants,
        overallRating,
        highlights,
        issues,
        optimizations,
        actionStatus,
      } = body;

      if (!eventId || !eventTitle) {
        return NextResponse.json({ error: '缺少活动 ID 或名称' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO learning_calendar_reviews (
            id, event_id, event_title, event_date, actual_participants, overall_rating,
            highlights, issues, optimizations, action_status,
            updated_by_email, updated_by_name, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(event_id) DO UPDATE SET
            event_title = excluded.event_title,
            event_date = excluded.event_date,
            actual_participants = excluded.actual_participants,
            overall_rating = excluded.overall_rating,
            highlights = excluded.highlights,
            issues = excluded.issues,
            optimizations = excluded.optimizations,
            action_status = excluded.action_status,
            updated_by_email = excluded.updated_by_email,
            updated_by_name = excluded.updated_by_name,
            updated_at = excluded.updated_at`
        )
        .bind(
          id,
          eventId,
          eventTitle,
          eventDate || '',
          actualParticipants === null || actualParticipants === undefined || actualParticipants === ''
            ? null
            : Number(actualParticipants),
          Number(overallRating ?? 5),
          highlights || '',
          issues || '',
          optimizations || '',
          actionStatus || 'open',
          userEmail,
          userName || userEmail,
          nowIso,
          nowIso
        )
        .run();

      return NextResponse.json({ ok: true });
    }

    // 动作 4: 团队成员发表优化讨论评论
    if (action === 'add_comment') {
      const { eventId, reviewId, content, category } = body;
      if (!eventId || !content?.trim()) {
        return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const role = canUploadActivityPhotos(userEmail) ? 'admin' : 'member';

      await db
        .prepare(
          `INSERT INTO learning_calendar_review_comments (
            id, event_id, review_id, author_email, author_name, author_role, content, category, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          eventId,
          reviewId || eventId,
          userEmail,
          userName || userEmail,
          role,
          content.trim(),
          category || 'optimization',
          nowIso
        )
        .run();

      return NextResponse.json({ ok: true, id });
    }

    return NextResponse.json({ error: '未知操作类型' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '执行操作失败' },
      { status: 500 }
    );
  }
}
