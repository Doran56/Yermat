// Maps a Supabase auth error to a friendly French message.
// auth-js can surface an unparsed fetch Response as `err.message` (a long JSON blob),
// so we only trust short, clean strings and otherwise fall back to a generic message —
// the raw object must never reach the UI.
export function authErrorMessage(err: unknown): string {
  const status = (err as { status?: number } | null)?.status;
  if (status === 429) {
    return 'Trop de tentatives. Patiente une minute avant de réessayer.';
  }
  const msg = (err as { message?: unknown } | null)?.message;
  if (typeof msg === 'string' && msg.length > 0 && msg.length < 120 && !msg.includes('{')) {
    return msg;
  }
  return "Impossible d'envoyer le code pour le moment. Réessaie dans quelques instants.";
}
