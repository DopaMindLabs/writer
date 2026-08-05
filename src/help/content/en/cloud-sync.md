# Cloud sync

Cloud sync keeps one account's writing in step across your devices, **end-to-end
encrypted**. Writer encrypts your writing and other content on your device before
upload. The sync service stores that encrypted content alongside the routing and
indexing metadata it needs to synchronise it. Your passphrase stays on your device.

On a healthy network, an idle device usually catches up in about **1–2
seconds**. For live editing within one browser, use multiple tabs.

For direct sync on the same local network with no account and no server, see
[Pairing two devices](pairing-devices).

## At a glance

- Set up a **passphrase** on your first device, then unlock each other device with it.
- Names and content appear on unlock **without reloading the page**.
- The **Sync** row shows health; **Up to date** means everything is in step.
- Keep your **recovery code** — it is the only way back if every device forgets the passphrase.

## Set up your first device

Do this once, on the device that already has your writing.

1. Open **Settings → Cloud sync (beta)**.
2. Select **Set up encryption**.
3. Type a passphrase of at least 12 characters. Type it again to confirm.
4. Select create.
5. On the **Save your recovery code** screen, copy the code and store it somewhere safe.
6. Confirm you have saved it to finish.

> **Warning:** if you lose both the passphrase and the recovery code, your
> encrypted writing cannot be recovered. No one can reset it for you.

## Unlock a second device

Your writing arrives locked on a new device until you unlock it.

1. On the new device, open **Settings → Cloud sync (beta)**.
2. Select **Sign in** and sign in to the same account.
3. Wait for the account to finish fetching.
4. Select **Unlock on this device**.
5. Enter the passphrase you created on the first device.
6. Select unlock.

Your spaces, sections, and document names now appear. You do **not** need to
reload the page, and any other tabs you have open update on their own.

## How many devices can I use?

**Four devices per account** while cloud sync is in beta. More will be supported
later.

A fifth device that signs in sees **This account already has four devices** and
cannot unlock or set up until you free a slot. You can free one without leaving
the device you are on — see **Manage your devices** below.

A device you have not used for **7 days** stops holding its slot, so a laptop you
wiped or gave away frees its place on its own — you do not have to dig it out to
sign out. If you use it again and a slot is free, it simply takes one back.

While the beta runs, keep local backups of important writing on at least one
device (**Settings → Backups**).

## Manage your devices

**Settings → Cloud sync (beta) → Your devices** lists every device on your
account, oldest first, and how many of your four slots are in use.

Devices have no names. Nothing identifying is stored about them — no device name,
no browser, no location — so each row shows only when it joined and when it last
synced. The device you are using is marked **This device**. One marked
**Inactive** has been quiet long enough that its slot is already free.

To free a slot:

- **On the device you are using**, select **Sign out**.
- **On any other device**, select **Remove**, then confirm.

**Remove** frees the slot straight away, so a new device can take it. If the
device you removed is still signed in somewhere, it stops holding a slot and is
asked to sign out — it will not quietly take another. Its writing stays on it, and
nothing is deleted from your account.

## Check that sync is healthy

The **Sync** row at the top of the cloud panel reports the current state.

- **Up to date** — everything is in step. Nothing to do.
- **Uploading changes** or **Downloading changes** — a sync is in progress. Wait a moment.
- **Offline** — the device has no connection. Changes sync once it reconnects.

## Errors

Normal syncing is quiet. A problem shows its own message.

### "Sync couldn't finish"

Some changes from your other devices could not be applied yet. Your writing is
safe and nothing has been lost.

1. Select **Try again**.
2. Wait a moment for the banner to clear.

If it keeps failing, check your connection, then reload the page and try once more.

### "Fetching your account…" never finishes

A new device checks your account before it can unlock. If that check fails, it
says **We couldn't fetch your account** instead of staying stuck. Your writing on
this device is safe.

1. Select **Try again**.
2. Wait a moment for the check to finish.

If it says **You're offline**, the check pauses on its own and finishes once you
reconnect — nothing to do. If **Try again** keeps failing, check your connection,
then reload the page and try once more.

## Recover an account

Use this when you no longer have the passphrase but still have the recovery code.

1. Open **Settings → Cloud sync (beta)** on the device.
2. Select **Unlock on this device**.
3. Choose the recovery-code option.
4. Enter your recovery code.
5. Set a new passphrase when prompted.

## Forget encryption on a device

Use this to remove the key from one browser — for example a shared computer.

> **Warning:** after this, that device shows your writing as locked until you
> unlock it again with the passphrase. Do not forget the key unless you still
> know the passphrase or have the recovery code.

1. Open **Settings → Cloud sync (beta)**.
2. Select **Forget encryption on this device**.
3. Confirm.

Your synced data and your other devices are unaffected.

## Related

- [Pairing two devices](pairing-devices) — direct sync with no account and no server.
- [Your data](your-data) — local storage, export, import, and backups.
- [Your profile](your-profile) — display name and presence for collaboration.
- [Working in multiple tabs](working-in-multiple-tabs) — live editing across tabs on one device.
