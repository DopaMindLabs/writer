# @lipsum/collab-relay

A **blind store-and-forward relay** for LIpsum Writer's end-to-end-encrypted
collaboration. It relays bytes it cannot read: per-room publish/subscribe plus an
append-only log of opaque ciphertext blobs. It never holds a plaintext document,
never sees a key, and cannot merge content — Yjs synchronisation runs end-to-end
between clients over frames the server only forwards.

This package is the **reference implementation**, vendored as a workspace so CI can
exercise the protocol. A production deployment would typically live in its own
repository; self-hosting or LAN-only operation is the named privacy mitigation and
falls out of the configurable host/port for free.

## What the relay observes (and cannot)

It can see room ids, ciphertext sizes and message timing, each participant's IP and
connection times, and which connections share a room (who collaborates with whom).
It cannot read content, keys, or reliably attribute who authored a frame.

## Run it

```sh
# Node ≥ 22 (uses --experimental-strip-types to run the TypeScript entry directly)
RELAY_PORT=8787 RELAY_HOST=0.0.0.0 npm start

# or via Docker
docker build -t lipsum-relay .
docker run -p 8787:8787 lipsum-relay
```

Environment:

- `RELAY_PORT` (default `8787`)
- `RELAY_HOST` (default `0.0.0.0` — set to `127.0.0.1` for LAN/loopback only)
- `RELAY_ROOM_SECRET` (optional) — enables a best-effort write token (anti-spam
  only; real authorisation is the clients' signature checks).

## Protocol

Client → server messages (JSON):

- `{ t: 'connect', roomId, token?, resumeFrom? }` — join a room, optionally resume
  from a sequence number.
- `{ t: 'post', blob: { type, payload } }` — append a stored blob (`update`,
  `snapshot`, `roster`, `wrappedKey`, `join`) or forward an ephemeral `awareness`
  frame. The `payload` is opaque ciphertext.
- `{ t: 'supersede', upto }` — drop stored blobs at or below a sequence number
  (client-driven compaction).
- `{ t: 'delete' }` — best-effort room deletion on stop-sharing.

Server → client messages: `{ t: 'blob', blob }`, `{ t: 'awareness', payload }`,
`{ t: 'ack', seq? }`, `{ t: 'error', error }`.
