const https = require('https');

const token = 'nfp_VhxfwFNFZc7oHmycpgULeEA2zudSjkS6db02';

const options = {
    hostname: 'api.netlify.com',
    path: '/api/v1/sites?filter=all',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
    },
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            const sites = JSON.parse(data);
            console.log('\n=== I tuoi siti Netlify ===\n');
            sites.forEach(site => {
                console.log(`Nome: ${site.name}`);
                console.log(`URL: ${site.url}`);
                console.log(`SITE_ID: ${site.id}`);
                console.log('---\n');
            });
        } else {
            console.error(`Errore: ${res.statusCode}`, data);
        }
    });
});

req.on('error', error => console.error('Errore:', error));
req.end();
