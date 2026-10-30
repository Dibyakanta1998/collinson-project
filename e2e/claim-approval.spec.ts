import { expect, test } from '@playwright/test';

import { WORKSPACE_CONTENT as copy } from '../src/content/workspace';

test('submits a covered claim and records human approval', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: copy.submit }).click();
  await expect(page.getByText(copy.classifications.likely_covered)).toBeVisible();
  await page.getByLabel(copy.approvalNote).fill('Handler reviewed coverage and evidence.');
  await page.getByRole('button', { name: copy.approve }).click();
  await expect(page.getByText(copy.statuses.approved).first()).toBeVisible();
});
