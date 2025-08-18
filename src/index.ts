import {webkit, chromium, BrowserType, Page, Browser} from 'playwright';
import {readFile, writeFile} from "fs/promises";
import {
    EMPLOYEE_MAIL,
    CIBUS_PASSWORD,
    CIBUS_COMPANY_NAME,
    RUN_INTERVAL_HOUR,
    COOKIE_FILE_PATH,
    LOCAL_STORAGE_FILE_PATH
} from "./config";
import {getLatestGiftCardsFromMail, getLatestSmsCodeFromMail, sendMail} from "./mailer";
import {expect} from "@playwright/test";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))


const setup = async (browserType: BrowserType, options: { copyCookies: boolean }) => {
    let browser: Browser;
    if (options.copyCookies === true) {
        browser = await browserType.launch({headless: true});
    } else {
        // browser = await browserType.launch({headless: true});
        browser = await browserType.launch({headless: true});
    }
    const context = await browser.newContext();
    const page = await context.newPage();

    // Read and format cookies and inject to browser
    const rawCookies = JSON.parse(await readFile(COOKIE_FILE_PATH, 'utf-8'));
    const formattedCookies = rawCookies.map((cookie: any) => ({
        ...cookie,
        sameSite: 'Lax' // Force sameSite to 'Lax' for all cookies
    }));
    await context.addCookies(formattedCookies);

    // Read and format localStorage
    const data = JSON.parse(await readFile(LOCAL_STORAGE_FILE_PATH, "utf8"));

    // Add logging for debugging
    console.log('Starting navigation to Wolt...');
    await page.goto('https://wolt.com/he/isr/tel-aviv/venue/woltilgiftcards', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });
    await page.evaluate((o) => {
        for (const [k, v] of Object.entries(o))
            localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }, data);
    await page.reload();
    console.log('Page loaded successfully');
    if (options.copyCookies === true) {
        console.log('Getting new cookies...');
        const newCookies = await page.context().cookies();
        await writeFile(COOKIE_FILE_PATH, JSON.stringify(newCookies, null, 2), 'utf-8');
        console.log('Cookies retrieved successfully');
        await page.close()
    }
    return {browser, page};
}


