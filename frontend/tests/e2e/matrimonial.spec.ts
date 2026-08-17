import { test, expect } from '@playwright/test';

test.describe('Scenario 5: Royal Matrimonial Classifieds (Statutory Rule Violation)', () => {
  test('rejects commercial listing title and displays verbatim statutory clause citation', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Royal Matrimonial Classifieds');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Verdict is explicitly REJECTED
    await expect(page.getByText('REJECTED • HIGH CONFLICT / STATUTORY VIOLATION')).toBeVisible();

    // Assert Rule failure is visible in PRGI Statutory Rulebook
    await expect(page.getByText(/Deterministic PRGI Statutory Rulebook/i)).toBeVisible();
    await expect(page.getByText(/FAILED/i).first()).toBeVisible();
    await expect(page.getByText(/Section 4\.1\(a\)/i).first()).toBeVisible();
  });
});
