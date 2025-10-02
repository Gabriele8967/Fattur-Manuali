# Istruzioni per il Deploy GDPR-Compliant su Netlify

⚠️ **IMPORTANTE**: Sistema completamente sicuro e conforme al GDPR

## 1. Configurazione Redirect URL per OAuth

Quando configuri l'app OAuth in Fatture in Cloud, inserisci come **Redirect URL**:
```
https://il-tuo-sito.netlify.app/callback
```
*Sostituisci "il-tuo-sito" con il nome effettivo del tuo sito Netlify*

## 2. Variabili d'Ambiente Netlify (OBBLIGATORIE)

Nella dashboard Netlify, vai in **Site Settings > Environment Variables** e aggiungi:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=la-tua-email-aziendale@dominio.it
SMTP_PASS=la-tua-app-password
AUDIT_LOG_ENDPOINT=https://your-logging-service.com/api/logs (opzionale)
AUDIT_LOG_TOKEN=your-secure-token (opzionale)
```

**⚠️ NIENTE HARDCODING**: Tutte le email e configurazioni aziendali sono configurabili.

### Come ottenere la Gmail App Password:
1. Vai in [Google Account Settings](https://myaccount.google.com/)
2. Sicurezza > Verifica in due passaggi (deve essere attiva)
3. Password per le app > Genera password app
4. Usa quella password come `SMTP_PASS`

## 3. Deploy su Netlify

### Metodo 1: Deploy da Git
1. Fai push del codice su GitHub/GitLab
2. Connetti il repository a Netlify
3. Il deploy avverrà automaticamente

### Metodo 2: Deploy manuale
1. Zip tutti i file della cartella
2. Carica su Netlify via drag & drop
3. Il sito sarà online immediatamente

## 4. Configurazione GDPR (OBBLIGATORIA)

**Prima di usare il sistema:**
1. Visita `/gdpr-consent.html`
2. Compila i dati della tua azienda/studio medico
3. Accetta i consensi richiesti
4. Il sistema sarà abilitato solo dopo questa configurazione

## 5. Test del Sistema

Dopo configurazione GDPR:
1. Configura OAuth Fatture in Cloud
2. Prova creazione fattura
3. Verifica invio email privacy (se consenso dato)
4. Controlla audit log per compliance

## 5. Configurazione OAuth Completa

### In Fatture in Cloud:
1. Vai nelle impostazioni API
2. Crea una nuova applicazione OAuth
3. Imposta:
   - **Nome**: Generatore Fatture Sanitarie
   - **Redirect URI**: `https://il-tuo-sito.netlify.app/callback`
   - **Scope**: `issued_documents.invoices:w`, `user.companies:r`

### Nel sito:
1. Inserisci `Client ID` e `Client Secret` dalla console Fatture in Cloud
2. Il sistema gestirà automaticamente l'autenticazione

## 6. Conformità GDPR

### Funzionalità di Sicurezza Implementate:
- ✅ **Crittografia AES-256** per dati sensibili
- ✅ **Audit log completi** per ogni operazione
- ✅ **Consensi espliciti** per ogni trattamento
- ✅ **Anonimizzazione automatica** nei log
- ✅ **Configurazione no-hardcode** per privacy
- ✅ **Diritti GDPR** implementati
- ✅ **Sicurezza by design**

### Compliance:
- 📋 **Privacy Policy completa**
- 📋 **Cookie Policy** (solo tecnici)
- 📋 **Consensi granulari**
- 📋 **Tempi di conservazione** conformi
- 📋 **Base giuridica** per ogni trattamento
- 📋 **Audit trail** per autorità

## 7. Risoluzione Problemi

### Email non inviate:
- Verifica che `SMTP_USER` e `SMTP_PASS` siano configurate
- Controlla che la Gmail App Password sia corretta
- Verifica nei logs di Netlify eventuali errori

### OAuth non funziona:
- Controlla che il Redirect URL sia esatto
- Verifica Client ID e Client Secret
- Assicurati che il sito sia servito via HTTPS

### API Fatture in Cloud:
- Verifica che i token non siano scaduti
- Controlla che il Company ID sia corretto
- Verifica i permessi dell'applicazione OAuth

## File Generati - Sistema GDPR-Compliant

### Frontend:
- ✅ `index.html` - Form principale con banner GDPR
- ✅ `gdpr-consent.html` - Configurazione e consensi GDPR
- ✅ `privacy-policy.html` - Informativa privacy completa
- ✅ `callback.html` - Gestione OAuth callback
- ✅ `app.js` - Logica con audit e sicurezza
- ✅ `crypto-utils.js` - Utilities crittografiche
- ✅ `style.css` - Stili responsive + GDPR

### Backend (Netlify Functions):
- ✅ `send-privacy.js` - Email privacy configurabile
- ✅ `audit-log.js` - Sistema audit GDPR-compliant

### Configurazione:
- ✅ `netlify.toml` - Deploy configuration
- ✅ `package.json` - Dipendenze sicure

## 8. Diritti degli Utenti GDPR

Il sistema implementa tutti i diritti GDPR:
- **Accesso**: Audit log esportabili
- **Rettifica**: Modifica dati in tempo reale
- **Cancellazione**: Funzione "Dimentica utente"
- **Portabilità**: Export dati strutturati
- **Opposizione**: Revoca consensi

## Supporto

**Per problemi tecnici:**
- Netlify Logs: Site Overview > Functions > Logs
- Browser Console per errori JavaScript
- Documentazione API: https://developers.fattureincloud.it/

**Per conformità GDPR:**
- Privacy Policy integrata nel sistema
- Audit log automatici per dimostrare compliance
- Configurazione flessibile per ogni titolare

**🔒 Il sistema è progettato per essere sicuro by design e GDPR-compliant dal primo utilizzo.**