const scrapeWolt = async (): Promise<void> => {
    let browser: Browser | null = null;
    let page: Page | null = null;
    try {
        ({browser, page} = await setup(webkit, {copyCookies: false}));

        // Debug page content
        const pageContent = await page.content();
        console.log('Page title:', await page.title());
        console.log('Page URL:', page.url());

        // Take screenshot after page load
        await page.screenshot({path: 'screenshots/initial-page.png'});

        // Wait for a shorter time for the page to stabilize
        await sleep(5000);

        // Check if we're on the right page
        const isOnGiftCardPage = await page.evaluate(() => {
            return document.body.textContent?.includes('גיפט קארד') || false;
        });

        if (!isOnGiftCardPage) {
            console.error('Not on gift card page! Current page content:', await page.content());
            await page.screenshot({path: 'screenshots/wrong-page.png'});
            throw new Error('Not on gift card page');
        }

        const localStorageItems = await page.evaluate(() => {
            return {...localStorage}
        })
        await writeFile(LOCAL_STORAGE_FILE_PATH, JSON.stringify(localStorageItems, null, 2), 'utf-8');


        try {
            console.log('Checking for restore order modal...');
            // Try multiple selectors for the restore order modal
            const dontRestoreOrderButton = await page.waitForSelector('[data-test-id="restore-order-modal.reject"] [class*="cbc_Button_spinnerContainer"]', {timeout: 5000})
                .catch(() => page.waitForSelector('button:has-text("Don\'t restore")', {timeout: 5000}))
                .catch(() => page.waitForSelector('[data-test-id="restore-order-modal.reject"]', {timeout: 5000}));

            if (dontRestoreOrderButton) {
                await dontRestoreOrderButton.click();
                console.log('Clicked restore order modal');
            } else {
                console.log('No restore order modal found, continuing...');
            }
        } catch (error) {
            console.log('No restore order modal found, continuing...');
        }

        // Wait for page to stabilize
        await sleep(3000);

        console.log('Starting gift card selection...');

        // Take screenshot before gift card selection
        await page.screenshot({path: 'screenshots/before-gift-card-selection.png'});

        const text1 = 'גיפט קארד - 25 ';
        const text2 = 'גיפט קארד - 30 ';

        try {
            console.log('Looking for 25 NIS gift card...');
            // Try multiple selectors for the gift card
            const giftCard25 = await page.waitForSelector(`xpath=(//*[@data-test-id="horizontal-item-card-header" and contains(text(), '${text1}')]/ancestor::*[@data-test-id="horizontal-item-card"]//*[@data-test-id="ItemCardStepperContainer"]/*/*)[last()]`, {timeout: 10000})
                .catch(() => page.waitForSelector(`button:has-text("${text1}")`, {timeout: 10000}));

            if (!giftCard25) {
                throw new Error('Could not find 25 NIS gift card');
            }

            await giftCard25.click();
            console.log('Selected 25 NIS gift card');

            // Take screenshot after first gift card selection
            await page.screenshot({path: 'screenshots/after-first-gift-card.png'});

            console.log('Looking for 30 NIS gift card...');
            const giftCard30 = await page.waitForSelector(`xpath=(//*[@data-test-id="horizontal-item-card-header" and contains(text(), '${text2}')]/ancestor::*[@data-test-id="horizontal-item-card"]//*[@data-test-id="ItemCardStepperContainer"]/*/*)[last()]`, {timeout: 10000})
                .catch(() => page.waitForSelector(`button:has-text("${text2}")`, {timeout: 10000}));

            if (!giftCard30) {
                throw new Error('Could not find 30 NIS gift card');
            }

            await giftCard30.click();
            console.log('Selected 30 NIS gift card');

            // Take screenshot after second gift card selection
            await page.screenshot({path: 'screenshots/after-second-gift-card.png'});
        } catch (error) {
            console.error('Error during gift card selection:', error);
            await page.screenshot({path: 'screenshots/error-gift-card-selection.png'});
            throw error;
        }

        const since = new Date();
        try {
            console.log('Adding to order...');

            // Take screenshot before looking for add to order button
            await page.screenshot({path: 'screenshots/before-add-to-order.png'});

            console.log("Waiting for 'Show order' button...");
            const showOrderButton = await page.locator('(//*[text()="הצגת פריטים"])[last()]');
            console.log("'Add to Order' button found. Clicking...");
            await showOrderButton.evaluate((el: HTMLElement) => el.click());
            console.log("'Add to Order' button clicked.");

            console.log("Waiting for 'Checkout' button...");
            const checkoutButton = await page.waitForSelector('(//*[text()="מעבר לתשלום"])[last()]', {timeout: 5000});
            console.log("'Checkout' button found. Clicking...");
            await checkoutButton.click();

            console.log('Changing payment method...');
            const changePaymentMethodButton = page.locator('[data-test-id="PaymentMethods.SelectedPaymentMethod"]');
            changePaymentMethodButton.click();

            console.log('Selecting Cibus payment...');
            const chooseCibusButton = page.locator('[data-payment-method-id="cibus"]');
            await chooseCibusButton.click();
            console.log('Selected Cibus payment');

            await sleep(2000);
            const selectedPaymentMethod = await changePaymentMethodButton.textContent();
            expect(selectedPaymentMethod).toEqual('Cibusיחויב בסכום של ‏55.00 ‏₪')

            console.log('Sending order...');
            const clickToOrderButton = page.locator('[data-test-id="SendOrderButton"]');
            await clickToOrderButton.click();
            console.log('Clicked Send order button');

            await sleep(5000);

            console.log('Handling Cibus iframe...');
            const cibusFrame = page.locator('iframe[name="cibus-challenge"]').contentFrame();

            console.log('Filling Cibus credentials...');
            await cibusFrame.locator('#txtUserName').fill(EMPLOYEE_MAIL);
            await cibusFrame.locator('#txtPassword').fill(CIBUS_PASSWORD);
            if (await cibusFrame.locator('#txtCompany').isVisible()) await cibusFrame.locator('#txtCompany').fill(CIBUS_COMPANY_NAME);
            console.log('Filled Cibus credentials');

            console.log('Submitting Cibus form...');
            await cibusFrame.locator('#btnSubmit').click();
            console.log('Submitted Cibus form');
            console.log('Filling email verification code...');
            await cibusFrame.locator('#txtOTP').waitFor({state: 'visible', timeout: 5000});
            console.log('Getting email verification code...');
            const code = await getLatestSmsCodeFromMail(since);
            console.log('Got email verification code');
            await cibusFrame.locator('#txtOTP').fill(code);
            console.log('Filled email verification code');
            console.log('Submitting Cibus form...');
            await cibusFrame.locator('#btnSubmit').click();
            console.log('Submitted Cibus form');


            const txtWillPayFromCard = await cibusFrame.locator('#hTitleOTL').textContent();
            if (txtWillPayFromCard === '(הסכום שיחוייב בכרטיס האשראי שלך :0  ש"ח)') {
                await cibusFrame.locator('#btnPay').click();
                console.log('Submitted Cibus payment');
            } else {
                console.log('Cibus payment failed, because the payment will use the credit card');
                throw new Error('Cibus payment failed, because the payment will use the credit card');
            }
            await sleep(3000);
            console.log('Checking for completion...');
            const alreadyUsedModal = await page.locator('body > div.sc-75cea620-0.klDnoY.rtl > div').isVisible();
            const outputMessage = alreadyUsedModal ? 'Already used cibus today' : 'Got giftcard successfully';
            console.log(`Operation result: ${outputMessage}`);
            await sleep(2000);
        } catch (error) {
            console.error('Error during checkout:', error);
            await page.screenshot({path: 'screenshots/error-checkout.png'});
            throw error;
        }

        const codes = await getLatestGiftCardsFromMail(since);
        for (let i = 0; i < codes.length; i++) {
            await page.goto('https://wolt.com/he/me/redeem-code')
            await page.waitForSelector('[data-test-id="redeem-code-input"]');
            await page.locator('[data-test-id="redeem-code-input"]').fill(codes[i])
            await page.locator('button[data-localization-key="user.redeem"]').click()
            await sleep(2000);
            await page.screenshot({path: `screenshots/redeemCode/${i}.png`});
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
}

scrapeWolt();
