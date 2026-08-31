import { expect } from '@playwright/test';
import { authTest, MOCK_NAME, MOCK_EMAIL } from './helpers/auth';

authTest.describe('Profile management', () => {
  authTest('prefills profile from the signed-in identity', async ({ signedInPage }) => {
    const page = signedInPage;
    await page.goto('/');
    await page.getByRole('tab', { name: 'My Profile' }).click();

    await expect(page.getByRole('heading', { name: 'Academic Parameters' })).toBeVisible();
    await expect(page.locator('label:has-text("Full Name") + input')).toHaveValue(MOCK_NAME);
    await expect(page.locator('label:has-text("Email Address") + input')).toHaveValue(MOCK_EMAIL);
    await expect(page.getByRole('button', { name: 'Save Profile Changes' })).toBeVisible();
  });

  authTest('saves edited profile fields with a success confirmation', async ({ signedInPage }) => {
    const page = signedInPage;
    await page.goto('/');
    await page.getByRole('tab', { name: 'My Profile' }).click();

    await page.getByPlaceholder('Phone').fill('+91 98765 43210');
    await page.getByPlaceholder('College Name').fill('Mock National Institute of Technology');
    await page.getByPlaceholder('Write a short summary...').fill('Full-stack developer exploring open source and hackathons.');

    const dialogPromise = page.waitForEvent('dialog').then(async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      return message;
    });

    await page.getByRole('button', { name: 'Save Profile Changes' }).click();

    expect(await dialogPromise).toBe('Profile updated successfully.');
  });
});
