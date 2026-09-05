import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';

import { searchPlaces, type Place } from '../api/admin';
import { Button } from './ui';
import './ui.css';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

/**
 * Last resort only.
 *
 * <p>Reached when there is no previous stop and the browser will not say where the operator is -
 * a denied permission, an insecure origin, or a desktop with no location service.
 */
const FALLBACK: [number, number] = [77.5946, 12.9716];

/**
 * Search for a place, or drop the pin yourself.
 *
 * <p>Typing coordinates by hand is how a stop ends up in the sea: nothing on a form can tell that
 * 12.5991 was meant to be 12.9591. Search covers the named places, and dragging the pin covers the
 * ones with no name - a lay-by, a gate, the far side of a junction.
 */
/** Whether the form already holds a real coordinate, in which case nothing should move the pin. */
function navigatorHasPin(latitude: string, longitude: string): boolean {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
    && latitude.trim() !== '' && longitude.trim() !== '';
}

export function LocationPicker({
  latitude,
  longitude,
  near,
  onPick,
}: {
  latitude: string;
  longitude: string;
  /**
   * Where to open when nothing is picked yet - the route's previous stop.
   *
   * <p>Better than the operator's own location: the next stop on a Bengaluru route is near the
   * last one, not near whoever is typing, who may be in another city entirely.
   */
  near?: [number, number];
  /** Fires for a search hit and for every drag, so the form always holds what the pin shows. */
  onPick: (place: { latitude: number; longitude: number; label?: string }) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Built once. Re-creating it on every keystroke would tear down the tiles mid-drag.
  useEffect(() => {
    if (!container.current || map.current) {
      return;
    }

    const start: [number, number] = near ?? FALLBACK;

    const instance = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: start,
      zoom: near ? 13 : 11,
      attributionControl: { compact: true },
    });
    instance.dragRotate.disable();
    instance.touchZoomRotate.disableRotation();

    const pin = new maplibregl.Marker({ draggable: true, color: '#12a68c' })
      .setLngLat(start)
      .addTo(instance);

    // Only when there is no previous stop to anchor to. Asked, not assumed: the prompt is a
    // permission dialog, and firing it on a route that already knows where it is would be rude
    // for no gain. It also resolves after the map has drawn, so it must not fight a pin the
    // operator has already moved.
    if (!near && !navigatorHasPin(latitude, longitude)) {
      navigator.geolocation?.getCurrentPosition(
        (position) => {
          if (pin.getLngLat().lng !== start[0] || pin.getLngLat().lat !== start[1]) {
            return;
          }
          const here: [number, number] = [position.coords.longitude, position.coords.latitude];
          instance.easeTo({ center: here, zoom: 13 });
          pin.setLngLat(here);
        },
        // Silent: a denied permission is a normal answer, and the fallback is already on screen.
        () => undefined,
        { timeout: 5000, maximumAge: 600_000 },
      );
    }

    pin.on('dragend', () => {
      const { lat, lng } = pin.getLngLat();
      onPick({ latitude: lat, longitude: lng });
    });

    // Clicking is the same gesture as dragging, and quicker for a coarse correction.
    instance.on('click', (event) => {
      pin.setLngLat(event.lngLat);
      onPick({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    });

    map.current = instance;
    marker.current = pin;

    return () => {
      instance.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follows the form, so typing a coordinate still moves the pin - the two never disagree.
  useEffect(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!marker.current || !map.current || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }
    if (lat === 0 && lng === 0) {
      return;
    }
    marker.current.setLngLat([lng, lat]);
    map.current.easeTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 14) });
  }, [latitude, longitude]);

  async function runSearch() {
    if (query.trim().length < 3) {
      return;
    }
    setSearching(true);
    setError(null);
    try {
      setResults(await searchPlaces(query.trim()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search is unavailable.');
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="location-picker">
      <div className="place-search">
        <input
          className="input"
          value={query}
          placeholder="Search a place — Marathahalli, Bengaluru"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Enter searches rather than submitting: this sits inside the stop form, and a stray
            // Enter would save a stop with no coordinates.
            if (event.key === 'Enter') {
              event.preventDefault();
              runSearch();
            }
          }}
        />
        <Button type="button" onClick={runSearch} disabled={searching || query.trim().length < 3}>
          {searching ? 'Searching' : 'Search'}
        </Button>
      </div>

      {error ? <p className="field-hint">{error}</p> : null}
      {results?.length === 0 ? <p className="field-hint">Nothing found for that.</p> : null}

      {results && results.length > 0 ? (
        <ul className="place-results">
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude}`}>
              <button
                type="button"
                className="place-result"
                onClick={() => {
                  onPick({
                    latitude: place.latitude,
                    longitude: place.longitude,
                    // The first comma-separated part is the place; the rest is the postal tail.
                    label: place.formattedAddress.split(',')[0]?.trim(),
                  });
                  setResults(null);
                }}
              >
                {place.formattedAddress}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div ref={container} className="picker-map" />
      <p className="field-hint">
        {near
          ? 'Opened at the previous stop. Drag the pin or click the map to adjust it.'
          : 'Drag the pin or click the map to adjust it.'}
      </p>
    </div>
  );
}
