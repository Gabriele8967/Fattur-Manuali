/**
 * Secure cryptographic utilities for GDPR compliance
 * Client-side encryption for sensitive data protection
 */
class SecureCrypto {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
    }

    /**
     * Generate a secure key for encryption
     */
    async generateKey() {
        return await crypto.subtle.generateKey(
            {
                name: this.algorithm,
                length: this.keyLength,
            },
            true, // extractable
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt sensitive data
     */
    async encryptData(data, key) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await crypto.subtle.encrypt(
            {
                name: this.algorithm,
                iv: iv,
            },
            key,
            encodedData
        );

        // Return combined IV + encrypted data as base64
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        return btoa(String.fromCharCode(...combined));
    }

    /**
     * Decrypt sensitive data
     */
    async decryptData(encryptedData, key) {
        const combined = new Uint8Array(
            atob(encryptedData)
                .split('')
                .map(char => char.charCodeAt(0))
        );
        
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);
        
        try {
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv,
                },
                key,
                data
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            throw new Error('Decryption failed - data may be corrupted');
        }
    }

    /**
     * Derive key from password (for fallback scenarios)
     */
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: this.algorithm, length: this.keyLength },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Generate secure salt
     */
    generateSalt() {
        return crypto.getRandomValues(new Uint8Array(32));
    }

    /**
     * Hash sensitive data for comparison (one-way)
     */
    async hashData(data) {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate secure random session ID
     */
    generateSecureId() {
        const array = new Uint32Array(4);
        crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-8)).join('');
    }

    /**
     * Secure data wipe from memory
     */
    secureWipe(sensitiveString) {
        // Clear string from memory (best effort in JavaScript)
        if (typeof sensitiveString === 'string') {
            // Overwrite string memory
            for (let i = 0; i < sensitiveString.length; i++) {
                sensitiveString = sensitiveString.substring(0, i) + '0' + sensitiveString.substring(i + 1);
            }
        }
    }
}

/**
 * Secure storage manager with encryption
 */
class SecureStorage {
    constructor() {
        this.crypto = new SecureCrypto();
        this.masterKey = null;
        this.initialized = false;
    }

    /**
     * Initialize secure storage with master key
     */
    async initialize() {
        if (this.initialized) return;

        // Try to load existing key or generate new one
        const storedKey = localStorage.getItem('_mk');
        if (storedKey) {
            try {
                this.masterKey = await crypto.subtle.importKey(
                    'jwk',
                    JSON.parse(atob(storedKey)),
                    { name: 'AES-GCM' },
                    true,
                    ['encrypt', 'decrypt']
                );
            } catch (error) {
                console.warn('Failed to load master key, generating new one');
                this.masterKey = await this.crypto.generateKey();
                await this.saveMasterKey();
            }
        } else {
            this.masterKey = await this.crypto.generateKey();
            await this.saveMasterKey();
        }

        this.initialized = true;
    }

    async saveMasterKey() {
        const exportedKey = await crypto.subtle.exportKey('jwk', this.masterKey);
        localStorage.setItem('_mk', btoa(JSON.stringify(exportedKey)));
    }

    /**
     * Store sensitive data securely
     */
    async setSecureItem(key, data) {
        await this.initialize();
        
        const encrypted = await this.crypto.encryptData(data, this.masterKey);
        localStorage.setItem('sec_' + key, encrypted);
        
        // Log access for audit
        this.logAccess('write', key);
    }

    /**
     * Retrieve sensitive data securely
     */
    async getSecureItem(key) {
        await this.initialize();
        
        const encrypted = localStorage.getItem('sec_' + key);
        if (!encrypted) return null;
        
        try {
            const decrypted = await this.crypto.decryptData(encrypted, this.masterKey);
            this.logAccess('read', key);
            return decrypted;
        } catch (error) {
            console.error('Failed to decrypt data for key:', key);
            return null;
        }
    }

    /**
     * Remove sensitive data
     */
    async removeSecureItem(key) {
        localStorage.removeItem('sec_' + key);
        this.logAccess('delete', key);
    }

    /**
     * Clear all secure storage (for GDPR compliance)
     */
    async clearAllSecureData() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('sec_'));
        keys.forEach(key => localStorage.removeItem(key));
        
        // Remove master key
        localStorage.removeItem('_mk');
        this.masterKey = null;
        this.initialized = false;
        
        this.logAccess('clear_all', 'system');
    }

    /**
     * Log access for audit trail
     */
    logAccess(action, key) {
        const auditLog = JSON.parse(localStorage.getItem('audit_log') || '[]');
        auditLog.push({
            timestamp: new Date().toISOString(),
            action: `storage_${action}`,
            resource: key,
            sessionId: this.crypto.generateSecureId().substr(0, 8)
        });
        
        // Keep only last 100 entries
        localStorage.setItem('audit_log', JSON.stringify(auditLog.slice(-100)));
    }
}

/**
 * Data anonymization utilities
 */
class DataAnonymizer {
    /**
     * Anonymize personal data for GDPR compliance
     */
    anonymizePersonalData(data) {
        const anonymized = { ...data };
        
        // Anonymize common personal fields
        if (anonymized.clientName) {
            anonymized.clientName = this.anonymizeName(anonymized.clientName);
        }
        if (anonymized.clientEmail) {
            anonymized.clientEmail = this.anonymizeEmail(anonymized.clientEmail);
        }
        if (anonymized.clientFiscalCode) {
            anonymized.clientFiscalCode = this.anonymizeFiscalCode(anonymized.clientFiscalCode);
        }
        if (anonymized.clientAddress) {
            anonymized.clientAddress = '[ANONYMIZED ADDRESS]';
        }
        if (anonymized.clientCity) {
            anonymized.clientCity = '[ANONYMIZED CITY]';
        }
        
        return anonymized;
    }

    anonymizeName(name) {
        const parts = name.split(' ');
        return parts.map(part => part.charAt(0) + '*'.repeat(part.length - 1)).join(' ');
    }

    anonymizeEmail(email) {
        const [local, domain] = email.split('@');
        const anonymizedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.slice(-1);
        return `${anonymizedLocal}@${domain}`;
    }

    anonymizeFiscalCode(code) {
        return code.substring(0, 3) + '*'.repeat(code.length - 6) + code.slice(-3);
    }

    /**
     * Generate pseudonymized ID for analytics
     */
    generatePseudonymId(personalData) {
        return this.crypto.hashData(JSON.stringify(personalData) + Date.now());
    }
}

// Global instances
window.secureStorage = new SecureStorage();
window.dataAnonymizer = new DataAnonymizer();
window.secureCrypto = new SecureCrypto();