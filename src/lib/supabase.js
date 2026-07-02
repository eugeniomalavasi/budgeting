import { createClient } from '@supabase/supabase-js'

// NOTA sul bug "il secondo movimento si blocca, serve refresh forzato":
// Di default supabase-js usa la Web Locks API del browser per sincronizzare
// il refresh del token di autenticazione tra più tab. Su mobile/PWA/alcuni
// browser questo lock può rimanere "agganciato" (deadlock) e blocca TUTTE
// le richieste successive finché non ricarichi la pagina (che resetta il lock).
// Siccome questa è un'app single-tab per due utenti, non ci serve la
// coordinazione multi-tab: disabilitiamo il lock passando una funzione
// "no-op" che esegue subito senza aspettare nessun lock del browser.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  }
)