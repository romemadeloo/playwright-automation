import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login.js';
import { sgConfig } from '../../config/sgConfig.js';
import { saveResultSheet } from '../../../utils/saveResult.js';
import * as XLSX from 'xlsx';
import fs from 'fs';

// Extend timeout (50 min)
test.setTimeout(3000000);

// 🧭 Helper: scroll into view then click
async function scrollAndClick(page, xpath, description) {
  const locator = page.locator(`xpath=${xpath}`);
  try {
    await locator.waitFor({ state: 'attached', timeout: 8000 });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(300);
    await locator.click({ timeout: 5000 });
    console.log(`✅ Clicked ${description}`);
  } catch (e) {
    console.warn(`⚠️ Could not click ${description}: ${e.message}`);
    try {
      await page.evaluate((xpath) => {
        const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, xpath);
      await page.waitForTimeout(1000);
      await locator.click({ timeout: 4000 });
      console.log(`✅ Retried click succeeded for ${description}`);
    } catch {
      console.warn(`❌ Retry also failed for ${description}`);
    }
  }
}

test('🛒 Add to Cart Flow - Button Badges (SingaPrinting) - All Shapes', async ({ page }) => {
  const env = process.env.ENV || 'dev';
  const targetEnv = sgConfig.environment[env];
  const baseUrl = targetEnv.baseUrl;

  console.log(`🌐 Environment: ${env}`);
  console.log(`🔗 Base URL: ${baseUrl}`);

  const results = [];

  try {
    // 1️⃣ LOGIN
    const loggedIn = await login(page, env);
    if (!loggedIn) throw new Error('❌ Login failed — cannot proceed.');

    // 2️⃣ NAVIGATE TO PRODUCT PAGE
    const productUrl = `${baseUrl}badges/button-badge?featured=1`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    console.log(`✅ Navigated to Button Badges: ${productUrl}`);

    // 3️⃣ DEFINE TEST DATA
    const shapes = [
      { name: 'Circle', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[1]' },
      { name: 'Square', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[2]' },
      { name: 'Heart', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[2]/div/div[1]/ul/li[3]' }
    ];

    const circleSizes = [
      { label: '32x32mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[1]' },
      { label: '44x44mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[2]' },
      { label: '58x58mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[3]' },
      { label: '75x75mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[4]' }
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

    const packagingOptions = [
      { label: 'No', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[6]/div/div[1]/ul/li[1]' },
      { label: 'Yes', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[6]/div/div[1]/ul/li[2]' }
    ];


    const uploadModalXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div';
    const artworkInputXPath = 'xpath=//*[@id="artwork_input_file"]';
    const specialInstructionXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[1]/textarea';
    const continueButtonXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[2]/div/button';
    const cartCloseXPath = 'xpath=//*[@id="__layout"]/div/div[1]/header/div[1]/div/div/div[2]/ul/li[3]/div/a';

    let uploadCounter = 1;
    const maxFiles = 10;

    // 4️⃣ LOOP THROUGH SHAPES
    for (const shape of shapes) {
      console.log(`🟢 Shape: ${shape.name}`);
      await scrollAndClick(page, shape.xpath, `Shape: ${shape.name}`);
      await page.waitForTimeout(1000);

      const sizes = shape.name === 'Circle'
        ? circleSizes
        : [{ label: shape.name === 'Square' ? '37x37mm' : '52x57mm', xpath: '//*[@id="product_details"]/div[1]/aside/div[1]/section[3]/div/div/ul/li[1]' }];

      for (const size of sizes) {
        await scrollAndClick(page, size.xpath, `Size: ${size.label}`);
        await page.waitForTimeout(800);

        const applicableFinishings = shape.name === 'Circle'
          ? finishings.filter(f => f.name === 'Gloss')
          : finishings;

        for (const finishing of applicableFinishings) {
          await scrollAndClick(page, finishing.xpath, `Finishing: ${finishing.name}`);
          await page.waitForTimeout(800);

          for (const qty of quantities) {
            console.log(`🧮 Quantity: ${qty.qty}`);

            const seeMoreButton = page.locator(
              'xpath=//*[@id="product_details"]/div[1]/aside/div[1]/section[5]//li[contains(@class,"see_more")] | //*[@id="product_details"]/div[1]/aside/div[1]/section[5]//a[contains(text(),"See More")]'
            );
            if (await seeMoreButton.isVisible()) {
              await seeMoreButton.first().click();
              await page.waitForTimeout(1000);
            }

            await scrollAndClick(page, qty.xpath, `Quantity: ${qty.qty}`);
            await page.waitForTimeout(1000);

            // 🎁 INDIVIDUAL PACKAGING OPTIONS LOOP
            for (const packaging of packagingOptions) {
            let priceValue = 0;

            try {
              await scrollAndClick(page, packaging.xpath, `Individual Packaging: ${packaging.label}`);
              await page.waitForTimeout(800);

              // Get price after selecting this packaging
              const priceText = await page.locator('xpath=//*[@id="product_details"]/div[1]/aside/div[3]/div[1]/h2').textContent();
              priceValue = parseFloat(priceText.replace(/[^0-9.]/g, ''));

              // Save results
              results.push({
                Shape: shape.name,
                Size: size.label,
                Finishing: finishing.name,
                Quantity: qty.qty,
                IndividualPackaging: packaging.label,
                Price: `S$${priceValue.toFixed(2)}`
              });

              // Add to cart & upload artwork
              await scrollAndClick(page, '//*[@id="product_details"]/div[1]/aside/div[3]/div[2]/button[1]', 'Add to Cart');
              await page.waitForSelector(uploadModalXPath, { timeout: 5000 });
              const filePath = `Materials/${uploadCounter}.png`;
              await page.setInputFiles(artworkInputXPath, filePath);

              const instructionText = `${shape.name} / ${size.label} / ${finishing.name} / Qty: ${qty.qty} / Packaging: ${packaging.label} / Price: S$${priceValue.toFixed(2)}`;
              await page.locator(specialInstructionXPath).fill(instructionText);
              await page.locator(continueButtonXPath).click();
              await page.waitForTimeout(1000);

              // Close cart modal
              try { await page.locator(cartCloseXPath).click({ timeout: 5000 }); } catch {}

              uploadCounter++;
              if (uploadCounter > maxFiles) uploadCounter = 1;

            } catch (e) {
              console.warn(`⚠️ Packaging ${packaging.label} failed: ${e.message}`);
            }
          }

            await page.waitForTimeout(1000);
          } // qty
        } // finishing
      } // size
    } // shape
  } catch (err) {
    console.error(`❌ Test interrupted: ${err.message}`);
  } finally {
    try {
      console.log('🧮 Comparing prices with baseline...');
      const baselinePath = 'singaprinting/test/pricingData/baselinePrice.json';
      const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

      const productName = 'Button Badges';
      const productBaseline = baselineData[productName];
      if (!productBaseline) throw new Error(`No baseline for ${productName}`);

      for (const result of results) {
        const shapeKey = Object.keys(productBaseline).find(
          key => key.toLowerCase() === result.Shape.trim().toLowerCase()
        );
        const shapeGroup = shapeKey ? productBaseline[shapeKey] : null;
        if (!shapeGroup) {
          result.Status = `⚠️ No shape data for ${result.Shape}`;
          continue;
        }

        const [width, height] = result.Size.replace('mm', '').split('x').map(n => parseFloat(n.trim()));
        const qtyKey = result.Quantity.toString();
        const actual = parseFloat(result.Price.replace(/[^0-9.]/g, ''));
        const matched = shapeGroup.find(s => s.width === width && s.height === height);

        if (matched && matched[qtyKey] !== undefined) {
          const expected = matched[qtyKey];
          const diff = Math.abs(expected - actual);
          result.Status = diff <= 0.5 ? '✅ Match' : `❌ Mismatch (Expected: ${expected}, Got: ${actual})`;
        } else {
          result.Status = '⚠️ No baseline data for this size/qty';
        }
      }

      console.log('🧾 Price comparison complete.');
    } catch (e) {
      console.warn(`⚠️ Could not compare prices: ${e.message}`);
    }

    await saveResultSheet(results, env, 'sg', 'ButtonBadges');
  }
});
