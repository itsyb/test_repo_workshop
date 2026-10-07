/** Thrown for rule violations; the message is shown to the user. */
export class RuleError extends Error {}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
