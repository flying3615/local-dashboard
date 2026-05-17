import { z } from "zod";

export const itemTypeSchema = z.enum([
  "property_listing",
  "school_profile",
  "school_event",
  "council_notice",
  "local_news",
  "community_event",
  "transport_alert",
  "manual_note",
]);

export const trustLevelSchema = z.enum([
  "official",
  "platform",
  "media",
  "manual",
]);

export const itemStatusSchema = z.enum([
  "new",
  "reviewed",
  "watching",
  "ignored",
  "done",
]);

export const watchStatusSchema = z.enum([
  "new",
  "watching",
  "visited",
  "ignored",
  "shortlist",
  "done",
]);

export const sourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  url: z.string().url(),
  trustLevel: trustLevelSchema,
  enabled: z.boolean(),
  refreshIntervalMinutes: z.number().int().positive(),
  lastSuccessAt: z.string().nullable(),
  lastError: z.string().nullable(),
});

export const rawSnapshotSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  fetchedAt: z.string().min(1),
  url: z.string().url(),
  contentHash: z.string().min(1),
  rawPayload: z.unknown(),
});

export const itemSchema = z.object({
  id: z.string().min(1),
  type: itemTypeSchema,
  title: z.string().min(1),
  summary: z.string(),
  sourceId: z.string().min(1),
  sourceUrl: z.string().url(),
  area: z.string().nullable(),
  address: z.string().nullable(),
  publishedAt: z.string().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  status: itemStatusSchema,
  tags: z.array(z.string()),
  rawSnapshotId: z.string().nullable(),
});

export const propertyListingSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  address: z.string().min(1),
  suburb: z.string().min(1),
  price: z.string().nullable(),
  bedrooms: z.number().int().nonnegative().nullable(),
  bathrooms: z.number().int().nonnegative().nullable(),
  parking: z.number().int().nonnegative().nullable(),
  landArea: z.number().nonnegative().nullable(),
  floorArea: z.number().nonnegative().nullable(),
  listedAt: z.string().nullable(),
  openHomeTimes: z.array(z.string()),
  platform: z.string().min(1),
  watchStatus: watchStatusSchema,
  notes: z.string().nullable(),
});

export const schoolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  schoolType: z.string().min(1),
  years: z.string().min(1),
  gender: z.string().min(1),
  authority: z.string().min(1),
  hasZone: z.boolean().nullable(),
  website: z.string().url(),
  area: z.string().min(1),
  commuteFromParaparaumu: z.string().nullable(),
  watchStatus: watchStatusSchema,
});

export const schoolEventSchema = z.object({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  itemId: z.string().min(1),
  eventType: z.string().min(1),
  startsAt: z.string().nullable(),
  deadline: z.string().nullable(),
  enrolmentYear: z.number().int().positive().nullable(),
});

export const itemLinkSchema = z.object({
  id: z.string().min(1),
  fromItemId: z.string().min(1),
  toEntityType: z.string().min(1),
  toEntityId: z.string().min(1),
  linkReason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const noteSchema = z.object({
  id: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  body: z.string(),
  createdAt: z.string().min(1),
});

export type ItemType = z.infer<typeof itemTypeSchema>;
export type TrustLevel = z.infer<typeof trustLevelSchema>;
export type ItemStatus = z.infer<typeof itemStatusSchema>;
export type WatchStatus = z.infer<typeof watchStatusSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type RawSnapshot = z.infer<typeof rawSnapshotSchema>;
export type Item = z.infer<typeof itemSchema>;
export type PropertyListing = z.infer<typeof propertyListingSchema>;
export type School = z.infer<typeof schoolSchema>;
export type SchoolEvent = z.infer<typeof schoolEventSchema>;
export type ItemLink = z.infer<typeof itemLinkSchema>;
export type Note = z.infer<typeof noteSchema>;
