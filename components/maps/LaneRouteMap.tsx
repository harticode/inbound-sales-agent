'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LaneRoute } from '@/types';

type ViewMode = 'demand' | 'booked' | 'supply_gaps';

interface Props {
  data: LaneRoute[];
}

function conversionColor(rate: number): string {
  if (rate === 0) return '#9A958C';
  if (rate >= 0.5) return '#5A8F6E';
  if (rate >= 0.3) return '#B8860B';
  return '#B54A4A';
}

function curvedArcPoints(
  origin: [number, number],
  dest: [number, number],
  bend = 0.12,
): LatLngExpression[] {
  const [lat1, lng1] = origin;
  const [lat2, lng2] = dest;
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const offsetLat = midLat + (-dx / len) * bend;
  const offsetLng = midLng + (dy / len) * bend;
  return [origin, [offsetLat, offsetLng], dest];
}

function lineWeight(callCount: number, min: number, max: number): number {
  if (max === min) return 4;
  const t = (callCount - min) / (max - min);
  return 2 + t * 6;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, bounds]);
  return null;
}

function LaneTooltip({ route }: { route: LaneRoute }) {
  const convPct = (route.conversion_rate * 100).toFixed(0);
  return (
    <div className="text-xs leading-relaxed">
      <p className="font-semibold text-ink">{route.lane}</p>
      <p>Calls: {route.call_count}</p>
      <p>Booked: {route.booked_count}</p>
      <p>Conversion: {convPct}%</p>
      <p>Revenue: {formatCurrency(route.revenue_booked)}</p>
      <p>Loads available: {route.available_loads}</p>
      {route.supply_gap && (
        <p className="mt-1 font-medium text-warning">Supply gap — demand exceeds inventory</p>
      )}
    </div>
  );
}

export default function LaneRouteMap({ data }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('demand');

  const geocoded = useMemo(() => data.filter((r) => r.geocoded), [data]);
  const unmappedCount = data.length - geocoded.length;

  const visibleRoutes = useMemo(() => {
    if (viewMode === 'booked') return geocoded.filter((r) => r.booked_count > 0);
    if (viewMode === 'supply_gaps') return geocoded.filter((r) => r.supply_gap);
    return geocoded;
  }, [geocoded, viewMode]);

  const callRange = useMemo(() => {
    if (visibleRoutes.length === 0) return { min: 0, max: 1 };
    const counts = visibleRoutes.map((r) => r.call_count);
    return { min: Math.min(...counts), max: Math.max(...counts) };
  }, [visibleRoutes]);

  const hubTouches = useMemo(() => {
    const touches: Record<string, { coords: [number, number]; count: number; label: string }> = {};
    const add = (label: string, coords: [number, number]) => {
      const key = `${coords[0]},${coords[1]}`;
      if (touches[key]) {
        touches[key].count += 1;
      } else {
        touches[key] = { coords, count: 1, label };
      }
    };
    for (const route of visibleRoutes) {
      add(route.origin, route.origin_coords);
      add(route.destination, route.dest_coords);
    }
    return Object.values(touches);
  }, [visibleRoutes]);

  const bounds = useMemo((): LatLngBoundsExpression | null => {
    if (visibleRoutes.length === 0) return null;
    const lats: number[] = [];
    const lngs: number[] = [];
    for (const r of visibleRoutes) {
      lats.push(r.origin_coords[0], r.dest_coords[0]);
      lngs.push(r.origin_coords[1], r.dest_coords[1]);
    }
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [visibleRoutes]);

  const supplyGapCount = geocoded.filter((r) => r.supply_gap).length;
  const totalRevenue = geocoded.reduce((sum, r) => sum + r.revenue_booked, 0);

  const modes: { id: ViewMode; label: string }[] = [
    { id: 'demand', label: 'Demand' },
    { id: 'booked', label: 'Booked' },
    { id: 'supply_gaps', label: 'Supply gaps' },
  ];

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="section-title mb-4">Lane Route Map</h3>
        <p className="py-8 text-center text-sm text-ink-muted">No lane route data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="section-title">Lane Route Map</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Geographic view of freight demand, conversion, and supply gaps
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-surface-1 p-1">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              className={`min-h-[44px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === mode.id
                  ? 'bg-primary text-on-primary'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="badge bg-surface-2 text-ink">
          {geocoded.length} lanes mapped
        </span>
        {supplyGapCount > 0 && (
          <span className="badge bg-warning/15 text-warning">
            {supplyGapCount} supply gap{supplyGapCount !== 1 ? 's' : ''}
          </span>
        )}
        {totalRevenue > 0 && (
          <span className="badge bg-success/15 text-success">
            {formatCurrency(totalRevenue)} booked revenue
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border" style={{ height: 420 }}>
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          style={{ height: '100%', width: '100%', background: '#FAF9F7' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {bounds && <FitBounds bounds={bounds} />}

          {visibleRoutes.map((route) => {
            const color = conversionColor(route.conversion_rate);
            const weight = lineWeight(route.call_count, callRange.min, callRange.max);
            const dashArray = route.supply_gap ? '8 6' : undefined;

            return (
              <Polyline
                key={route.lane}
                positions={curvedArcPoints(route.origin_coords, route.dest_coords)}
                pathOptions={{
                  color,
                  weight,
                  opacity: 0.85,
                  dashArray,
                }}
              >
                <Tooltip sticky className="lane-route-tooltip">
                  <LaneTooltip route={route} />
                </Tooltip>
              </Polyline>
            );
          })}

          {hubTouches.map((hub) => {
            const maxTouch = Math.max(...hubTouches.map((h) => h.count), 1);
            const radius = 4 + (hub.count / maxTouch) * 8;
            return (
              <CircleMarker
                key={`${hub.coords[0]}-${hub.coords[1]}`}
                center={hub.coords}
                radius={radius}
                pathOptions={{
                  color: '#6B6B63',
                  fillColor: '#D8D4CC',
                  fillOpacity: 0.9,
                  weight: 1,
                }}
              >
                <Tooltip>
                  <span className="text-xs">{hub.label}</span>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
        <span className="font-medium text-ink-muted">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 rounded bg-success" />
          ≥50% conversion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 rounded bg-warning" />
          30–49%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 rounded bg-danger" />
          &lt;30%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 rounded bg-ink-muted" />
          0%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 border-t-2 border-dashed border-border" />
          Supply gap
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-6 rounded bg-border" style={{ height: 3 }} />
          Thicker = more calls
        </span>
      </div>

      {unmappedCount > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          {unmappedCount} lane{unmappedCount !== 1 ? 's' : ''} not mapped (unknown city)
        </p>
      )}
    </div>
  );
}
