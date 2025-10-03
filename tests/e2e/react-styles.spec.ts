import { test, expect } from '@playwright/test'

const VITE_URL = process.env.VITE_URL || 'http://localhost:3002'

test.describe('React App Styles', () => {
  test('should load Tailwind CSS correctly', async ({ page }) => {
    // Navigate to React login page
    await page.goto(`${VITE_URL}/auth/login`)

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check if Tailwind styles are applied by checking the main container
    const mainContainer = page.locator('.min-h-screen').first()

    // Get background gradient
    const backgroundImage = await mainContainer.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage
    })

    // Check the login button has proper styling
    const loginButton = page.getByRole('button', { name: /sign in/i })
    const buttonBgImage = await loginButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage
    })

    // Tailwind should apply gradient backgrounds
    expect(backgroundImage).toContain('gradient')
    expect(buttonBgImage).toContain('gradient')

    console.log('Container background:', backgroundImage)
    console.log('Button background:', buttonBgImage)
  })

  test('should apply dark mode styles', async ({ page }) => {
    await page.goto(`${VITE_URL}/auth/login`)
    await page.waitForLoadState('networkidle')

    // Get the html element (where dark class is applied)
    const html = page.locator('html')

    // Check if dark class is applied
    const htmlClasses = await html.getAttribute('class')

    console.log('HTML classes:', htmlClasses)

    // Dark class should be present on html element
    expect(htmlClasses).toContain('dark')
  })

  test('should have CSS loaded and applied', async ({ page }) => {
    await page.goto(`${VITE_URL}/auth/login`)
    await page.waitForLoadState('networkidle')

    // In Vite dev mode, CSS is injected via JavaScript, not link tags
    // Check if styles are actually applied by checking a styled element
    const body = page.locator('body')
    const bodyBackground = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Check for font family (from globals.css)
    const fontFamily = await body.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily
    })

    console.log('Body background:', bodyBackground)
    console.log('Font family:', fontFamily)

    // Font should be Inter (from globals.css)
    expect(fontFamily).toContain('Inter')
  })

  test('should render with proper Tailwind utility classes', async ({ page }) => {
    await page.goto(`${VITE_URL}/auth/login`)
    await page.waitForLoadState('networkidle')

    // Check if elements have Tailwind classes
    const loginForm = page.locator('form').first()
    const formClasses = await loginForm.getAttribute('class')

    console.log('Form classes:', formClasses)

    // Form should have Tailwind classes
    expect(formClasses).toBeTruthy()
    expect(formClasses).toMatch(/space-y|gap|flex|grid/)
  })
})
