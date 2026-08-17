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
    const verdictSection = page.getByRole('region', { name: /Title Verification Verdict/i });
    await expect(verdictSection).toBeVisible();
    await expect(verdictSection.getByText('APPROVED • CLEAR FOR REGISTRATION')).toBeVisible();

    // Assert Statutory Rulebook passes all checks (no failures)
    const rulesSection = page.getByRole('region', { name: /Deterministic PRGI Statutory Rulebook/i });
    await expect(rulesSection).toBeVisible();
    await expect(rulesSection.getByText(/PASSED/i).first()).toBeVisible();
    await expect(rulesSection.getByText(/FAILED/i)).not.toBeAttached();
  });
});
