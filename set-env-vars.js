const https = require('https');

const SITE_ID = '2aedc05b-957a-484d-8561-813ccb9da44f';
const token = 'nfp_VhxfwFNFZc7oHmycpgULeEA2zudSjkS6db02';

const envVars = {
    'FIC_CLIENT_ID': 's6sHWJld4GNQOR35z5MHLYgFyWPOBUHI',
    'FIC_CLIENT_SECRET': '4A1k2joLMcTMC9U8da2qdsgcC1RGXdhOlzA1DV5cN3Sozu9Ewj7f375LUSWweqdI',
    'FIC_REDIRECT_URI': 'https://fatture-manuali.netlify.app/callback.html',
    'FIC_COMPANY_ID': '1467198',
    'SITE_ID': '2aedc05b-957a-484d-8561-813ccb9da44f',
    'NETLIFY_API_TOKEN': 'nfp_VhxfwFNFZc7oHmycpgULeEA2zudSjkS6db02'
};

async function setEnvVars() {
    // 1. Get current site data
    const getOptions = {
        hostname: 'api.netlify.com',
        path: `/api/v1/sites/${SITE_ID}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    const siteData = await new Promise((resolve, reject) => {
        const req = https.request(getOptions, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`GET failed: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });

    const existingVars = siteData.build_settings?.env || {};
    console.log('Variabili esistenti:', Object.keys(existingVars).join(', '));

    // 2. Merge with new vars
    const newEnv = { ...existingVars, ...envVars };

    // 3. Update via PATCH
    const patchBody = JSON.stringify({
        build_settings: {
            env: newEnv,
        },
    });

    const patchOptions = {
        hostname: 'api.netlify.com',
        path: `/api/v1/sites/${SITE_ID}`,
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(patchBody),
        },
    };

    await new Promise((resolve, reject) => {
        const req = https.request(patchOptions, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 204) {
                    console.log('\n✅ Variabili d\'ambiente aggiornate con successo!');
                    console.log('Variabili aggiunte:', Object.keys(envVars).join(', '));
                    resolve();
                } else {
                    reject(new Error(`PATCH failed: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(patchBody);
        req.end();
    });
}

setEnvVars().catch(error => console.error('❌ Errore:', error.message));
