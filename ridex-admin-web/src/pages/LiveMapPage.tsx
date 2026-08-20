import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, Grid, humanState, PageHeader, Pill, StatTile, stateTone, Table } from '../components/ui';
import { LIVE_DRIVERS, METRICS, TRIPS_BY_STATE } from '../data/mock';

/** Same map stack as the two apps: MapLibre against OpenFreeMap tiles. No key, no billing. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';
const CENTRE: [number, number] = [77.5946, 12.9716];

const STATE_COLOUR: Record<string, string> = {
  TRIP_STARTED: '#12805a',
  DRIVER_ARRIVING: '#2563c9',
  DRIVER_AT_PICKUP: '#b26a12',
  DRIVER_ASSIGNED: '#5b6779',
};

/** FR-OPS-004, the live half. Positions are static here; T8 and T11 make them real. */
export function LiveMapPage() {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: CENTRE,
      zoom: 12,
      attributionControl: { compact: true },
    });

    // North stays up: an ops map that rotates makes two people describing the same screen disagree.
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    LIVE_DRIVERS.forEach((driver) => {
      const element = document.createElement('div');
      element.className = 'driver-dot';
      element.style.background = STATE_COLOUR[driver.state] ?? '#5b6779';
      element.title = `${driver.name} · ${humanState(driver.state)}`;

      new maplibregl.Marker({ element })
        .setLngLat([CENTRE[0] + driver.offset[0], CENTRE[1] + driver.offset[1]])
        .setPopup(
          new maplibregl.Popup({ offset: 14 }).setHTML(
            `<strong>${driver.name}</strong><br/>${humanState(driver.state)}<br/><span class="mono">${driver.id}</span>`,
          ),
        )
        .addTo(map);
    });

    return () => map.remove();
  }, []);

  return (
    <>
      <PageHeader title="Live map" subtitle="Trips in flight. Updated a few seconds ago." />

      <Grid columns={4}>
        <StatTile label="Live trips" value={METRICS.liveTrips} tone="primary" />
        <StatTile label="Drivers online" value={METRICS.driversOnline} />
        <StatTile label="Unmatched 15m" value={METRICS.unmatched15m} tone="warning" />
        <StatTile label="Cancellation rate" value={METRICS.cancellationRate} />
      </Grid>

      <Card>
        <div ref={container} className="live-map" />
      </Card>

      <Card title="Trips by state">
        <Table
          columns={[
            { key: 'state', header: 'State', render: (row: (typeof TRIPS_BY_STATE)[number]) => <Pill tone={stateTone(row.state)}>{humanState(row.state)}</Pill> },
            { key: 'count', header: 'Trips', align: 'right', render: (row) => <span className="cell-strong">{row.count}</span> },
          ]}
          rows={TRIPS_BY_STATE}
          onRowClick={() => navigate('/trips')}
        />
      </Card>
    </>
  );
}
