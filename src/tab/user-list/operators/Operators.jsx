'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import './Operators.css';

const API_URL = 'https://qbits.quickestimate.co/api/v1/frontend/inverter/all_latest_data';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  const candidates = [
    data?.data,
    data?.data?.data,
    data?.data?.inverters,
    data?.inverters,
    data?.items,
    data?.result,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('en-GB', { hour12: false })}`;
};

const formatText = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
};

const getStateBadge = (state) => {
  const raw = state ?? 'Unknown';
  const normalized = String(raw).toLowerCase();

  // Normal / Online
  if (normalized === '1' || raw === 1 || normalized === 'normal' || normalized === 'online') {
    return { text: 'Normal', className: 'inv-state normal' };
  }

  // Fault states: 4 or 5 (and text equivalents)
  if (normalized === '4' || normalized === '5' || raw === 4 || raw === 5 || normalized === 'fault') {
    return { text: 'Fault', className: 'inv-state fault' };
  }

  // Everything else is treated as Offline
  return { text: 'Offline', className: 'inv-state offline' };
};

export default function InverterTab() {
  const router = useRouter();
  const [inverters, setInverters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOpenInverter = (inv) => {
    if (!inv) return;
    const plantNo =
      inv?.plant_no ??
      inv?.plantNo ??
      inv?.plant_id ??
      inv?.plantId ??
      inv?.plant?.plant_no ??
      inv?.plant?.plantId ??
      inv?.plant?.plant_id ??
      null;

    const targetId =
      inv?.id ??
      inv?.inverter_id ??
      inv?.inverterId ??
      inv?.inverter_no ??
      inv?.inverterNo ??
      inv?.sn ??
      inv?.inverter_sn ??
      inv?.inverter?.id ??
      inv?.inverter?.inverter_id ??
      inv?.inverter?.inverter_no;
    if (!targetId) return;

    const query = plantNo ? `?plant_no=${plantNo}` : '';
    const path = `/inverters/${targetId}/summary${query}`;

    if (router && typeof router.push === 'function') {
      router.push(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchInverters = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const headers = { Accept: 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(API_URL, { method: 'GET', headers, signal: controller.signal });
        const rawText = await response.text();
        let json;
        try {
          json = rawText ? JSON.parse(rawText) : null;
        } catch (parseErr) {
          json = null;
        }

        if (!response.ok) {
          const message = json?.message || json?.error || rawText || 'Failed to load inverter data';
          throw new Error(message);
        }

        const list = normalizeList(json);
        if (!Array.isArray(list)) {
          setInverters([]);
          setError('No inverter records returned');
        } else {
          setInverters(list);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load inverter data');
        setInverters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInverters();
    return () => controller.abort();
  }, []);

  const sortedInverters = useMemo(() => {
    const toTime = (inv) => {
      const candidates = [inv?.record_time, inv?.recordTime, inv?.updated_at, inv?.created_at];
      for (const value of candidates) {
        const t = Date.parse(value);
        if (!Number.isNaN(t)) return t;
      }
      return -Infinity;
    };

    return [...inverters].sort((a, b) => toTime(b) - toTime(a));
  }, [inverters]);

  const renderBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={8} className="inv-center muted">Loading inverters...</td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={8} className="inv-center error">{error}</td>
        </tr>
      );
    }

    if (!sortedInverters.length) {
      return (
        <tr>
          <td colSpan={8} className="inv-center muted">No inverter records found</td>
        </tr>
      );
    }

    return sortedInverters.map((inv, idx) => {
      const badge = getStateBadge(
        inv?.plantstate ??
        inv?.plant?.plantstate ??
        inv?.state ??
        inv?.status ??
        inv?.state_text ??
        inv?.status_text
      );
      const plantName = inv?.plant_name || inv?.plant?.plant_name || 'N/A';
      const collector = inv?.collector_address || inv?.collector || inv?.collector_sn || 'N/A';
      const model = inv?.model || inv?.inverter_model || inv?.type || 'N/A';
      const recordTime = inv?.record_time || inv?.recordTime || inv?.time;
      const rowId =
        inv?.id ??
        inv?.inverter_id ??
        inv?.inverterId ??
        inv?.inverter_no ??
        inv?.inverterNo ??
        inv?.sn ??
        inv?.inverter_sn ??
        inv?.inverter?.id ??
        inv?.inverter?.inverter_id ??
        inv?.inverter?.inverter_no ??
        idx;
      return (
        <tr key={rowId} onClick={() => handleOpenInverter(inv)} style={{ cursor: 'pointer' }}>
          <td>{formatText(plantName)}</td>
          <td>{formatText(inv?.id)}</td>
          <td>{formatText(collector)}</td>
          <td>{formatText(model)}</td>
          <td>{formatDateTime(recordTime)}</td>
          <td>{formatDateTime(inv?.created_at)}</td>
          <td>{formatDateTime(inv?.updated_at)}</td>
          <td><span className={badge.className}>{badge.text}</span></td>
        </tr>
      );
    });
  };

  return (
    <div className="inverter-page">
      <div className="inv-card">
        <div className="inv-header">
          <h5 className="inv-title">Inverters</h5>
        </div>

        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Plant Name</th>
                <th>ID</th>
                <th>Collector Address</th>
                <th>Model</th>
                <th>Record Time</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

