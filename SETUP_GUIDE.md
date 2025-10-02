# Guida alla Configurazione Iniziale

Questa guida spiega come configurare il sistema di generazione fatture per il collegamento con Fatture in Cloud. Questa procedura va eseguita **una sola volta**.

## Prerequisiti

- Un account su [Fatture in Cloud](https://www.fattureincloud.it/).
- Un account su [Netlify](https://www.netlify.com/) dove è ospitato questo sito.

## Passaggio 1: Ottenere le Credenziali da Fatture in Cloud

1.  Accedi al tuo account di Fatture in Cloud.
2.  Vai su **Impostazioni > Sviluppatore > API OAuth2**.
3.  Crea una nuova applicazione OAuth2:
    - **Nome Applicazione**: Scegli un nome riconoscibile (es. "Sito Pagamenti Pazienti").
    - **Redirect URI**: Incolla l'URL del tuo sito Netlify seguito da `/callback.html`. Esempio: `https://tuo-sito.netlify.app/callback.html`.
4.  Una volta creata l'applicazione, Fatture in Cloud ti mostrerà il **Client ID** e il **Client Secret**. Copiali e tienili al sicuro.

## Passaggio 2: Ottenere il Token API di Netlify

1.  Accedi al tuo account Netlify.
2.  Vai su **User settings > Applications**.
3.  Nella sezione "Personal access tokens", clicca su **New access token**.
4.  Dai un nome al token (es. "Token Aggiornamento Fatture") e salvalo. Verrà mostrato una sola volta, quindi copialo subito.

## Passaggio 3: Configurare le Variabili d'Ambiente su Netlify

1.  Nel pannello del tuo sito su Netlify, vai su **Site configuration > Build & deploy > Environment**.
2.  Clicca su **Edit variables** e aggiungi le seguenti variabili:

| Chiave                | Valore                                                                  |
| --------------------- | ----------------------------------------------------------------------- |
| `FIC_CLIENT_ID`       | Il tuo Client ID ottenuto da Fatture in Cloud.                          |
| `FIC_CLIENT_SECRET`   | Il tuo Client Secret ottenuto da Fatture in Cloud.                      |
| `FIC_COMPANY_ID`      | L'ID della tua azienda su Fatture in Cloud (lo trovi nelle impostazioni). |
| `NETLIFY_API_TOKEN`   | Il token di accesso personale di Netlify che hai appena creato.         |
| `SITE_ID`             | L'ID del tuo sito Netlify (lo trovi in **Site configuration > General**). |
| `FATTURE_REDIRECT_URI`| L'URL completo di callback. Es: `https://tuo-sito.netlify.app/callback.html` |

**Importante**: `FIC_ACCESS_TOKEN` e `FIC_REFRESH_TOKEN` verranno creati e aggiornati automaticamente. Non è necessario impostarli manualmente.

## Passaggio 4: Autorizzazione Iniziale

1.  Dopo aver impostato le variabili e aver deployato il sito, apri il seguente link nel tuo browser:

    `https://tuo-sito.netlify.app/oauth-setup.html`

2.  Verrai reindirizzato a Fatture in Cloud per autorizzare l'applicazione.
3.  Dopo aver dato il consenso, verrai riportato al sito. A questo punto, il sistema avrà salvato automaticamente i token iniziali.

La configurazione è completa. Il sito è ora pronto per accettare pagamenti e creare fatture in automatico, gestendo autonomamente la scadenza e l'aggiornamento dei token.
