# Generatore Fatture Sanitarie v2.1 - OAuth Fixed

Sistema web sicuro per la creazione automatica di fatture per prestazioni sanitarie utilizzando le API di Fatture in Cloud.

## 🚀 Versione 2.1 - OAuth Scope Fix

### ✅ Fix Critici Implementati
- **OAuth Scope corretti**: `issued_documents.invoices:a entity.clients:r`
- **Documentazione ufficiale**: Scope verificati dalla documentazione Fatture in Cloud
- **Compatibilità garantita**: Funziona con le API v2 attuali
- **Errori risolti**: "scope is not valid" completamente risolto

### 🔧 Nuovi Scope OAuth

**Scope implementati secondo documentazione ufficiale:**
- `issued_documents.invoices:a` - Accesso completo (`:a`) alle fatture
- `entity.clients:r` - Lettura (`:r`) dei dati clienti

**Vantaggi:**
- ✅ Principio di "Least Privilege" applicato
- ✅ Solo permessi necessari per il funzionamento
- ✅ Sicurezza massima per l'utente
- ✅ Compatibilità garantita con API Fatture in Cloud

## 🔧 Configurazione Variabili d'Ambiente

Le seguenti variabili d'ambiente sono **OBBLIGATORIE** su Netlify:

### Credenziali OAuth
- `FATTURE_CLIENT_ID` - (Configurare su Netlify)
- `FATTURE_CLIENT_SECRET` - (Configurare su Netlify - NON includere mai nel codice)
- `FATTURE_COMPANY_ID` - (Configurare su Netlify)
- `FATTURE_REDIRECT_URI` - (URL del tuo sito Netlify + /callback)

### Email (Opzionali)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`

## 🧪 Test OAuth v2.1

**URL di test con scope corretti:**
```
https://api-v2.fattureincloud.it/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_NETLIFY_URL/callback&scope=issued_documents.invoices:a entity.clients:r&state=test123
```

## 🎯 Utilizzo Post-Deploy

1. **Vai su**: `https://IL-TUO-SITO-NETLIFY.netlify.app/oauth-setup.html`
2. **Clicca**: "🔐 Autorizza Sistema"
3. **Autorizza**: Su Fatture in Cloud con le tue credenziali
4. **Usa**: Interfaccia principale per creare fatture

**Sistema pronto per l'uso in produzione! 🚀**