const https = require('https');

exports.handler = async (event, context) => {
    // Solo POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { code, state } = JSON.parse(event.body);

        if (!code) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Authorization code is required' })
            };
        }

        // Verifica che tutte le variabili d'ambiente siano configurate
        const requiredEnvVars = [
            'FATTURE_CLIENT_ID',
            'FATTURE_CLIENT_SECRET',
            'FATTURE_COMPANY_ID',
            'FATTURE_REDIRECT_URI'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('Missing environment variables:', missingVars);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: `Server configuration error`
                })
            };
        }

        // Scambia il codice per il token
        const tokenData = await exchangeCodeForToken(code, state);

        // Restituisci le credenziali
        const credentials = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in * 1000),
            companyId: process.env.FATTURE_COMPANY_ID,
            method: 'oauth',
            timestamp: new Date().toISOString()
        };

        console.log('OAuth token exchange successful for company:', process.env.FATTURE_COMPANY_ID);
        console.log('--- TO BE SET AS NETLIFY ENVIRONMENT VARIABLE ---');
        console.log('FATTURE_MASTER_REFRESH_TOKEN:', tokenData.refresh_token);
        console.log('--------------------------------------------------');
        console.log('Initial Access Token:', tokenData.access_token);
        console.log('Expires At:', Date.now() + (tokenData.expires_in * 1000));

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(credentials)
        };

    } catch (error) {
        console.error('OAuth token exchange error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: error.message || 'Token exchange failed'
            })
        };
    }
};

async function exchangeCodeForToken(code, state) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            grant_type: 'authorization_code',
            client_id: process.env.FATTURE_CLIENT_ID,
            client_secret: process.env.FATTURE_CLIENT_SECRET,
            redirect_uri: process.env.FATTURE_REDIRECT_URI,
            code: code
        });

        const options = {
            hostname: 'api-v2.fattureincloud.it',
            port: 443,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const tokenData = JSON.parse(data);
                        resolve(tokenData);
                    } catch (error) {
                        reject(new Error('Failed to parse token response: ' + data));
                    }
                } else {
                    reject(new Error(`Token exchange failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}