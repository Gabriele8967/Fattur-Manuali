const https = require('https');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Call the refresh-token function to get a fresh access token
        const refreshResponse = await fetch(`${process.env.URL}/.netlify/functions/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}), // No body needed as refresh-token uses env var
        });

        if (!refreshResponse.ok) {
            const errorText = await refreshResponse.text();
            throw new Error(`Failed to get fresh token: ${refreshResponse.status} - ${errorText}`);
        }

        const tokenData = await refreshResponse.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                accessToken: tokenData.accessToken,
                expiresAt: tokenData.expiresAt
            })
        };
    } catch (error) {
        console.error('Error in get-master-access-token:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: error.message || 'Failed to retrieve access token' })
        };
    }
};
