import { z } from "zod";

export const aiCommandSchema = z.object({
  action: z.enum(["set_grant", "revoke_grant", "explain", "reject"]),
  userId: z.string().optional(),
  email: z.string().optional(),
  product: z.enum(["mailguard", "brandwatch", "certradar"]).optional(),
  level: z.enum(["none", "view", "operate", "admin"]).optional(),
  expiresAt: z.string().nullable().optional(),
  reason: z.string(),
  confidence: z.number(),
});

export type AiCommand = z.infer<typeof aiCommandSchema>;
