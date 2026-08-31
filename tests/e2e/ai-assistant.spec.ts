import { expect } from '@playwright/test';
import { authTest } from './helpers/auth';

authTest.describe('AI Assistant career mentor', () => {
  authTest('answers a GSoC question with a guided roadmap', async ({ signedInPage }) => {
    const page = signedInPage;

    // Force the mock fallback path: the app's generatedContentProxy gets an empty
    // response from /api/v1/ai/generate and chatWithMentor returns mockCareerAdvice.
    await page.route('**/api/v1/ai/generate', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ text: 'disabled' }),
        });
      }
      return route.continue();
    });

    await page.goto('/');
    await page.getByRole('tab', { name: 'AI Assistant' }).click();

    await expect(page.getByRole('heading', { name: 'AI Assistant' })).toBeVisible();

    await page.getByRole('heading', { name: 'Career Guidance' }).click();
    await expect(page.getByRole('heading', { name: 'Yuva AI Career Mentor' })).toBeVisible();

    await page.getByRole('button', { name: /How do I get into GSoC/ }).click();

    await expect(page.getByText(/Open-source development is one of the highest-signal elements/)).toBeVisible();
    await expect(page.getByText(/Learn Git thoroughly/)).toBeVisible();
  });
});
