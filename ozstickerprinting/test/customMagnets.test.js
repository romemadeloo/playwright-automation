import { test, expect } from '@playwright/test';
import { login } from '../../utils/login.js';
import { saveResultSheet } from '../../utils/saveResult.js';
import * as XLSX from 'xlsx'; // 📊 Excel export support

// Extend timeout (default 60s → 50min)
test.setTimeout(3000000);

// 🧭 Helper: scroll into view then click
async function scrollAndClick(page, xpath, description) {
  const locator = page.locator(`xpath=${xpath}`);
  try {
    await locator.scrollIntoViewIfNeeded();
    await locator.waitFor({ state: 'visible', timeout: 4000 });
    await locator.click();
    console.log(`✅ Clicked ${description}`);
  } catch (e) {
    console.warn(`⚠️ Could not click ${description}: ${e.message}`);
  }
}

test('🛒 Add to Cart Flow - Custom Magnets (OzStickerPrinting) - All Shapes', async ({ page }) => {
  const env = process.env.ENV || 'dev';
  const targetEnv = ospConfig.environment[env];
  const baseUrl = targetEnv.baseUrl;

  console.log(`🌐 Environment: ${env}`);
  console.log(`🔗 Base URL: ${baseUrl}`);

  // 1️⃣ LOGIN FIRST
  const loggedIn = await login(page, env);
  if (!loggedIn) throw new Error('❌ Login failed — cannot proceed.');

  // 2️⃣ NAVIGATE TO Custom Magnets PRODUCT PAGE
  const productUrl = `${baseUrl}magnets/custom-magnet?featured=1`;
  await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
  console.log(`✅ Navigated to Custom Magnets: ${productUrl}`);

  // 3️⃣ DEFINE TEST DATA
  const shapes = [
    { name: 'Circle', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[1]' },
    { name: 'Rectangle', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[2]' },
    { name: 'Custom', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[3]' }
  ];

  const circleSizes = [
    { label: '30x30mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[1]' },
    { label: '35x35mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[2]' },
    { label: '40x40mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[3]' },
    { label: '45x45mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[4]' },
    { label: '50x50mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[5]' },
    { label: '55x55mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[6]' },
  ];

  const rectangleSizes = [
    { label: '53x33mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[1]' },
    { label: '55x38mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[2]' },
    { label: '60x41mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[3]' },
    { label: '65x45mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[4]' },
    { label: '80x55mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[5]' },
    { label: '90x65mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[6]' },
  ];

  const quantities = [
    { qty: 50, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div[2]/div[1]/ul/li[1]' },
    { qty: 100, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div[2]/div[1]/ul/li[2]' },
    { qty: 200, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div[2]/div[1]/ul/ul/li[1]' },
    { qty: 300, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div[2]/div[1]/ul/ul/li[2]' },
    { qty: 500, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div[2]/div[1]/ul/ul/li[3]' },
    { qty: 1000, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div[2]/div[1]/ul/ul/li[4]' },
    { qty: 2000, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div[2]/div[1]/ul/ul/li[5]' },
    { qty: 5000, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div[2]/div[1]/ul/ul/li[6]' },
  ];

  const uploadModalXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div';
  const artworkInputXPath = 'xpath=//*[@id="artwork_input_file"]';
  const specialInstructionXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[1]/textarea';
  const continueButtonXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[2]/div/button';
  const cartCloseXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[1]/div/div/div[2]/ul/li[3]/div/a';

  let uploadCounter = 1;
  const maxFiles = 10;

  const results = []; // 🧾 store all test results

  try {
  // 4️⃣ MAIN TEST LOOP
  for (const shape of shapes) {
    console.log(`🟢 Shape: ${shape.name}`);
    await scrollAndClick(page, shape.xpath, `Shape: ${shape.name}`);
    await page.waitForTimeout(1000);

    let sizes = [];
    if (shape.name === 'Circle') sizes = circleSizes;
    else if (shape.name === 'Rectangle') sizes = rectangleSizes;
    else if (shape.name === 'Custom') {
      sizes = [
        { width: 30, height: 30 },
        { width: 50, height: 50 },
        { width: 60, height: 60 },
        { width: 80, height: 80 },
        { width: 100, height: 100 },
        { width: 125, height: 125 },
        { width: 150, height: 150 },
        { width: 200, height: 200 },
        { width: 300, height: 300 },
        { width: 450, height: 350 },
      ];
    }

    for (const size of sizes) {
      if (shape.name === 'Custom') {
        // 🧩 CUSTOM SIZE LOGIC
        const widthInput = page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/div/input[1]');
        const heightInput = page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/div/input[2]');
        const priceLocator = page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[3]/div[1]/h2/span');

        console.log(`📏 Custom Size: ${size.width}x${size.height}`);
        const oldPrice = (await priceLocator.textContent())?.trim() || '';

        await widthInput.fill(size.width.toString());
        await heightInput.fill(size.height.toString());
        await page.waitForTimeout(1000);

        const newPrice = (await priceLocator.textContent())?.trim() || '';
        if (oldPrice !== newPrice) console.log(`✅ Price updated from ${oldPrice} → ${newPrice}`);
        else console.warn(`⚠️ Price did not update for ${size.width}x${size.height}`);

        // 🧮 Proceed to quantities (no finishing)
        for (const qty of quantities) {
          console.log(`🧮 Quantity: ${qty.qty}`);

          // Expand quantities if needed
          const seeMoreButton = page.locator(
            'xpath=//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[contains(@class,"see_more")] | //*[@id="product_details"]/div[1]/aside/div[1]/section[4]//a[contains(text(),"See More")]'
          );
          if (await seeMoreButton.isVisible()) {
            await seeMoreButton.first().click();
            await page.waitForTimeout(100);
          }

          await scrollAndClick(page, qty.xpath, `Quantity: ${qty.qty}`);
          await page.waitForTimeout(100);

          // Capture combo info and price
          const comboInfo = (await page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[2]').textContent())?.trim() || '';
          const price = (await page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[3]/div[1]/h2').textContent())?.trim() || '';
          console.log(`ℹ️ comboInfo: ${comboInfo}`);
          console.log(`ℹ️ price: ${price}`);

          // 🧾 Extract shipping info
          let shipping = '';
          const match = comboInfo.match(/dispatched around (.+)/i);
          if (match) shipping = match[1].trim();

          // 🗂️ Save result
          results.push({
            Shape: shape.name,
            Size: `${size.width}x${size.height}`,
            Quantity: qty.qty,
            Price: price,
            Shipping: shipping,
            ComboInfo: comboInfo.replace(/\s+/g, ' '),
          });

          // 🛒 Add to cart + upload
          await scrollAndClick(page, '//*[@id="product_details"]/div[1]/aside/div[3]/div[2]/button[1]', 'Add to Cart');
          try {
            await page.waitForSelector(uploadModalXPath, { timeout: 5000 });
          } catch {
            console.warn('⚠️ Upload modal did not appear — skipping this qty.');
            continue;
          }

          const filePath = `Materials/${uploadCounter}.png`;
          await page.setInputFiles(artworkInputXPath, filePath).catch(() => {});
          console.log(`📂 Uploaded: ${filePath}`);
          uploadCounter = uploadCounter >= maxFiles ? 1 : uploadCounter + 1;

          const instructionText = `${shape.name} / ${size.width}x${size.height} / Qty: ${qty.qty} / Price: ${price}`;
          await page.locator(specialInstructionXPath).fill(instructionText);
          console.log(`📝 Filled instruction: ${instructionText}`);

          await page.locator(continueButtonXPath).click();
          console.log('✅ Clicked Continue.');
          await page.waitForTimeout(1000);

          // Close cart modal
          try {
            await page.locator(cartCloseXPath).waitFor({ state: 'visible', timeout: 8000 });
            await page.locator(cartCloseXPath).click();
            console.log('❎ Closed cart modal.');
          } catch {
            console.warn('⚠️ Cart close button not visible; continuing.');
          }

          await page.waitForTimeout(1200);
        }
      } else {
        // 🟠 CIRCLE & RECTANGLE — NO FINISHING
        console.log(`📏 Size: ${size.label}`);
        await scrollAndClick(page, size.xpath, `Size: ${size.label}`);
        await page.waitForTimeout(200);

        for (const qty of quantities) {
          console.log(`🧮 Quantity: ${qty.qty}`);

          // Expand quantities if needed
          const seeMoreButton = page.locator(
            'xpath=//*[@id="product_details"]/div[1]/aside/div[1]/section[4]//li[contains(@class,"see_more")] | //*[@id="product_details"]/div[1]/aside/div[1]/section[4]//a[contains(text(),"See More")]'
          );
          if (await seeMoreButton.isVisible()) {
            await seeMoreButton.first().click();
            await page.waitForTimeout(800);
          }

          await scrollAndClick(page, qty.xpath, `Quantity: ${qty.qty}`);
          await page.waitForTimeout(800);

          // Capture combo info and price
          const comboInfo = (await page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[2]').textContent())?.trim() || '';
          const price = (await page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[3]/div[1]/h2').textContent())?.trim() || '';
          console.log(`ℹ️ comboInfo: ${comboInfo}`);
          console.log(`ℹ️ price: ${price}`);

          // 🧾 Extract shipping info
          let shipping = '';
          const match = comboInfo.match(/dispatched around (.+)/i);
          if (match) shipping = match[1].trim();

          // 🗂️ Save result
          results.push({
            Shape: shape.name,
            Size: size.label,
            Quantity: qty.qty,
            Price: price,
            Shipping: shipping,
            ComboInfo: comboInfo.replace(/\s+/g, ' '),
          });

          // 🛒 Add to cart + upload
          await scrollAndClick(page, '//*[@id="product_details"]/div[1]/aside/div[3]/div[2]/button[1]', 'Add to Cart');
          try {
            await page.waitForSelector(uploadModalXPath, { timeout: 5000 });
          } catch {
            console.warn('⚠️ Upload modal did not appear — skipping this qty.');
            continue;
          }

          const filePath = `Materials/${uploadCounter}.png`;
          await page.setInputFiles(artworkInputXPath, filePath).catch(() => {});
          console.log(`📂 Uploaded: ${filePath}`);
          uploadCounter = uploadCounter >= maxFiles ? 1 : uploadCounter + 1;

          const instructionText = `${shape.name} / ${size.label} / Qty: ${qty.qty} / Price: ${price}`;
          await page.locator(specialInstructionXPath).fill(instructionText);
          console.log(`📝 Filled instruction: ${instructionText}`);

          await page.locator(continueButtonXPath).click();
          console.log('✅ Clicked Continue.');
          await page.waitForTimeout(1000);

          // Close cart modal
          try {
            await page.locator(cartCloseXPath).waitFor({ state: 'visible', timeout: 8000 });
            await page.locator(cartCloseXPath).click();
            console.log('❎ Closed cart modal.');
          } catch {
            console.warn('⚠️ Cart close button not visible; continuing.');
          }

          await page.waitForTimeout(1200);
        }
      }
    }
  }} catch (err) {
    console.error(`❌ Test interrupted due to error: ${err.message}`);
  } finally {
    saveResultSheet(results, env, 'osp', 'CustomMagnets');
  }
});
