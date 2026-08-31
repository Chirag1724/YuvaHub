import { expect } from '@playwright/test';
import { authTest, MOCK_OPPORTUNITIES } from './helpers/auth';

authTest.describe('Bookmarks', () => {
  authTest('saves an opportunity and shows it in the Bookmarks tab', async ({ signedInPage }) => {
    const page = signedInPage;
    await page.goto('/');
    await page.getByRole('tab', { name: 'Opportunities' }).click();

    const opp = MOCK_OPPORTUNITIES[0];
    const saveButton = page.getByRole('button', { name: `Save ${opp.title} to bookmarks` });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toHaveAttribute('aria-pressed', 'false');

    await saveButton.click();

    const removeButton = page.getByRole('button', { name: `Remove ${opp.title} from bookmarks` });
    await expect(removeButton).toBeVisible();
    await expect(removeButton).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('tab', { name: 'Bookmarks' }).click();
    await expect(page.getByRole('heading', { name: 'Your Saved Bookmarks' })).toBeVisible();
    await expect(page.getByText('All Saved (1)')).toBeVisible();
    await expect(page.getByRole('heading', { name: opp.title })).toBeVisible();
  });

  authTest('removes a saved opportunity and empties the tab', async ({ signedInPage }) => {
    const page = signedInPage;
    await page.goto('/');
    await page.getByRole('tab', { name: 'Opportunities' }).click();

    const opp = MOCK_OPPORTUNITIES[0];
    await page.getByRole('button', { name: `Save ${opp.title} to bookmarks` }).click();
    await expect(page.getByRole('button', { name: `Remove ${opp.title} from bookmarks` })).toBeVisible();

    await page.getByRole('button', { name: `Remove ${opp.title} from bookmarks` }).click();
    await expect(page.getByRole('button', { name: `Save ${opp.title} to bookmarks` })).toBeVisible();

    await page.getByRole('tab', { name: 'Bookmarks' }).click();
    await expect(page.getByRole('heading', { name: 'No saved bookmarks match this view' })).toBeVisible();
  });
});
