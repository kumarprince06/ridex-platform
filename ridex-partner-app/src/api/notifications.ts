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

/** Opening the screen is the acknowledgement, so the whole feed is marked at once. */
export function markAllRead() {
  return request<void>('/api/v1/notifications/read', { method: 'POST' });
}
