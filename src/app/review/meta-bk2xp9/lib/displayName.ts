/**
 * Display fallback for a commenter's name on the Meta review demo dashboard.
 *
 * Graph v25.0 omits the `from` object for comments authored by ordinary users
 * who haven't authorised the app, so `commenterName` arrives null even for a
 * valid reply target (the comment id is still present, so the comment is a
 * legitimate target — we just can't show who wrote it). The data layer keeps
 * the name null; the UI renders this neutral label instead of an empty name.
 */
export function commenterDisplayName(name: string | null | undefined): string {
  return name && name.trim() ? name : 'Facebook user'
}
