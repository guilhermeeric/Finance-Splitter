import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const budgetItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.number(),
});

export type BudgetItem = z.infer<typeof budgetItemSchema>;

export const budgetsTable = pgTable("budgets", {
  sessionId: text("session_id").primaryKey(),
  incomeItems: jsonb("income_items").notNull().$type<BudgetItem[]>().default([]),
  expenseItems: jsonb("expense_items").notNull().$type<BudgetItem[]>().default([]),
  investSplit: text("invest_split").notNull().default("50"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBudgetSchema = createInsertSchema(budgetsTable).omit({ createdAt: true, updatedAt: true });
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgetsTable.$inferSelect;
