import { authReply, sameOrigin, type GoogleUser } from './google-auth';
import { isPriceAdmin } from './price-library';
import {
  DEFAULT_AI_ANALYSIS_MODEL,
  DEFAULT_OPENAI_API_BASE,
} from './scheme-analyzer';

const TABLES = [
  'estimates',
  'google_sessions',
  'price_catalogs',
  'price_items',
  'scheme_documents',
  'scheme_analyses',
  'scheme_cost_estimates',
  'activity_cost_templates',
  'scheme_learning_feedback',
  'scheme_confirmed_costs',
  'activity_aliases',
  'activity_alias_feedback',
  'cost_price_aliases',
] as const;

const MIGRATION_HINTS: Record<string, string> = {
  scheme_analyses: '需要执行 0005_careful_jean_grey.sql',
  scheme_cost_estimates: '需要执行 0006_organic_micromax.sql',
  activity_cost_templates: '需要执行 0007_faulty_arclight.sql',
  scheme_learning_feedback: '需要执行 0007_faulty_arclight.sql',
  scheme_confirmed_costs: '需要执行 0007_faulty_arclight.sql',
  activity_aliases: '需要执行 0007_faulty_arclight.sql',
  activity_alias_feedback: '需要执行 0008_last_edwin_jarvis.sql',
  cost_price_aliases: '需要执行 0007_faulty_arclight.sql',
};

type CheckEnv = {
  DB?: D1Database;
  GOOGLE_CLIENT_ID?: string;
  PRICE_ADMIN_EMAILS?: string;
  OPENAI_API_KEY?: string;
  AI_ANALYSIS_MODEL?: string;
  OPENAI_API_BASE?: string;
};

type CheckOptions = {
  env: CheckEnv;
  isAdmin?: (user: GoogleUser) => boolean;
};

function configured(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname.length > 0;
  } catch {
    return false;
  }
}

function status(ready: boolean, message: string) {
  return { status: ready ? 'ready' : 'not_ready', message };
}

async function readDatabase(db: D1Database) {
  await db.prepare('SELECT 1 AS ok').bind().first<{ ok: number }>();
  const placeholders = TABLES.map(() => '?').join(',');
  const result = await db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`,
    )
    .bind(...TABLES)
    .all<{ name: string }>();
  const present = new Set(result.results.map((row) => row.name));
  return Object.fromEntries(TABLES.map((name) => [name, present.has(name)])) as Record<
    (typeof TABLES)[number],
    boolean
  >;
}

export async function systemCheckRequest(
  request: Request,
  user: GoogleUser | null,
  options: CheckOptions,
) {
  if (!user) return authReply({ error: '请先登录后查看系统检查' }, 401);
  if (!(options.isAdmin ?? (() => isPriceAdmin(user, options.env.PRICE_ADMIN_EMAILS)))(user))
    return authReply({ error: '没有查看系统检查的权限' }, 403);
  if (request.method !== 'GET') return authReply({ error: '不支持的操作' }, 405);
  if (!sameOrigin(request)) return authReply({ error: '请求来源无效' }, 403);

  const env = options.env;
  const hasDbBinding = !!env.DB;
  let tables = Object.fromEntries(TABLES.map((name) => [name, false])) as Record<
    (typeof TABLES)[number],
    boolean
  >;
  let queryOk = false;
  if (env.DB) {
    try {
      tables = await readDatabase(env.DB);
      queryOk = true;
    } catch {
      return authReply(
        {
          error: '系统检查暂不可用，请稍后重试',
          configuration: {
            google: { configured: configured(env.GOOGLE_CLIENT_ID) },
            openai: {
              apiKeyConfigured: configured(env.OPENAI_API_KEY),
              model: env.AI_ANALYSIS_MODEL?.trim() || DEFAULT_AI_ANALYSIS_MODEL,
              apiConfigured: validUrl(env.OPENAI_API_BASE?.trim() || DEFAULT_OPENAI_API_BASE),
            },
            db: { bindingConfigured: hasDbBinding, queryOk: false },
          },
        },
        503,
      );
    }
  }

  const all = (names: readonly string[]) => names.every((name) => tables[name as keyof typeof tables]);
  const openaiConfigured = configured(env.OPENAI_API_KEY);
  const apiConfigured = validUrl(env.OPENAI_API_BASE?.trim() || DEFAULT_OPENAI_API_BASE);
  const migrationHints = TABLES.filter((name) => !tables[name])
    .map((name) => MIGRATION_HINTS[name])
    .filter((hint, index, list): hint is string => !!hint && list.indexOf(hint) === index);

  return authReply({
    checkedAt: new Date().toISOString(),
    configuration: {
      google: { configured: configured(env.GOOGLE_CLIENT_ID) },
      openai: {
        apiKeyConfigured: openaiConfigured,
        model: env.AI_ANALYSIS_MODEL?.trim() || DEFAULT_AI_ANALYSIS_MODEL,
        apiConfigured,
        usingDefaultApi: !configured(env.OPENAI_API_BASE),
      },
      db: { bindingConfigured: hasDbBinding, queryOk },
    },
    tables: Object.fromEntries(
      TABLES.map((name) => [
        name,
        { present: tables[name], migrationHint: tables[name] ? null : MIGRATION_HINTS[name] ?? null },
      ]),
    ),
    services: {
      schemeImport: status(
        tables.scheme_documents,
        tables.scheme_documents ? '方案导入服务可用' : '缺少 scheme_documents 表',
      ),
      aiAnalysis: status(
        openaiConfigured && apiConfigured,
        openaiConfigured && apiConfigured
          ? 'AI Provider 配置可初始化，未发送测试请求'
          : '缺少有效的 OpenAI 配置',
      ),
      priceMatching: status(
        all(['price_catalogs', 'price_items']),
        all(['price_catalogs', 'price_items']) ? '价格匹配服务可用' : '缺少价格库表',
      ),
      learning: status(
        all([
          'activity_cost_templates',
          'scheme_learning_feedback',
          'scheme_confirmed_costs',
          'activity_aliases',
          'activity_alias_feedback',
          'cost_price_aliases',
        ]),
        all([
          'activity_cost_templates',
          'scheme_learning_feedback',
          'scheme_confirmed_costs',
          'activity_aliases',
          'activity_alias_feedback',
          'cost_price_aliases',
        ])
          ? '学习服务可用'
          : '缺少学习相关表',
      ),
      estimateHistory: status(
        tables.estimates,
        tables.estimates ? '历史估算服务可用' : '缺少 estimates 表',
      ),
    },
    migrationHints,
  });
}
