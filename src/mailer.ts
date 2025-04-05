import mailer from "nodemailer";
import { MAIL_PROVIDER, MAIL_USER, MAIL_PASSWORD, TO_MAIL } from "./config";

const transporter = mailer.createTransport({
  host: MAIL_PROVIDER,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASSWORD
  }
});

const messageOptions: mailer.SendMailOptions = {
  from: "woltMailer@example.com",
  to: TO_MAIL,
  subject: "Wolt cibus automation",
}

export const sendMail = async (text: string): Promise<void> => {
  await transporter.sendMail({ ...messageOptions, text })
}