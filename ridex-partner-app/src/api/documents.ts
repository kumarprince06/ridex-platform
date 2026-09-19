import { request } from './client';

export type DocumentType =
  | 'DRIVING_LICENCE' | 'IDENTITY_PROOF' | 'ADDRESS_PROOF'
  | 'VEHICLE_REGISTRATION' | 'VEHICLE_INSURANCE' | 'BACKGROUND_CHECK';

export type DocumentStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type DriverDocument = {
  id: string;
  documentType: DocumentType;
  status: DocumentStatus;
  expiresAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

/** The two the backend refuses to send for review without. The rest are optional extras. */
export const REQUIRED_TYPES: DocumentType[] = ['DRIVING_LICENCE', 'IDENTITY_PROOF'];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  DRIVING_LICENCE: "Driver's licence",
  IDENTITY_PROOF: 'Identity proof',
  ADDRESS_PROOF: 'Address proof',
  VEHICLE_REGISTRATION: 'Vehicle registration',
  VEHICLE_INSURANCE: 'Insurance certificate',
  BACKGROUND_CHECK: 'Background check',
};

const DAY_MS = 86_400_000;

/** The approved document closest to lapsing within a month - offers stop the moment it expires. */
export function expiringSoon(documents: DriverDocument[]): { doc: DriverDocument; days: number } | undefined {
  return documents
    .filter((doc) => doc.status === 'APPROVED' && doc.expiresAt)
    .map((doc) => ({ doc, days: Math.ceil((Date.parse(doc.expiresAt!) - Date.now()) / DAY_MS) }))
    .filter((entry) => entry.days > 0 && entry.days <= 30)
    .sort((a, b) => a.days - b.days)[0];
}

export function expiryTitle({ doc, days }: { doc: DriverDocument; days: number }): string {
  return `${DOCUMENT_LABELS[doc.documentType]} expires in ${days} day${days === 1 ? '' : 's'}`;
}

export function listDocuments() {
  return request<DriverDocument[]>('/api/v1/driver/documents');
}

/**
 * Uploads one document.
 *
 * React Native's FormData takes a {uri, name, type} object rather than a Blob - there is no File
 * on this platform, and passing the uri string alone uploads the literal text of the path.
 */
export function uploadDocument(
  documentType: DocumentType,
  file: { uri: string; name: string; mimeType: string },
  expiresAt?: string,
) {
  const form = new FormData();
  form.append('documentType', documentType);
  if (expiresAt) {
    form.append('expiresAt', expiresAt);
  }
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  return request<DriverDocument>('/api/v1/driver/documents', { method: 'POST', body: form });
}
