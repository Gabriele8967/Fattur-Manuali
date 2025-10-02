
const https = require('https');

async function updateNetlifyEnvVars(varsToUpdate) {
    const { SITE_ID, NETLIFY_API_TOKEN } = process.env;

    if (!SITE_ID || !NETLIFY_API_TOKEN) {
        throw new Error('Missing SITE_ID or NETLIFY_API_TOKEN environment variables.');
    }

    const path = `/api/v1/sites/${SITE_ID}`;
    const options = {
        hostname: 'api.netlify.com',
        path: path,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${NETLIFY_API_TOKEN}`,
        },
    };

    // 1. Get current environment variables to avoid deleting existing ones
    const siteData = await new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Netlify API GET failed with status ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });

    const existingVars = siteData.build_settings.env || {};

    // 2. Prepare the new set of variables
    const newEnv = { ...existingVars, ...varsToUpdate };

    // 3. Make the PATCH request to update the variables
    const patchPath = `/api/v1/sites/${SITE_ID}`;
    const patchBody = JSON.stringify({
        build_settings: {
            env: newEnv,
        },
    });

    const patchOptions = {
        hostname: 'api.netlify.com',
        path: patchPath,
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${NETLIFY_API_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': patchBody.length,
        },
    };

    await new Promise((resolve, reject) => {
        const req = https.request(patchOptions, res => {
            if (res.statusCode === 204 || res.statusCode === 200) {
                console.log('Netlify environment variables updated successfully.');
                resolve();
            } else {
                 let data = '';
                 res.on('data', chunk => data += chunk);
                 res.on('end', () => {
                    reject(new Error(`Netlify API PATCH failed with status ${res.statusCode}: ${data}`));
                 });
            }
        });
        req.on('error', reject);
        req.write(patchBody);
        req.end();
    });
}

module.exports = { updateNetlifyEnvVars };
