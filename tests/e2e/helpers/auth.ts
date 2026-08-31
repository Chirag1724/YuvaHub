import { Page, test as base } from '@playwright/test';

// ─── Mock identity ────────────────────────────────────────────────────────────
// These values must match the throwaway Firebase project the dev server boots
// with (see the webServer.env block in playwright.config.ts). The backend runs
// with ENABLE_MOCK_AUTH=true, so MOCK_VALID_TOKEN is accepted by both the auth
// sync endpoint (parsed as a 3-part JWT) and the auth middleware (string match).

export const MOCK_FIREBASE_API_KEY = 'AIzaSyTest123456789abcdefghijklmnopqrstuvwxyz';
export const MOCK_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
export const MOCK_FIREBASE_PROJECT_ID = 'test-project';
export const MOCK_UID = 'mock_user_123';
export const MOCK_EMAIL = 'mock@example.com';
export const MOCK_NAME = 'Mock User';
export const MOCK_VALID_TOKEN =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJtb2NrX3VzZXJfMTIzIiwiZW1haWwiOiJtb2NrQGV4YW1wbGUuY29tIiwibmFtZSI6Ik1vY2sgVXNlciIsInVzZXJfaWQiOiJtb2NrX3VzZXJfMTIzIiwicGljdHVyZSI6IiJ9.mock-signature';

const FIREBASE_AUTH_KEY = `firebase:authUser:${MOCK_FIREBASE_API_KEY}:[DEFAULT]`;

// ─── Firestore WebChannel mock ────────────────────────────────────────────────
// Firestore SDK 4.x talks to Firestore over goog.net.WebChannel, not the unary
// gRPC-Web Commit endpoint. Every RPC opens a WebChannel stream:
//   1. POST .../<Rpc>/channel?CVER=22 -> handshake body "<len>\n[[0,[\"c\",sid]]]"
//   2. GET  .../<Rpc>/channel?RID=rpc  -> streamed response frames
// Server->client frames are "<byteLen>\n<json>" (no trailing newline!) where
// <json> is `[[<arrayId>, [<message>]]]` — the [arrayId, message] tuple is
// wrapped in an outer array, and <message> is a plain proto3-JSON object (the
// SDK reads `msg.data[0]` directly, see WebChannelConnection.openStream). A
// Write stream must first answer the handshake ({streamToken}) and then every
// write batch ({streamToken, writeResults, commitTime}). A trailing "\n" after
// the frame would be parsed as a phantom empty frame and kill the channel, so
// frames must be exactly "<len>\n<json>".

const MOCK_SID = 'mock-session-0001';
const MOCK_GSESSION = 'mock-gsession-0001';

function webChannelOpenBody(): string {
  const content = JSON.stringify([[0, ['c', MOCK_SID, '', 8, 14, 30000]]]);
  return `${content.length}\n${content}`;
}

// Frame arrayIds must be strictly increasing across the channel (the SDK skips
// any frame whose id <= the last one processed, see the `a.K` bookkeeping in the
// WebChannel blob). The OPEN "c" tuple uses id 0, so RPC responses start at 1.
let webChannelFrameAid = 0;

function webChannelFrame(message: unknown): string {
  const content = JSON.stringify([[++webChannelFrameAid, [message]]]);
  return `${content.length}\n${content}`;
}

// Valid base64 for the `bytes` streamToken field (decodes to three zero bytes).
const WRITE_HANDSHAKE = { streamToken: 'AAAA', writeResults: [] };
const COMMIT_TIME = '2024-01-01T00:00:00.000000000Z';
const LISTEN_RESPONSE = {
  targetChange: { targetChangeType: 'NO_CHANGE', readTime: COMMIT_TIME },
};

/** WriteStream ack for a batch of `writes` mutations (must match 1:1). */
function makeWriteSuccess(writes: number) {
  return {
    streamToken: 'AAAA',
    writeResults: Array.from({ length: writes }, () => ({ updateTime: COMMIT_TIME })),
    commitTime: COMMIT_TIME,
  };
}

// Number of RPC responses served on the current Write stream. The SDK routes
// the first response of a stream to the Write handshake handler and later
// responses to the mutation-ack handler, so a fresh counter is started each
// time a new Write channel opens (see the CVER=22 branch below).
let writeStreamRpcCount = 0;
// Pending mutation batches (write counts) that the next Write RPC response must
// acknowledge. Filled by parsing forward-channel WriteRequests (`writes`).
let writeAckQueue: number[] = [];

// ─── Mock opportunities ──────────────────────────────────────────────────────
// Mirrors the shape returned by /api/v1/opportunities so the explorer,
// detail view and Bookmarks tab all render deterministic cards.

