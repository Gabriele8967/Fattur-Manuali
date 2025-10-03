const https = require('https');

// Funzione per chiamare l'API di Fatture in Cloud
function callFattureInCloudAPI(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    const error = new Error(`API Error ${res.statusCode}: ${data}`);
                    error.statusCode = res.statusCode;
                    reject(error);
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// Funzione per aggiornare il token
const { URLSearchParams } = require('url');

async function refreshAccessToken(currentRefreshToken) {
    const postData = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.FIC_CLIENT_ID,
        client_secret: process.env.FIC_CLIENT_SECRET,
        refresh_token: currentRefreshToken,
    }).toString();

    const options = {
        hostname: 'api-v2.fattureincloud.it',
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length,
        },
    };

    const tokenData = await callFattureInCloudAPI(options, postData);

    console.log('Tokens refreshed, saving to Netlify Blobs...');

    // Salva i nuovi token in Netlify Blobs
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({
        name: 'fic-tokens',
        siteID: process.env.SITE_ID,
        token: process.env.NETLIFY_API_TOKEN
    });
    await store.setJSON('oauth-tokens', {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        timestamp: new Date().toISOString()
    });

    console.log('Tokens updated successfully in Netlify Blobs');

    return tokenData.access_token;
}

exports.handler = async (event, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        // Get tokens from Netlify Blobs
        const { getStore } = await import('@netlify/blobs');
        const store = getStore({
            name: 'fic-tokens',
            siteID: process.env.SITE_ID || context.site?.id,
            token: process.env.NETLIFY_API_TOKEN
        });
        const tokens = await store.getJSON('oauth-tokens');

        if (!tokens || !tokens.accessToken) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'OAuth tokens not configured. Please authorize the system first.' }),
            };
        }

        const data = JSON.parse(event.body);
        const companyId = process.env.FIC_COMPANY_ID;

        // 1. Costruisci i dati della fattura
        const invoicePayload = {
            data: {
                type: 'invoice',
                entity: {
                    name: `${data.nome} ${data.cognome}`,
                    tax_code: data.codiceFiscale,
                    email: data.email,
                    country: 'IT',
                },
                date: new Date().toISOString().split('T')[0],
                items_list: [
                    {
                        name: data.causale,
                        qty: 1,
                        net_price: data.importo,
                        vat: { id: 0 }, // Esente IVA, da configurare se necessario
                    },
                ],
                payments_list: [
                    {
                        amount: data.importo,
                        due_date: new Date().toISOString().split('T')[0],
                        status: 'paid',
                    },
                ],
            },
        };

        const postData = JSON.stringify(invoicePayload);

        const createInvoice = async (token) => {
            const options = {
                hostname: 'api-v2.fattureincloud.it',
                path: `/c/${companyId}/issued_documents`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Content-Length': postData.length,
                },
            };
            return await callFattureInCloudAPI(options, postData);
        };

        try {
            // Prova a creare la fattura con il token attuale
            const result = await createInvoice(tokens.accessToken);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ invoiceNumber: result.data.number }),
            };
        } catch (error) {
            // Se il token è scaduto (401), aggiornalo e riprova
            if (error.statusCode === 401) {
                console.log('Access token expired. Refreshing...');
                const newAccessToken = await refreshAccessToken(tokens.refreshToken);
                const result = await createInvoice(newAccessToken);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ invoiceNumber: result.data.number }),
                };
            }
            throw error; // Altri errori
        }

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
        };
    }
};