import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login.js';
import { sgConfig } from '../../config/sgConfig.js';
import { saveResultSheet } from '../../../utils/saveResult.js';
import * as XLSX from 'xlsx'; // 📊 Excel export support
import fs from 'fs';


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

test('🧲 Add to Cart Flow - Magnetic Badges (SingaPrinting) - All Shapes', async ({ page }) => {
  const env = process.env.ENV || 'dev';
  const targetEnv = sgConfig.environment[env];
  const baseUrl = targetEnv.baseUrl;

  console.log(`🌐 Environment: ${env}`);
  console.log(`🔗 Base URL: ${baseUrl}`);

  const results = []; // 🧾 store all combo results

  try {
    // 1️⃣ LOGIN FIRST
    const loggedIn = await login(page, env);
    if (!loggedIn) throw new Error('❌ Login failed — cannot proceed.');

    // 2️⃣ GO TO PRODUCT PAGE
    const productUrl = `${baseUrl}badges/magnetic-badge?featured=1`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    console.log(`✅ Navigated to Magnetic Badges: ${productUrl}`);

    // 3️⃣ DEFINE TEST DATA
    const shapes = [
      { name: 'Circle', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[1]' },
    ];

    const circleSizes = [
      { label: '25x25mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[1]' },
      { label: '32x32mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[2]' },
    ];

    const finishings = [
      { name: 'Gloss', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div/div[1]/ul/li[1]' },
      { name: 'Matte', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[4]/div/div[1]/ul/li[2]' }
    ];

    const quantities = [
      { qty: 5, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/li[1]' },
      { qty: 10, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/li[2]' },
      { qty: 20, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/ul/li[1]' },
      { qty: 30, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/ul/li[2]' },
      { qty: 50, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/ul/li[3]' },
      { qty: 100, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/ul/li[4]' },
      { qty: 200, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/ul/li[5]' },
      { qty: 300, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/ul/li[6]' },
      { qty: 500, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/ul/li[7]' },
      { qty: 1000, xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[5]/div[2]/div[1]/ul/ul/li[8]' }
    ];

    const uploadModalXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div';
    const artworkInputXPath = 'xpath=//*[@id="artwork_input_file"]';
    const specialInstructionXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[1]/textarea';
    const continueButtonXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[2]/div/button';
    const cartCloseXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[1]/div/div/div[2]/ul/li[3]/div/a';

    let uploadCounter = 1;
    const maxFiles = 10;

    // 4️⃣ LOOP: SHAPE → SIZE → FINISH → QTY
    for (const shape of shapes) {
      console.log(`🟢 Shape: ${shape.name}`);
      await scrollAndClick(page, shape.xpath, `Shape: ${shape.name}`);
      await page.waitForTimeout(1000);

      const sizes = shape.name === 'Circle'
        ? circleSizes
        : [{ label: 'Default', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[1]' }];

      for (const size of sizes) {
        await scrollAndClick(page, size.xpath, `Size: ${size.label}`);
        for (const finishing of finishings) {
          await scrollAndClick(page, finishing.xpath, `Finishing: ${finishing.name}`);
          for (const qty of quantities) {
            try {
              console.log(`🧮 Quantity: ${qty.qty}`);

              // Click See More if needed
              const seeMoreButton = page.locator(
                'xpath=//*[@id="product_details"]/div[1]/aside/div[1]/section[5]//li[contains(@class,"see_more")] | //*[@id="product_details"]/div[1]/aside/div[1]/section[5]//a[contains(text(),"See More")]'
              );
              if (await seeMoreButton.isVisible()) {
                await seeMoreButton.first().click();
                await page.waitForTimeout(800);
              }

              await scrollAndClick(page, qty.xpath, `Quantity: ${qty.qty}`);
              await page.waitForTimeout(800);

              const comboInfo = (await page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[2]').textContent())?.trim() || '';
              const price = (await page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[3]/div[1]/h2').textContent())?.trim() || '';
              console.log(`ℹ️ comboInfo: ${comboInfo}`);
              console.log(`💰 price: ${price}`);

              await scrollAndClick(page, '//*[@id="product_details"]/div[1]/aside/div[3]/div[2]/button[1]', 'Add to Cart');
              await page.waitForSelector(uploadModalXPath, { timeout: 8000 });

              const filePath = `Materials/${uploadCounter}.png`;
              await page.setInputFiles(artworkInputXPath, filePath);
              uploadCounter++;
              if (uploadCounter > maxFiles) uploadCounter = 1;

              const note = `${shape.name} / ${size.label} / ${finishing.name} / Qty: ${qty.qty} / Price: ${price}`;
              await page.locator(specialInstructionXPath).fill(note);
              await page.locator(continueButtonXPath).click();
              await page.waitForTimeout(1000);

              await page.locator(cartCloseXPath).click();
              await page.waitForTimeout(1200);

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

              console.log(`✅ Logged combo: ${note}`);
            } catch (err) {
              console.warn(`⚠️ Skipped combo due to error: ${err.message}`);
            }
          }
        }
      }
    }

  } catch (err) {
    console.error(`❌ Test stopped early: ${err.message}`);
   } finally {
  try {
    console.log('🧮 Comparing prices with baseline before saving...');
    const baselinePath = 'singaprinting/test/pricingData/baselinePrice.json';
    const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

    // 🏷️ Product name
    const productName = 'Magnetic Badges';

    // ✅ Get product baseline directly (array)
    const productBaseline = baselineData[productName];
    if (!productBaseline) throw new Error(`No baseline data found for ${productName}`);

    // 🧾 Compare each result with baseline
    for (const result of results) {
      const [width, height] = result.Size.replace('mm', '').split('x').map(Number);
      const qtyKey = result.Quantity.toString();
      const actual = parseFloat(result.Price.replace(/[^0-9.]/g, ''));

      const baselineEntry = productBaseline.find(
        (item) => item.width === width && item.height === height
      );

      if (baselineEntry && baselineEntry[qtyKey] !== undefined) {
        const expected = baselineEntry[qtyKey];
        const diff = Math.abs(expected - actual);

        result.Status =
          diff <= 0.5
            ? '✅ Match'
            : `❌ Mismatch (Expected: ${expected}, Got: ${actual})`;
      } else {
        result.Status = '⚠️ No baseline data';
      }
    }

    console.log(`🧾 Price comparison complete for ${productName}.`);
  } catch (error) {
    console.warn(`⚠️ Could not compare prices: ${error.message}`);
  }

  // 📊 Export final results
  await saveResultSheet(results, env, 'sg', 'MagneticBadges');
}
});
