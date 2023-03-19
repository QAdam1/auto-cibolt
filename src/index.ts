import puppeteer from 'puppeteer-extra'
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { readFile } from "fs/promises";
import { Protocol } from 'puppeteer';
import { EMPLOYEE_ID, CIBUS_PASSWORD, COMPANY_NAME, RUN_INTERVAL_HOUR, COOKIE_FILE_PATH } from "./config";
import { sendMail } from "./mailer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))


const scrapeWolt = async (): Promise<void> => {
    try {
        puppeteer.use(StealthPlugin())
        const browser = await puppeteer.launch({ headless: false, args: ['--disable-features=site-per-process'] });
        const page = await browser.newPage()

        const cookies: Protocol.Network.CookieParam[] = JSON.parse(await readFile(COOKIE_FILE_PATH, 'utf-8'));
        await page.setCookie(...cookies);

        await page.goto('https://wolt.com/en/isr/modiin/venue/woltilgiftcards');

        const GiftCardButton = await page.waitForSelector('#mainContent > div > div.sc-82e0570f-0.dZGtPZ > div.vJcWLX.rtl > div.E3Uywo.rtl > div.G8uDzj.E3Uywo > div > section > div:nth-child(2) > div:nth-child(7) > div > a', { timeout: 15000 })
        await GiftCardButton.click()
        const addToOrderButton = await page.waitForSelector('body > div.sc-75cea620-0.klDnoY.rtl > div > aside > footer > div > div > div > div.sc-e0dc78c3-2.jVipoH > button', { timeout: 5000 })
        await addToOrderButton.click()
        await sleep(1000)
        const viewOrderButton = await page.waitForSelector('#mainContent > div > div.neKplL.vOSS4d.WFldf4 > div > div.AMg3We > div > div', { timeout: 10000 })
        await viewOrderButton.click()
        const checkoutButton = await page.waitForSelector('body > div.sc-75cea620-0.klDnoY.rtl > div > aside > footer > div > div > button', { timeout: 5000 })
        await checkoutButton.click()
        const changePaymentMethodButton = await page.waitForSelector('#mainContent > div._7jNY6.rtl > div.Ma9ZAd > div:nth-child(1) > ul.sc-bb657320-1.joEtjd > li > a', { timeout: 5000 })
        await changePaymentMethodButton.click()
        const chooseCibusButton = await page.waitForSelector('body > div.sc-75cea620-0.klDnoY.rtl > div > aside > div.sc-c12b36a1-0.cGazFG > div > div.sc-c12b36a1-5.hNAlWg > div > div:nth-child(6) > button', { timeout: 5000 })
        await chooseCibusButton.click()
        await sleep(2000)
        const clickToOrderButton = await page.waitForSelector('#mainContent > div._7jNY6.rtl > div.Ma9ZAd > div.CZxzRr > div > div.sc-aa3e1f87-0.gKHgeC > dl:nth-child(3) > div:nth-child(3) > dd > div.COs4mW > div > button', { timeout: 5000 })
        await clickToOrderButton.click()
        await sleep(3000)
        const cibusIframeElement = await page.waitForSelector('#mainContent > div.sc-abd810a6-0.ccSyce > iframe')
        const cibusIframe = await cibusIframeElement.contentFrame()

        const [employeeIdInput, passwordInput, companyNameInput] = await Promise.all([
            cibusIframe.waitForSelector('#txtUserName'),
            cibusIframe.waitForSelector('#txtPassword'),
            cibusIframe.waitForSelector('#txtCompany')
        ])
        await employeeIdInput.type(EMPLOYEE_ID, { delay: 200 })
        await passwordInput.type(CIBUS_PASSWORD, { delay: 200 })
        await companyNameInput.type(COMPANY_NAME, { delay: 200 })
        const loginButton = await cibusIframe.waitForSelector('#btnSubmit')
        await loginButton.click()
        const approvePayButton = await cibusIframe.waitForSelector('#btnPay')
        await approvePayButton.click()
        await sleep(3000)
        const alreadyUsedModal = await page.$('body > div.sc-75cea620-0.klDnoY.rtl > div')
        const outputMessage = alreadyUsedModal ? 'Already used cibus today' : 'Got giftcard successfully'
        await sendMail(outputMessage)
        await sleep(2000)
        await browser.close()
    } catch (err) {
        console.log(`Error collecting giftcard: ${err}`);
    } finally {
        setTimeout(scrapeWolt, 1000 * 60 * 60 * RUN_INTERVAL_HOUR)
    }
}

scrapeWolt()