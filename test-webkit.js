const { webkit } = require('playwright');

async function testWebkit() {
    try {
        console.log('Launching WebKit...');
        const browser = await webkit.launch({ headless: true });
        console.log('✓ WebKit launched successfully');
        
        const page = await browser.newPage();
        console.log('✓ Page created');
        
        await page.goto('https://example.com');
        console.log('✓ Navigation successful');
        
        const title = await page.title();
        console.log('Page title:', title);
        
        const html = await page.content();
        console.log('HTML length:', html.length);
        
        await browser.close();
        console.log('✓ Browser closed successfully');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    }
}

testWebkit();