# Reference a PDF in a note

The **PDF reference** note kind lets you link a published PDF — a paper, a
brief, a chapter — into a BrainSpace card, write your commentary beneath it,
and open the PDF in a reading pane beside the editor.

## Add a PDF reference

1. In a space that has PDF references enabled (the Thesis · research template
   does by default), open **BrainSpace** and click the **+ PDF reference**
   button on the canvas toolbar.
2. A card appears with an empty URL field. Paste an **https://** link to a PDF
   — for example, `https://arxiv.org/pdf/1706.03762.pdf` — and press
   **fetch**.
3. The card downloads the file, shows the first-page thumbnail and the page
   count, and caches the PDF so it loads instantly next time.

You can then click the body of the card to add your own **commentary** —
e.g. _"methods section, ε-greedy is the bit we want to cite"_ — exactly the
same as any other note's body.

## Open it beside the editor

Click **↗ open beside editor** on the card. A reading pane slides in next to
your draft. Use the **←/→** arrow keys (or the toolbar) to flip pages, and
**+/−** to zoom. The reading pane stays open as you move between documents in
the same space, and closes when you switch spaces.

## When the PDF won't load

Some hosts don't allow other websites to download their files (a browser-level
restriction called **CORS**). When that happens you'll see a banner reading
**"Couldn't fetch this PDF"** with the reason — _CORS blocked_, _404 not
found_, _not a PDF_, _too large_. Use the **edit URL** field on the banner to
try a different link, or fetch the same file from a different host.

(In a future update we'll let you upload PDFs from your computer, which avoids
CORS entirely.)

## Replace or refresh the linked PDF

- **Edit URL** — change the link to point at a different file.
- **Refresh PDF** — re-download from the same URL (useful if the source has
  been updated).

PDF references are local: they live in this browser's storage, just like your
notes. Clearing your browser data removes them.
