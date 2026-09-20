import { beforeEach, describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { asDeviceId } from 'writer-sync/core';
import { renderWithProviders } from '@/test/test-utils';
import { peerLinkStatus } from '@/lib/writerSyncIntegration/peerLinkStatus';
import { PeerLinkNotice } from './PeerLinkNotice';

const PEER = asDeviceId('peer-1');

/** Where the router has been taken, so navigation is observable. */
const WhereWeAre = () => {
  const { pathname, search } = useLocation();
  return <span data-testid="where">{`${pathname}${search}`}</span>;
};

/** Take a link up and then down, the way a real session reports it. */
const dropTheLink = (): void => {
  act(() => {
    peerLinkStatus.observe(PEER, 'connected');
    peerLinkStatus.observe(PEER, 'interrupted');
  });
};

describe('PeerLinkNotice', () => {
  beforeEach(() => {
    peerLinkStatus.reset();
  });

  it('says nothing on a page that has connected to nothing', () => {
    // Sessions do not survive a reload, so this is every app start. A notice
    // here would fire on every launch and stop meaning anything.
    const { container } = renderWithProviders(<PeerLinkNotice />);

    expect(container).toBeEmptyDOMElement();
  });

  it('says nothing while a link is still coming up', () => {
    renderWithProviders(<PeerLinkNotice />);

    act(() => {
      peerLinkStatus.observe(PEER, 'connecting');
    });

    expect(screen.queryByTestId('peer-link-notice')).not.toBeInTheDocument();
  });

  it('says so when a working link is lost', () => {
    renderWithProviders(<PeerLinkNotice />);

    dropTheLink();

    expect(screen.getByTestId('peer-link-notice')).toHaveTextContent(
      /no longer connected/i,
    );
  });

  it('announces politely, and never takes the focus', () => {
    renderWithProviders(<PeerLinkNotice />);
    const before = document.activeElement;

    dropTheLink();

    // `status` is read at the next pause rather than over whatever is being
    // said, which is what makes this visible to a screen reader without
    // interrupting the sentence being typed.
    expect(screen.getByRole('status')).toHaveAttribute('data-testid', 'peer-link-notice');
    expect(document.activeElement).toBe(before);
  });

  it('leaves the page beneath it alone', () => {
    renderWithProviders(<PeerLinkNotice />);

    dropTheLink();

    // No dialog, so nothing is trapped and nothing has to be dismissed before
    // the user can carry on writing.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('notice-dock')).toHaveClass('pointer-events-none');
  });

  it('leads to the device list rather than reconnecting on the spot', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <PeerLinkNotice />
        <WhereWeAre />
      </>,
    );
    dropTheLink();

    await user.click(screen.getByRole('button', { name: 'Open device sync' }));

    // Reconnecting needs both devices and a fresh code; this device cannot do it
    // alone, so the honest action is to go where that can be started.
    expect(screen.getByTestId('where')).toHaveTextContent('/settings?tab=deviceSync');
  });

  it('goes quiet again once the device is back', () => {
    renderWithProviders(<PeerLinkNotice />);
    dropTheLink();

    act(() => {
      peerLinkStatus.observe(PEER, 'connected');
    });

    expect(screen.queryByTestId('peer-link-notice')).not.toBeInTheDocument();
  });
});
