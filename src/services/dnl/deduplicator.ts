import crypto from 'crypto';
import { NormalizedOpportunity } from './types';

/** Fields used to build a stable, deterministic deduplication key. */
export interface DedupeKeyParts {
  source: string;
  url: string;
  title: string;
  company: string;
  /** Optional stable identifier from the source (e.g. a listing/job id). */
  externalId?: string;
}

/** Normalize a single key component: coerce to string, trim, collapse
 * internal whitespace and lowercase so trivial formatting differences do not
 * produce different hashes. */
function normalizeComponent(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Generate a deterministic SHA-256 deduplication hash from stable identifiers.
 *
 * The hash intentionally contains NO timestamps or other volatile data, so
 * identical opportunities always produce an identical hash and can be
 * deduplicated. Components are joined with a delimiter (`|`) so field
 * boundaries cannot collide (e.g. `"ab" + "c"` vs `"a" + "bc"`).
 */
export function generateDedupeHash(parts: DedupeKeyParts): string {
  const baseString = [
    normalizeComponent(parts.source),
    normalizeComponent(parts.externalId),
    normalizeComponent(parts.url),
    normalizeComponent(parts.title),
    normalizeComponent(parts.company),
  ].join('|');
  return crypto.createHash('sha256').update(baseString).digest('hex');
}

export interface IngestionResult {
  processed: number;
  inserted: number;
  duplicates: number;
  failures: number;
  errors: string[];
}

export async function ingestOpportunities(
  db: any,
  opportunities: NormalizedOpportunity[]
): Promise<IngestionResult> {
  const result: IngestionResult = {
    processed: opportunities.length,
    inserted: 0,
    duplicates: 0,
    failures: 0,
    errors: [],
  };

  if (!db) {
    result.failures = opportunities.length;
    result.errors.push('Database connection is not available.');
    return result;
  }

  for (const item of opportunities) {
    const dedupe_hash = generateDedupeHash({
      source: item.sourceName,
      url: item.url,
      title: item.title,
      company: item.company,
    });

    const doc = {
      title: item.title,
      description: item.description,
      source: item.sourceName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      source_name: item.sourceName,
      source_url: item.url,
      apply_link: item.url,
      image_url: 'https://yuvahub.xyz/og-image.jpg',
      tags: item.tags,
      category: item.opportunityType,
      deadline: item.deadline,
      location: item.location,
      opportunity_type: item.opportunityType.toLowerCase(),
      dedupe_hash: dedupe_hash,
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      if (db.isMock) {
        // Handle mock database unique constraint emulation
        const existing = db.collection('opportunities').data.find(
          (o: any) => o.dedupe_hash === dedupe_hash
        );
        if (existing) {
          const err: any = new Error('Duplicate key error');
          err.code = 11000;
          throw err;
        }
        await db.collection('opportunities').insertOne(doc);
      } else {
        await db.collection('opportunities').insertOne(doc);
      }
      result.inserted++;
    } catch (err: any) {
      if (err.code === 11000) {
        result.duplicates++;
      } else {
        result.failures++;
        result.errors.push(err.stack || err.message || String(err));
      }
    }
  }

  return result;
}
