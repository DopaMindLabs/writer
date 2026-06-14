# Work with PDF notes

A **PDF** note links a PDF document — a paper, a brief, a chapter — into a
BrainSpace card, where you can write commentary beneath it and open the PDF in
a reading pane beside your editor. You can attach a PDF from your space's media
library or by pasting a link to one.

## Add a PDF to a note

1. In a space that has PDF notes enabled (the Thesis · research template does
   by default), open **BrainSpace** and add a **PDF** card from the canvas
   toolbar.
2. The empty card shows a **Select PDF** button. Click it to open the picker.
3. Choose how to add the PDF:
   - **From library** — pick a PDF you have already uploaded to this space.
   - **Paste URL** — enter an `https://` link to a PDF, for example
     `https://arxiv.org/pdf/1706.03762.pdf`, and click **Select**.

The card shows the first-page thumbnail and the page count once the PDF is
ready, and caches it so it loads instantly next time.

## Trust a domain

The app only fetches PDFs from hosts you have approved. The first time you
paste a link from an unfamiliar domain (such as `arxiv.org`), a dialog asks
**Trust PDFs from {domain}?**. Click **Trust & fetch** to add the domain to
your trusted list and download the PDF; you will not be asked for that domain
again. You can review and remove trusted domains later from the media library.

Common paper hosts are trusted out of the box, so most links work without a
prompt.

## Upload PDFs to your library

Build a reusable library of PDFs for a space so you can attach the same
document to several notes:

1. Open the **Media library** from the sidebar.
2. Click **Upload PDF** and choose a PDF from your computer.
3. The PDF is validated and added to the library, where you can search it,
   preview it, and delete it.

Each PDF can be up to 50 MB. The library is local to your browser, just like
your notes.

## Add commentary

Click the body of the card to add your own **commentary** — for example,
_"methods section, ε-greedy is the bit we want to cite"_ — exactly as you would
with any other note. Your commentary stays with the note even if you change the
PDF source.

## Open it beside the editor

Click **open beside editor** on the card. A reading pane slides in next to your
draft. Use the **←/→** arrow keys (or the toolbar) to turn pages, and **+/−**
to zoom. The pane stays open as you move between documents in the same space,
and closes when you switch spaces.

## Change or refresh the PDF

- **Edit source** — open the picker again to choose a different library item or
  paste a new URL.
- **Refresh PDF** — re-download a URL-sourced PDF from the same link (useful if
  the source has been updated). Library-sourced notes have no refresh, since
  the file is stored with your space.

## When a URL won't load

Some hosts don't allow other websites to download their files, and a link may
fail with a short message — _the host blocks cross-origin requests_, _not
found_, _not a PDF_, _too large_, or _the domain is not in your trusted list_.
Choose **Edit source** to try a different link, trust the domain, or upload the
file to your library instead, which avoids cross-origin restrictions entirely.
