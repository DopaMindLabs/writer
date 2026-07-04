import { useTranslation } from 'react-i18next';

/** The items the server can see, one i18n key each, in disclosure order. */
const SERVER_VISIBLE = ['ids', 'timestamps', 'kinds', 'email', 'network'] as const;

/**
 * An always-visible privacy note explaining exactly what the cloud server can
 * and cannot see. Mirrors the local Account privacy-notice styling.
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
      <p className="mt-1 font-serif">{k('encrypted')}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 font-serif">
        {SERVER_VISIBLE.map((name) => (
          <li key={name}>{k(name)}</li>
        ))}
      </ul>
      <p className="mt-2 font-serif italic">{k('invite')}</p>
    </div>
  );
};
