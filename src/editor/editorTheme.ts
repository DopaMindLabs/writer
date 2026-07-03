import type { EditorThemeClasses } from 'lexical';

/** Token-backed Lexical theme classes shared by every editor instance. */
export const editorTheme: EditorThemeClasses = {
  paragraph: 'mb-4 leading-relaxed',
  heading: {
    h1: 'mb-4 mt-6 font-serif text-3xl font-semibold tracking-tight',
    h2: 'mb-3 mt-6 font-serif text-2xl font-semibold tracking-tight',
    h3: 'mb-2 mt-4 font-serif text-xl font-semibold tracking-tight',
    h4: 'mb-2 mt-3 font-serif text-lg font-semibold tracking-tight',
  },
  list: {
    ul: 'mb-4 list-disc pl-6',
    ol: 'mb-4 list-decimal pl-6',
    listitem: 'mb-1',
  },
  quote: 'mb-4 border-l-2 border-rule pl-4 italic text-ink-2',
  text: {
    bold: 'font-semibold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'rounded bg-paper-2 px-1 py-0.5 font-mono text-sm',
  },
  link: 'text-ink underline underline-offset-2',
};
