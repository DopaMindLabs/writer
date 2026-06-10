# The document inspector

The document inspector is the panel beside the editor. Its **Outline** tab maps the
document's structure, and its **Info** tab shows live details about the document you're
writing and lets you set a few optional limits and a status. You choose which of these
fields appear — globally and per space — so the inspector only shows what you care about.

## The outline

The **Outline** tab lists the document's headings in order, indented by level, so you can
see the shape of a long piece at a glance. It updates a moment after you pause typing.

The outline is built from your headings — type `# `, `## ` or `### ` at the start of a
line (or use the floating toolbar) to add one. A document without headings shows an empty
outline; see [Formatting & markdown](formatting-and-markdown#headings-and-structure) for
how headings work.

## Word and character counts

The Info tab always shows the live **word** and **character** counts for the document.

## Setting a word or character limit

If the **Word limit** or **Character limit** field is shown, type a number to set a target.
The count then reads `current / limit`, and once you go over the limit the count turns red
and the over-limit text is highlighted in the editor. Nothing is ever deleted or cropped —
the highlight is only a visual cue, so you can keep writing and trim later.

Leave a limit empty (or set it to `0`) for no limit.

If you'd rather keep the limit and the counter but not the editor highlight, turn off
**Highlight over-limit text** in settings (see below).

## Status and locking

The **Status** picker moves a document through its stages: _Draft_, _In progress_, _In
review_, _Complete_ and _Published_. Setting the status to **Complete** or **Published**
locks the document so it can't be changed by accident — a banner appears over the editor
with an **Unlock to edit** button. To unlock, use that button or set the status back to an
earlier stage. Locking only protects the document body; nothing is deleted.

## Due date

If the **Due date** field is shown, pick a date to record a deadline. An overdue date is
shown in red.

## Choosing which fields appear

Every inspector field is optional. To choose which appear:

- **Globally:** open **Settings → Doc inspector** and turn each field on or off. You can
  also choose which status stages appear in the picker.
- **Per space:** open a space's **Settings → Doc inspector**. Each field can inherit the
  global default or be turned on or off just for that space.

Turning a field off hides it from the inspector — along with its limit and the editor highlight —
even if you'd set a value earlier. The value isn't deleted: turn the field back on and it reappears.
