import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  postSlug: text('post_slug').notNull(),
  name: text('name').notNull(),
  body: text('body').notNull(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [index('idx_comments_post_created_id').on(table.postSlug, table.createdAt, table.id)]);

export const commentLimits = sqliteTable('comment_limits', {
  key: text('key').primaryKey(),
  hits: integer('hits').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('idx_comment_limits_expiry').on(table.expiresAt)]);
