import { z } from "zod";

const monthKey = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional();

// Optional "YYYY-MM"; the service falls back to the current IST month.
export const MonthQuerySchema = z.object({
  month: monthKey,
});

export const AddTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive().max(100000000),
  category: z.string().trim().min(1).max(60),
  note: z.string().trim().max(140).optional(),
  date: z.string().datetime().optional(),
});

const CategoryLimitSchema = z.object({
  category: z.string().trim().min(1).max(60),
  limit: z.coerce.number().nonnegative().max(100000000),
});

export const SetBudgetSchema = z.object({
  month: monthKey,
  monthlyLimit: z.coerce.number().nonnegative().max(100000000).optional(),
  categoryLimits: z.array(CategoryLimitSchema).max(40).optional(),
});
