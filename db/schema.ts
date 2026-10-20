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
 version:integer('version').notNull().default(1),importHash:text('import_hash').notNull().default(''),
 id:text('id').primaryKey(),ownerId:text('owner_id'),name:text('name').notNull(),source:text('source').notNull(),isActive:integer('is_active',{mode:'boolean'}).notNull().default(true),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('idx_price_catalogs_owner_source').on(t.ownerId,t.source,t.updatedAt)]);

export const priceItems=sqliteTable('price_items',{
 projectName:text('project_name').notNull().default(''),validFrom:text('valid_from').notNull().default(''),validTo:text('valid_to').notNull().default(''),
 id:text('id').primaryKey(),catalogId:text('catalog_id').notNull(),groupType:text('group_type').notNull(),category:text('category').notNull(),name:text('name').notNull(),mode:text('mode').notNull(),amount:real('amount').notNull(),quantity:real('quantity').notNull().default(1),capacity:integer('capacity').notNull().default(1),minPeople:integer('min_people').notNull().default(0),maxPeople:integer('max_people').notNull().default(10000),actualOnly:integer('actual_only',{mode:'boolean'}).notNull().default(false),note:text('note').notNull().default(''),sortOrder:integer('sort_order').notNull().default(0),
},t=>[index('idx_price_items_catalog_group').on(t.catalogId,t.groupType,t.sortOrder)]);

export const schemeDocuments = sqliteTable('scheme_documents', {
 id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), title: text('title').notNull(),
 fileName: text('file_name').notNull(), fileType: text('file_type').notNull(), rawText: text('raw_text').notNull(),
 createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [index('idx_scheme_documents_owner_created').on(t.ownerId, t.createdAt, t.id)]);

export const schemeAnalyses = sqliteTable('scheme_analyses', {
 id: text('id').primaryKey(),
 schemeDocumentId: text('scheme_document_id').notNull(),
 ownerId: text('owner_id').notNull(),
 analysisJson: text('analysis_json').notNull(),
 model: text('model').notNull(),
 promptVersion: text('prompt_version').notNull(),
 sourceTextHash: text('source_text_hash').notNull(),
 createdAt: text('created_at').notNull(),
}, t => [index('idx_scheme_analyses_owner_document_created').on(t.ownerId, t.schemeDocumentId, t.createdAt)]);

export const schemeCostEstimates = sqliteTable('scheme_cost_estimates', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  schemeDocumentId: text('scheme_document_id').notNull(),
  schemeAnalysisId: text('scheme_analysis_id').notNull(),
  priceSource: text('price_source').notNull(),
  matchJson: text('match_json').notNull(),
  knownCostTotal: real('known_cost_total').notNull(),
  unresolvedCount: integer('unresolved_count').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, t => [
  index('idx_scheme_cost_estimates_owner_scheme_updated').on(t.ownerId, t.schemeDocumentId, t.updatedAt),
  index('idx_scheme_cost_estimates_owner_analysis_created').on(t.ownerId, t.schemeAnalysisId, t.createdAt),
]);

export const activityCostTemplates = sqliteTable('activity_cost_templates', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  activityName: text('activity_name').notNull(),
  normalizedActivityName: text('normalized_activity_name').notNull(),
  groupType: text('group_type').notNull().default(''),
  costName: text('cost_name').notNull(),
  normalizedCostName: text('normalized_cost_name').notNull(),
  category: text('category').notNull(),
  billingHint: text('billing_hint').notNull(),
  requiredness: text('requiredness').notNull(),
  confidenceScore: real('confidence_score').notNull().default(0),
  positiveCount: integer('positive_count').notNull().default(0),
  negativeCount: integer('negative_count').notNull().default(0),
  isDisabled: integer('is_disabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('idx_activity_cost_templates_owner_relation').on(
    t.ownerId,
    t.normalizedActivityName,
    t.normalizedCostName,
    t.groupType,
  ),
  index('idx_activity_cost_templates_owner_activity').on(
    t.ownerId,
    t.normalizedActivityName,
    t.positiveCount,
  ),
]);

