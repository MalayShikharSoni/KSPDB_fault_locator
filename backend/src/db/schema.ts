import { pgTable, varchar, doublePrecision, integer, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const substations = pgTable('substations', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const feeders = pgTable('feeders', {
  id: varchar('id', { length: 50 }).primaryKey(),
  substationId: varchar('substation_id', { length: 50 }).references(() => substations.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const dts = pgTable('dts', {
  id: varchar('id', { length: 50 }).primaryKey(),
  feederId: varchar('feeder_id', { length: 50 }).references(() => feeders.id).notNull(),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  capacityKva: integer('capacity_kva').notNull(),
  householdsServed: integer('households_served').notNull(),
});

// Self-referential table needs careful typing or simplified foreign keys
export const poles = pgTable('poles', {
  id: varchar('id', { length: 50 }).primaryKey(),
  dtId: varchar('dt_id', { length: 50 }).references(() => dts.id).notNull(),
  feederId: varchar('feeder_id', { length: 50 }).references(() => feeders.id).notNull(),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  seqOnLine: integer('seq_on_line'),
  parentPoleId: varchar('parent_pole_id', { length: 50 }), // We'll add the FK in a migration or just rely on application logic for now to avoid circular typings, but actually Drizzle handles it if we use `AnyPgColumn` or just omit the inline FK and define it at the end. For now, a plain varchar is fine, we can define the relation below.
  poleType: varchar('pole_type', { length: 50 }).notNull(),
  ward: varchar('ward', { length: 50 }).notNull(),
  pincode: varchar('pincode', { length: 20 }),
  deviceId: varchar('device_id', { length: 100 }),
});

export const telemetryEvents = pgTable('telemetry_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: varchar('device_id', { length: 100 }).notNull(),
  seq: integer('seq').notNull(),
  event: varchar('event', { length: 50 }).notNull(), // heartbeat | power_lost | power_restored | boot
  energized: boolean('energized').notNull(),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  batteryMv: integer('battery_mv'),
  rssi: integer('rssi'),
  fw: varchar('fw', { length: 20 }),
  poleId: varchar('pole_id', { length: 50 }).references(() => poles.id).notNull(),
});

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(), // span_fault, dt_fault, feeder_fault, sensor_health
  status: varchar('status', { length: 50 }).notNull(), // detected, acknowledged, crew_assigned, resolved, verified, closed, suppressed
  boundaryParentPoleId: varchar('boundary_parent_pole_id', { length: 50 }).references(() => poles.id),
  boundaryChildPoleId: varchar('boundary_child_pole_id', { length: 50 }).references(() => poles.id),
  dtId: varchar('dt_id', { length: 50 }).references(() => dts.id),
  feederId: varchar('feeder_id', { length: 50 }).references(() => feeders.id),
  confidenceScore: doublePrecision('confidence_score'),
  topologySource: varchar('topology_source', { length: 50 }), // surveyed, inferred, inferred_ambiguous
  affectedPolesCount: integer('affected_poles_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Define relationships
export const polesRelations = relations(poles, ({ one, many }) => ({
  parentPole: one(poles, {
    fields: [poles.parentPoleId],
    references: [poles.id],
    relationName: 'parentChild'
  }),
  childrenPoles: many(poles, {
    relationName: 'parentChild'
  }),
}));
