import { test, expect } from '@playwright/test';

test.describe('Scenario 4: The Vidarbha Daily Express (Core-Word Root Extraction)', () => {
  test('strips filler words and detects core root clash on vidarbha', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('The Vidarbha Daily Express');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Core-Word breakdown is present
    await expect(page.getByText(/4\. Core-Word Distinctive Root/i)).toBeVisible();

    // Assert extracted root tokens contains vidarbha
    await expect(page.getByText(/Extracted Root Tokens:/i)).toBeVisible();
    await expect(page.getByText('vidarbha').first()).toBeVisible();
  });
});
