import { test } from '@playwright/test'

test('compare HTMX and React admin dashboards', async ({ page }) => {
  // HTMX version - login and screenshot
  await page.goto('http://localhost:8787/auth/login')
  await page.fill('input[name="email"]', 'admin@example.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'test-results/htmx-dashboard.png', fullPage: true })

  // React version - login and screenshot
  await page.goto('http://localhost:3002/auth/login')
  await page.fill('input[id="email"]', 'admin@example.com')
  await page.fill('input[id="password"]', 'password')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'test-results/react-dashboard.png', fullPage: true })
})
