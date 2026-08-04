# Pairing two devices

Pairing lets two of your devices sync directly with each other over your local
network, with no sign-up and no server in between. You do it once per pair of
devices, and it takes about a minute.

## Before you start

- Both devices need to be on the **same network** — the same Wi‑Fi, or the same
  wired network.
- Keep both devices in front of you. Pairing is a back‑and‑forth: each device
  shows the other a code, one step at a time.
- **It does not matter which device you start on.** Each device asks what you
  want it to do — show a code, or scan the one on your other device — so pick
  whichever is easier to point at the other and let that one show.
- There are three ways to read a code: point the device's **camera** at it,
  **upload a photo** of it, or **paste the code text**. Writer asks for the
  camera only when you press "Use the camera" — never before.
- You do **not** need a camera. If either device has no camera, or you would
  rather not use it, or you decline the permission, the upload and paste
  options stay exactly where they are. Declining costs you nothing.

## Pairing step by step

1. On **both** devices, open **Settings → Device sync** and choose **Pair
   another device**. Each one asks what you want it to do.
2. On the first device, choose **Show a code to start pairing**. It takes a
   moment to prepare, then shows a square code.
3. On the second device, choose **Scan the code on your other device**. Point it
   at the first device's code, or upload a photo of it, or copy the text
   underneath that code across and paste it in.
4. The second device now offers a **reply code**, kept out of sight until you
   ask: choose **Reveal the code for your other device**. It waits behind a
   press because this screen arrives the moment your scan succeeds, with your
   finger still coming down.
5. On the first device, choose **It's been scanned — scan the reply** and read
   that reply back the same way round. Then, on the second device, choose **They
   have scanned it**.
6. Both devices now show the **same six digits**.

Pressed **They have scanned it** too early? Nothing is lost — choose **Show the
code again** and the same reply comes back.

## Checking the six digits

This is the step that makes pairing safe, so it is worth doing properly.

**Compare the two numbers with your own eyes**, on the two screens in front of
you. If they match, choose **The codes match** on both devices and you are
paired.

If the digits **differ**, stop. Close the dialog on both devices and start
again. A mismatch means the two devices are not talking to each other directly —
something else has answered in the middle — and continuing would pair your
device with that something else instead.

## If the code spans more than one square

Almost every pairing code fits in a single square. Occasionally a long one is
split across several, shown as "Symbol 1 of 2" and so on. Use **Next** and
**Previous** to step through them, and read each one in turn. The receiving
device names the squares it is still waiting for — "Still to scan: symbol 2" —
so you can go back to the one it missed.

## If something goes wrong

- **"This device could not prepare a pairing code."** The device could not find
  a way to reach the network. Check you are connected, then close the dialog and
  try again.
- **"This pairing code is too large to display."** The connection details this
  device gathered are too big to fit in a code — usually a machine with very
  many network connections (VPNs, virtual adapters). Disconnect what you are not
  using, then close the dialog and try again.
- **"That code has expired."** A code is valid for five minutes. Reading it in
  a roundabout way — photographing it, opening the photo, copying the text and
  pasting it — can take longer than that. Close the dialog on both devices and
  start again; the fresh code is quicker to read the second time.
- **"That does not look like a pairing code from this device's partner."** The
  code came from a different pairing attempt — for example, one you started
  earlier and left open. Close the dialog on both devices and start fresh.
- **"That is this device's own code."** The camera was pointed at the screen it
  is scanning from, or you pasted the text from underneath this device's own
  code. Use the code on the *other* device.
- **"No pairing code could be read from that image."** The photo is too blurry,
  too dark, or the code is cut off. Take another photo straight on, or copy the
  text across instead.
- **"Camera access was declined."** Your browser blocked the camera, either
  because you said no or because it remembers a previous no. You can change that
  in your browser's site settings — or simply upload a photo or paste the code
  instead, which works just as well.
- **"No camera is available on this device."** Nothing is wrong; many desktops
  have no camera. Use the upload or paste option.
- **The camera is on but nothing happens.** Hold the code steady and fill more
  of the frame with it. Writer keeps looking until you stop it, and says
  "Looking for a code…" the whole time it is trying. A pairing code is denser
  than most QR codes, so it needs more of the frame than you might expect —
  move closer until the code nearly fills the picture.
