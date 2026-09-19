import { request } from './client';

export type Notification = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  /** What it is about, so a tap can open it. Null for news with nowhere to go. */
  referenceType: string | null;
  referenceId: string | null;
  read: boolean;
  createdAt: string;
};

export function listNotifications() {
  return request<Notification[]>('/api/v1/notifications');
}

export function unreadCount() {
  return request<{ unread: number }>('/api/v1/notifications/unread-count');
}

/** A bell badge: the count, capped so it fits. */
export function countLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}

/** Opening the screen is the acknowledgement, so the whole feed is marked at once. */
export function markAllRead() {
  return request<void>('/api/v1/notifications/read', { method: 'POST' });
}


/** What a person wants to be told about. The server decides whether to send, so it keeps these. */
export type NotificationPreferences = {
  push: boolean;
  email: boolean;
  promotions: boolean;
};

export function getPreferences() {
  return request<NotificationPreferences>('/api/v1/notifications/preferences');
}

/** All three at once: a settings screen sends what its switches are now, not what changed. */
export function updatePreferences(preferences: NotificationPreferences) {
  return request<NotificationPreferences>('/api/v1/notifications/preferences', {
    method: 'PUT',
    body: preferences,
  });
}
