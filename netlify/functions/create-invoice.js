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
const { updateNetlifyEnvVars } = require('./helpers/netlify-api');

async function refreshAccessToken() {
    const postData = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.FIC_CLIENT_ID,
        client_secret: process.env.FIC_CLIENT_SECRET,
        refresh_token: process.env.FIC_REFRESH_TOKEN,
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

    console.log('Tokens refreshed, updating Netlify environment variables...');

    // Salva i nuovi token nelle variabili d'ambiente di Netlify
    await updateNetlifyEnvVars({
        FIC_ACCESS_TOKEN: tokenData.access_token,
        FIC_REFRESH_TOKEN: tokenData.refresh_token,
    });

    // Aggiorna anche per la richiesta corrente
    process.env.FIC_ACCESS_TOKEN = tokenData.access_token;
    process.env.FIC_REFRESH_TOKEN = tokenData.refresh_token;

    console.log('Environment variables updated successfully');

    return tokenData.access_token;
}

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // In produzione, restringere a `process.env.URL`
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
            const result = await createInvoice(process.env.FIC_ACCESS_TOKEN);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ invoiceNumber: result.data.number }),
            };
        } catch (error) {
            // Se il token è scaduto (401), aggiornalo e riprova
            if (error.statusCode === 401) {
                console.log('Access token expired. Refreshing...');
                const newAccessToken = await refreshAccessToken();
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