const https = require('https');
const { refreshAccessToken } = require('./refresh-token');

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
        const importo = parseFloat(data.importo);

        // Costruisci i dati della fattura
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
                        net_price: importo,
                        vat: { id: 6, nature: 'N4' }, // ID e Natura per IVA esente
                    },
                ],
                payments_list: [
                    {
                        amount: importo,
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