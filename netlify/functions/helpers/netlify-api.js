
const https = require('https');

async function updateNetlifyEnvVars(varsToUpdate) {
    const { SITE_ID, NETLIFY_API_TOKEN } = process.env;

    if (!SITE_ID || !NETLIFY_API_TOKEN) {
        throw new Error('Missing SITE_ID or NETLIFY_API_TOKEN environment variables.');
    }

    // Get account ID from site info
    const siteInfo = await getSiteInfo(SITE_ID, NETLIFY_API_TOKEN);
    const accountId = siteInfo.account_slug;

    // Update each variable using the new API
    for (const [key, value] of Object.entries(varsToUpdate)) {
        await setOrUpdateEnvVar(accountId, SITE_ID, NETLIFY_API_TOKEN, key, value);
    }

    console.log('Netlify environment variables updated successfully.');
}

async function getSiteInfo(siteId, token) {
    const options = {
        hostname: 'api.netlify.com',
        path: `/api/v1/sites/${siteId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Failed to get site info: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function setOrUpdateEnvVar(accountId, siteId, token, key, value) {
    // First try to get existing var to determine if we should PATCH or POST
    try {
        const existingVar = await getEnvVar(accountId, siteId, token, key);

        // Variable exists, update it
        return await updateEnvVar(accountId, siteId, token, key, value);
    } catch (error) {
        // Variable doesn't exist, create it
        return await createEnvVar(accountId, siteId, token, key, value);
    }
}

async function getEnvVar(accountId, siteId, token, key) {
    const options = {
        hostname: 'api.netlify.com',
        path: `/api/v1/accounts/${accountId}/env/${key}?site_id=${siteId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Var not found: ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function createEnvVar(accountId, siteId, token, key, value) {
    const postBody = JSON.stringify({
        key: key,
        scopes: ['builds', 'functions', 'runtime', 'post_processing'],
        values: [{
            context: 'all',
            value: value
        }]
    });

    const options = {
        hostname: 'api.netlify.com',
        path: `/api/v1/accounts/${accountId}/env?site_id=${siteId}`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postBody),
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log(`Created env var: ${key}`);
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Failed to create env var ${key}: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(postBody);
        req.end();
    });
}

async function updateEnvVar(accountId, siteId, token, key, value) {
    const patchBody = JSON.stringify({
        key: key,
        scopes: ['builds', 'functions', 'runtime', 'post_processing'],
        values: [{
            context: 'all',
            value: value
        }]
    });

    const options = {
        hostname: 'api.netlify.com',
        path: `/api/v1/accounts/${accountId}/env/${key}?site_id=${siteId}`,
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(patchBody),
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 204) {
                    console.log(`Updated env var: ${key}`);
                    resolve();
                } else {
                    reject(new Error(`Failed to update env var ${key}: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(patchBody);
        req.end();
    });
}

module.exports = { updateNetlifyEnvVars };
