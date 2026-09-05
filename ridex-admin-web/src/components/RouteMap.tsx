import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

import type { RouteStop } from '../api/admin';

/** Same map stack as the live map and the two apps: MapLibre on OpenFreeMap. No key, no billing. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

/**
 * A shuttle route drawn from its stops.
 *
 * <p>A coordinate typed into a form is unverifiable as a number and obvious as a pin - a stop
 * dropped in the wrong district is the kind of mistake that only shows up when a rider is standing
 * somewhere nobody is coming.
 */
export function RouteMap({ stops }: { stops: RouteStop[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || stops.length === 0) {
      return;
    }

    // Lng, lat - MapLibre's order is the reverse of how the stops are typed in, and getting it
    // backwards puts a Bangalore route in the Indian Ocean.
    const points: [number, number][] = stops.map((stop) => [
      Number(stop.longitude),
      Number(stop.latitude),
    ]);

    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: points[0],
      zoom: 11,
      attributionControl: { compact: true },
    });

    // North stays up: a map that rotates makes two people describing the same screen disagree.
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.on('load', () => {
      if (points.length > 1) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: points },
          },
        });
        // Straight legs between stops, not a driven path: there is no routing provider yet (T8),
        // and a smoothed curve would imply road geometry nothing has actually computed.
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#12a68c', 'line-width': 3, 'line-dasharray': [2, 1.5] },
        });
      }

      const bounds = points.reduce(
        (box, point) => box.extend(point),
        new maplibregl.LngLatBounds(points[0], points[0]),
      );
      // A single stop has no extent, so fitBounds would zoom to the maximum and show one building.
      map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
    });

    stops.forEach((stop, index) => {
      const element = document.createElement('div');
      element.className = 'stop-dot';
      // Numbered, because the order is the route: a rider can only travel forwards along it.
      element.textContent = String(index + 1);

      new maplibregl.Marker({ element })
        .setLngLat(points[index])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setHTML(
            `<strong>${stop.name}</strong><br/>${
              stop.offsetMinutes === 0 ? 'At departure' : `+${stop.offsetMinutes} min`
            }`,
          ),
        )
        .addTo(map);
    });

    return () => map.remove();
  }, [stops]);

  if (stops.length === 0) {
    return null;
  }

  return <div ref={container} className="route-map" />;
}
