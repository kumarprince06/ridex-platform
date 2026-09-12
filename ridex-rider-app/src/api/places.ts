import { request } from './client';

/** Somewhere the rider goes often enough to name. */
export type SavedPlace = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
};

export function listSavedPlaces() {
  return request<SavedPlace[]>('/api/v1/rider/places');
}

/** Saving an existing label moves that place rather than creating a second one. */
export function savePlace(place: {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}) {
  return request<SavedPlace>('/api/v1/rider/places', { method: 'POST', body: place });
}

export async function deleteSavedPlace(placeId: string): Promise<void> {
  await request(`/api/v1/rider/places/${placeId}`, { method: 'DELETE' });
}
