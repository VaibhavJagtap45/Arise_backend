import { z } from "zod";

// Users-overview query: server-side pagination + search + sort. `limit` 0 means
// "return everything" (legacy/back-compat when no paging params are sent).
export const AdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(0).max(100).default(0),
  search: z.string().trim().max(80).optional().default(""),
  sort: z.enum(["score", "name", "lastActive", "flags"]).default("score"),
});

export const CoachNoteSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});
