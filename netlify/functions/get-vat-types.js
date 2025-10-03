const https = require('https');

function callFattureInCloudAPI(options) {
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
        req.end();
    });
}

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    try {
        const accessToken = process.env.FIC_ACCESS_TOKEN;
        const companyId = process.env.FIC_COMPANY_ID;

        if (!accessToken || !companyId) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'API token not configured' }),
            };
        }

        const options = {
            hostname: 'api-v2.fattureincloud.it',
            path: `/c/${companyId}/info/vat_types`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        };

        const result = await callFattureInCloudAPI(options);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