export interface MockOpportunity {
  id: string;
  title: string;
  type: string;
  organization: string;
  tags: string[];
  deadline: string;
  apply_link: string;
  description: string;
  location: string;
  isLive?: boolean;
  match_score?: number;
  applicationFee?: { isFree: boolean; amount: number; currency: string };
}

export const MOCK_OPPORTUNITIES: MockOpportunity[] = [
  {
    id: 'fb_gsoc_2026',
    title: 'Google Summer of Code (GSoC) - Open Source Fellow',
    type: 'Fellowship',
    organization: 'Google Open Source',
    tags: ['Open Source', 'Software Engineering'],
    deadline: '12 days left',
    apply_link: 'https://summerofcode.withgoogle.com',
    description:
      'An intensive global program focused on bringing student developers into open source software development.',
    location: 'Remote / Online',
    isLive: true,
    match_score: 98,
    applicationFee: { isFree: true, amount: 0, currency: 'USD' },
  },
  {
    id: 'fb_stripe_intern',
    title: 'Software Engineering Summer Intern - Infrastructure & APIs',
    type: 'Internship',
    organization: 'Stripe',
    tags: ['Backend', 'Systems', 'Fintech'],
    deadline: 'Rolling admission',
    apply_link: 'https://stripe.com/jobs',
    description:
      'Join Stripe for a summer internship focused on the infrastructure and APIs that power payments.',
    location: 'Remote / San Francisco',
    isLive: true,
    match_score: 95,
    applicationFee: { isFree: true, amount: 0, currency: 'USD' },
  },
  {
    id: 'fb_imagine_cup',
    title: 'Microsoft Imagine Cup - Social Impact Tech Challenge',
    type: 'Hackathon',
    organization: 'Microsoft',
    tags: ['AI/ML', 'Innovation'],
    deadline: 'Rolling admission',
    apply_link: 'https://imaginecup.microsoft.com',
    description: 'Show off your technical skills and develop a creative social-impact solution using Azure.',
    location: 'Global Virtual',
    isLive: true,
    match_score: 90,
    applicationFee: { isFree: true, amount: 0, currency: 'USD' },
  },
];

// ─── Route mocks ─────────────────────────────────────────────────────────────

