import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  TypographyH1,
  TypographyH2,
  TypographyP,
} from '@/components/ui/typography';
import { BlockQuote } from '@/components/ui/block-quote';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';
import { slugify } from '@/lib/help/content';

const LINK_CLASS =
  'underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink';

const MarkdownLink = ({
  href,
  children,
}: {
  readonly href?: string;
  readonly children?: ReactNode;
}) => {
  if (href === undefined || href.length === 0) return <>{children}</>;
  if (/^(https?:|mailto:)/.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        {children}
      </a>
    );
  }
  const [slug, anchor] = href.replace(/^\//, '').split('#');
  return (
    <Link to={routes.helpArticle(slug, anchor)} className={LINK_CLASS}>
      {children}
    </Link>
  );
};

const toText = (children: ReactNode): string => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(toText).join('');
  if (isValidElement(children)) {
    return toText((children.props as { children?: ReactNode }).children);
  }
  return '';
};

const SLUG_SUFFIX_RE = /\s+\{#([^}\s]+)\}\s*$/;

const stripSlugSuffix = (children: ReactNode): ReactNode => {
  if (typeof children === 'string') return children.replace(SLUG_SUFFIX_RE, '');
  if (Array.isArray(children)) {
    const nodes = children as ReactNode[];
    if (nodes.length === 0) return nodes;
    const head = nodes.slice(0, -1);
    const last: ReactNode = nodes[nodes.length - 1];
    return [...head, stripSlugSuffix(last)];
  }
  return children;
};

interface ParsedHeading {
  readonly id: string;
  readonly content: ReactNode;
}

const parseHeading = (children: ReactNode): ParsedHeading => {
  const text = toText(children);
  const match = SLUG_SUFFIX_RE.exec(text);
  if (!match) return { id: slugify(text), content: children };
  return { id: match[1], content: stripSlugSuffix(children) };
};

const components: Components = {
  h1: ({ children }) => <TypographyH1 className="mt-10 first:mt-0">{children}</TypographyH1>,
  h2: ({ children }) => {
    const { id, content } = parseHeading(children);
    return (
      <TypographyH2 id={id} className="mt-10 scroll-mt-24">
        {content}
      </TypographyH2>
    );
  },
  h3: ({ children }) => {
    const { id, content } = parseHeading(children);
    return (
      <h3
        id={id}
        className="mt-6 scroll-mt-24 font-serif text-[15px] font-medium text-ink"
      >
        {content}
      </h3>
    );
  },
  p: ({ children }) => <TypographyP className="mt-4">{children}</TypographyP>,
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-1.5 pl-6 font-serif text-ink-2 md:text-[17px]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-1.5 pl-6 font-serif text-ink-2 md:text-[17px]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => <BlockQuote>{children}</BlockQuote>,
  hr: () => <hr className="my-8 border-rule" />,
  code: ({ children }) => (
    <code className="rounded-sm bg-paper-2 px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-md border border-rule bg-paper-2 p-4 font-mono text-[13px] text-ink">
      {children}
    </pre>
  ),
};

export interface MarkdownProps {
  readonly children: string;
}

export const Markdown = ({ children }: MarkdownProps) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
    {children}
  </ReactMarkdown>
);
