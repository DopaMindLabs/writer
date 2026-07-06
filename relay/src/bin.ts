#!/usr/bin/env -S node --experimental-strip-types
/**
 * Entry point for running the reference relay: `npx @lipsum/collab-relay` or via
 * Docker. Binds a configurable host/port so LAN-only / self-hosted operation
 * needs no extra flags. A room secret (anti-spam write token) is optional.
 */
import { createRelayServer } from './server.ts';

const port = Number(process.env.RELAY_PORT ?? '8787');
const host = process.env.RELAY_HOST ?? '0.0.0.0';
const roomSecret = process.env.RELAY_ROOM_SECRET;

createRelayServer({ port, host, roomSecret });

process.stdout.write(`lipsum blind relay listening on ws://${host}:${String(port)}\n`);
