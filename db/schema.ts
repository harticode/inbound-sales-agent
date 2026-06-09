import {
  pgTable,
  serial,
  varchar,
  text,
  real,
  integer,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const callOutcomeEnum = pgEnum("call_outcome", [
  "booked",
  "declined",
  "no_loads",
  "carrier_not_eligible",
  "negotiation_failed",
  "transferred",
  "callback_requested",
  "dropped",
]);

export const sentimentEnum = pgEnum("sentiment", [
  "positive",
  "neutral",
  "negative",
  "frustrated",
]);

export const callEventTypeEnum = pgEnum("call_event_type", [
  "call_started",
  "carrier_verify",
  "load_search",
  "negotiate",
  "call_logged",
]);

export const loads = pgTable("loads", {
  id: serial("id").primaryKey(),
  loadId: varchar("load_id", { length: 50 }).notNull().unique(),
  origin: varchar("origin", { length: 200 }).notNull(),
  destination: varchar("destination", { length: 200 }).notNull(),
  pickupDatetime: timestamp("pickup_datetime", { withTimezone: true }).notNull(),
  deliveryDatetime: timestamp("delivery_datetime", { withTimezone: true }).notNull(),
  equipmentType: varchar("equipment_type", { length: 50 }).notNull(),
  loadboardRate: real("loadboard_rate").notNull(),
  notes: text("notes").default(""),
  weight: real("weight"),
  commodityType: varchar("commodity_type", { length: 100 }).default(""),
  numOfPieces: integer("num_of_pieces"),
  miles: real("miles"),
  dimensions: varchar("dimensions", { length: 100 }).default(""),
  status: varchar("status", { length: 20 }).default("available").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  mcNumber: varchar("mc_number", { length: 20 }).notNull().unique(),
  legalName: varchar("legal_name", { length: 200 }).default(""),
  dbaName: varchar("dba_name", { length: 200 }).default(""),
  dotNumber: varchar("dot_number", { length: 20 }).default(""),
  entityType: varchar("entity_type", { length: 50 }).default(""),
  operatingStatus: varchar("operating_status", { length: 50 }).default(""),
  allowedToOperate: varchar("allowed_to_operate", { length: 10 }).default(""),
  phone: varchar("phone", { length: 20 }).default(""),
  totalDrivers: integer("total_drivers"),
  totalPowerUnits: integer("total_power_units"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callId: varchar("call_id", { length: 100 }).notNull().unique(),
  carrierId: integer("carrier_id").references(() => carriers.id),
  loadId: integer("load_id").references(() => loads.id),
  carrierMcNumber: varchar("carrier_mc_number", { length: 20 }).default(""),
  carrierName: varchar("carrier_name", { length: 200 }).default(""),
  callerName: varchar("caller_name", { length: 200 }).default(""),
  originRequested: varchar("origin_requested", { length: 200 }).default(""),
  destinationRequested: varchar("destination_requested", { length: 200 }).default(""),
  equipmentRequested: varchar("equipment_requested", { length: 50 }).default(""),
  loadboardRate: real("loadboard_rate"),
  initialOffer: real("initial_offer"),
  finalAgreedRate: real("final_agreed_rate"),
  counterOffers: jsonb("counter_offers").$type<{ round: number; carrier: number; broker: number | null }[]>().default([]),
  negotiationRounds: integer("negotiation_rounds").default(0).notNull(),
  outcome: callOutcomeEnum("outcome").default("dropped").notNull(),
  sentiment: sentimentEnum("sentiment").default("neutral").notNull(),
  callDurationSeconds: integer("call_duration_seconds"),
  notes: text("notes").default(""),
  extractedData: jsonb("extracted_data").$type<Record<string, unknown>>().default({}),
  transcriptSummary: text("transcript_summary").default(""),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const callEvents = pgTable("call_events", {
  id: serial("id").primaryKey(),
  callId: varchar("call_id", { length: 100 }).notNull(),
  eventType: callEventTypeEnum("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Load = typeof loads.$inferSelect;
export type Carrier = typeof carriers.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type CallEvent = typeof callEvents.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