export const schemeLearningFeedback = sqliteTable('scheme_learning_feedback', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  schemeDocumentId: text('scheme_document_id').notNull(),
  schemeAnalysisId: text('scheme_analysis_id').notNull(),
  schemeCostEstimateId: text('scheme_cost_estimate_id').notNull(),
  learningBatchId: text('learning_batch_id').notNull(),
  itemKey: text('item_key').notNull(),
  action: text('action').notNull(),
  activityName: text('activity_name').notNull(),
  normalizedActivityName: text('normalized_activity_name').notNull(),
  originalCostName: text('original_cost_name').notNull(),
  finalCostName: text('final_cost_name').notNull(),
  normalizedCostName: text('normalized_cost_name').notNull(),
  category: text('category').notNull(),
  billingHint: text('billing_hint').notNull(),
  requiredness: text('requiredness').notNull(),
  groupType: text('group_type').notNull().default(''),
  source: text('source').notNull(),
  priceItemId: text('price_item_id'),
  quantity: real('quantity'),
  unit: text('unit'),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull(),
  revokedAt: text('revoked_at'),
}, (t) => [
  index('idx_scheme_learning_feedback_owner_batch').on(t.ownerId, t.learningBatchId, t.createdAt),
  index('idx_scheme_learning_feedback_owner_relation').on(
    t.ownerId,
    t.normalizedActivityName,
    t.normalizedCostName,
  ),
  index('idx_scheme_learning_feedback_owner_scheme').on(
    t.ownerId,
    t.schemeDocumentId,
    t.createdAt,
  ),
]);

export const schemeConfirmedCosts = sqliteTable('scheme_confirmed_costs', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  schemeDocumentId: text('scheme_document_id').notNull(),
  schemeAnalysisId: text('scheme_analysis_id').notNull(),
  schemeCostEstimateId: text('scheme_cost_estimate_id').notNull(),
  confirmationBatchId: text('confirmation_batch_id').notNull(),
  itemKey: text('item_key').notNull(),
  activityName: text('activity_name').notNull(),
  normalizedActivityName: text('normalized_activity_name').notNull(),
  costName: text('cost_name').notNull(),
  normalizedCostName: text('normalized_cost_name').notNull(),
  category: text('category').notNull(),
  billingHint: text('billing_hint').notNull(),
  requiredness: text('requiredness').notNull(),
  groupType: text('group_type').notNull().default(''),
  source: text('source').notNull(),
  priceItemId: text('price_item_id'),
  quantity: real('quantity'),
  unit: text('unit'),
  adopted: integer('adopted', { mode: 'boolean' }).notNull(),
  note: text('note').notNull().default(''),
  confirmedAt: text('confirmed_at').notNull(),
  revokedAt: text('revoked_at'),
}, (t) => [
  index('idx_scheme_confirmed_costs_owner_batch').on(t.ownerId, t.confirmationBatchId),
  index('idx_scheme_confirmed_costs_owner_scheme').on(
    t.ownerId,
    t.schemeDocumentId,
    t.confirmedAt,
  ),
]);

export const activityAliases = sqliteTable('activity_aliases', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  aliasName: text('alias_name').notNull(),
  normalizedAliasName: text('normalized_alias_name').notNull(),
  canonicalName: text('canonical_name').notNull(),
  normalizedCanonicalName: text('normalized_canonical_name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('idx_activity_aliases_owner_alias').on(t.ownerId, t.normalizedAliasName),
  index('idx_activity_aliases_owner_canonical').on(t.ownerId, t.normalizedCanonicalName),
]);

export const activityAliasFeedback = sqliteTable('activity_alias_feedback', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  activityName: text('activity_name').notNull(),
  normalizedActivityName: text('normalized_activity_name').notNull(),
  candidateName: text('candidate_name').notNull(),
  normalizedCandidateName: text('normalized_candidate_name').notNull(),
  decision: text('decision'),
  source: text('source').notNull().default('deterministic'),
  confidence: real('confidence'),
  reason: text('reason').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('idx_activity_alias_feedback_owner_pair').on(
    t.ownerId,
    t.normalizedActivityName,
    t.normalizedCandidateName,
  ),
  index('idx_activity_alias_feedback_owner_activity').on(
    t.ownerId,
    t.normalizedActivityName,
    t.decision,
  ),
]);

