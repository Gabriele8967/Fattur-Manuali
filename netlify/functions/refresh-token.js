const https = require('https');
const { updateNetlifyEnvVars } = require('./helpers/netlify-api');

async function refreshAccessToken() {
    console.log('Starting token refresh process...');

    const { FIC_CLIENT_ID, FIC_CLIENT_SECRET, FIC_REFRESH_TOKEN } = process.env;

    if (!FIC_CLIENT_ID || !FIC_CLIENT_SECRET || !FIC_REFRESH_TOKEN) {
        throw new Error('Missing Fatture in Cloud environment variables for token refresh.');
    }

    const postData = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: FIC_CLIENT_ID,
        client_secret: FIC_CLIENT_SECRET,
        refresh_token: FIC_REFRESH_TOKEN,
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

    // 1. Get new tokens from Fatture in Cloud
    const tokenData = await new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Failed to refresh token. Status: ${res.statusCode}, Body: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });

    const { access_token, refresh_token } = tokenData;
    console.log('Successfully received new tokens from Fatture in Cloud.');

    // 2. Update Netlify environment variables
    await updateNetlifyEnvVars({
        FIC_ACCESS_TOKEN: access_token,
        FIC_REFRESH_TOKEN: refresh_token,
    });

    // 3. Update environment for the current execution context
    process.env.FIC_ACCESS_TOKEN = access_token;
    process.env.FIC_REFRESH_TOKEN = refresh_token;

    console.log('Token refresh process completed.');

    return access_token;
}

// This function can be triggered manually or by other functions.
// For this project, it's used as a module, but we export a handler for potential direct invocation.
exports.handler = async () => {
    try {
        await refreshAccessToken();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Token refreshed and environment variables updated successfully.' }),
        };
    } catch (error) {
        console.error('Refresh token handler failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

module.exports.refreshAccessToken = refreshAccessToken;