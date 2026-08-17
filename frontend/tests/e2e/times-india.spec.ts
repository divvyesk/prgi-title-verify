import { test, expect } from '@playwright/test';

test.describe('Scenario 1: Times India vs India Times (Anagram & Lexical Clash)', () => {
  test('detects word reordering and lists India Times as top registered clash', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Times India');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Verdict is explicitly REJECTED
    await expect(page.getByText('REJECTED • HIGH CONFLICT / STATUTORY VIOLATION')).toBeVisible();

    // Assert "India Times" appears in the clashing registered titles
    await expect(page.getByText(/India Times/i).first()).toBeVisible();

    // Assert Lexical sub-score breakdown is present
    await expect(page.getByText(/1\. Lexical/i)).toBeVisible();
  });
});
