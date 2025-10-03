// Fix per oauth-config.js con scope corretti
exports.handler = async (event, context) => {
    try {
        const requiredEnvVars = [
            'FIC_CLIENT_ID',
            'FIC_COMPANY_ID', 
            'FIC_REDIRECT_URI'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: `Missing environment variables: ${missingVars.join(', ')}`
                })
            };
        }

        const config = {
            clientId: process.env.FATTURE_CLIENT_ID,
            companyId: process.env.FATTURE_COMPANY_ID,
            redirectUri: process.env.FATTURE_REDIRECT_URI,
            authEndpoint: 'https://api-v2.fattureincloud.it/oauth/authorize',
            tokenEndpoint: 'https://api-v2.fattureincloud.it/oauth/token',
            // SCOPE CORRETTO per Fatture in Cloud
            scope: 'issued_documents.invoices:a entity.clients:r'
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(config)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
};