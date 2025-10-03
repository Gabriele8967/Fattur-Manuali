const https = require('https');
const { URLSearchParams } = require('url');

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

    let code;
    try {
        const body = JSON.parse(event.body);
        code = body.code;
        if (!code) {
            throw new Error('Authorization code is missing.');
        }
    } catch (error) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request: ' + error.message }) };
    }

    try {
        const { FIC_CLIENT_ID, FIC_CLIENT_SECRET, FIC_REDIRECT_URI } = process.env;

        const postData = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: FIC_CLIENT_ID,
            client_secret: FIC_CLIENT_SECRET,
            redirect_uri: FIC_REDIRECT_URI,
            code: code,
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

        // 1. Exchange authorization code for tokens
        const tokenData = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`Fatture in Cloud API error. Status: ${res.statusCode}, Body: ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });

        // 2. Return tokens to client for storage in localStorage
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Authentication successful',
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                companyId: process.env.FIC_COMPANY_ID,
                timestamp: new Date().toISOString()
            }),
        };

    } catch (error) {
        console.error('OAuth token exchange failed:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error: ' + error.message }),
        };
    }
};
