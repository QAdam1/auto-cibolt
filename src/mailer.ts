import fs from 'fs';
import path from 'path';
import {simpleParser} from "mailparser";
import pdfParse from 'pdf-parse';
import mailer, {Transporter} from "nodemailer";
import imaps, {ImapSimple, ImapSimpleOptions} from 'imap-simple';
import {FetchOptions} from "imap";
import {MAIL_PROVIDER, MAIL_USER, MAIL_PASSWORD, TO_MAIL} from "./config";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import {waitUntil} from "./utils";

const smtpTransportOptions: SMTPTransport.Options = {
    host: `smtp.${MAIL_PROVIDER}.com`,
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASSWORD
    }
};

const imapSimpleOptions: ImapSimpleOptions = {
    imap: {
        user: process.env.MAIL_USER as string,
        password: process.env.MAIL_PASSWORD as string,
        host: `imap.${process.env.MAIL_PROVIDER}.com`,
        port: 993,
        tls: true,
        authTimeout: 5000,
        tlsOptions: {rejectUnauthorized: false}
    }
}

const messageOptions: mailer.SendMailOptions = {
    from: MAIL_USER,
    to: TO_MAIL,
    subject: "Wolt cibus automation",
}

function _getAllFiles(dirPath: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dirPath);

    list.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            results = results.concat(_getAllFiles(filePath)); // recurse into subdirectory
        } else {
            results.push(filePath);
        }
    });

    return results;
}

export const sendMail = async (text: string, folderPath?: string): Promise<void> => {
    let transporter: Transporter;
    try {
        transporter = mailer.createTransport(smtpTransportOptions);
        let attachments: any[] = [];

        if (folderPath) {
            const absolutePath = path.resolve(folderPath);
            if (!fs.existsSync(absolutePath)) {
                throw new Error(`Folder not found: ${absolutePath}`);
            }

            const files = _getAllFiles(absolutePath);
            attachments = files.map(file => ({
                filename: path.basename(file),
                path: file
            }));
        }

        await transporter.sendMail({
            ...messageOptions,
            text,
            attachments
        });

        console.log('Email sent successfully');
    } catch (error) {
        console.error('Failed to send email:', error);
    } finally {
        if (transporter) transporter.close();
    }
};

export const getMail = async (query: string, since: Date): Promise<any> => {
    let imapSimple: ImapSimple;
    try {
        imapSimple = await imaps.connect(imapSimpleOptions);
        await imapSimple.openBox('[Gmail]/All Mail'); // for Gmail; else use 'INBOX'
        const searchCriteria: any = [['X-GM-RAW', query]];
        const fetchOptions: FetchOptions = {bodies: [''], struct: true};

        let messages: any[] = null;
        await waitUntil(async () => {
                messages = await imapSimple.search(searchCriteria, fetchOptions);
                if (!messages.length) return false;

                messages = messages.filter(message => {
                    const messageDate = message.attributes.date as Date | undefined;
                    return messageDate ? messageDate.getTime() > since.getTime() : false;
                });

                return messages.length > 0;
            },
            {timeout: 120_000, interval: 1500, timeoutMsg: `Latest gmail was not found for query: ${query}`}
        )

        if (query.toLowerCase().includes('sms')) {
            const message = messages[messages.length - 1].parts.find((p: any) => p.which === '');
            const parsed: any = await simpleParser(message.body);
            return parsed;

        } else {
            for (let i = messages.length - 1; i >= 0; i--) {
                const all = messages[i].parts.find((p: any) => p.which === '');
                if (!all) continue;

                const parsed: any = await simpleParser(all.body);

                const pdf: any = (parsed.attachments || []).find((a: any) =>
                    (a.contentType || '').toLowerCase().includes('application/pdf') ||
                    (a.filename || '').toLowerCase().endsWith('.pdf')
                );

                if (pdf) {
                    return {parsed, pdf};
                }
            }
        }
        return null;
    } catch (e) {
        console.error(`Error in getMail:`, e);
        return null;
    } finally {
        if (imapSimple) imapSimple.end();
    }
};

export const getLatestSmsCodeFromMail = async (since: Date) => {
    const gmailDate = since.toISOString().slice(0, 10).replace(/-/g, "/");
    const query = `subject:"SMS code received" in:inbox after:${gmailDate}`;
    let parsedMail: any = await getMail(query, since);
    const code = parsedMail.text?.trim().split('#')[1]
    console.log(`retrieved SMS code:\n${code}`);

    return code;
}

export const getLatestGiftCardsFromMail = async (since: Date) => {
    const gmailDate = since.toISOString().slice(0, 10).replace(/-/g, "/");
    const query = `subject:"הגיפט קארד של Wolt הגיע ומחכה לשליחה :)‬" in:inbox has:attachment after:${gmailDate}`;
    const mailData: any = await getMail(query, since);
    if (!mailData?.parsed?.attachments?.length) {
        console.log('No attachments found.');
        return [];
    }
    // Find all attachments named like "Wolt gift card English"
    const matchingAttachments = mailData.parsed.attachments.filter((a: any) =>
        a.filename?.toLowerCase().includes('wolt gift card english') &&
        a.filename?.toLowerCase().endsWith('.pdf')
    );
    if (!matchingAttachments.length) {
        console.log('No matching Wolt gift card PDFs found.');
        return [];
    }
    const codes: string[] = [];
    for (const attachment of matchingAttachments) {
        try {
            const pdfData = await pdfParse(attachment.content);
            const pdfText = pdfData.text;

            const match = pdfText.match(/CODE:\s*([A-Z0-9]+)/);
            if (match) {
                codes.push(match[1]);
            } else {
                console.warn(`No code found in file: ${attachment.filename}`);
            }
        } catch (err) {
            console.error(`Failed to parse ${attachment.filename}:`, err);
        }
    }
    console.log(`Extracted gift card codes:`, codes);
    return codes;
};
