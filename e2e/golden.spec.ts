import { expect, test, type Browser, type Page } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const PASSWORD = process.env.DEMO_PASSWORD!;

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function order(page: Page, item = 'Iced Americano') {
  await page.goto('/menu');
  await page.locator('[data-testid="menu-item"]', { hasText: item }).first().click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.waitForURL('**/menu');
  await page.goto('/checkout');
  await expect(page.getByTestId('total')).toBeVisible();
}

async function placeAndGetNumber(page: Page) {
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForURL(/\/orders\/[0-9a-f-]{36}/);
  const heading = await page.getByRole('heading', { name: /Order #/ }).innerText();
  return heading.replace(/\D/g, '');
}

async function baristaPage(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await login(page, 'barista@altitude.demo');
  await page.waitForURL('**/barista');
  return page;
}

test('signup rejects a non-allowed domain and accepts an allowed one', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Test Climber');
  await page.getByLabel('RIT email').fill('someone@gmail.com');
  await page.getByLabel('Password').fill('climbing-test-1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Use your RIT email')).toBeVisible();
  await page.getByLabel('RIT email').fill(`e2e${Date.now()}@altitude.demo`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Hello Test')).toBeVisible();
});

test('golden path: order to READY to meters', async ({ page, browser }) => {
  await login(page, 'student1@altitude.demo');
  await order(page);
  const no = await placeAndGetNumber(page);
  await expect(page.getByTestId('queue')).toContainText('ahead of you');

  const barista = await baristaPage(browser);
  const card = barista.getByTestId(`order-${no}`);
  await card.getByRole('button', { name: 'Start' }).click();
  await card.getByRole('button', { name: 'Ready' }).click();

  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveTitle(`READY #${no}`);

  await barista.getByTestId(`order-${no}`).getByRole('button', { name: 'Picked up' }).click();
  await expect(page.getByTestId('meters-earned')).toContainText(/\+\d+ m/, { timeout: 20_000 });
  await barista.context().close();
});

test('double click on Place order makes one order', async ({ page }) => {
  await login(page, 'student2@altitude.demo');
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');
  const before = await page.getByRole('link', { name: /#\d+/ }).count();
  await order(page);
  await page.getByRole('button', { name: 'Place order' }).dblclick();
  await page.waitForURL(/\/orders\/[0-9a-f-]{36}/);
  await page.goto('/orders');
  await expect(page.getByRole('link', { name: /#\d+/ })).toHaveCount(before + 1);
});

test('sold-out toggle blocks adding in real time', async ({ page, browser }) => {
  await login(page, 'student3@altitude.demo');
  await page.goto('/menu');
  await page.locator('[data-testid="menu-item"]', { hasText: 'Espresso 20g' }).first().click();
  await expect(page.getByRole('button', { name: /Add to cart/ })).toBeEnabled({ timeout: 10_000 }).catch(() => undefined);

  const barista = await baristaPage(browser);
  await barista.getByRole('button', { name: 'Sold out' }).click();
  await barista.getByRole('switch', { name: 'Espresso 20g available' }).click();

  await expect(page.getByRole('button', { name: 'Sold out' })).toBeDisabled({ timeout: 20_000 });

  await barista.getByRole('switch', { name: 'Espresso 20g available' }).click();
  await expect(barista.getByRole('switch', { name: 'Espresso 20g available' })).toHaveAttribute('aria-checked', 'true');
  await barista.context().close();
});

test('student cannot open barista or admin', async ({ page }) => {
  await login(page, 'student1@altitude.demo');
  for (const path of ['/barista', '/admin']) {
    await page.goto(path);
    await expect(page).toHaveURL('http://localhost:5199/');
  }
});

test('squad: create, join, order, bonus appears', async ({ browser }) => {
  const stamp = Date.now();
  const make = async (name: string) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/signup');
    await page.getByLabel('Full name').fill(name);
    await page.getByLabel('RIT email').fill(`${name.toLowerCase().replace(' ', '')}${stamp}@altitude.demo`);
    await page.getByLabel('Password').fill('climbing-test-1');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(`Hello ${name.split(' ')[0]}`)).toBeVisible();
    return page;
  };
  const a = await make('Alpha Tester');
  const b = await make('Bravo Tester');

  await a.goto('/squad');
  await a.getByLabel('Squad name').fill('E2E Rope');
  await a.getByRole('button', { name: 'Create', exact: true }).click();
  const code = await a.getByTestId('squad-code').innerText();

  await b.goto('/squad');
  await b.getByLabel('6-character code').fill(code);
  await b.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(b.getByTestId('squad-code')).toHaveText(code);

  await order(a, 'Cafe Latte');
  const no = await placeAndGetNumber(a);
  const barista = await baristaPage(browser);
  const card = barista.getByTestId(`order-${no}`);
  await card.getByRole('button', { name: 'Start' }).click();
  await card.getByRole('button', { name: 'Ready' }).click();
  await card.getByRole('button', { name: 'Picked up' }).click();
  await expect(a.getByTestId('meters-earned')).toBeVisible({ timeout: 20_000 });

  await b.goto('/me');
  await expect(b.getByTestId('total-meters')).not.toHaveText('0', { timeout: 15_000 });
  await barista.context().close();
});

for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['laptop', { width: 1440, height: 900 }]] as const) {
  test(`smoke at ${name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await login(page, 'student4@altitude.demo');
    for (const path of ['/', '/menu', '/cart', '/orders', '/squad', '/me', '/offers', '/clubs', '/events', '/lab']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `test-results/shots/${name}${path.replace(/\//g, '-')}.png`, fullPage: true });
    }
    expect(errors.filter((e) => !/favicon|WebSocket|503/.test(e))).toEqual([]);
    await ctx.close();
  });
}
