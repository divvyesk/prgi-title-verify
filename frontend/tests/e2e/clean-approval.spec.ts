import { test, expect } from '@playwright/test';

test.describe('Scenario 6: Clean Distinctive Title (Clean Statutory Approval)', () => {
  test('approves distinct title with all statutory rule checks passed', async ({ page }) => {
    await page.goto('/?skipIntro=1');

    const titleInput = page.getByPlaceholder(/Enter proposed publication title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Zeta Orbital Quarterly');

    const verifyButton = page.getByRole('button', { name: /Verify Title/i });
    await verifyButton.click();

    // Assert Verdict is explicitly APPROVED
    await expect(page.getByText('APPROVED • CLEAR FOR REGISTRATION')).toBeVisible();

    // Assert Statutory Rulebook passes all checks (no failures)
    await expect(page.getByText(/Deterministic PRGI Statutory Rulebook/i)).toBeVisible();
    await expect(page.getByText(/PASSED/i).first()).toBeVisible();
    await expect(page.getByText(/FAILED/i)).not.toBeAttached();
  });
});
