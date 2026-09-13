import { z } from 'zod';
import { http } from '@/lib/http';
import { suggestionSchema, type Suggestion } from '@/lib/schemas/suggestions';

export async function listSuggestions(): Promise<Suggestion[]> {
  const data = await http<unknown>('/suggestions');
  return z.array(suggestionSchema).parse(data);
}

export async function createSuggestion(input: {
  title: string;
  body: string;
}): Promise<Suggestion> {
  const data = await http<unknown>('/suggestions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return suggestionSchema.parse(data);
}
