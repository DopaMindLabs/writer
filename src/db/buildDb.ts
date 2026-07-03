import { LoremDB } from './LoremDB';

/**
 * Constructs the app database. A factory (rather than a bare `new`) gives the
 * cloud-sync layer a single seam to wrap: Task 6 adds the gated cloud
 * construction here, leaving every caller importing `db` from `./db` unchanged.
 */
export const buildDb = (name = 'lipsum'): LoremDB => new LoremDB(name);
