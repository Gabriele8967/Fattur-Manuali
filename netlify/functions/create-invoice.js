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

exports.handler = async (event) => {
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
        // Use permanent API token from environment variables
        const accessToken = process.env.FIC_ACCESS_TOKEN;
        const companyId = process.env.FIC_COMPANY_ID;

        if (!accessToken || !companyId) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'API token not configured. Please set FIC_ACCESS_TOKEN environment variable.' }),
            };
        }

        const data = JSON.parse(event.body);

        // 1. Costruisci i dati della fattura usando la struttura corretta OpenAPI
        const importo = parseFloat(data.importo);
        const today = new Date().toISOString().split('T')[0];

        const invoicePayload = {
            data: {
                type: 'invoice',
                entity: {
                    name: `${data.nome} ${data.cognome}`,
                    tax_code: data.codiceFiscale,
                    email: data.email,
                    country: 'Italia',
                },
                date: today,
                items_list: [
                    {
                        name: data.causale,
                        qty: 1,
                        net_price: importo,
                        vat: {
                            value: 0
                        },
                    },
                ],
                payment_method: {
                    name: 'Contanti',
                    default_payment_account: {
                        name: 'Cassa'
                    }
                },
                payments_list: [
                    {
                        amount: importo,
                        due_date: today,
                        status: 'not_paid'
                    }
                ]
            },
        };

        const postData = JSON.stringify(invoicePayload);

        // Create invoice with permanent token
        const options = {
            hostname: 'api-v2.fattureincloud.it',
            path: `/c/${companyId}/issued_documents`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Content-Length': postData.length,
            },
        };

        const result = await callFattureInCloudAPI(options, postData);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ invoiceNumber: result.data.number }),
        };

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
        };
    }
};