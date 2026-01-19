'use client';

import { useEffect, useMemo, useState } from 'react';
import './FaultInfo.css';

const API_URL = 'https://qbits.quickestimate.co/api/v1/frontend/faults';
const PAGE_SIZE = 20;

const TAB_CONFIG = [
  { key: 'all', label: 'ALL', status: -1 },
  { key: 'going', label: 'Fault', status: 0 },
  { key: 'recovered', label: 'Recovered', status: 1 }
];

function formatDate(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' })} ${d.toLocaleTimeString('en-GB', { hour12: false })}`;
}

function statusBadge(status) {
  if (status === 1 || status === 'Recovered') return { text: 'Recovered', className: 'status recovered' };
  // Treat all non-1 statuses as Fault to align with API meaning
  if (status === 0 || status === 'Fault' || status === 'Going' || status === -1 || status === 2) return { text: 'Fault', className: 'status fault' };
  return { text: String(status ?? 'Unknown'), className: 'status unknown' };
}

function extractFaultList(data) {
  if (!data) return [];
  const candidates = [
    data?.data?.faults?.data,
    data?.data?.faults,
    data?.faults?.data,
    data?.faults,
    data?.data?.data,
    data?.data,
    data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function formatCell(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => formatCell(v)).join(', ');
  }
  if (typeof value === 'object') {
    // Try common nested fields
    return (
      value.name ||
      value.plant_name ||
      value.station_name ||
      value.title ||
      value.model ||
      value.serial ||
      value.id ||
      JSON.stringify(value)
    );
  }
  return String(value);
}

export default function FaultInfo() {
  const [activeTab, setActiveTab] = useState('all');
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Optional filters if needed later
  const [plantId] = useState('');
  const [inverterId] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchFaults = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const headers = { Accept: 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const tab = TAB_CONFIG.find((t) => t.key === activeTab) ?? TAB_CONFIG[0];
        const params = new URLSearchParams();
        params.set('status', tab.status);
        params.set('limit', PAGE_SIZE);
        params.set('page', page);
        if (plantId) params.set('plant_id', plantId);
        if (inverterId) params.set('inverter_id', inverterId);
        const url = `${API_URL}?${params.toString()}`;

        const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const list = extractFaultList(data);
        if (!Array.isArray(list)) {
          setFaults([]);
          setError('No fault records returned');
        } else {
          setFaults(list);
          setError(null);
        }

        const metaTotal =
          data?.data?.faults?.last_page ||
          data?.faults?.last_page ||
          data?.data?.last_page ||
          (Array.isArray(list) && list.length === PAGE_SIZE ? page + 1 : 1);
        setTotalPages(Math.max(1, Number(metaTotal) || 1));
      } catch (err) {
        if (err.name === 'AbortError') return;
        setFaults([]);
        setError(err.message || 'Failed to load fault info');
      } finally {
        setLoading(false);
      }
    };

    fetchFaults();
    return () => controller.abort();
  }, [activeTab, page, plantId, inverterId]);

  const sortedFaults = useMemo(() => {
    const toTime = (fault) => {
      const start = fault?.stime ?? fault?.start_time ?? fault?.start;
      const end = fault?.etime ?? fault?.end_time ?? fault?.end;
      const startTime = Date.parse(start);
      if (!Number.isNaN(startTime)) return startTime;
      const endTime = Date.parse(end);
      if (!Number.isNaN(endTime)) return endTime;
      return -Infinity;
    };

    return [...faults].sort((a, b) => toTime(b) - toTime(a));
  }, [faults]);

  const renderBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={7} className="fi-center muted">Loading faults...</td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={7} className="fi-center error">{error}</td>
        </tr>
      );
    }

    if (!sortedFaults.length) {
      return (
        <tr>
          <td colSpan={7} className="fi-center muted">No fault records found</td>
        </tr>
      );
    }

    return sortedFaults.map((fault, idx) => {
      const badge = statusBadge(fault.status);
      const stationName = fault?.inverter?.plant?.plant_name || fault?.plant?.plant_name || fault?.plant_name;
      const device = fault?.inverter?.model || fault?.model;
      const serial = fault?.inverter_sn || fault?.serial || fault?.collector_sn;
      const faultInfo = Array.isArray(fault?.message_en)
        ? fault.message_en.join(', ')
        : fault?.message_en || fault?.message_cn || fault?.fault_info || fault?.title;
      const start = fault?.stime || fault?.start_time || fault?.start;
      const end = fault?.etime || fault?.end_time || fault?.end;
      return (
        <tr key={`${fault.id || idx}-${page}`}>
          <td><span className={badge.className}>{badge.text}</span></td>
          <td>{formatCell(stationName)}</td>
          <td>{formatCell(device)}</td>
          <td>{formatCell(serial)}</td>
          <td>{formatCell(faultInfo)}</td>
          <td>{formatDate(start)}</td>
          <td>{formatDate(end)}</td>
        </tr>
      );
    });
  };

  return (
    <div className="fault-info-page">
      <div className="card fi-card">
        <div className="fi-header">
          <h5 className="fi-title">Fault Info</h5>
          <div className="fi-tabs">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`fi-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
            <button type="button" className="fi-tab export" disabled>
              Fault Export ↓
            </button>
          </div>
        </div>

        <div className="fi-table-wrap">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Station Name</th>
                <th>Device</th>
                <th>Serial</th>
                <th>Fault Info</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </div>

        <div className="fi-pagination">
          <button
            type="button"
            className="fi-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ‹
          </button>
          <span className="fi-page-indicator">{page} / {totalPages}</span>
          <button
            type="button"
            className="fi-page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

