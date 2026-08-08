# Pairing two devices

Pair two devices to sync directly over your local network, with **no account and
no server**. Use the camera, a photo or copied code text to complete the exchange.

## At a glance

- Keep both devices on the **same Wi-Fi or wired network**.
- Open Writer on both devices and keep both tabs open while they sync.
- One device shows a code. The other reads it and shows a reply.
- Compare the six digits on both screens before you confirm.
- Pair every device directly with the other devices you want it to sync with.

## Pair your devices

1. On both devices, open **Settings → Device sync**.
2. Select **Pair another device** on both.
3. On the first device, select **Show a code to start pairing**.
4. On the second device, select **Scan the code on your other device**.
5. Read the code with the camera, upload a photo or paste the code text.
6. On the second device, select **Reveal the code for your other device**.
7. On the first device, select **It's been scanned — scan the reply**, then read
   the reply code.
8. On the second device, select **They have scanned it**.
9. Compare the six digits shown on both devices.
10. If they match, select **The codes match** on both devices.

If you select **They have scanned it** too soon, select **Show the code again**.

## Check the six digits

The six digits confirm that the devices are connected to each other.

- If the digits match, confirm on both devices.
- If they differ, close the pairing window on both devices and start again.

Do not continue when the digits differ.

## Read a pairing code

Choose whichever method is easiest:

- **Camera** — select **Use the camera**, then hold the code inside the frame.
- **Photo** — take a clear, straight-on photo and upload it.
- **Text** — copy the text below the code and paste it on the other device.

Writer requests camera permission only when you select **Use the camera**. If
you decline, you can still upload a photo or paste the text.

Some pairing codes use several symbols. Use **Next** and **Previous** on the
device showing the code. The other device tells you which symbol to scan next.

## After pairing

The devices sync while Writer is open on both. Changes made while a device is
away catch up the next time the devices connect.

Closing or reloading a tab ends the connection. To connect again:

1. Open Writer on both devices.
2. Go to **Settings → Device sync**.
3. Select **Reconnect** beside the device.
4. Complete the code exchange on both screens.

Reconnecting uses the existing trusted-device record and resumes from the
changes each device still needs.

If you have three or more devices, pair every required pair. A paired device
does not relay changes to another device on your behalf.

## Remove or pair a device again

Select **Remove** beside a device to stop syncing with it. If the device is
connected, Writer disconnects it straight away and accepts nothing further from
it. Writing already stored on that device remains there.

To trust the same device again, pair it normally and confirm the six digits on
both screens. If Writer says that a previously paired device has proved a
different identity, stop and remove it from the list. Do not continue pairing.

## Sync history

**Settings → Device sync → Keep sync history for** controls how long Writer
keeps recent changes for a device that is away. The default is 30 days.

A device returning after that period receives the current state instead of
replaying the full history. Writer keeps deletions until every paired device has
confirmed them. Remove a device you no longer use so it does not keep old
deletions waiting.

## Troubleshooting

### The camera cannot read the code

- Move closer until the code fills most of the frame.
- Hold both devices steady and avoid glare.
- Upload a clearer photo or paste the code text instead.
- Use Writer's scanner. A phone's camera app may ignore the code because it
  contains pairing data rather than a web address.

### Camera access was declined

Upload a photo or paste the code text. To use the camera, allow camera access in
your browser's site settings and try again.

### No camera is available

Upload a photo or paste the code text. A camera is optional.

### The code has expired

A pairing code is valid for five minutes. Close the pairing window on both
devices and start again.

### The code belongs to another attempt

Close any older pairing windows on both devices, then start a new pairing.

### This is the device's own code

Read the code shown on the other device.

### The device cannot prepare a code

Check that both devices are connected to the same local network. Close the
pairing window and try again.

### The pairing code is too large

Disconnect unused VPNs or virtual network adapters, then try again.

## Privacy and security

The pairing code contains the connection and identity information needed for
the devices to find and verify each other. Your passphrase, recovery code and
content-protection keys remain separate from the code.

Writer accepts synced changes only from devices you have paired and not removed.

## Related

- [Cloud sync](cloud-sync) — encrypted account-based sync across wider networks.
- [Your data](your-data) — local storage, backups and exports.
- [Working in multiple tabs](working-in-multiple-tabs) — live editing within one browser.
