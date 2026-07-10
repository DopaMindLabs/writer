
import { lexicalJsonToPlainText } from '@/lib/revisions/lexicalJsonToPlainText';

const countTokens = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

export const countWords = (body: string): number => {
  if (!body) return 0;
  return countTokens(lexicalJsonToPlainText(body));
};
