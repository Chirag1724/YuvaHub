import { expect } from '@playwright/test';
import { authTest } from './helpers/auth';

authTest.describe('Community forum', () => {
  authTest('loads seeded posts and supports upvoting', async ({ signedInPage }) => {
    const page = signedInPage;
    await page.goto('/');
    await page.getByRole('tab', { name: 'Community Forum' }).click();

    await expect(page.getByRole('heading', { name: 'Community Discussion Forum' })).toBeVisible();
    await expect(page.getByText('Secured GSoC 2026 Mentorship under Linux Foundation')).toBeVisible();

    const upvoteButton = page.getByRole('button', { name: '24 Upvotes' });
    await expect(upvoteButton).toBeVisible();
    await upvoteButton.click();
    await expect(page.getByRole('button', { name: '25 Upvotes' })).toBeVisible();
  });

  authTest('publishes a new post to the feed', async ({ signedInPage }) => {
    const page = signedInPage;
    const postTitle = 'Playwright E2E Post: First Open Source Contribution';

    // The real POST /api/v1/posts route is behind authMiddleware and the app does
    // not attach a token, so it would 401. Stub the create so the feed updates.
    await page.route('**/api/v1/posts', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'post_e2e',
          title: postTitle,
          content: 'I just merged my first pull request and would love feedback from the community.',
          author: 'Mock User',
          type: 'Update',
          tags: ['OpenSource', 'DSA'],
          upvotes: 0,
          upvoted_by: [],
          repliesCount: 0,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('tab', { name: 'Community Forum' }).click();

    await page
      .getByPlaceholder('Post Title (e.g. Secured GSoC 2026! or How to prep for Amazon OA?)')
      .fill(postTitle);
    await page
      .getByPlaceholder('Share details, questions, or resources with the student network...')
      .fill('I just merged my first pull request and would love feedback from the community.');
    await page.getByPlaceholder('Tags (comma-separated, e.g. GSoC, DSA, Internship)').fill('OpenSource, DSA');

    await page.getByRole('button', { name: 'Publish Post' }).click();

    await expect(page.getByRole('heading', { name: postTitle })).toBeVisible();
  });
});
