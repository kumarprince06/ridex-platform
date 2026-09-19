import { request } from './client';

export type LegalSlug = 'rider-terms' | 'privacy-policy';

export type LegalDocument = { slug: LegalSlug; title: string; body: string; updatedAt: string };

/** Public: the Welcome screen links here before anybody has signed in. */
export function getLegalDocument(slug: LegalSlug) {
  return request<LegalDocument>(`/api/v1/legal/${slug}`, { auth: false });
}
