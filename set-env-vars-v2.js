const https = require('https');

const SITE_ID = '2aedc05b-957a-484d-8561-813ccb9da44f';
const token = 'nfp_VhxfwFNFZc7oHmycpgULeEA2zudSjkS6db02';

const envVars = [
    { key: 'FIC_CLIENT_ID', value: 's6sHWJld4GNQOR35z5MHLYgFyWPOBUHI' },
    { key: 'FIC_CLIENT_SECRET', value: '4A1k2joLMcTMC9U8da2qdsgcC1RGXdhOlzA1DV5cN3Sozu9Ewj7f375LUSWweqdI' },
    { key: 'FIC_REDIRECT_URI', value: 'https://fatture-manuali.netlify.app/callback.html' },
    { key: 'FIC_COMPANY_ID', value: '1467198' },
    { key: 'SITE_ID', value: '2aedc05b-957a-484d-8561-813ccb9da44f' },
    { key: 'NETLIFY_API_TOKEN', value: 'nfp_VhxfwFNFZc7oHmycpgULeEA2zudSjkS6db02' }
];

async function setEnvVar(key, value) {
    const postBody = JSON.stringify({
        key: key,
        values: [
            {
                context: 'all',
                value: value
            }
        ]
    });

    const options = {
        hostname: 'api.netlify.com',
        path: `/api/v1/accounts/672b8835d05b4400d7ced246/env`,
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
                    console.log(`✅ ${key} impostata`);
                    resolve();
                } else if (res.statusCode === 409) {
                    console.log(`ℹ️  ${key} già esistente, aggiorno...`);
                    updateEnvVar(key, value).then(resolve).catch(reject);
                } else {
                    console.error(`❌ ${key} fallita: ${res.statusCode} ${data}`);
                    resolve(); // Continue anyway
                }
            });
        });
        req.on('error', reject);
        req.write(postBody);
        req.end();
    });
}

async function updateEnvVar(key, value) {
    const patchBody = JSON.stringify({
        key: key,
        values: [
            {
                context: 'all',
                value: value
            }
        ]
    });

    const options = {
        hostname: 'api.netlify.com',
        path: `/api/v1/accounts/672b8835d05b4400d7ced246/env/${key}`,
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
                    console.log(`✅ ${key} aggiornata`);
                    resolve();
                } else {
                    console.error(`❌ ${key} update fallito: ${res.statusCode} ${data}`);
                    resolve();
                }
            });
        });
        req.on('error', reject);
        req.write(patchBody);
        req.end();
    });
}

async function main() {
    console.log('Configurazione variabili d\'ambiente su Netlify...\n');

    for (const env of envVars) {
        await setEnvVar(env.key, env.value);
    }

    console.log('\n✅ Configurazione completata!');
    console.log('Il sito verrà ridistribuito automaticamente.');
}

main().catch(error => console.error('Errore:', error));
