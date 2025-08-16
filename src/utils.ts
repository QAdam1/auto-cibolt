export async function waitUntil(
    condition: () => Promise<boolean>,
    {
        timeout = 5000,
        interval = 200,
        timeoutMsg = 'waitUntil: condition not met in time',
    } = {}
): Promise<void> {
    const start = Date.now();

    while (true) {
        if (await condition()) return;
        if (Date.now() - start > timeout) {
            throw new Error(timeoutMsg);
        }
        await new Promise(res => setTimeout(res, interval));
    }
}
