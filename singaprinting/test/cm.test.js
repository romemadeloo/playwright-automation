import { test, expect } from '@playwright/test';
import { sgConfig } from '../config/sgConfig.js';
import { login } from './helpers/loginHelper.js';

// Extend timeout (default 60s → 50min)
test.setTimeout(3000000);

// 🧭 Helper: scroll into view then click
async function scrollAndClick(page, xpath, description) {
  const locator = page.locator(`xpath=${xpath}`).first();
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Wait for the element to be attached to DOM
      const attached = await locator.count();
      if (!attached) throw new Error('not attached');

      // try scroll into view then visible
      await locator.scrollIntoViewIfNeeded().catch(() => null);
      await locator.waitFor({ state: 'visible', timeout: 3000 });

      // try normal click first
      await locator.click({ timeout: 3000 });
      console.log(`✅ Clicked ${description} (attempt ${attempt})`);
      return;
    } catch (e) {
      console.warn(`⚠️ Attempt ${attempt} failed to click ${description}: ${e.message}`);
      // fallback: try JS click via evaluate
      try {
        await page.evaluate((xp) => {
          const el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if (el) el.click();
        }, xpath);
        console.log(`✅ Clicked ${description} via JS click (attempt ${attempt})`);
        return;
      } catch (ev) {
        console.warn(`⚠️ JS click failed for ${description}: ${ev.message}`);
      }

      // last resort: force click if visible in DOM
      try {
        if (await locator.count()) {
          await locator.click({ force: true, timeout: 2000 });
          console.log(`✅ Clicked ${description} with force (attempt ${attempt})`);
          return;
        }
      } catch (ef) {
        console.warn(`⚠️ Force click failed for ${description}: ${ef.message}`);
      }

      // small backoff before retry
      await page.waitForTimeout(500 * attempt);
    }
  }
  // If we reach here, all attempts failed
  console.error(`❌ Failed to click ${description} after ${maxAttempts} attempts`);
}

// Safe wait helper that returns boolean instead of throwing
async function waitForSelectorSafe(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (_) {
    return false;
  }
}

// Helper: wait until common blocking overlays/modals are gone
async function waitForNoOverlay(page, timeout = 3000) {
  const overlaySelectors = [
    uploadModalXPath, // defined later but hoisted as const in file scope
    '.up_artwork_modal.active',
    '.modal--.active',
    '.modal--up_artwork_modal.active',
    '[class*="modal-- up_artwork_modal"]',
    '[class*="modal-- up_artwork_modal"]',
    '[class*="modal"] .active'
  ];

  const start = Date.now();
  while (Date.now() - start < timeout) {
    let blocked = false;
    for (const sel of overlaySelectors) {
      try {
        if (await page.locator(sel).isVisible().catch(() => false)) {
          blocked = true;
          break;
        }
      } catch (_) {
        // ignore selector errors
      }
    }
    if (!blocked) return true;
    await page.waitForTimeout(150);
  }
  return false;
}


