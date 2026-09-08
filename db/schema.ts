import {sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const estimates=sqliteTable('estimates',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),title:text('title').notNull(),planJson:text('plan_json').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('idx_estimates_owner_created').on(t.ownerId,t.createdAt,t.id)]);
