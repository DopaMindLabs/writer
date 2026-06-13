import { useState } from 'react';
import {
  addTrustedDomain,
  domainFromUrl,
  isDomainAllowed,
} from '@/lib/trusted-domains';

const isHttpsUrl = (url: string): boolean => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

export interface UrlPicker {
  url: string;
  setUrl: (value: string) => void;
  error: string | null;
  pendingHost: string | null;
  submit: () => Promise<void>;
  confirmTrust: () => void;
  cancelTrust: () => void;
}

export const useUrlPicker = (onSelect: (url: string) => void): UrlPicker => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingHost, setPendingHost] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = url.trim();
    setError(null);
    if (!isHttpsUrl(trimmed)) {
      setError('Enter an https:// PDF URL.');
      return;
    }
    if (await isDomainAllowed(trimmed)) {
      onSelect(trimmed);
      return;
    }
    setPendingHost(domainFromUrl(trimmed));
  };

  const confirmTrust = () => {
    if (pendingHost === null) return;
    void addTrustedDomain(pendingHost).then(() => {
      setPendingHost(null);
      onSelect(url.trim());
    });
  };

  const cancelTrust = () => { setPendingHost(null); };

  return { url, setUrl, error, pendingHost, submit, confirmTrust, cancelTrust };
};
