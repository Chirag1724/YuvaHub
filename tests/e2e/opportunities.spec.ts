import { expect } from '@playwright/test';
import { authTest, MOCK_OPPORTUNITIES } from './helpers/auth';

authTest.describe('Opportunities explorer', () => {
  authTest('renders deterministic opportunity cards', async ({ signedInPage }) => {
    const page = signedInPage;
    await page.goto('/');
    await page.getByRole('tab', { name: 'Opportunities' }).click();

    await expect(page.getByRole('heading', { name: 'Opportunities Explorer' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Search opportunities' })).toBeVisible();

    for (const opp of MOCK_OPPORTUNITIES) {
      await expect(page.getByRole('heading', { name: opp.title })).toBeVisible();
    }
  });

  authTest('opens an opportunity detail view from a card', async ({ signedInPage }) => {
    const page = signedInPage;
    await page.goto('/');
    await page.getByRole('tab', { name: 'Opportunities' }).click();

    const first = MOCK_OPPORTUNITIES[0];
    await page.getByRole('link', { name: first.title }).click();

    await expect(page.getByRole('heading', { name: first.title })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to opportunities' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await expect(page.getByText(first.description)).toBeVisible();

    await page.getByRole('button', { name: 'Back to opportunities' }).click();
    await expect(page.getByRole('heading', { name: 'Opportunities Explorer' })).toBeVisible();
  });
});
