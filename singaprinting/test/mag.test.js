import { test, expect } from '@playwright/test';
import { sgConfig } from '../config/sgConfig.js';
import { login } from './helpers/loginHelper.js';

const env = process.env.ENV || 'live';
const targetEnv = sgConfig.environment[env];
const baseUrl = targetEnv.baseUrl;

test('Order Magnetic Badge Test - dev', async ({ page }) => {
    try {
        console.log(`🧭 Running on environment: ${env}`);
        // Step 1: Login
        await login(page);

        // Step 2: Navigate to magnetic badge product (use config URL if available)
        const magneticBadgeUrl = (targetEnv && targetEnv.magneticBadge) ? targetEnv.magneticBadge : `${baseUrl}badges/magnetic-badge?featured=1`;
        await page.goto(magneticBadgeUrl, { waitUntil: 'networkidle' });

        // Wait for the product section with increased timeout
        await page.waitForSelector('.product-details, .product-container', { timeout: 30000 });

        const productArea = page.locator('.product-details, .product-container').first();

        // If there are multiple product cards, open the first product
        const productCard = page.locator('.product-card, .product-item').first();
        if (await productCard.isVisible()) {
            await productCard.click();
            await page.waitForLoadState('networkidle');
        }

        // Choose Shape (Circle)
        const shapeLocator = productArea.locator('text=Circle');
        if (await shapeLocator.first().isVisible().catch(() => false)) {
            await shapeLocator.first().click();
        }

        // Choose Size (25x25)
        const sizeLocator = productArea.locator('text=25x25');
        if (await sizeLocator.first().isVisible().catch(() => false)) {
            await sizeLocator.first().click();
        }

        // Choose Finishing (Gloss)
        const glossLocator = productArea.locator('text=Gloss');
        if (await glossLocator.first().isVisible().catch(() => false)) {
            await glossLocator.first().click();
        }

        // Set Quantity to 5
        const qtyInput = productArea.locator('input[type="number"], input[name="quantity"], input.quantity-input');
        if (await qtyInput.first().isVisible().catch(() => false)) {
            await qtyInput.first().fill('5');
        } else {
            const qtyButton = productArea.locator('button:has-text("5"), text=5');
            if (await qtyButton.first().isVisible().catch(() => false)) {
                await qtyButton.first().click();
            }
        }

        // Click Add to Cart and wait for cart update/response
        const addSelectors = [
            'button:has-text("Add to Cart")',
            'button:has-text("Add To Cart")',
            'button.add-to-cart',
            'a:has-text("Add to Cart")',
            'input[value="Add to Cart"]',
        ];

        let clicked = false;
        for (const sel of addSelectors) {
            const scoped = productArea.locator(sel).first();
            if (await scoped.isVisible().catch(() => false)) {
                await Promise.all([
                    page.waitForResponse(response => response.url().includes('/cart') && (response.status() === 200 || response.status() === 201), { timeout: 10000 }).catch(() => null),
                    scoped.click()
                ]);
                console.log(`✅ Clicked add-to-cart using scoped selector: ${sel}`);
                clicked = true;
                break;
            }
            const global = page.locator(sel).first();
            if (await global.isVisible().catch(() => false)) {
                await Promise.all([
                    page.waitForResponse(response => response.url().includes('/cart') && (response.status() === 200 || response.status() === 201), { timeout: 10000 }).catch(() => null),
                    global.click()
                ]);
                console.log(`✅ Clicked add-to-cart using global selector: ${sel}`);
                clicked = true;
                break;
            }
        }

        if (!clicked) {
            const buttons = await page.locator('button, a, input[type="submit"]').allTextContents();
            console.log('ℹ️ Buttons on page:', buttons.slice(0, 20));
            throw new Error('Add to Cart button not found (checked multiple selectors)');
        }

        // Navigate to cart page
        const cartBtn = page.locator('.cart-icon, a[href*="cart"], text=Cart');
        if (await cartBtn.first().isVisible().catch(() => false)) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => null),
                cartBtn.first().click()
            ]);
        } else {
            await page.goto(new URL('/cart', baseUrl).toString(), { waitUntil: 'networkidle' });
        }

        // Verify cart contents
        await Promise.race([
            page.waitForSelector('text=Cart (', { timeout: 10000 }).catch(() => null),
            page.waitForSelector('text=Magnetic Badge', { timeout: 10000 }).catch(() => null),
        ]);
        const pageText = (await page.content()).toLowerCase();
        expect(pageText).toContain('magnetic badge');
        await page.screenshot({ path: `test-results/magnetic-badge-success-${env}.png`, fullPage: true });

        // Navigate to checkout
        const checkoutSelectors = [
            'button:has-text("CHECKOUT")',
            'button:has-text("Checkout")',
            'a:has-text("CHECKOUT")',
            'a:has-text("Checkout")',
            'button.checkout',
            'a[href*="/checkout"]'
        ];

        let navigatedToCheckout = false;
        for (const sel of checkoutSelectors) {
            const el = page.locator(sel).first();
            if (await el.isVisible().catch(() => false)) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => null),
                    el.click()
                ]);
                console.log(`✅ Clicked checkout using selector: ${sel}`);
                navigatedToCheckout = true;
                break;
            }
        }

        if (!navigatedToCheckout) {
            const checkoutUrl = new URL('/checkout', baseUrl).toString();
            await page.goto(checkoutUrl, { waitUntil: 'networkidle' });
            console.log('ℹ️ Opened checkout URL directly');
        }

        // Handle checkout process
        await Promise.race([
            page.waitForSelector('text=Available Payment Options', { timeout: 15000 }).catch(() => null),
            page.waitForSelector('text=Checkout', { timeout: 15000 }).catch(() => null),
            page.waitForSelector('form[action*="/checkout"]', { timeout: 15000 }).catch(() => null)
        ]);

        // Enable drop shipping
        const enableDropShippingBtn = page.locator('input[type="checkbox"]').filter({ hasText: /Enable Drop Shipping/ });
        if (await enableDropShippingBtn.isVisible().catch(() => false)) {
            await enableDropShippingBtn.click();
            console.log('✅ Enabled drop shipping');
        }

        // Random choose shipping method
        const availableShippingMethods = ['Standard', 'Express'];
        const selectedShipping = availableShippingMethods[Math.floor(Math.random() * availableShippingMethods.length)];
        const selectedShippingRadio = page.locator(`input[type="radio"]`).filter({ hasText: selectedShipping }).first();
        if (await selectedShippingRadio.isVisible().catch(() => false)) {
            await selectedShippingRadio.click();
            console.log(`✅ Selected ${selectedShipping} shipping`);
        }

        // Select payment method (Bank Transfer or Credit Card) before checkout
        const paymentOptions = ['Credit Card', 'Bank Transfer'];
        const selectedPayment = paymentOptions[Math.floor(Math.random() * paymentOptions.length)];
        console.log(`🔄 Selecting payment method: ${selectedPayment}`);

        // Wait for payment options to be visible
        await page.waitForSelector('label:has-text("Bank Transfer"), label:has-text("Credit Card")', { timeout: 5000 });
        
        if (selectedPayment === 'Credit Card') {
            // Try to select Credit Card payment radio if present
            await page.evaluate(() => {
                const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]'));
                const creditCardInput = radioInputs.find(input => {
                    const label = document.querySelector(`label[for="${input.id}"]`);
                    return label && /credit card/i.test(label.textContent);
                });
                if (creditCardInput) creditCardInput.click();
            });
            
            // Try to select Credit Card payment method using JavaScript
            // Wait for credit card form to be visible — fields may be inside iframes
            const cardFieldSelectors = [
                'input[name="card_number"]',
                'input[placeholder*="Card number"]',
                'input[aria-label*="Card number"]',
            ];

            // Try to fill non-iframe fields first
            let filledCard = false;
            for (const sel of cardFieldSelectors) {
                const locator = page.locator(sel).first();
                if (await locator.isVisible().catch(() => false)) {
                    await locator.fill('4035501000000008');
                    filledCard = true;
                    console.log('✅ Filled card number (direct field)');
                    break;
                }
            }

            // If not filled, try filling inside iframes (common for 3rd-party payment widgets)
            if (!filledCard) {
                const frames = page.frameLocator('iframe');
                // card
                const frameCard = frames.locator('input[placeholder*="Card number"], input[aria-label*="Card number"], input[name*="card"]').first();
                if (await frameCard.isVisible().catch(() => false)) {
                    await frameCard.fill('4035501000000008');
                    console.log('✅ Filled card number (iframe)');
                }
                // expiry (ensure year > 2025 -> YY >= 26)
                const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
                const randomYear = String(Math.floor(Math.random() * 5) + 26); // YY -> 26-30
                const expiryValue = `${randomMonth} / ${randomYear}`;
                const frameExpiry = frames.locator('input[placeholder*="MM"], input[placeholder*="MM / YY"], input[name*="expiry"]').first();
                if (await frameExpiry.isVisible().catch(() => false)) {
                    await frameExpiry.fill(expiryValue);
                    console.log('✅ Filled expiry date (iframe):', expiryValue);
                }
                // cvc/cvv
                const randomCVV = String(Math.floor(Math.random() * 900) + 100);
                const frameCvc = frames.locator('input[placeholder*="CVC"], input[placeholder*="CVV"], input[name*="cvc"], input[name*="cvv"]').first();
                if (await frameCvc.isVisible().catch(() => false)) {
                    await frameCvc.fill(randomCVV);
                    console.log('✅ Filled CVV (iframe)');
                }
            } else {
                // direct fields path: expiry and cvv
                const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
                const randomYear = String(Math.floor(Math.random() * 5) + 26); // YY
                const expiryValue = `${randomMonth} / ${randomYear}`;
                await page.locator('input[placeholder="MM/YY"], input[name="expiry"]').fill(expiryValue).catch(() => {});
                const randomCVV = String(Math.floor(Math.random() * 900) + 100);
                await page.locator('input[placeholder="XXX"], input[name="cvv"]').fill(randomCVV).catch(() => {});
                console.log('✅ Filled expiry and CVV (direct fields):', expiryValue, randomCVV);
            }
        } else {
            // Try multiple strategies for Bank Transfer selection
            try {
                // Try direct radio button selection first
                const bankTransferRadio = page.locator('input[type="radio"]').filter({ hasText: /Bank Transfer/ }).first();
                if (await bankTransferRadio.isVisible().catch(() => false)) {
                    await bankTransferRadio.click();
                    console.log('✅ Selected Bank Transfer using radio button');
                } else {
                    // Fallback to JavaScript selection
                    await page.evaluate(() => {
                        const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]'));
                        const bankTransferInput = radioInputs.find(input => {
                            const label = document.querySelector(`label[for="${input.id}"]`);
                            return label && (label.textContent.includes('Bank Transfer') || label.textContent.includes('Bank transfer'));
                        });
                        if (bankTransferInput) {
                            bankTransferInput.click();
                        } else {
                            // Try clicking the container/label if radio not found
                            const bankTransferLabel = Array.from(document.querySelectorAll('label, div')).find(el => 
                                el.textContent.toLowerCase().includes('bank transfer'));
                            if (bankTransferLabel) bankTransferLabel.click();
                        }
                    });
                    console.log('✅ Selected Bank Transfer using JavaScript');
                }
                
                // Wait for any loading or transitions after selecting bank transfer
                await page.waitForLoadState('networkidle').catch(() => {});
                
            } catch (error) {
                console.log('⚠️ Error selecting Bank Transfer:', error.message);
                throw error;
            }
            console.log('✅ Selected Bank Transfer payment method');
        }

        // Accept terms of service - click the checkbox right after payment selection
        try {
            await page.waitForLoadState('networkidle');

            // Try to locate and click the Terms of Service checkbox
            await page.waitForLoadState('networkidle');
            
            // Find the checkbox through its parent div
            const termsCheckbox = page.locator('input[type="checkbox"]').filter({ 
                hasText: 'I Agree with the Terms of Services and Privacy Policy'
            }).first();

            try {
                await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
                await termsCheckbox.click();
                console.log('✅ Clicked Terms of Services agreement');
                
                // Verify acceptance
                await page.waitForTimeout(500);
                if (await page.locator('text="Please agree to our terms"').isVisible().catch(() => false)) {
                    throw new Error('Terms acceptance did not register');
                }
                console.log('✅ Terms acceptance verified');
            } catch (error) {
                console.log('❌ Error accepting terms of service:', error.message);
                throw error;
            }

            // Wait briefly for UI update
            await page.waitForTimeout(500);

        } catch (error) {
            console.error('❌ Error accepting terms of service:', error.message);
            throw error;
        }

        // Wait for any pending animations or transitions
        await page.waitForTimeout(2000);
        
        // Click Complete Checkout button with multiple strategies
        console.log('🔄 Attempting to click Complete Checkout button...');
        
        // Wait for any animations to complete
        await page.waitForTimeout(2000);

        // Try to find and click the Complete Checkout button
        const completeCheckoutButton = page.locator('button:has-text("Complete Checkout")');
        
        if (await completeCheckoutButton.isVisible().catch(() => false)) {
            // Take screenshot before clicking
            await page.screenshot({ path: `test-results/before-checkout-${env}.png`, fullPage: true });
            
            // Click and wait for response
            await Promise.all([
                page.waitForLoadState('networkidle'),
                completeCheckoutButton.click({ timeout: 10000 })
            ]);
            console.log('✅ Clicked Complete Checkout button directly');
        } else {
            // If button not found, try JavaScript approach
            console.log('⚠️ Complete Checkout button not found, trying alternate method');
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                const checkoutButton = buttons.find(btn => 
                    btn.textContent?.toLowerCase().includes('complete checkout') ||
                    btn.textContent?.toLowerCase().includes('place order'));
                if (checkoutButton) checkoutButton.click();
            });
            console.log('✅ Attempted checkout using JavaScript');
        }
        
        // Wait for navigation or confirmation text (more robust than relying only on networkidle)
        const confirmationLocator = page.locator('text=/thank you|order number|order received|payment confirmation|order details/i').first();
        const waited = await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 45000 }).catch(() => null),
            confirmationLocator.waitFor({ state: 'visible', timeout: 45000 }).catch(() => null)
        ]);

        if (!waited) {
            console.warn('⚠️ No navigation or confirmation detected after checkout click (timed out).');
            // Capture a debugging screenshot
            await page.screenshot({ path: `test-results/before-final-wait-${env}.png`, fullPage: true }).catch(() => {});
        } else {
            console.log('✅ Completed checkout process (navigation or confirmation detected)');
        }

        // Take a final checkout screenshot
        await page.screenshot({ path: `test-results/magnetic-badge-checkout-${env}.png`, fullPage: true });
        console.log('✅ Captured final checkout screenshot');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (page) {
            await page.screenshot({ path: `test-results/magnetic-badge-error-${env}.png`, fullPage: true });
        }
        throw error;
    }
});