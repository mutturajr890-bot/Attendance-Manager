// Auth storage adapter for the Supabase client.
// (Previously this also brokered the session with the Lovable editor's
// preview iframe; that logic has been removed and it now just uses the
// browser's localStorage, same as Supabase's own default.)
export function brokeredPreviewStorage() {
  if (typeof window === 'undefined') return undefined;
  return localStorage;
}
