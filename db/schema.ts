import {sqliteTable,text,index,integer,uniqueIndex,real} from 'drizzle-orm/sqlite-core';
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

export const priceCatalogs=sqliteTable('price_catalogs',{
 id:text('id').primaryKey(),ownerId:text('owner_id'),name:text('name').notNull(),source:text('source').notNull(),isActive:integer('is_active',{mode:'boolean'}).notNull().default(true),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('idx_price_catalogs_owner_source').on(t.ownerId,t.source,t.updatedAt)]);

export const priceItems=sqliteTable('price_items',{
 id:text('id').primaryKey(),catalogId:text('catalog_id').notNull(),groupType:text('group_type').notNull(),category:text('category').notNull(),name:text('name').notNull(),mode:text('mode').notNull(),amount:real('amount').notNull(),quantity:real('quantity').notNull().default(1),capacity:integer('capacity').notNull().default(1),minPeople:integer('min_people').notNull().default(0),maxPeople:integer('max_people').notNull().default(10000),actualOnly:integer('actual_only',{mode:'boolean'}).notNull().default(false),note:text('note').notNull().default(''),sortOrder:integer('sort_order').notNull().default(0),
},t=>[index('idx_price_items_catalog_group').on(t.catalogId,t.groupType,t.sortOrder)]);
