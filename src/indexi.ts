import { webkit, chromium, BrowserType, Page, Browser } from 'playwright';
import { readFile, writeFile } from 'fs/promises';
import {
    EMPLOYEE_MAIL,
    CIBUS_PASSWORD,
    CIBUS_COMPANY_NAME,
    RUN_INTERVAL_HOUR,
    COOKIE_FILE_PATH,
    LOCAL_STORAGE_FILE_PATH,
} from './config';
import { getLatestGiftCardsFromMail, getLatestSmsCodeFromMail, sendMail } from './mailer';
import { expect } from '@playwright/test';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const setup = async (browserType: BrowserType, options: { copyCookies: boolean }) => {
    let browser: Browser;
    if (options.copyCookies === true) {
        browser = await browserType.launch({ headless: false });
    } else {
        // browser = await browserType.launch({headless: true});
        browser = await browserType.launch({ headless: true });
    }
    const context = await browser.newContext();
    const page = await context.newPage();

    // Read and format cookies and inject to browser
    const rawCookies = JSON.parse(await readFile(COOKIE_FILE_PATH, 'utf-8'));
    const formattedCookies = rawCookies.map((cookie: any) => ({
        ...cookie,
        sameSite: 'Lax', // Force sameSite to 'Lax' for all cookies
    }));
    await context.addCookies(formattedCookies);

    // Read and format localStorage
    const data = JSON.parse(await readFile(LOCAL_STORAGE_FILE_PATH, 'utf8'));

    // Add logging for debugging
    console.log('Starting navigation to Wolt...');
    await page.goto('https://wolt.com/he/isr/tel-aviv/venue/woltilgiftcards', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
    });
    await page.evaluate(o => {
        for (const [k, v] of Object.entries(o))
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }, data);
    await page.reload();
    console.log('Page loaded successfully');
    if (options.copyCookies === true) {
        console.log('Getting new cookies...');
        const newCookies = await page.context().cookies();
        await writeFile(COOKIE_FILE_PATH, JSON.stringify(newCookies, null, 2), 'utf-8');
        console.log('Cookies retrieved successfully');
        await page.close();
    }
    return { browser, page };
};

const scrapeWolt = async (): Promise<void> => {
    let browser: Browser | null = null;
    let page: Page | null = null;
    try {
        ({ browser, page } = await setup(webkit, { copyCookies: false }));

        // Debug page content
        const pageContent = await page.content();
        console.log('Page title:', await page.title());
        console.log('Page URL:', page.url());

        // Take screenshot after page load
        await page.screenshot({ path: 'screenshots/initial-page.png' });

        // Wait for a shorter time for the page to stabilize
        await sleep(5000);

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log(`since: ${since}`);

        const codes = await getLatestGiftCardsFromMail(since);
        for (let i = 0; i < codes.length; i++) {
            await page.goto('https://wolt.com/he/me/redeem-code');
            console.log('navigated to redeem code page');
            await expect(page).toHaveURL('https://wolt.com/he/me/redeem-code');
            console.log('URL verified');
            await page.waitForSelector('[data-test-id="redeem-code-input"]');
            await page.locator('[data-test-id="redeem-code-input"]').fill(codes[i]);
            await page.locator('button[data-localization-key="user.redeem"]').click();
            await sleep(2000);
            await page.screenshot({ path: `screenshots/redeemCode/${i}.png` });
        }

        await sendMail('✅ [cibolt] Successfully  collected giftcard', 'screenshots/');
    } catch (err) {
        console.error('Error details:', err);
        await sendMail(`❌ [cibolt] Error collecting giftcard: ${err}`, 'screenshots/');
    } finally {
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
            console.log('Browser closed');
        }
        // console.log(`Scheduling next run in ${RUN_INTERVAL_HOUR} hours...`);
        // setTimeout(scrapeWolt, 1000 * 60 * 60 * RUN_INTERVAL_HOUR);
    }
};

scrapeWolt().then(() => {
    console.log('Scraping completed successfully');
});
