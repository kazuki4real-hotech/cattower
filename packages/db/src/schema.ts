import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  ...timestamps,
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_uidx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  locale: text("locale").notNull().default("ja"),
  timezone: text("timezone").notNull().default("Asia/Tokyo"),
  townEnabled: integer("town_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  townDigest: text("town_digest", { enum: ["off", "daily"] })
    .notNull()
    .default("off"),
  reducedMotionOverride: integer("reduced_motion_override", {
    mode: "boolean",
  }),
  analyticsConsent: integer("analytics_consent", { mode: "boolean" })
    .notNull()
    .default(false),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  activeHouseholdId: text("active_household_id"),
  activeCatId: text("active_cat_id"),
  onboardingPromptedAt: integer("onboarding_prompted_at", {
    mode: "timestamp_ms",
  }),
  onboardingCompletedAt: integer("onboarding_completed_at", {
    mode: "timestamp_ms",
  }),
  ...timestamps,
});

export const households = sqliteTable(
  "households",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    deletionRequestedAt: integer("deletion_requested_at", {
      mode: "timestamp_ms",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("households_owner_user_id_uidx").on(table.ownerUserId),
  ],
);

export const householdMembers = sqliteTable(
  "household_members",
  {
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor"] }).notNull(),
    status: text("status", {
      enum: ["invited", "active", "revoked"],
    }).notNull(),
    invitedBy: text("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.userId] }),
    index("household_members_user_status_idx").on(table.userId, table.status),
  ],
);

export const householdInvites = sqliteTable(
  "household_invites",
  {
    id: text("id").primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["editor"] })
      .notNull()
      .default("editor"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    acceptedBy: text("accepted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    index("household_invites_household_created_idx").on(
      table.householdId,
      table.createdAt,
    ),
  ],
);

export const cats = sqliteTable(
  "cats",
  {
    id: text("id").primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nickname: text("nickname"),
    birthDate: integer("birth_date", { mode: "timestamp_ms" }),
    birthPrecision: text("birth_precision", {
      enum: ["day", "month", "year", "unknown"],
    })
      .notNull()
      .default("unknown"),
    adoptionDate: integer("adoption_date", { mode: "timestamp_ms" }),
    profileAssetId: text("profile_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    lifeStatus: text("life_status", { enum: ["living", "memorial"] })
      .notNull()
      .default("living"),
    townAccess: text("town_access", {
      enum: ["disabled", "owners_only", "household_members"],
    })
      .notNull()
      .default("disabled"),
    ...timestamps,
  },
  (table) => [index("cats_household_idx").on(table.householdId)],
);

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    kind: text("kind", { enum: ["image", "video"] }).notNull(),
    provider: text("provider", { enum: ["r2", "stream"] }).notNull(),
    purpose: text("purpose", { enum: ["profile", "entry"] })
      .notNull()
      .default("profile"),
    providerKey: text("provider_key").notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size"),
    width: integer("width"),
    height: integer("height"),
    status: text("status", {
      enum: [
        "pending",
        "uploaded",
        "processing",
        "ready",
        "failed",
        "deleting",
      ],
    }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    index("media_assets_household_status_idx").on(
      table.householdId,
      table.status,
    ),
  ],
);

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    primaryCatId: text("primary_cat_id").references(() => cats.id, {
      onDelete: "set null",
    }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    title: text("title"),
    body: text("body"),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    occurredPrecision: text("occurred_precision", {
      enum: ["minute", "day", "month"],
    })
      .notNull()
      .default("day"),
    status: text("status", {
      enum: ["draft", "ready", "processing", "failed"],
    })
      .notNull()
      .default("ready"),
    version: integer("version").notNull().default(1),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    index("entries_household_occurred_deleted_idx").on(
      table.householdId,
      table.occurredAt,
      table.deletedAt,
    ),
  ],
);

export const entryCats = sqliteTable(
  "entry_cats",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    catId: text("cat_id")
      .notNull()
      .references(() => cats.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.catId] }),
    index("entry_cats_cat_entry_idx").on(table.catId, table.entryId),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tags_household_normalized_uidx").on(
      table.householdId,
      table.normalizedName,
    ),
  ],
);

export const entryTags = sqliteTable(
  "entry_tags",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.entryId, table.tagId] })],
);

export const entryMedia = sqliteTable(
  "entry_media",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    mediaAssetId: text("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    role: text("role", { enum: ["primary", "gallery"] })
      .notNull()
      .default("primary"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.mediaAssetId] }),
    index("entry_media_asset_idx").on(table.mediaAssetId),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "household_invite",
        "household_joined",
        "upload_ready",
        "upload_failed",
        "export_ready",
        "share_expiring",
        "town_digest",
      ],
    }).notNull(),
    resourceType: text("resource_type", {
      enum: ["household", "cat", "media_asset"],
    }),
    resourceId: text("resource_id"),
    payloadJson: text("payload_json").notNull().default("{}"),
    dedupeKey: text("dedupe_key").notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    index("notifications_recipient_read_created_idx").on(
      table.recipientUserId,
      table.readAt,
      table.createdAt,
    ),
    uniqueIndex("notifications_recipient_dedupe_uidx").on(
      table.recipientUserId,
      table.dedupeKey,
    ),
    index("notifications_expires_idx").on(table.expiresAt),
  ],
);

export const schema = {
  user,
  session,
  account,
  verification,
  userPreferences,
  households,
  householdMembers,
  householdInvites,
  cats,
  mediaAssets,
  entries,
  entryCats,
  tags,
  entryTags,
  entryMedia,
  notifications,
};

export type DatabaseSchema = typeof schema;
