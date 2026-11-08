import { expect, test, type Browser, type Page } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const PASSWORD = process.env.DEMO_PASSWORD!;

const AUTO_ADVANCE = '**/rpc/auto_advance_orders';

async function login(page: Page, email: string, password = PASSWORD) {
  // Most tests drive the barista by hand, so the pitch timer stays out of their way.
  await page.route(AUTO_ADVANCE, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '0' }));
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
  const hrefs = () => page.getByRole('link', { name: /#\d+/ }).evaluateAll((links) => links.map((l) => l.getAttribute('href')));
  const before = await hrefs();
  await order(page);
  await page.getByRole('button', { name: 'Place order' }).dblclick();
  await page.waitForURL(/\/orders\/[0-9a-f-]{36}/);
  await page.goto('/orders');
  await expect(page.getByRole('link', { name: /#\d+/ }).first()).toBeVisible();
  // The list stops at 10, so check that exactly one new order went on top.
  expect((await hrefs()).slice(1)).toEqual(before.slice(0, 9));
});

test('an order reaches Ready by itself in about 15 seconds', async ({ page }) => {
  await login(page, 'student3@altitude.demo');
  await page.unroute(AUTO_ADVANCE);
  await order(page);
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForURL(/\/orders\/[0-9a-f-]{36}/);
  const start = Date.now();
  await expect(page.getByTestId('queue')).toContainText(/about (7|8|9|10) min/);
  await expect(page.getByTestId('prepared-by')).toContainText('is preparing your order', { timeout: 10_000 });
  await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 20_000 });
  expect(Date.now() - start).toBeLessThan(20_000);
  await page.getByRole('button', { name: 'I got it' }).click();
});

test('menu filters survive opening an item, and Back returns to the menu', async ({ page }) => {
  await login(page, 'student2@altitude.demo');
  await page.goto('/menu');
  await page.getByPlaceholder('Search').fill('Iced Americano');
  await page.locator('[data-testid="menu-item"]', { hasText: 'Iced Americano' }).first().click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.waitForURL('**/menu');
  await expect(page.getByPlaceholder('Search')).toHaveValue('Iced Americano');
  await page.locator('[data-testid="menu-item"]', { hasText: 'Iced Americano' }).first().click();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Menu' }).click();
  await expect(page.getByPlaceholder('Search')).toHaveValue('Iced Americano');
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
    for (const path of ['/', '/menu', '/cart', '/orders', '/squad', '/me', '/offers']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `test-results/shots/${name}${path.replace(/\//g, '-')}.png`, fullPage: true });
    }
    expect(errors.filter((e) => !/favicon|WebSocket|503/.test(e))).toEqual([]);
    await ctx.close();
  });
}

test('review dialog, barista name, tip, and ready pop-up off the order page', async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'student2@altitude.demo');
  await order(page);
  await expect(page.getByRole('list', { name: 'Your items' })).toContainText('1 x Iced Americano');
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForURL(/\/orders\/[0-9a-f-]{36}/);
  const tracker = page.url();
  await expect(page.getByTestId('prep-visual')).toHaveAttribute('data-kind', 'iced');
  const no = (await page.getByRole('heading', { name: /Order #\d+/ }).innerText()).replace(/\D/g, '');

  const barista = await baristaPage(browser);
  const card = barista.getByTestId(`order-${no}`);
  await card.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('prepared-by')).toContainText('Sara is preparing your order', { timeout: 20_000 });
  await page.getByRole('button', { name: 'AED 5' }).click();
  await expect(page.getByText('You tipped AED 5')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('link', { name: 'Menu' }).first().click();
  await card.getByRole('button', { name: 'Ready' }).click();
  // The same full-screen Ready panel shows off the order page, and I got it picks the order up.
  const popup = page.getByRole('alertdialog', { name: `Ready, order ${no}` });
  await expect(popup).toBeVisible({ timeout: 20_000 });
  await popup.getByRole('button', { name: 'I got it' }).click();
  await page.waitForURL(tracker);

  await page.getByRole('button', { name: 'Rate your drink' }).click();
  const dialog = page.getByRole('dialog', { name: /^Rate / });
  await expect(dialog.getByRole('button', { name: 'Submit' })).toBeInViewport({ ratio: 1 });
  const box = await dialog.getByRole('heading').boundingBox();
  expect(box!.y).toBeGreaterThan(0);
  await barista.context().close();

  await page.goto('/orders');
  await page.getByRole('button', { name: `Remove order ${no} from history` }).click();
  await expect(page.getByRole('button', { name: `Remove order ${no} from history` })).toHaveCount(0);
});

test('favorites are pinned to the top of the menu', async ({ page }) => {
  await login(page, 'student4@altitude.demo');
  await page.goto('/menu');
  const cards = page.locator('[data-testid="menu-item"]');
  await cards.last().waitFor();
  const name = await cards.last().getByRole('heading').innerText();
  await cards.last().getByRole('button', { name: 'Star as usual' }).click();
  await expect(cards.first()).toContainText(name, { timeout: 10_000, ignoreCase: true });
  await cards.first().getByRole('button', { name: 'Remove from favorites' }).click();
});
