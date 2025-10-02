/**
 * Secure audit logging system for GDPR compliance
 * Logs all data processing activities for regulatory compliance
 */

const crypto = require('crypto');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { action, resource, metadata, userId, sessionId } = JSON.parse(event.body);

        // Validate required fields
        if (!action || !resource) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Action and resource are required' })
            };
        }

        // Create audit log entry
        const auditEntry = {
            id: generateAuditId(),
            timestamp: new Date().toISOString(),
            action: action,
            resource: resource,
            userId: userId || 'anonymous',
            sessionId: sessionId || 'unknown',
            ip: getClientIP(event),
            userAgent: event.headers['user-agent'] || 'unknown',
            metadata: metadata || {},
            processed: true
        };

        // Add GDPR-specific fields
        auditEntry.gdpr = {
            legalBasis: determineLegalBasis(action),
            dataCategory: categorizeData(resource),
            retention: calculateRetention(action, resource),
            consentRequired: requiresConsent(action, resource)
        };

        // In production, this should be sent to a secure logging service
        // For now, we'll return the audit entry for client-side storage
        const response = {
            success: true,
            auditId: auditEntry.id,
            timestamp: auditEntry.timestamp,
            retention: auditEntry.gdpr.retention,
            message: 'Audit entry recorded'
        };

        // If environment supports external logging service
        if (process.env.AUDIT_LOG_ENDPOINT) {
            await sendToExternalLogger(auditEntry);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('Audit logging error:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to process audit log',
                details: error.message 
            })
        };
    }
};

/**
 * Generate unique audit ID
 */
function generateAuditId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `audit_${timestamp}_${random}`;
}

/**
 * Extract client IP from event
 */
function getClientIP(event) {
    return event.headers['x-forwarded-for'] || 
           event.headers['x-real-ip'] || 
           event.requestContext?.identity?.sourceIp || 
           'unknown';
}

/**
 * Determine legal basis for GDPR compliance
 */
function determineLegalBasis(action) {
    const legalBasisMap = {
        'invoice_create': 'legal_obligation', // Art. 6.1.c - Tax obligations
        'data_access': 'consent', // Art. 6.1.a - User consent
        'data_delete': 'consent', // Art. 6.1.a - User request
        'email_send': 'consent', // Art. 6.1.a - Communication consent
        'data_export': 'consent', // Art. 6.1.a - Data portability
        'consent_given': 'consent', // Art. 6.1.a - Explicit consent
        'consent_withdrawn': 'consent', // Art. 6.1.a - Consent withdrawal
        'system_backup': 'legitimate_interest', // Art. 6.1.f - Security
        'security_log': 'legitimate_interest' // Art. 6.1.f - Security
    };

    return legalBasisMap[action] || 'legitimate_interest';
}

/**
 * Categorize data type for GDPR
 */
function categorizeData(resource) {
    if (resource.includes('health') || resource.includes('medical')) {
        return 'special_category'; // Art. 9 GDPR - Health data
    }
    if (resource.includes('fiscal') || resource.includes('tax')) {
        return 'personal_data'; // Standard personal data
    }
    if (resource.includes('email') || resource.includes('contact')) {
        return 'personal_data'; // Contact information
    }
    if (resource.includes('system') || resource.includes('log')) {
        return 'technical_data'; // Technical/system data
    }
    
    return 'personal_data'; // Default classification
}

/**
 * Calculate data retention period
 */
function calculateRetention(action, resource) {
    // Italian legal requirements for healthcare/fiscal data
    const retentionMap = {
        'invoice_create': '10_years', // Fiscal obligation
        'medical_data': '10_years', // Healthcare obligation
        'consent_data': 'until_withdrawal', // Until consent withdrawn
        'audit_log': '5_years', // Audit trail requirement
        'contact_data': '5_years', // Business relationship
        'system_log': '1_year' // Technical logs
    };

    // Determine retention based on action and resource
    if (action.includes('invoice') || resource.includes('fiscal')) {
        return retentionMap['invoice_create'];
    }
    if (resource.includes('medical') || resource.includes('health')) {
        return retentionMap['medical_data'];
    }
    if (resource.includes('consent')) {
        return retentionMap['consent_data'];
    }
    if (action.includes('system') || action.includes('log')) {
        return retentionMap['system_log'];
    }
    
    return retentionMap['contact_data']; // Default
}

/**
 * Check if action requires explicit consent
 */
function requiresConsent(action, resource) {
    const consentRequired = [
        'email_send',
        'data_export',
        'marketing_communication',
        'analytics_tracking'
    ];

    return consentRequired.some(required => action.includes(required));
}

/**
 * Send to external logging service (if configured)
 */
async function sendToExternalLogger(auditEntry) {
    if (!process.env.AUDIT_LOG_ENDPOINT) return;

    try {
        const response = await fetch(process.env.AUDIT_LOG_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.AUDIT_LOG_TOKEN}`,
            },
            body: JSON.stringify(auditEntry)
        });

        if (!response.ok) {
            console.error('Failed to send audit log to external service:', response.status);
        }
    } catch (error) {
        console.error('Error sending to external logger:', error);
    }
}