/**
 * Host half of the dsh-auto-snake bundle.
 *
 * The game, the AI solver and every control live in the browser half, so this
 * entry deliberately does almost nothing. It exists because a bundle needs a
 * Host entry to be a valid Loader row, and because the client manifest
 * (`dsh.client`) is read off this same package.
 *
 * No services are injected and no tools are registered. `apply` is present so
 * the row is a normal Cordis plugin rather than a bare manifest.
 */

export const name = 'dsh-auto-snake';

export function apply() {
  // Intentionally empty: all behaviour lives in client.js.
}

export default { name, apply };
