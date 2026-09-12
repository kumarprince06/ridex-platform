import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { getDashboard, getLiveDrivers, type LiveDriver } from '../api/admin';
import { useQuery } from '../api/useQuery';
import { Card, Grid, humanState, PageHeader, Pill, StatTile, stateTone, Table } from '../components/ui';

/** Same map stack as the two apps: MapLibre against OpenFreeMap tiles. No key, no billing. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';
const CENTRE: [number, number] = [77.5946, 12.9716];

/** Carrying somebody, or waiting for the next offer. Two states is all ops reads at a glance. */
const ON_TRIP = '#12805a';
const IDLE = '#5b6779';

/** Positions are seconds old by design, so the map asks again on this cadence. */
const POLL_MS = 10000;

/** FR-OPS-004, the live half. Every pin is a driver whose phone reported in the last two minutes. */
export function LiveMapPage() {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  const { data: dashboard } = useQuery(getDashboard);
  const { data: drivers, refetch } = useQuery(getLiveDrivers);

  useEffect(() => {
    const timer = setInterval(refetch, POLL_MS);
    return () => clearInterval(timer);
  }, [refetch]);

  useEffect(() => {
    if (!container.current || map.current) {
      return;
    }

    map.current = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: CENTRE,
      zoom: 12,
      attributionControl: { compact: true },
    });

    // North stays up: an ops map that rotates makes two people describing the same screen disagree.
    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !drivers) {
      return;
    }

    // Cleared and redrawn each poll rather than diffed: a few dozen markers redraw in under a
    // frame, and a diff is state that can disagree with the server.
    markers.current.forEach((marker) => marker.remove());
    markers.current = drivers.map((driver) => marker(driver).addTo(map.current!));
  }, [drivers]);

  const byState = Object.entries(dashboard?.ridesByStatus ?? {})
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader
        title="Live map"
        subtitle={
          drivers
            ? `${drivers.length} drivers reporting · refreshed every ${POLL_MS / 1000}s`
            : 'Loading positions...'
        }
      />

      <Grid columns={4}>
        <StatTile label="Rides in progress" value={dashboard?.ridesInProgress ?? '--'} tone="primary" />
        <StatTile label="Drivers on duty" value={dashboard?.driversOnDuty ?? '--'} />
        <StatTile label="Reporting a position" value={drivers?.length ?? '--'} />
        <StatTile label="Carrying somebody" value={drivers?.filter((d) => d.onTrip).length ?? '--'} />
      </Grid>

      <Card>
        <div ref={container} className="live-map" />
      </Card>

      <Card title="Rides by state">
        <Table
          columns={[
            {
              key: 'state',
              header: 'State',
              render: (row: { state: string; count: number }) => (
                <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill>
              ),
            },
            {
              key: 'count',
              header: 'Rides',
              align: 'right',
              render: (row: { state: string; count: number }) => (
                <span className="cell-strong">{row.count}</span>
              ),
            },
          ]}
          rows={byState}
          empty="No rides today."
          onRowClick={() => navigate('/trips')}
        />
      </Card>
    </>
  );
}

function marker(driver: LiveDriver) {
  const element = document.createElement('div');
  element.className = 'driver-dot';
  element.style.background = driver.onTrip ? ON_TRIP : IDLE;
  element.title = `${driver.name} · ${driver.onTrip ? 'on a trip' : 'waiting'}`;

  return new maplibregl.Marker({ element })
    .setLngLat([driver.longitude, driver.latitude])
    .setPopup(
      new maplibregl.Popup({ offset: 14 }).setHTML(
        `<strong>${driver.name}</strong><br/>${driver.vehicle ?? 'No vehicle on file'}<br/>` +
          `<span class="mono">${driver.registrationNumber ?? driver.driverId}</span>`,
      ),
    );
}
