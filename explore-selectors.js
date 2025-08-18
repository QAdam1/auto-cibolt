const { webkit } = require('playwright');
const { readFile } = require("fs/promises");

const COOKIE_FILE_PATH = './wolt.com.cookies.json';
const LOCAL_STORAGE_FILE_PATH = './wolt.com.localstorage.json';

async function exploreSelectors() {
    const browser = await webkit.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Load cookies and localStorage like in the main script
    const rawCookies = JSON.parse(await readFile(COOKIE_FILE_PATH, 'utf-8'));
    const formattedCookies = rawCookies.map((cookie) => ({
        ...cookie,
        sameSite: 'Lax'
    }));
    await context.addCookies(formattedCookies);

    const data = JSON.parse(await readFile(LOCAL_STORAGE_FILE_PATH, "utf8"));

    await page.goto('https://wolt.com/he/isr/tel-aviv/venue/woltilgiftcards', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    await page.evaluate((o) => {
        for (const [k, v] of Object.entries(o))
            localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }, data);
    
    await page.reload();
    await page.waitForTimeout(5000);

    // Handle restore order modal if it exists
    try {
        const dontRestoreOrderButton = await page.waitForSelector('[data-test-id="restore-order-modal.reject"]', {timeout: 5000});
        if (dontRestoreOrderButton) {
            await dontRestoreOrderButton.click();
            console.log('Clicked restore order modal');
        }
    } catch (error) {
        console.log('No restore order modal found');
    }

    await page.waitForTimeout(3000);

    // Let's explore the structure
    console.log('=== EXPLORING PAGE STRUCTURE ===');
    
    // First, let's see all horizontal item cards
    const itemCards = await page.locator('[data-test-id="horizontal-item-card"]').all();
    console.log(`Found ${itemCards.length} horizontal item cards`);

    // Look for gift cards specifically
    const text1 = 'גיפט קארד - 25 ';
    const text2 = 'גיפט קארד - 30 ';

    console.log('\n=== LOOKING FOR 25 NIS GIFT CARD ===');
    try {
        // Let's try to find the card header first
        const card25Header = await page.locator(`[data-test-id="horizontal-item-card-header"]:has-text("${text1}")`).first();
        if (await card25Header.isVisible()) {
            console.log('✓ Found 25 NIS card header');
            
            // Get the parent card
            const card25 = card25Header.locator('xpath=ancestor::*[@data-test-id="horizontal-item-card"]').first();
            
            // Explore the stepper container
            const stepperContainer = card25.locator('[data-test-id="ItemCardStepperContainer"]');
            if (await stepperContainer.isVisible()) {
                console.log('✓ Found stepper container');
                
                // Let's see what buttons are inside
                const buttons = stepperContainer.locator('button').all();
                console.log(`Found ${(await buttons).length} buttons in stepper`);
                
                for (let i = 0; i < (await buttons).length; i++) {
                    const button = (await buttons)[i];
                    const text = await button.textContent();
                    const ariaLabel = await button.getAttribute('aria-label');
                    const classes = await button.getAttribute('class');
                    console.log(`  Button ${i}: text="${text}", aria-label="${ariaLabel}", classes="${classes}"`);
                }
            }
        }
    } catch (error) {
        console.log('❌ Error exploring 25 NIS card:', error.message);
    }

    console.log('\n=== LOOKING FOR 30 NIS GIFT CARD ===');
    try {
        const card30Header = await page.locator(`[data-test-id="horizontal-item-card-header"]:has-text("${text2}")`).first();
        if (await card30Header.isVisible()) {
            console.log('✓ Found 30 NIS card header');
            
            const card30 = card30Header.locator('xpath=ancestor::*[@data-test-id="horizontal-item-card"]').first();
            const stepperContainer = card30.locator('[data-test-id="ItemCardStepperContainer"]');
            
            if (await stepperContainer.isVisible()) {
                console.log('✓ Found stepper container');
                
                const buttons = stepperContainer.locator('button').all();
                console.log(`Found ${(await buttons).length} buttons in stepper`);
                
                for (let i = 0; i < (await buttons).length; i++) {
                    const button = (await buttons)[i];
                    const text = await button.textContent();
                    const ariaLabel = await button.getAttribute('aria-label');
                    const classes = await button.getAttribute('class');
                    console.log(`  Button ${i}: text="${text}", aria-label="${ariaLabel}", classes="${classes}"`);
                }
            }
        }
    } catch (error) {
        console.log('❌ Error exploring 30 NIS card:', error.message);
    }

    console.log('\n=== TESTING CURRENT SELECTORS ===');
    
    // Test the current XPath selectors
    try {
        const xpath25 = `xpath=(//*[@data-test-id="horizontal-item-card-header" and contains(text(), '${text1}')]/ancestor::*[@data-test-id="horizontal-item-card"]//*[@data-test-id="ItemCardStepperContainer"]/*/*)[last()]`;
        const element25 = await page.locator(xpath25).first();
        if (await element25.isVisible()) {
            console.log('✓ Current 25 NIS XPath selector works');
            const text = await element25.textContent();
            const ariaLabel = await element25.getAttribute('aria-label');
            console.log(`  Element text: "${text}", aria-label: "${ariaLabel}"`);
        } else {
            console.log('❌ Current 25 NIS XPath selector does not find visible element');
        }
    } catch (error) {
        console.log('❌ Current 25 NIS XPath selector failed:', error.message);
    }

    try {
        const xpath30 = `xpath=(//*[@data-test-id="horizontal-item-card-header" and contains(text(), '${text2}')]/ancestor::*[@data-test-id="horizontal-item-card"]//*[@data-test-id="ItemCardStepperContainer"]/*/*)[last()]`;
        const element30 = await page.locator(xpath30).first();
        if (await element30.isVisible()) {
            console.log('✓ Current 30 NIS XPath selector works');
            const text = await element30.textContent();
            const ariaLabel = await element30.getAttribute('aria-label');
            console.log(`  Element text: "${text}", aria-label: "${ariaLabel}"`);
        } else {
            console.log('❌ Current 30 NIS XPath selector does not find visible element');
        }
    } catch (error) {
        console.log('❌ Current 30 NIS XPath selector failed:', error.message);
    }

    console.log('\n=== TESTING ALTERNATIVE SELECTORS ===');
    
    // Test some alternative approaches
    const alternatives = [
        `[data-test-id="horizontal-item-card"]:has([data-test-id="horizontal-item-card-header"]:has-text("${text1}")) [data-test-id="ItemCardStepperContainer"] button:last-child`,
        `[data-test-id="horizontal-item-card"]:has-text("${text1}") [data-test-id="ItemCardStepperContainer"] button[aria-label*="הוסף"]`,
        `[data-test-id="horizontal-item-card"]:has-text("${text1}") [data-test-id="ItemCardStepperContainer"] button:has-text("+")`,
    ];

    for (let i = 0; i < alternatives.length; i++) {
        try {
            const element = await page.locator(alternatives[i]).first();
            if (await element.isVisible()) {
                console.log(`✓ Alternative ${i + 1} for 25 NIS works: ${alternatives[i]}`);
                const text = await element.textContent();
                const ariaLabel = await element.getAttribute('aria-label');
                console.log(`  Element text: "${text}", aria-label: "${ariaLabel}"`);
            } else {
                console.log(`❌ Alternative ${i + 1} for 25 NIS not visible: ${alternatives[i]}`);
            }
        } catch (error) {
            console.log(`❌ Alternative ${i + 1} for 25 NIS failed: ${alternatives[i]} - ${error.message}`);
        }
    }

    // Keep browser open for manual inspection
    console.log('\n=== BROWSER PAUSED FOR MANUAL INSPECTION ===');
    console.log('Browser will stay open. Press Ctrl+C to close when done inspecting.');
    
    // Wait indefinitely
    await new Promise(() => {});
}

exploreSelectors().catch(console.error);