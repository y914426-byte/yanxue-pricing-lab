declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    GOOGLE_CLIENT_ID?: string;
    PRICE_ADMIN_EMAILS?: string;
    OPENAI_API_KEY?: string;
    AI_ANALYSIS_MODEL?: string;
    OPENAI_API_BASE?: string;
  }
}

