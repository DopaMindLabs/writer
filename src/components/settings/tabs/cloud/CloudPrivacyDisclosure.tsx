import { useTranslation } from 'react-i18next';

/** The items the server can see, one i18n key each, in disclosure order. */
const SERVER_VISIBLE = ['ids', 'timestamps', 'kinds', 'email', 'network'] as const;

/**
 * An always-visible privacy note explaining exactly what the cloud server can
 * and cannot see. Mirrors the local Account privacy-notice styling.
 *
 * The two halves are labelled separately and deliberately. An unlabelled list
 * sitting beneath a sentence about encryption reads as more of the same
 * reassurance, when it is the exact opposite — everything in it is visible to
 * the server. In a privacy disclosure that inversion is the one mistake that
 * matters, so what is hidden and what is exposed each carry their own heading.
 */
export const CloudPrivacyDisclosure = () => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.disclosure.${name}`);
  return (
    <div
      role="note"
      data-testid="cloud-privacy-disclosure"
      className="mt-4 border border-rule bg-paper-2 p-3 text-[13px] text-ink-2"
    >
      <p className="font-sans font-medium text-ink">{k('title')}</p>

      <p className="mt-2 font-sans font-medium text-ink">{k('hiddenTitle')}</p>
      <p className="mt-1 font-serif">{k('encrypted')}</p>

      <p className="mt-3 font-sans font-medium text-ink">{k('visibleTitle')}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 font-serif">
        {SERVER_VISIBLE.map((name) => (
          <li key={name}>{k(name)}</li>
        ))}
      </ul>
    </div>
  );
};
