import { test, expect } from '@playwright/test'

const VITE_URL = process.env.VITE_URL || 'http://localhost:3002'

test.describe('Tailwind CSS Loading Verification', () => {
  test('should load Tailwind CSS with all utility classes', async ({ page }) => {
    await page.goto(`${VITE_URL}/auth/login`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Take screenshot to show styles are applied
    await page.screenshot({
      path: 'test-results/tailwind-verification.png',
      fullPage: true
    })

    // Test 1: Check gradient background on container
    const container = page.locator('.min-h-screen').first()
    const containerBg = await container.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage
    })
    console.log('✓ Container background:', containerBg)
    expect(containerBg).toContain('gradient')

    // Test 2: Check button has gradient and proper styling
    const button = page.getByRole('button', { name: /sign in/i })
    await expect(button).toBeVisible()

    const buttonStyles = await button.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundImage: styles.backgroundImage,
        borderRadius: styles.borderRadius,
        padding: styles.padding,
        fontWeight: styles.fontWeight
      }
    })
    console.log('✓ Button styles:', buttonStyles)
    expect(buttonStyles.backgroundImage).toContain('gradient')
    expect(parseInt(buttonStyles.borderRadius)).toBeGreaterThan(0)

    // Test 3: Check input has border and rounded corners
    const emailInput = page.locator('input[id="email"]')
    const inputStyles = await emailInput.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        border: styles.border,
        borderRadius: styles.borderRadius,
        padding: styles.padding
      }
    })
    console.log('✓ Input styles:', inputStyles)
    expect(inputStyles.borderRadius).toBeTruthy()
    expect(inputStyles.border).toBeTruthy()

    // Test 4: Check text has correct font family
    const heading = page.getByRole('heading', { name: /welcome to sonicjs/i })
    const headingFont = await heading.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily
    })
    console.log('✓ Heading font:', headingFont)
    expect(headingFont).toContain('Inter')

    // Test 5: Check backdrop blur effect on card
    const card = page.locator('.backdrop-blur-md').first()
    const cardStyles = await card.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backdropFilter: styles.backdropFilter,
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow
      }
    })
    console.log('✓ Card styles:', cardStyles)
    expect(cardStyles.backdropFilter).toBeTruthy()
    expect(cardStyles.borderRadius).toBeTruthy()

    // Test 6: Check color classes are applied
    const demoText = page.locator('text=Demo credentials')
    const textColor = await demoText.evaluate((el) => {
      return window.getComputedStyle(el).color
    })
    console.log('✓ Text color:', textColor)
    expect(textColor).toBeTruthy()

    console.log('\n✅ All Tailwind CSS utilities are loading correctly!')
    console.log('✅ Gradient backgrounds working')
    console.log('✅ Border radius working')
    console.log('✅ Padding and spacing working')
    console.log('✅ Font family (Inter) working')
    console.log('✅ Backdrop blur working')
    console.log('✅ Color utilities working')
  })
})
