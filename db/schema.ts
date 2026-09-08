import {sqliteTable,text,index,integer,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const estimates=sqliteTable('estimates',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),title:text('title').notNull(),planJson:text('plan_json').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('idx_estimates_owner_created').on(t.ownerId,t.createdAt,t.id)]);

export const googleSessions=sqliteTable('google_sessions',{
 tokenHash:text('token_hash').primaryKey(),ownerId:text('owner_id').notNull(),displayName:text('display_name').notNull(),email:text('email').notNull(),expiresAt:integer('expires_at').notNull(),
},t=>[index('idx_google_sessions_expiry').on(t.expiresAt)]);
export const googleChallenges=sqliteTable('google_challenges',{
 nonceHash:text('nonce_hash').primaryKey(),expiresAt:integer('expires_at').notNull(),
},t=>[index('idx_google_challenges_expiry').on(t.expiresAt)]);
export const accountLinks=sqliteTable('account_links',{
 legacyOwner:text('legacy_owner').primaryKey(),googleOwner:text('google_owner').notNull(),linkedAt:text('linked_at').notNull(),
},t=>[uniqueIndex('idx_account_links_google_owner').on(t.googleOwner)]);
