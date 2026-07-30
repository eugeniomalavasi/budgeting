# Fase 1 — Configurazione (da fare nelle dashboard)

Il codice è pronto. Restano i passi che richiedono i tuoi account. **Ordine consigliato:**
1. Lancia la migration SQL
2. Configura Resend + SMTP su Supabase
3. Imposta gli URL di redirect
4. Configura Google OAuth
5. Deploy del codice

---

## 1. Migration SQL

Supabase → **SQL Editor** → incolla tutto `supabase_phase1.sql` → **Run**.
Poi esegui le query di verifica in fondo al file: tutti i profili e i mesi
esistenti devono avere lo **stesso** `household_id`.

> Se dà errore su un nome di constraint diverso da quello atteso, mandami
> l'errore: i nomi di default sono `transactions_month_id_fkey` e
> `shared_expenses_month_id_fkey`, ma potrebbero differire.

---

## 2. Resend + SMTP (email reali)

Di default Supabase manda le email con un servizio interno **limitato a poche
mail/ora** e solo a indirizzi membri del progetto — inutilizzabile in pubblico.
Resend lo sostituisce.

### 2a. Resend
1. Crea account su https://resend.com
2. **Domains** → aggiungi il tuo dominio → inserisci i record DNS (SPF/DKIM)
   che ti mostra. (Senza dominio puoi testare solo verso la tua stessa email.)
3. **API Keys** → crea una chiave (serve host/porta SMTP, non l'API key HTTP):
   - Host: `smtp.resend.com`
   - Porta: `465` (SSL) oppure `587` (TLS)
   - User: `resend`
   - Password: la tua **API key** Resend

### 2b. Collega a Supabase
Supabase → **Authentication → Emails → SMTP Settings** (o *Project Settings →
Auth*) → **Enable Custom SMTP**:
- Sender email: es. `no-reply@iltuodominio.it`
- Sender name: `Budget`
- Host `smtp.resend.com`, Port `465`, User `resend`, Password = API key
- Salva.

### 2c. Conferma email attiva
Supabase → **Authentication → Providers → Email**:
- **Confirm email**: ON (l'utente deve confermare — il codice già gestisce il
  messaggio "controlla la mail")
- **Enable Signup**: ON

---

## 3. URL di redirect

Supabase → **Authentication → URL Configuration**:
- **Site URL**: l'URL di produzione (es. `https://budget.iltuodominio.it`)
- **Redirect URLs** (aggiungi tutte quelle che usi):
  - `https://budget.iltuodominio.it`
  - `https://budget.iltuodominio.it/**`
  - `http://localhost:5173` e `http://localhost:5173/**` (per sviluppo)

> L'app usa hash-router + PKCE: dopo conferma/reset/Google, Supabase torna
> all'origin con `?code=...` e il codice completa la sessione da solo.
> Per il reset, al ritorno scatta l'evento `PASSWORD_RECOVERY` e l'app
> dirotta da sola sulla schermata `/reset` per la nuova password.

---

## 4. Google OAuth

### 4a. Google Cloud Console
1. https://console.cloud.google.com → crea/scegli un progetto
2. **APIs & Services → OAuth consent screen**: tipo *External*, compila nome
   app, email di supporto, dominio. Aggiungi te stesso come *test user*
   finché l'app è in verifica.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: il tuo dominio + `http://localhost:5173`
   - **Authorized redirect URIs**: incolla l'URL che ti dà Supabase, cioè
     `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
     (lo trovi al punto 4b)
   - Salva → copia **Client ID** e **Client Secret**

### 4b. Supabase
Supabase → **Authentication → Providers → Google**:
- Enable ON
- Incolla **Client ID** e **Client Secret**
- Copia da qui il **Callback URL** e verifica che sia tra i redirect URI di Google
- Salva

Il bottone "Continua con Google" in `Login.vue` è già collegato a
`signInWithGoogle()`.

> Nota: un login Google crea un nuovo utente → il trigger `handle_new_user`
> gli crea un household dedicato (parte vuoto). Per farlo entrare nella
> famiglia Mido servirà la Fase 4 (inviti).

---

## 5. Deploy

Committa e fai il deploy su Vercel come al solito. Verifica in produzione:
- [ ] Registrazione → arriva la mail di conferma (Resend)
- [ ] Conferma → login → l'app mostra un mese vuoto (nuovo household)
- [ ] Password dimenticata → mail → link `/#/reset` → nuova password → login
- [ ] Continua con Google → redirect → sessione attiva
- [ ] Il nuovo utente **non** vede i dati della famiglia Mido
