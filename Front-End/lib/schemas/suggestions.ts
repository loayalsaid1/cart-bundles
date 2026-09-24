import { z } from 'zod';

export const suggestionStatusSchema = z.enum([
  'new',
  'reviewed',
  'planned',
  'done',
  'rejected',
]);

export const suggestionSchema = z.object({
  id: z.number(),
  merchantId: z.number(),
  userId: z.number().nullable().optional(),
  title: z.string(),
  body: z.string(),
  status: suggestionStatusSchema,
  adminNote: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
