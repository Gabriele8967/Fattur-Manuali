/**
 * Token Manager for Fatture in Cloud OAuth 2.0
 * Handles access tokens, refresh tokens, and automatic token refresh
 */
class TokenManager {
    constructor() {
        this.credentials = null;
    }

    /**
     * Load credentials from serverless function
     */
    async loadCredentials() {
        try {
            const response = await fetch('/.netlify/functions/get-master-access-token');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to load credentials: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            this.credentials = {
                accessToken: data.accessToken,
                expiresAt: data.expiresAt,
                method: 'master_oauth',
                timestamp: new Date().toISOString()
            };
            return this.credentials;
        } catch (error) {
            console.error('Error loading credentials from serverless function:', error);
            throw error;
        }
    }

    /**
     * Get valid access token (refresh if needed)
     */
    async getValidAccessToken() {
        if (!this.credentials || this.isTokenExpired()) {
            console.log('Token expired or not loaded, fetching new one...');
            await this.loadCredentials();
        }

        if (!this.credentials || !this.credentials.accessToken) {
            throw new Error('No credentials available. Please ensure master token is configured.');
        }

        return this.credentials.accessToken;
    }

    /**
     * Check if current access token is expired
     */
    isTokenExpired() {
        if (!this.credentials || !this.credentials.expiresAt) {
            return true;
        }
        
        // Add 5 minutes buffer before expiration
        const bufferMs = 5 * 60 * 1000;
        return Date.now() + bufferMs >= this.credentials.expiresAt;
    }

    /**
     * Clear stored credentials (client-side only, master token remains on server)
     */
    clearCredentials() {
        this.credentials = null;
        console.log('Client-side credentials cleared');
    }

    /**
     * Get authorization header for API requests
     */
    async getAuthHeader() {
        const token = await this.getValidAccessToken();
        return `Bearer ${token}`;
    }

    /**
     * Check if user is authenticated (client-side)
     */
    isAuthenticated() {
        // For master token setup, we assume it's always authenticated if the serverless function returns a token
        return !!this.credentials && !this.isTokenExpired();
    }

    /**
     * Get token expiration info
     */
    getTokenInfo() {
        if (!this.credentials) {
            return null;
        }

        return {
            isExpired: this.isTokenExpired(),
            expiresAt: new Date(this.credentials.expiresAt),
            timeUntilExpiry: this.credentials.expiresAt - Date.now(),
            method: this.credentials.method,
            lastRefresh: this.credentials.timestamp
        };
    }
}

/**
 * API Client with automatic token management
 */
class FattureInCloudClient {
    constructor() {
        this.tokenManager = new TokenManager();
        this.baseUrl = 'https://api-v2.fattureincloud.it/v2';
    }

    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const authHeader = await this.tokenManager.getAuthHeader();
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                    ...options.headers
                }
            });

            if (!response.ok) {
                // If 401, try to get a new token from the serverless function
                if (response.status === 401) {
                    console.log('401 response, attempting to fetch new token from serverless function...');
                    await this.tokenManager.loadCredentials(); // This will fetch a new token
                    
                    // Retry request with new token
                    const newAuthHeader = await this.tokenManager.getAuthHeader();
                    const retryResponse = await fetch(url, {
                        ...options,
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': newAuthHeader,
                            ...options.headers
                        }
                    });
                    
                    if (!retryResponse.ok) {
                        throw new Error(`API request failed: ${retryResponse.status}`);
                    }
                    
                    return await retryResponse.json();
                }
                
                throw new Error(`API request failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Get company information
     */
    async getUserCompanies() {
        return await this.request('/user/info');
    }

    /**
     * Create invoice
     */
    async createInvoice(companyId, invoiceData) {
        return await this.request(`/c/${companyId}/issued_documents`, {
            method: 'POST',
            body: JSON.stringify({ data: invoiceData })
        });
    }
}

// Global instances
window.tokenManager = new TokenManager();
window.ficClient = new FattureInCloudClient();