import { request } from './client';

export type VehicleType =
  | 'BICYCLE' | 'SCOOTER' | 'MOTORCYCLE' | 'E_RICKSHAW' | 'AUTO_RICKSHAW'
  | 'HATCHBACK' | 'SEDAN' | 'MPV' | 'SUV' | 'VAN' | 'PICKUP' | 'MINIBUS' | 'BUS';

export type VehicleStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';

export type Vehicle = {
  id: string;
  vehicleType: VehicleType;
  status: VehicleStatus;
  make: string;
  model: string;
  manufactureYear: number;
  color: string | null;
  seatCapacity: number;
  registrationNumber: string;
  createdAt: string;
};

/**
 * Mirrors VehicleType.maxSeats() on the server, so the picker cannot offer a seat count the API
 * will reject. The server still checks - this only saves a round trip.
 */
export const MAX_SEATS: Record<VehicleType, number> = {
  BICYCLE: 1, SCOOTER: 1, MOTORCYCLE: 1,
  E_RICKSHAW: 3, AUTO_RICKSHAW: 3,
  HATCHBACK: 4, SEDAN: 4, PICKUP: 4,
  MPV: 6, SUV: 6,
  VAN: 8, MINIBUS: 24, BUS: 64,
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  BICYCLE: 'Bicycle', SCOOTER: 'Scooter', MOTORCYCLE: 'Motorcycle',
  E_RICKSHAW: 'E-rickshaw', AUTO_RICKSHAW: 'Auto rickshaw',
  HATCHBACK: 'Hatchback', SEDAN: 'Sedan', MPV: 'MPV', SUV: 'SUV',
  VAN: 'Van', PICKUP: 'Pickup', MINIBUS: 'Minibus', BUS: 'Bus',
};

export function listVehicles() {
  return request<Vehicle[]>('/api/v1/driver/vehicles');
}

export function addVehicle(vehicle: {
  vehicleType: VehicleType;
  make: string;
  model: string;
  manufactureYear: number;
  color?: string;
  seatCapacity: number;
  registrationNumber: string;
}) {
  return request<Vehicle>('/api/v1/driver/vehicles', { method: 'POST', body: vehicle });
}

export function deactivateVehicle(vehicleId: string) {
  return request<Vehicle>(`/api/v1/driver/vehicles/${vehicleId}/deactivate`, { method: 'POST' });
}