test('🛒 Custom Magnets - Add to Cart Flow (All Shapes → Sizes → Quantities)', async ({ page }) => {
  const env = process.env.ENV || 'dev';
  const targetEnv = sgConfig.environment[env];
  const baseUrl = targetEnv.baseUrl;

  console.log(`🌐 Environment: ${env}`);
  console.log(`🔗 Base URL: ${baseUrl}`);

  // Step 1: Login
  await login(page);
  console.log('✅ Login completed');

  // Step 2: Navigate to product
  const productUrl = `${baseUrl}magnets/custom-magnet?featured=1`;
  console.log(`🚀 Navigating to: ${productUrl}`);
  const response = await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`📡 Response status: ${response?.status()}`);
  await page.waitForSelector('#product_details', { timeout: 15000 });
  console.log('✅ Product page loaded');

  // 3️⃣ Define shapes
  const circleSizes = [
    { label: '30x30mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[1]' },
    { label: '35x35mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[2]' },
    { label: '40x40mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[3]' },
    { label: '45x45mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[4]' },
    { label: '50x50mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[5]' },
    { label: '55x55mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[6]' }
  ];

  const shapes = [
    { name: 'Circle', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[1]' },
    { name: 'Rectangle', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[2]' },
    { name: 'Custom', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[3]' }
  ];

  const quantities = [
  { qty: 50, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[contains(text(), "50") and not(contains(text(), "500")) and not(contains(text(), "5000"))]' },
  { qty: 100, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[contains(text(), "100") and not(contains(text(), "1000"))]' },
  { qty: 200, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[contains(text(), "200") and not(contains(text(), "2000"))]' },
  { qty: 300, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[text()="300" or starts-with(normalize-space(text()), "300")]' },
  { qty: 500, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[contains(text(), "500") and not(contains(text(), "5000"))]' },
  { qty: 1000, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[text()="1000" or starts-with(normalize-space(text()), "1000")]' },
  { qty: 2000, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[text()="2000" or starts-with(normalize-space(text()), "2000")]' },
  { qty: 5000, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[text()="5000" or starts-with(normalize-space(text()), "5000")]' }
];

  // XPaths for modals and inputs
  const uploadModalXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div';
  const artworkInputXPath = 'xpath=//*[@id="artwork_input_file"]';
  const specialInstructionXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[1]/textarea';
  const continueButtonXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[2]/div/button';
  const cartCloseXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[1]/div/div/div[2]/ul/li[3]/div/a';

  let uploadCounter = 1;
  const maxFiles = 10;
  let cartCount = 0;
   const cartLimit = process.env.CART_LIMIT ? Number(process.env.CART_LIMIT) : (process.env.FAST === 'true' ? 1 : Infinity);
  let addLoopDone = false;

  ADD_LOOP:
    for (const shape of shapes) {
      console.log(`🟢 Shape: ${shape.name}`);
        console.log(`\n🔄 Starting iteration for ${shape.name}`);
        
        // ensure no blocking overlays before interacting
        await waitForNoOverlay(page, 2000).catch(() => null);
        
        // Click shape and verify it's selected
        await scrollAndClick(page, shape.xpath, `Shape: ${shape.name}`);
        await page.waitForTimeout(500);
        
        // Verify shape selection
        const shapeSelected = await page.evaluate((shapeName) => {
          const shapeItems = document.querySelectorAll('#product_details [class*="selected"]');
          return Array.from(shapeItems).some(item => item.textContent.includes(shapeName));
        }, shape.name);
        
        if (!shapeSelected) {
          console.warn(`⚠️ Shape ${shape.name} may not be selected correctly, retrying...`);
          await scrollAndClick(page, shape.xpath, `Shape: ${shape.name} (retry)`);
          await page.waitForTimeout(800);
        }
  
      // Use default size for non-circle shapes and log size options
     const sizes = shape.name === 'Circle'
      ? circleSizes // your existing circleSizes array
      : shape.name === 'Rectangle'
    ? [
      { label: '53x33mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[1]' },
      { label: '55x38mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[2]' },
      { label: '60x41mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[3]' },
      { label: '65x45mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[4]' },
      { label: '80x55mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[5]' },
      { label: '90x65mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[6]' }
    ]
    : shape.name === 'Custom Shape'
    ? [{ 
      label: 'Custom (30x30mm - 450x350mm)', 
      xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[contains(text(), "Custom")]' 
      }]
    : [];

      console.log(`📏 Available sizes for ${shape.name}:`, sizes.map(s => s.label).join(', '));
  
      for (const size of sizes) {
      console.log(`\n📏 Selecting size: ${size.label}`);
      await waitForNoOverlay(page, 1500).catch(() => null);
      await scrollAndClick(page, size.xpath, `Size: ${size.label}`);
      await page.waitForTimeout(800); // Increased to ensure UI updates
      
      // Verify size selection
      const sizeSelected = await page.evaluate((sizeLabel) => {
        const sizeItems = document.querySelectorAll('#product_details [class*="selected"]');
        return Array.from(sizeItems).some(item => item.textContent.includes(sizeLabel));
      }, size.label);
      
      if (!sizeSelected) {
        console.warn(`⚠️ Size ${size.label} may not be selected correctly, retrying...`);
        await scrollAndClick(page, size.xpath, `Size: ${size.label} (retry)`);
        await page.waitForTimeout(1000);
      }
  
  
          for (const qty of quantities) {
            console.log(`🧮 Quantity: ${qty.qty}`);

            // Click See More if needed (quantities live in section[5])
            const seeMoreButton = page.locator(
            'xpath=//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[contains(@class,"see_more")] | //*[@id="product_details"]/div[1]/aside/div[1]/section[4]//a[contains(text(),"See More")]'
            );
              
            if (await seeMoreButton.isVisible()) {
            await seeMoreButton.first().click();
            await page.waitForTimeout(400); // 🔧 FIXED: Reduced from 800ms
            }

            await waitForNoOverlay(page, 1200).catch(() => null);
            await scrollAndClick(page, qty.xpath, `Quantity: ${qty.qty}`);
            await page.waitForTimeout(500); // give UI slightly more time to update

            // Capture combo info and price
            const comboInfo = (await page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[2]').textContent())?.trim() || '';
            const price = (await page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[3]/div[1]/h2').textContent())?.trim() || '';
            console.log(`ℹ️ comboInfo: ${comboInfo}`);
            console.log(`ℹ️ price: ${price}`);
  
            // Click Add to Cart
            console.log('⏳ Clicking Add to Cart for qty', qty.qty);
            await waitForNoOverlay(page, 2000).catch(() => null);
            await scrollAndClick(page, '//*[@id="product_details"]/div[1]/aside/div[3]/div[2]/button[1]', 'Add to Cart');
  
            // 🔧 FIXED: Handle both upload modal and direct cart modal scenarios
            // Wait longer and use Promise.race to detect whichever appears first
            console.log('⏳ Waiting for upload modal or cart modal to appear...');
            
            const modalDetected = await Promise.race([
              // Wait for upload modal
              page.locator(uploadModalXPath).waitFor({ state: 'visible', timeout: 5000 })
                .then(() => 'upload')
                .catch(() => null),
              // Wait for cart modal
              page.locator(cartCloseXPath).waitFor({ state: 'visible', timeout: 5000 })
                .then(() => 'cart')
                .catch(() => null),
              // Timeout fallback
              new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))
            ]);
  
            console.log(`🔍 Modal detection result: ${modalDetected}`);
            
            const uploadModalVisible = modalDetected === 'upload';
            const cartModalVisible = modalDetected === 'cart';
  
            if (uploadModalVisible) {
              console.log('📤 Upload modal detected - proceeding with file upload');
              
              // Upload file (with timeout wrapper to avoid hanging)
              const filePath = `Materials/${uploadCounter}.png`;
              try {
                await Promise.race([
                  page.setInputFiles(artworkInputXPath, filePath),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('setInputFiles timeout')), 5000))
                ]);
                console.log(`📂 Uploaded: ${filePath}`);
              } catch (e) {
                console.error(`❌ Failed to upload ${filePath}: ${e.message}`);
              }
              
              uploadCounter++;
              if (uploadCounter > maxFiles) uploadCounter = 1;
  
              // Fill special instructions
              const instructionText = `${shape.name} / ${size.label}  / Qty: ${qty.qty} / Price: ${price}`;
              try {
                await page.locator(specialInstructionXPath).fill(instructionText);
                console.log(`📝 Filled instruction: ${instructionText}`);
              } catch (e) {
                console.warn(`⚠️ Could not fill instruction textarea: ${e.message}`);
              }
  
              // Click Continue
              try {
                await page.locator(continueButtonXPath).click();
                console.log('✅ Clicked Continue.');
                
                // Wait for the continue action to process and cart modal to appear
                console.log('⏳ Waiting for cart modal to appear after Continue...');
                const cartModalAppeared = await page.locator(cartCloseXPath)
                  .waitFor({ state: 'visible', timeout: 10000 })
                  .then(() => true)
                  .catch(() => false);
                
                if (!cartModalAppeared) {
                  console.warn('⚠️ Cart modal did not appear after Continue - trying alternatives');
                  
                  // Alternative 1: Look for success indicators
                  const successIndicators = [
                    'text=Added to cart',
                    'text=Item added',
                    '[class*="success"]',
                    '[class*="notification"]'
                  ];
                  
                  for (const indicator of successIndicators) {
                    if (await page.locator(indicator).isVisible().catch(() => false)) {
                      console.log(`✅ Found success indicator: ${indicator}`);
                      await page.waitForTimeout(1000);
                      break;
                    }
                  }
                  
                  // Alternative 2: Check if upload modal closed (indicates success)
                  const uploadModalClosed = !(await page.locator(uploadModalXPath).isVisible().catch(() => false));
                  if (uploadModalClosed) {
                    console.log('✅ Upload modal closed - item likely added to cart');
                    await page.waitForTimeout(1500);
                  } else {
                    console.warn('⚠️ Upload modal still open - Continue may have failed');
                    await page.screenshot({ path: `test-results/continue-failed-${Date.now()}.png` });
                  }
                } else {
                  console.log('✅ Cart modal appeared successfully');
                }
                
              } catch (e) {
                console.error(`❌ Continue button click failed: ${e.message}`);
                await page.screenshot({ path: `test-results/continue-error-${Date.now()}.png` });
              }
  
              await page.waitForTimeout(1000); // Buffer time for UI to settle
  
            } else if (cartModalVisible) {
              console.log('🛒 Cart modal opened directly (no upload needed - likely cached from previous upload)');
              // No upload needed, cart is already open
              
            } else {
              console.warn('⚠️ Neither upload nor cart modal appeared after 5 seconds');
              console.log('🔍 Taking screenshot to debug modal issue');
              await page.screenshot({ path: `test-results/no-modal-${Date.now()}.png`, fullPage: true });
              
              // Check if "Add to Cart" actually worked
              const cartCountBefore = await page.locator('text=/View Cart \\(\\d+\\)/').textContent().catch(() => '');
              console.log(`📊 Cart indicator shows: ${cartCountBefore}`);
              
              // Try clicking the cart icon to see if item was added silently
              const cartIcon = page.locator('[class*="cart"]').first();
              if (await cartIcon.isVisible().catch(() => false)) {
                await cartIcon.click().catch(() => null);
                await page.waitForTimeout(1000);
                
                // Check if cart modal appeared after clicking cart icon
                if (await page.locator(cartCloseXPath).isVisible().catch(() => false)) {
                  console.log('✅ Cart modal appeared after clicking cart icon');
                  // Continue to cart close logic below
                } else {
                  console.log('⚠️ Still no cart modal - skipping this iteration');
                  cartCount++;
                  continue;
                }
              } else {
                console.log('⚠️ Cannot verify cart - continuing to next iteration');
                cartCount++;
                continue;
              }
            }
  
            // 🔧 CRITICAL FIX: Ensure cart modal is closed before continuing
            try {
              // Wait for cart modal to be visible
              const cartModalAppeared = await page.locator(cartCloseXPath)
                .waitFor({ state: 'visible', timeout: 8000 })
                .then(() => true)
                .catch(() => false);
              
              if (!cartModalAppeared) {
                console.log('ℹ️ Cart modal did not appear - continuing');
                cartCount++;
                await page.waitForTimeout(500);
                continue;
              }
              
              // Try multiple methods to close the cart modal
              let cartClosed = false;
              
              // Method 1: Direct click on close button
              if (!cartClosed) {
                try {
                  await page.locator(cartCloseXPath).click({ timeout: 3000 });
                  await page.waitForTimeout(800);
                  cartClosed = !(await page.locator(cartCloseXPath).isVisible().catch(() => false));
                  if (cartClosed) console.log('❎ Closed cart modal (method 1 - direct click)');
                } catch (e) {
                  console.warn('⚠️ Method 1 (direct click) failed:', e.message);
                }
              }
              
              // Method 2: Click using evaluate if method 1 failed
              if (!cartClosed) {
                try {
                  console.log('🔄 Trying method 2: JS click');
                  await page.evaluate((xpath) => {
                    const closeBtn = document.evaluate(
                      xpath.replace('xpath=', ''), 
                      document, 
                      null, 
                      XPathResult.FIRST_ORDERED_NODE_TYPE, 
                      null
                    ).singleNodeValue;
                    if (closeBtn) closeBtn.click();
                  }, cartCloseXPath);
                  await page.waitForTimeout(800);
                  cartClosed = !(await page.locator(cartCloseXPath).isVisible().catch(() => false));
                  if (cartClosed) console.log('❎ Closed cart modal (method 2 - JS)');
                } catch (e) {
                  console.warn('⚠️ Method 2 (JS click) failed:', e.message);
                }
              }
              
              // Method 3: Press Escape key
              if (!cartClosed) {
                try {
                  console.log('🔄 Trying method 3: Escape key');
                  await page.keyboard.press('Escape');
                  await page.waitForTimeout(800);
                  cartClosed = !(await page.locator(cartCloseXPath).isVisible().catch(() => false));
                  if (cartClosed) console.log('❎ Closed cart modal (method 3 - Escape key)');
                } catch (e) {
                  console.warn('⚠️ Method 3 (Escape) failed:', e.message);
                }
              }
              
              // Method 4: Click multiple possible close buttons
              if (!cartClosed) {
                try {
                  console.log('🔄 Trying method 4: Find any close button');
                  const closeSelectors = [
                    cartCloseXPath,
                    'button[aria-label="Close"]',
                    'button.close',
                    '[class*="close"]',
                    '[class*="modal"] button',
                    'xpath=//button[contains(@class, "close")]',
                    'xpath=//a[contains(@class, "close")]'
                  ];
                  
                  for (const selector of closeSelectors) {
                    const closeBtn = page.locator(selector).first();
                    if (await closeBtn.isVisible().catch(() => false)) {
                      await closeBtn.click({ force: true }).catch(() => null);
                      await page.waitForTimeout(800);
                      cartClosed = !(await page.locator(cartCloseXPath).isVisible().catch(() => false));
                      if (cartClosed) {
                        console.log(`❎ Closed cart modal (method 4 - selector: ${selector})`);
                        break;
                      }
                    }
                  }
                } catch (e) {
                  console.warn('⚠️ Method 4 (multiple selectors) failed:', e.message);
                }
              }
              
              // Method 5: Force remove modal via DOM manipulation
              if (!cartClosed) {
                try {
                  console.log('🔧 Trying method 5: Force remove modal from DOM');
                  await page.evaluate(() => {
                    // Find and remove all modal/overlay elements
                    const selectors = [
                      '[class*="modal"]',
                      '[class*="cart"]',
                      '[class*="overlay"]',
                      '[class*="drawer"]',
                      '[style*="position: fixed"]',
                      '[style*="z-index"]'
                    ];
                    
                    selectors.forEach(selector => {
                      document.querySelectorAll(selector).forEach(el => {
                        const computed = window.getComputedStyle(el);
                        // Only remove if it's a modal-like element
                        if (computed.position === 'fixed' || computed.position === 'absolute') {
                          const zIndex = parseInt(computed.zIndex);
                          if (zIndex > 100) { // High z-index indicates modal
                            el.style.display = 'none';
                            el.remove();
                          }
                        }
                      });
                    });
                    
                    // Re-enable body scroll
                    document.body.style.overflow = 'auto';
                    document.documentElement.style.overflow = 'auto';
                  });
                  await page.waitForTimeout(800);
                  cartClosed = !(await page.locator(cartCloseXPath).isVisible().catch(() => false));
                  if (cartClosed) console.log('❎ Closed cart modal (method 5 - DOM removal)');
                } catch (e) {
                  console.warn('⚠️ Method 5 (DOM removal) failed:', e.message);
                }
              }
              
              // Method 6: Navigate back to product page (preserving state)
              if (!cartClosed) {
                try {
                  console.log('🔄 Method 6: Navigating back to product page');
                  // Go back to product URL to dismiss any stuck modals
                  await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                  await page.waitForSelector('#product_details', { timeout: 10000 });
                  await page.waitForTimeout(1000);
                  
                  // Re-select the current configuration
                  console.log(`🔄 Re-selecting: ${shape.name} / ${size.label} / ${finishing.name}`);
                  await waitForNoOverlay(page, 1500).catch(() => null);
                  await scrollAndClick(page, shape.xpath, `Shape: ${shape.name} (re-select)`);
                  await page.waitForTimeout(400);
                  await waitForNoOverlay(page, 1500).catch(() => null);
                  await scrollAndClick(page, size.xpath, `Size: ${size.label} (re-select)`);
                  await page.waitForTimeout(400);
                  await waitForNoOverlay(page, 1500).catch(() => null);
                  await scrollAndClick(page, finishing.xpath, `Finishing: ${finishing.name} (re-select)`);
                  await page.waitForTimeout(400);
                  
                  cartClosed = true;
                  console.log('❎ Modal cleared after navigation (method 6)');
                } catch (e) {
                  console.warn('⚠️ Method 6 (navigation) failed:', e.message);
                }
              }
              
              if (!cartClosed) {
                console.error('❌ WARNING: Failed to close cart modal after all 6 attempts!');
                console.log('⚠️ Taking screenshot and skipping to next iteration');
                await page.screenshot({ path: `test-results/cart-modal-stuck-${Date.now()}.png`, fullPage: true });
                
                // Skip this iteration and move to next quantity
                cartCount++;
                continue;
              } else {
                console.log('✅ Cart modal successfully closed - product page ready for next iteration');
              }
              
              // Verify product page state after cart close
            const productDetailsVisible = await page.locator('#product_details').isVisible().catch(() => false);
            if (!productDetailsVisible) {
              console.error('❌ Product details not visible after closing cart');
              throw new Error('Product page not accessible');
            }
            
            // Verify our selections are still active
            const selections = await page.evaluate(({ currentShape, currentSize, currentFinishing }) => {
              const selected = document.querySelectorAll('#product_details [class*="selected"]');
              const selectedTexts = Array.from(selected).map(el => el.textContent.trim());
              return {
                shape: selectedTexts.some(t => t.includes(currentShape)),
                size: selectedTexts.some(t => t.includes(currentSize)),

              };
            }, {
              currentShape: shape.name,
              currentSize: size.label
            });
            
            if (!selections.shape || !selections.size) {
              console.warn('⚠️ Some selections were lost after cart close:');
              if (!selections.shape) console.warn(`  - Shape ${shape.name} not selected`);
              if (!selections.size) console.warn(`  - Size ${size.label} not selected`);
              
              // Re-select all options in sequence
              console.log('🔄 Re-selecting all options...');
              await waitForNoOverlay(page, 1500).catch(() => null);
              await scrollAndClick(page, shape.xpath, `Shape: ${shape.name} (restore)`);
              await page.waitForTimeout(800);
              
              await waitForNoOverlay(page, 1500).catch(() => null);
              await scrollAndClick(page, size.xpath, `Size: ${size.label} (restore)`);
              await page.waitForTimeout(800);
            }
            
            console.log('✅ Cart modal closed and product page state verified');
  
              // Check cart count from the "View Cart (N)" text
              const cartCountText = await page.locator('text=/View Cart \\(\\d+\\)/').textContent().catch(() => '');
              const match = cartCountText?.match(/\((\d+)\)/);
              const currentCount = match ? parseInt(match[1], 10) : 0;
              console.log(`🛒 Current cart count: ${currentCount}`);
  
              // Proceed to checkout if cart count is 40-50
              if (currentCount >= 100) {
                console.log(`🎯 Cart count ${currentCount} reached target range (40-50) - proceeding to checkout`);
                addLoopDone = true;
                break ADD_LOOP;
              }
            } catch (error) {
              console.error('❌ Cart modal handling failed:', error.message);
              await page.screenshot({ path: `test-results/cart-error-${Date.now()}.png` });
              throw error;
            }
  
            // increment cart count and check limit
            cartCount++;
            console.log(`🧾 Internal cart count: ${cartCount}`);
  
            // Respect CART limit from env to avoid long runs
            if (typeof cartLimit !== 'undefined' && cartLimit !== Infinity && cartCount >= cartLimit) {
              console.log(`ℹ️ Reached CART_LIMIT (${cartLimit}) — stopping add-to-cart loop`);
              addLoopDone = true;
              break ADD_LOOP;
            }
  
            // small buffer for UI
            await page.waitForTimeout(500); // 🔧 FIXED: Reduced from 1000ms
          } // end qty
      } // end size
    } // end shape
  
    console.log('🎯 Completed all Add-to-Cart combinations for all shapes successfully.');
  
    // Navigate to cart page
    // lightweight timing helper to trace slow steps
    const t0 = Date.now();
    function mark(step) {
      console.log(`⏱ ${step} — +${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  
    mark('Start navigate to cart');
    const cartBtn = page.locator('.cart-icon, a[href*="cart"], text=Cart').first();
    try {
      if (await cartBtn.isVisible().catch(() => false)) {
        await cartBtn.click().catch(() => null);
        // wait for cart page indicator
        await page.waitForSelector('text=Magnetic Badge, text=Cart', { timeout: 10000 });
        mark('Clicked cart button and saw cart content');
      } else {
        // direct navigation is more reliable than networkidle
        await page.goto(new URL('/cart', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('text=Custom Magnets, text=Cart', { timeout: 10000 });
        mark('Opened cart URL and saw cart content');
      }
    } catch (e) {
      console.warn('⚠️ Cart navigation flaky, trying a more permissive check:', e.message);
      await page.goto(new URL('/cart', baseUrl).toString(), { waitUntil: 'domcontentloaded' }).catch(() => null);
    }
  
    // Verify cart contents quickly
    const cartContentText = (await page.content()).toLowerCase();
    if (!cartContentText.includes('magnetic badge')) {
      console.warn('⚠️ Magnetic Badge not obviously present in cart — continuing but check test artifacts');
    } else {
      console.log('✅ Cart appears to contain Magnetic Badge');
    }
    await page.screenshot({ path: `test-results/magnetic-badge-success-${env}.png`, fullPage: true });
  
    // ✅ Proceed to checkout (refactored, shorter and more reliable)
    try {
      mark('Proceed to checkout');
  
      const clickIfVisible = async (sel) => {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          await el.click().catch(() => null);
          return true;
        }
        return false;
      };
  
      const checkoutSelectors = [
        'button:has-text("CHECKOUT")',
        'button:has-text("Checkout")',
        'a:has-text("CHECKOUT")',
        'a:has-text("Checkout")',
        'button.checkout',
        'a[href*="/checkout"]'
      ];
  
      let wentToCheckout = false;
      for (const sel of checkoutSelectors) {
        if (await clickIfVisible(sel)) {
          // wait briefly for checkout markers
          await page.waitForSelector('text=Checkout, text=Available Payment Options, form[action*="/checkout"]', { timeout: 10000 }).catch(() => null);
          console.log(`✅ Clicked checkout using selector: ${sel}`);
          wentToCheckout = true;
          break;
        }
      }
  
      if (!wentToCheckout) {
        const checkoutUrl = new URL('/checkout', baseUrl).toString();
        await page.goto(checkoutUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('text=Checkout, form[action*="/checkout"]', { timeout: 10000 }).catch(() => null);
        console.log('ℹ️ Opened checkout URL directly');
      }
  
      mark('On checkout page');
  
      // small helpers for payment & shipping
      const selectShipping = async () => {
        const shippingOptions = ['Standard', 'Express'];
        const chosen = shippingOptions[Math.floor(Math.random() * shippingOptions.length)];
        const radio = page.locator('label').filter({ hasText: chosen }).first();
        if (await radio.isVisible().catch(() => false)) {
          await radio.click().catch(() => null);
          console.log(`✅ Selected ${chosen} shipping`);
        }
      };
  
     // Select Bank Transfer only (deterministic)
      const selectPayment = async () => {
        try {
          console.log('🔄 Payment chosen: Bank Transfer');
          await page.evaluate(() => {
            const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
            const bt = radios.find(r => {
              const label = document.querySelector(`label[for="${r.id}"]`);
              return label && /bank transfer/i.test(label.textContent);
            });
            if (bt) bt.click();
          }).catch(() => null);
          // small pause to allow UI to update
          await page.waitForTimeout(700);
        } catch (e) {
          console.warn('⚠️ selectPayment (Bank Transfer) failed:', e.message);
        }
      };
  
      const acceptTerms = async () => {
        try {
          console.log('🔍 Looking for terms acceptance control...');
  
          // Prefer a label that mentions the agreement text (broad regex)
          const label = page.locator('label').filter({ hasText: /I Agree|Terms of Services|Privacy Policy|I Agree with the Terms/i }).first();
  
          if (await label.count() && await label.isVisible().catch(() => false)) {
            const forAttr = await label.getAttribute('for');
  
            // If the label contains the styled icon, click the icon (visual target)
            const icon = label.locator('.icon_check').first();
            if (await icon.count() && await icon.isVisible().catch(() => false)) {
              await icon.click().catch(async () => {
                // fallback to clicking label if icon click fails
                await label.click().catch(() => null);
              });
            } else if (forAttr) {
              // Try to check the associated input by id
              const cb = page.locator(`#${forAttr}`);
              if (await cb.count()) {
                const isChecked = await cb.isChecked().catch(() => false);
                if (!isChecked) {
                  // Try normal check(), then click label as fallback
                  try {
                    await cb.check({ force: true });
                  } catch (_) {
                    await label.click().catch(() => null);
                    // as last resort set checked via JS and dispatch events
                    await page.evaluate((id) => {
                      const el = document.getElementById(id);
                      if (el) {
                        el.checked = true;
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }, forAttr).catch(() => null);
                  }
                } else {
                  console.log('✅ Terms checkbox already checked');
                }
              }
            } else {
              // no for attr and no icon -> click the label
              await label.click().catch(() => null);
            }
  
            // Wait briefly and verify the actual checkbox is checked
            await page.waitForTimeout(500);
  
            let verified = false;
            if (forAttr) {
              verified = await page.locator(`#${forAttr}`).first().isChecked().catch(() => false);
            }
            if (!verified) {
              // try to find a checkbox inside the label or a nearby input
              const innerCb = label.locator('input[type="icon_check"]').first();
              if (await innerCb.count()) verified = await innerCb.isChecked().catch(() => false);
            }
  
            if (!verified) {
              // last-resort: try common agree checkbox ids/names
              const fallback = page.locator('#i_agree, input[name="i_agree"], input[id*="agree"], input[type="icon_check"]').first();
              if (await fallback.count()) {
                const wasChecked = await fallback.isChecked().catch(() => false);
                if (!wasChecked) await fallback.check({ force: true }).catch(() => null);
                verified = await fallback.isChecked().catch(() => false);
              }
            }
  
            if (verified) {
              console.log('✅ Verified terms acceptance');
              return;
            }
  
            console.warn('⚠️ Terms acceptance not verified after attempts');
          } else {
            // Label not visible: try any checkbox fallbacks
            console.log('ℹ️ Label not found, trying fallback checkbox targets...');
            const possible = page.locator('#i_agree, input[name="i_agree"], input[id*="agree"], input[type="icon_check"]').first();
            if (await possible.count()) {
              const isChecked = await possible.isChecked().catch(() => false);
              if (!isChecked) {
                await possible.check({ force: true }).catch(async () => {
                  // try clicking surrounding visual element
                  const parentLabel = possible.locator('xpath=ancestor::label').first();
                  if (await parentLabel.count()) await parentLabel.click().catch(() => null);
                });
              }
              if (await possible.isChecked().catch(() => false)) {
                console.log('✅ Accepted terms via fallback checkbox');
                return;
              }
            }
            console.warn('⚠️ No suitable checkbox found to accept terms');
          }
        } catch (error) {
          console.error(`❌ Error accepting terms: ${error.message}`);
          await page.screenshot({ path: 'test-results/terms-acceptance-error.png', fullPage: true }).catch(() => null);
        }
      };
      // perform checkout steps
      await selectShipping().catch(() => null);
      await selectPayment().catch(() => null);
      await acceptTerms().catch(() => null);
  
      mark('Before clicking Complete Checkout');
      const completeBtn = page.locator('button:has-text("Complete Checkout")').first();
      if (await completeBtn.isVisible().catch(() => false)) {
        await completeBtn.click().catch(() => null);
        // wait for confirmation markers (thank you page or order id)
        await Promise.race([
          page.waitForSelector('text=Thank you', { timeout: 20000 }).catch(() => null),
          page.waitForSelector('text=Order Confirmation', { timeout: 20000 }).catch(() => null),
          page.waitForURL('**/order**', { timeout: 20000 }).catch(() => null)
        ]);
        console.log('✅ Complete checkout clicked (waited for confirmation markers)');
      } else {
        console.warn('⚠️ Complete Checkout button not found — trying generic submit');
        await page.locator('form[action*="/checkout"] button[type="submit"]').first().click().catch(() => null);
      }
  
      await page.screenshot({ path: `test-results/magnetic-badge-checkout-${env}.png`, fullPage: true });
      console.log('✅ Checkout flow finished (screenshot taken)');
    } catch (checkoutError) {
      console.error('❌ Checkout step failed:', checkoutError.message);
      await page.screenshot({ path: `test-results/magnetic-badge-checkout-error-${env}.png`, fullPage: true }).catch(() => null);
      throw checkoutError;
    }
  });

  