- **Your phone's own camera app sees the code but offers nothing** (on iPhone,
  "No usable data found"). That is normal: a pairing code carries text, not a
  web address, and phone camera apps only offer to open addresses. Read the
  code from **inside Writer** instead — the "Use the camera" button on the
  scanning screen — or photograph it and use "Upload a photo of the code".
- **The codes do not match.** Do not continue. Start again, and if it happens
  repeatedly, pair on a network you trust.

## What travels in the code

The code carries only what the two devices need in order to find each other and
prove who they are. Your passphrase, your recovery code and the keys that
protect your writing are **never** in a pairing code — nothing secret is on
screen, which is why it is safe to hold up a code before you have confirmed
anything.

## What happens after pairing

Once two devices trust each other, they compare what each one holds and send
only the difference. Neither device re-sends work the other already has, so
catching up after a few days apart is quick.

Every change carries a signature from the device that made it, and the receiving
device checks that signature before accepting anything. A device you have
removed, or one you never paired with, cannot slip changes in.

A document open on both devices updates in place as the other device writes. You
do not need to close it and open it again to see the words arrive.

Writer sends whole documents rather than merging two people's typing together,
so if you had unsaved changes on this device when the other device's version
arrives, that version takes the page. Nothing is lost: what you had is kept as a
version you can restore from the document's history.

Attachments travel in pieces. If a transfer is interrupted — you close the lid,
you walk out of range — the next connection picks up from the pieces still
missing rather than starting the file again.

Each device accepts changes only from devices it has paired with itself. If you
have three devices, pair each one with each of the others; a device in the
middle will not pass changes along on their behalf.

## When a device stops being connected

Settings → Device sync says, for each device, whether you are **connected** to
it right now. **Not connected** is the usual state and is not a fault — but
while it says that, nothing you write reaches that device.

Two devices are connected only while both have Writer open. The connection is
made by the pairing exchange and is never saved, so closing the tab, reloading,
sleeping the laptop or walking out of range ends it. That is why a freshly
opened Writer says nothing about connections.

If a device that *was* connected drops away while you work, a small notice
appears in the corner. It never interrupts: nothing moves on the page, nothing
takes what you are typing.

**Nothing is lost.** Your writing stays where you wrote it, and the devices
catch up next time they are connected.

To connect again, choose **Reconnect** beside the device and go through the
codes on both screens. This is not pairing from scratch: the devices still
trust each other and still share the same keys, so nothing secret changes hands
again — only the connection is rebuilt. The codes are needed because the
devices talk directly, with no server in the middle to arrange a new one.

## Removing a device, and pairing it again

Settings → Device sync lists every device you have paired. **Remove** stops a
device connecting again: nothing it sends is accepted from that moment on. It
stays in the list marked as removed, so you can always tell a device you
removed apart from one you never paired.

Removing cannot reach back and erase the writing already on the other device —
treat a lost device as still holding whatever it had when you removed it.

Removal is not final. To bring a device back, pair it again the ordinary way:
show a code, scan it, and confirm the digits on both screens. Confirming is
what restores trust — the device proves it is still the same one you paired
with before, and syncing resumes from where it left off.

If a device you have paired with before ever fails re-pairing with a message
about proving a different identity, do not keep trying. Remove it from the
list, and be careful about the network you are on — that message means the
thing on the other end is not the device your list remembers.

## Devices you have not used for a while

Writer keeps a history of recent changes so a device that has been offline can
catch up. How long it keeps that history is up to you — Settings → Device sync →
**Keep sync history for**, which offers 7, 30 or 90 days, or a year. Thirty days
is the default.

A device that has been switched off for longer than that has fallen past the
history, so it is sent a fresh copy of everything as it currently stands instead
— including what you have deleted, so it does not come back holding pages
everything else has let go of. Anything you wrote on it while it was away is not
lost: the two versions are merged the same way any other change is, rather than
one silently replacing the other.

Once every device you have paired has confirmed it holds a change, Writer stops
keeping that piece of history early — there is nobody left who needs it. If one
device never comes back, the window above still closes eventually, so a device
you have lost cannot make the history grow forever. Deletions are the exception:
they are kept until every device you have paired has confirmed them, however long
that takes, because they are the only thing stopping a returning device from
restoring what you removed. Removing a device you are not going back to is what
lets go of the deletions it never confirmed.
