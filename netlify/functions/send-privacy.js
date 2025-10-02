const nodemailer = require('nodemailer');
const crypto = require('crypto');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { clientEmail, clientName, invoiceNumber, senderEmail, senderName, companyName } = JSON.parse(event.body);

        // Validate required fields
        if (!clientEmail || !clientName || !senderEmail || !companyName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email cliente, nome, email mittente e nome azienda sono obbligatori' })
            };
        }

        // Validate email formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(clientEmail) || !emailRegex.test(senderEmail)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Formato email non valido' })
            };
        }

        // Configure email transporter using environment variables
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Configurazione SMTP mancante' })
            };
        }

        const transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Privacy consent email content
        const privacyContent = `
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Consenso Privacy</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
                .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #666; }
                h1 { margin: 0; }
                h2 { color: #667eea; margin-top: 30px; }
                .highlight { background: #e8f0fe; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Consenso Privacy - Prestazioni Sanitarie</h1>
            </div>
            
            <div class="content">
                <p>Gentile <strong>${clientName}</strong>,</p>
                
                <p>La ringraziamo per aver scelto i nostri servizi sanitari. In conformità al Regolamento UE 2016/679 (GDPR), La informiamo che i Suoi dati personali saranno trattati nel rispetto della normativa vigente.</p>
                
                ${invoiceNumber ? `<div class="highlight">Questa comunicazione è relativa alla fattura n. ${invoiceNumber}</div>` : ''}
                
                <h2>Informazioni sul Trattamento</h2>
                
                <h3>Titolare del Trattamento</h3>
                <p><strong>${companyName}</strong><br>
                Email: ${senderEmail}</p>
                
                <h3>Finalità del Trattamento</h3>
                <p>I Suoi dati personali vengono trattati per le seguenti finalità:</p>
                <ul>
                    <li>Erogazione delle prestazioni sanitarie richieste</li>
                    <li>Adempimenti amministrativi e contabili</li>
                    <li>Fatturazione e gestione pagamenti</li>
                    <li>Obblighi di legge in campo sanitario</li>
                </ul>
                
                <h3>Base Giuridica</h3>
                <p>Il trattamento si basa su:</p>
                <ul>
                    <li>Consenso dell'interessato per le prestazioni sanitarie</li>
                    <li>Obblighi di legge per la fatturazione e conservazione documenti</li>
                    <li>Interesse legittimo per la gestione amministrativa</li>
                </ul>
                
                <h3>Conservazione dei Dati</h3>
                <p>I dati saranno conservati per il tempo necessario agli adempimenti di legge:</p>
                <ul>
                    <li>Documenti sanitari: 10 anni</li>
                    <li>Documenti fiscali: 10 anni</li>
                    <li>Dati di contatto: fino alla revoca del consenso</li>
                </ul>
                
                <h3>Diritti dell'Interessato</h3>
                <p>Lei ha diritto di:</p>
                <ul>
                    <li>Accedere ai Suoi dati personali</li>
                    <li>Rettificare dati inesatti o incompleti</li>
                    <li>Chiedere la cancellazione nei casi previsti dalla legge</li>
                    <li>Limitare il trattamento</li>
                    <li>Richiedere la portabilità dei dati</li>
                    <li>Opporsi al trattamento</li>
                </ul>
                
                <p>Per esercitare i Suoi diritti, può contattarci all'email: <strong>${senderEmail}</strong></p>
                
                <h3>Comunicazione a Terzi</h3>
                <p>I Suoi dati potranno essere comunicati esclusivamente a:</p>
                <ul>
                    <li>Autorità sanitarie competenti</li>
                    <li>Professionisti sanitari coinvolti nella prestazione</li>
                    <li>Società di servizi informatici (con accordi di riservatezza)</li>
                    <li>Autorità fiscali per adempimenti di legge</li>
                </ul>
                
                <div class="highlight">
                    <strong>Consenso:</strong> Con la presente comunicazione, La informiamo che i Suoi dati sono già stati trattati per l'erogazione della prestazione sanitaria e per gli adempimenti amministrativi correlati, in base alle finalità sopra indicate.
                </div>
                
                <p>Per qualsiasi chiarimento o per esercitare i Suoi diritti, non esiti a contattarci.</p>
                
                <p>Cordiali saluti,<br>
                <strong>${senderName || 'Staff Amministrativo'}</strong></p>
            </div>
            
            <div class="footer">
                <p>Questa email è stata inviata automaticamente dal sistema di fatturazione.<br>
                Per informazioni: ${senderEmail}</p>
                <p><small>Documento generato in data: ${new Date().toLocaleDateString('it-IT')}</small></p>
            </div>
        </body>
        </html>
        `;

        // Email options
        const mailOptions = {
            from: {
                name: `${companyName} - Consenso Privacy`,
                address: senderEmail
            },
            to: clientEmail,
            subject: `Consenso Privacy - Prestazioni Sanitarie${invoiceNumber ? ` (Fattura ${invoiceNumber})` : ''}`,
            html: privacyContent,
            text: `Gentile ${clientName}, trova in allegato le informazioni sul trattamento dei dati personali relative alle prestazioni sanitarie erogate. Per qualsiasi chiarimento può contattarci all'email ${senderEmail}`
        };

        // Send email
        await transporter.sendMail(mailOptions);

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                message: 'Email consenso privacy inviata correttamente' 
            })
        };

    } catch (error) {
        console.error('Email sending error:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Errore nell\'invio dell\'email',
                details: error.message 
            })
        };
    }
};