/** Intercept Firebase REST/Web calls so the SDK never needs a real project. */
export async function mockFirebaseNetwork(page: Page): Promise<void> {
  // Token refresh (auth reload + getIdToken(true) on profile save)
  await page.route('**/securetoken.googleapis.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: MOCK_VALID_TOKEN,
        expires_in: '3600',
        token_type: 'Bearer',
        refresh_token: 'mock-refresh-token',
        user_id: MOCK_UID,
        project_id: MOCK_FIREBASE_PROJECT_ID,
      }),
    }),
  );

  // getRedirectResult on boot + any account reload
  await page.route('**/identitytoolkit.googleapis.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [
          {
            localId: MOCK_UID,
            email: MOCK_EMAIL,
            displayName: MOCK_NAME,
            photoUrl: '',
            emailVerified: true,
            createdAt: '1710000000000',
            lastLoginAt: '1710000000000',
          },
        ],
      }),
    }),
  );

  // Any auth popup/redirect page for the throwaway project
  await page.route(`**/${MOCK_FIREBASE_AUTH_DOMAIN}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><head></head><body></body></html>',
    }),
  );

  // Firestore writes (bookmark toggles, profile saves) succeed via the
  // WebChannel streaming transport used by Firestore SDK 4.x. Track per-channel
  // RPC sequence so the first RPC response answers the Write handshake and a
  // later response acknowledges the actual mutation (setDoc etc.).
  await page.route('https://firestore.googleapis.com/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('TYPE=terminate')) {
      return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });
    }

    if (url.includes('RID=rpc')) {
      if (url.includes('/Write/channel')) {
        writeStreamRpcCount++;
        let body: string;
        if (writeStreamRpcCount === 1) {
          body = webChannelFrame(WRITE_HANDSHAKE);
        } else if (writeAckQueue.length > 0) {
          body = webChannelFrame(makeWriteSuccess(writeAckQueue.shift()!));
        } else {
          body = webChannelFrame('noop');
        }
        return route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body });
      }
      return route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: webChannelFrame(LISTEN_RESPONSE) });
    }

    if (method === 'POST' && url.includes('CVER=22')) {
      // Channel handshake. The first RPC message (stream handshake) is sent
      // separately via a forward-channel POST right after this succeeds.
      if (url.includes('/Write/channel')) {
        writeStreamRpcCount = 0;
        writeAckQueue = [];
      }
      return route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        headers: { 'X-HTTP-Session-Id': MOCK_GSESSION },
        body: webChannelOpenBody(),
      });
    }

    if (method === 'POST') {
      // Forward-channel message POST. For the Write stream, count how many
      // mutations are in the batch so the next RPC response acknowledges the
      // right number of writeResults (the SDK hard-asserts a 1:1 match and
      // crashes on extra successes). The actual RPC response arrives on the RPC
      // stream; the POST itself is acked with a plain keepalive tuple — it must
      // be a 3-element array or the WebChannel tears the channel down.
      if (url.includes('/Write/channel')) {
        const body = route.request().postData() || '';
        const m = body.match(/req\d+___data__=([^&]*)/);
        if (m) {
          try {
            const msg = JSON.parse(decodeURIComponent(m[1]));
            if (Array.isArray(msg.writes) && msg.writes.length > 0) {
              writeAckQueue.push(msg.writes.length);
            }
          } catch {
            // Ignore malformed frames.
          }
        }
      }
      return route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: '7\n[0,0,0]' });
    }

    return route.continue();
  });
}

/** Deterministic /api/v1/opportunities list so cards always render. */
export async function mockOpportunitiesList(page: Page): Promise<void> {
  await page.route('**/api/v1/opportunities*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_OPPORTUNITIES) });
  });

  // The Opportunities explorer searches via /api/v1/search?q=...
  await page.route('**/api/v1/search*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: MOCK_OPPORTUNITIES, meta: { total: MOCK_OPPORTUNITIES.length } }),
    });
  });
}

/** Deterministic /api/v1/opportunity/:id detail responses. */
export async function mockOpportunityDetail(page: Page): Promise<void> {
  await page.route('**/api/v1/opportunity/*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const match = route.request().url().match(/\/api\/v1\/opportunity\/([^/]+)/);
    const id = match ? decodeURIComponent(match[1]) : 'unknown';
    const opp = MOCK_OPPORTUNITIES.find((o) => o.id === id) || { ...MOCK_OPPORTUNITIES[0], id };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opp) });
  });
}

/** Backend bookmark + bookmark-folder calls resolve so toggles persist. */
export async function mockBookmarksApi(page: Page): Promise<void> {
  await page.route('**/api/v1/bookmarks', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', bookmarks: [] }) });
    }
    if (method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', message: 'Bookmark added successfully' }) });
    }
    return route.continue();
  });
  await page.route('**/api/v1/bookmarks/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', message: 'Bookmark removed successfully' }) });
    }
    return route.continue();
  });
  await page.route('**/api/v1/user/bookmark-folders*', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

// ─── Sign-in helper ──────────────────────────────────────────────────────────

/**
 * Restores a signed-in Firebase session (persisted user in localStorage) and
 * wires up all network mocks so the authenticated app shell renders without a
 * real Firebase project or a real OAuth login.
 */
export async function signInAsMockUser(page: Page, options: { onboarded?: boolean } = {}): Promise<void> {
  const onboarded = options.onboarded ?? true;

  await page.addInitScript(
    ({ authKey, uid, email, name, token, onboarded }) => {
      const persistedUser = {
        uid,
        email,
        emailVerified: true,
        displayName: name,
        isAnonymous: false,
        photoURL: '',
        providerData: [
          { providerId: 'google.com', uid, displayName: name, email, phoneNumber: null, photoURL: '' },
        ],
        stsTokenManager: {
          refreshToken: 'mock-refresh-token',
          accessToken: token,
          expirationTime: Date.now() + 60 * 60 * 1000,
        },
        createdAt: '1710000000000',
        lastLoginAt: '1710000000000',
      };
      localStorage.setItem(authKey, JSON.stringify(persistedUser));
      if (onboarded) {
        localStorage.setItem(`yuvahub-onboarded-${uid}`, 'true');
      }
    },
    { authKey: FIREBASE_AUTH_KEY, uid: MOCK_UID, email: MOCK_EMAIL, name: MOCK_NAME, token: MOCK_VALID_TOKEN, onboarded },
  );

  await mockFirebaseNetwork(page);
  await mockOpportunitiesList(page);
  await mockOpportunityDetail(page);
  await mockBookmarksApi(page);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * Waits until the Express backend is reachable through the Vite proxy. Playwright
 * only waits for the Vite dev server (port 5173) to be up, which can happen before
 * `tsx server.ts` finishes booting. Tests that talk to real endpoints (auth/sync,
 * community feed) would otherwise race the backend startup. Vite returns a 5xx while
 * the proxy target is down, so any response below 500 means the backend is ready.
 */
export async function waitForBackend(page: Page, timeoutMs = 90000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await page.request.get('http://localhost:5173/api/health');
      if (response.status() < 500) return;
    } catch {
      // Proxy not reachable yet — retry.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Backend did not become ready within ${timeoutMs}ms`);
}

/** Test fixture that provides a page already signed in as the mock user. */
export const authTest = base.extend<{ signedInPage: Page }>({
  signedInPage: async ({ page }, use) => {
    await signInAsMockUser(page);
    await waitForBackend(page);
    await use(page);
  },
});
