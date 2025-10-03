const https = require('https');

// Usa le stesse credenziali
const FIC_ACCESS_TOKEN = process.env.FIC_ACCESS_TOKEN || 'IL_TUO_TOKEN';
const FIC_COMPANY_ID = process.env.FIC_COMPANY_ID || '1467198';

console.log('📋 Recupero aliquote IVA dall\'account...\n');

const options = {
    hostname: 'api-v2.fattureincloud.it',
    path: `/c/${FIC_COMPANY_ID}/info/vat_types`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
    },
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);

        if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            console.log('\n✅ Aliquote IVA disponibili:\n');

            if (parsed.data && Array.isArray(parsed.data)) {
                parsed.data.forEach(vat => {
                    console.log(`ID: ${vat.id} - ${vat.description || vat.value + '%'} (${vat.value}%)`);
                    if (vat.is_disabled) console.log('  ⚠️  Disabilitata');
                });

                // Trova IVA al 0% o esente
                const zeroVat = parsed.data.find(v => v.value === 0 || v.value === '0');
                if (zeroVat) {
                    console.log(`\n✨ Usa questo ID per IVA esente/0%: ${zeroVat.id}`);
                }
            } else {
                console.log('Risposta:', JSON.stringify(parsed, null, 2));
            }
        } else {
            console.log('❌ Errore:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Errore di rete:', e.message);
});

req.end();