export const costPriceAliases = sqliteTable('cost_price_aliases', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  costName: text('cost_name').notNull(),
  normalizedCostName: text('normalized_cost_name').notNull(),
  priceItemId: text('price_item_id').notNull(),
  positiveCount: integer('positive_count').notNull().default(0),
  negativeCount: integer('negative_count').notNull().default(0),
  isDisabled: integer('is_disabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('idx_cost_price_aliases_owner_relation').on(
    t.ownerId,
    t.normalizedCostName,
    t.priceItemId,
  ),
  index('idx_cost_price_aliases_owner_cost').on(t.ownerId, t.normalizedCostName),
]);


export const learningCalendarEvents = sqliteTable('learning_calendar_events', {
  id: text('id').primaryKey(),
  eventDate: text('event_date').notNull(),
  name: text('name').notNull(),
  audience: text('audience').notNull().default(''),
  people: integer('people').notNull().default(0),
  place: text('place').notNull().default(''),
  status: text('status').notNull().default('pending'),
  flow: text('flow').notNull().default(''),
  materialsJson: text('materials_json').notNull().default('[]'),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, t => [index('idx_learning_calendar_events_date').on(t.eventDate), index('idx_learning_calendar_events_status_date').on(t.status,t.eventDate)]);

export const learningCalendarReviews = sqliteTable('learning_calendar_reviews', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  eventTitle: text('event_title').notNull(),
  eventDate: text('event_date').notNull(),
  actualParticipants: integer('actual_participants'),
  overallRating: integer('overall_rating').default(5),
  highlights: text('highlights').notNull().default(''),
  issues: text('issues').notNull().default(''),
  optimizations: text('optimizations').notNull().default(''),
  actionStatus: text('action_status').notNull().default('open'),
  updatedByEmail: text('updated_by_email').notNull(),
  updatedByName: text('updated_by_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, t => [
  index('idx_learning_calendar_reviews_date').on(t.eventDate),
  index('idx_learning_calendar_reviews_status').on(t.actionStatus),
]);

export const learningCalendarReviewComments = sqliteTable('learning_calendar_review_comments', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull(),
  reviewId: text('review_id').notNull(),
  authorEmail: text('author_email').notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull().default('member'),
  content: text('content').notNull(),
  category: text('category').notNull().default('optimization'),
  createdAt: text('created_at').notNull(),
}, t => [
  index('idx_learning_calendar_review_comments_event').on(t.eventId),
  index('idx_learning_calendar_review_comments_review').on(t.reviewId),
]);

export const learningCalendarPhotos = sqliteTable('learning_calendar_photos', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull(),
  eventDate: text('event_date').notNull(),
  imageUrl: text('image_url').notNull(),
  caption: text('caption').notNull().default(''),
  uploadedByEmail: text('uploaded_by_email').notNull(),
  createdAt: text('created_at').notNull(),
}, t => [
  index('idx_learning_calendar_photos_event').on(t.eventId),
  index('idx_learning_calendar_photos_date').on(t.eventDate),
]);


export const learningWarehouseMaterials = sqliteTable('learning_warehouse_materials', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  zone: text('zone').notNull().default(''),
  category: text('category').notNull().default('常规物资'),
  quantity: real('quantity').notNull().default(0),
  unit: text('unit').notNull().default('件'),
  safeQuantity: real('safe_quantity').notNull().default(0),
  specification: text('specification').notNull().default(''),
  unitPrice: real('unit_price').notNull().default(0),
  supplier: text('supplier').notNull().default(''),
  status: text('status').notNull().default('normal'),
  note: text('note').notNull().default(''),
  updatedByEmail: text('updated_by_email').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('idx_learning_warehouse_materials_name').on(t.name),
  index('idx_learning_warehouse_materials_zone').on(t.zone),
  index('idx_learning_warehouse_materials_category').on(t.category),
]);
