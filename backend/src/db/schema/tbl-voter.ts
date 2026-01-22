import { integer, pgTable, varchar, boolean } from "drizzle-orm/pg-core";

export const votersTable = pgTable("voters", {
  voter_id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  has_voted: boolean().notNull().default(false),
});

export type Voter = typeof votersTable.$inferSelect;
export type NewVoter = typeof votersTable.$inferInsert;