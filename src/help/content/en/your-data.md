# Your data

This app is **local-first**: your writing is stored in your own browser, on your
own device. Nothing is uploaded to a server, and the app works fully offline.

## At a glance

- Your work lives in **your browser** — private by default, tied to this device.
- **Export** prose and citations to take your work with you.
- **Back up** regularly; clearing site data erases your work.
- Optionally **sync** a space to a local folder.

## What local-first means

- Documents, spaces, notes, and citations live in your browser's local storage.
- There's no account and no automatic cloud sync — privacy by default, but your
  data is tied to this browser on this device.
- Clearing your browser's site data will remove your work, so keep backups.

## Exporting

Export your writing to take it with you or keep a safe copy. A whole space
exports as a timestamped **space archive** (.zip); citations export as
[BibTeX](citations-and-bibliography).

A space archive contains two layers: a readable tree of markdown files you can
open anywhere, and a complete machine-readable copy of every record — docs,
notes, attachments, annotations, citations, connections, version history, and
settings — so the archive can be faithfully restored or imported later.

## Importing

Bring a space into this browser from a space archive — for example a snapshot
you downloaded, or a folder-sync export from another device. Go to
**Settings → Export / import**, choose the archive file, and it is imported as
a **new space** alongside your existing ones. Importing never overwrites
anything; this is also the way to move a space between devices.

## Backups, restore & sync

- Create **snapshots** from the space's backups area; each adds a row you can
  download, restore, or delete.
- **Restore** a snapshot to roll the whole space back to that moment. The
  current state is saved as a fresh snapshot first, so a restore can itself be
  undone. Snapshots created before restore support existed (markdown-only)
  can only be downloaded.
- Connect a **sync folder** to mirror a space to local storage, set the
  interval, and run a sync on demand.
- The home screen shows a status chip: a warning while sync and backups are
  not enabled, switching to **folder sync on** once a sync folder is
  connected.

Storage is local, so **regular backups are essential**. Export before clearing
browser data, switching devices, or trying something new.

## If the app fails to start

If the app can't open its local database, it shows a boot error screen. From
there you can choose **Reset local data**, which — after an explicit
confirmation — erases everything the app has stored in this browser and starts
afresh with the demo content. This permanently deletes your documents, notes,
citations and in-app backups, so treat it as a last resort and keep exports
somewhere safe.

> This is an evolving pre-release app. Treat your exports as the source of
> truth and back up often.

## Related

- [Citations & bibliography](citations-and-bibliography) — BibTeX export.
- [Organising your work](organizing-your-work) — what a space contains.
