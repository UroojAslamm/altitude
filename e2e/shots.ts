// Visual review helper. Needs the dev server on 5199.
// Run: node --experimental-strip-types e2e/shots.ts <output folder>
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const out = process.argv[2] ?? 'review-shots';
const base = 'http://localhost:5199';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

async function session(email: string, viewport: { width: number; height: number }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 160)));
  await page.goto(`${base}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  return page;
}

const landing = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await landing.goto(base);
await landing.waitForTimeout(9000);
await landing.screenshot({ path: `${out}/ascent-0.png` });
await landing.close();

const phone = await session('student3@altitude.demo', { width: 390, height: 844 });
await phone.waitForTimeout(2500);
const gotIt = phone.getByRole('button', { name: 'Got it' });
if (await gotIt.isVisible()) await gotIt.click();
await phone.screenshot({ path: `${out}/home.png` });
await phone.goto(`${base}/menu`);
await phone.getByRole('button', { name: 'Coffee-Free Drinks' }).click();
await phone.waitForTimeout(800);
await phone.screenshot({ path: `${out}/smoothies.png` });
await phone.locator('[data-testid="menu-item"]', { hasText: "Pash n' Shoot" }).click();
await phone.waitForTimeout(600);
await phone.screenshot({ path: `${out}/item.png` });
await phone.getByRole('button', { name: 'Add to cart' }).click();
await phone.waitForURL('**/menu');
await phone.goto(`${base}/checkout`);
await phone.waitForTimeout(1500);
await phone.screenshot({ path: `${out}/checkout.png`, fullPage: true });
await phone.getByRole('button', { name: 'Place order' }).click();
await phone.waitForURL(/\/orders\/[0-9a-f-]{36}/);
await phone.waitForTimeout(6000);
await phone.screenshot({ path: `${out}/tracker.png` });
await phone.goto(`${base}/me`);
await phone.waitForTimeout(6000);
await phone.screenshot({ path: `${out}/me.png` });

const bar = await session('barista@altitude.demo', { width: 1440, height: 900 });
await bar.waitForTimeout(2000);
await bar.screenshot({ path: `${out}/barista.png` });

const admin = await session('admin@altitude.demo', { width: 1440, height: 900 });
await admin.waitForTimeout(1500);
await admin.screenshot({ path: `${out}/admin.png` });
await admin.getByRole('tab', { name: 'Analytics' }).click();
await admin.waitForTimeout(2000);
await admin.screenshot({ path: `${out}/analytics.png` });
await browser.close();
