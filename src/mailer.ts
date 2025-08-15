import fs from 'fs';
import path from 'path';
import {simpleParser} from "mailparser";
import pdfParse from 'pdf-parse';
import mailer from "nodemailer";
import imaps, {ImapSimple} from 'imap-simple';
import {FetchOptions} from "imap";
import {MAIL_PROVIDER, MAIL_USER, MAIL_PASSWORD, TO_MAIL} from "./config";

const transporter = mailer.createTransport({
    host: `smtp.${MAIL_PROVIDER}.com`,
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASSWORD
    }
});

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
    try {
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
    }
};

export const getMail = async (searchObj: any = {}): Promise<any> => {
    const subject = searchObj.subject || 'Wolt';
    const days = searchObj.days || 1;
    const query = `subject:"${subject}" in:inbox has:attachment newer_than:${days}d`;

    let connection: ImapSimple;
    try {
        connection = await imaps.connect({
            imap: {
                user: process.env.MAIL_USER as string,
                password: process.env.MAIL_PASSWORD as string,
                host: `imap.${process.env.MAIL_PROVIDER}.com`,
                port: 993,
                tls: true,
                authTimeout: 5000,
                tlsOptions: {rejectUnauthorized: false}
            }
        });

        await connection.openBox('[Gmail]/All Mail'); // for Gmail; else use 'INBOX'

        const searchCriteria: any = [['X-GM-RAW', query]];
        const fetchOptions: FetchOptions = {bodies: [''], struct: true};

        const messages: any[] = await connection.search(searchCriteria, fetchOptions);
        if (!messages.length) return null;

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

        return null;
    } catch (e) {
        console.error(`Error in getMail:`, e);
        return null;
    } finally {
        if (connection) connection.end();
    }
};

export const getLatestSmsCodeFromMail = async (since: Date) => {
    const parsedMail: any = await getMail({subject: 'SMS code received', sentSince: since});
    const code = parsedMail.text?.trim().split('#')[1]
    console.log(`retrieved SMS code:\n${code}`);

    return code;
}

export const getLatestGiftCardsFromMail = async () => {
    const mailData: any = await getMail({
        subject: 'הגיפט קארד של Wolt הגיע ומחכה לשליחה :)‬'
    });
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
