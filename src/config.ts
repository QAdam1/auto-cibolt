import * as dotenv from "dotenv";
dotenv.config();

export const { EMPLOYEE_MAIL, CIBUS_PASSWORD, CIBUS_COMPANY_NAME,  MAIL_PROVIDER, MAIL_USER, MAIL_PASSWORD, TO_MAIL } = process.env
export const RUN_INTERVAL_HOUR = 24
export const COOKIE_FILE_PATH = 'wolt.com.cookies.json'
export const LOCAL_STORAGE_FILE_PATH = 'wolt.com.localstorage.json'
