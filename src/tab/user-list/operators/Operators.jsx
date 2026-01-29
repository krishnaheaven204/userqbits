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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    const parseFirst = (values) => {
      for (const value of values) {
        const t = Date.parse(value);
        if (!Number.isNaN(t)) return t;
      }
      return undefined;
    };

    const toTime = (inv) => {
      const startTime = parseFirst([inv?.start_time, inv?.startTime, inv?.stime, inv?.start]);
      const endTime = parseFirst([inv?.end_time, inv?.endTime, inv?.etime, inv?.end]);
      const recordTime = parseFirst([inv?.record_time, inv?.recordTime, inv?.updated_at, inv?.created_at]);

      const primary = Math.max(
        Number.isFinite(startTime) ? startTime : -Infinity,
        Number.isFinite(endTime) ? endTime : -Infinity,
      );

      if (primary > -Infinity) return primary;
      return Number.isFinite(recordTime) ? recordTime : -Infinity;
    };

    return [...inverters].sort((a, b) => toTime(b) - toTime(a));
  }, [inverters]);

  const filteredInverters = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedInverters;

    return sortedInverters.filter((inv) => {
      const plantName = inv?.plant_name || inv?.plant?.plant_name || '';
      const idValue =
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
        '';
      const collector = inv?.collector_address || inv?.collector || inv?.collector_sn || '';
      const badge = getStateBadge(
        inv?.plantstate ??
        inv?.plant?.plantstate ??
        inv?.state ??
        inv?.status ??
        inv?.state_text ??
        inv?.status_text
      );

      const parts = [plantName, idValue, collector, badge.text];
      return parts.some((part) => String(part ?? '').toLowerCase().includes(query));
    });
  }, [search, sortedInverters]);

  const totalPages = useMemo(() => {
    const total = Math.ceil(filteredInverters.length / pageSize);
    return total > 0 ? total : 1;
  }, [filteredInverters.length, pageSize]);

  const currentPageInverters = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInverters.slice(start, start + pageSize);
  }, [filteredInverters, page, pageSize]);

  const startIndex = filteredInverters.length ? (page - 1) * pageSize + 1 : 0;
  const endIndex = filteredInverters.length
    ? Math.min(startIndex + pageSize - 1, filteredInverters.length)
    : 0;

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    setPage((prev) => Math.min(Math.max(prev, 1), totalPages));
  }, [totalPages]);

  const goToPage = (target) => {
    setPage(Math.min(Math.max(target, 1), totalPages));
  };

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

    if (!filteredInverters.length) {
      return (
        <tr>
          <td colSpan={8} className="inv-center muted">
            {search.trim() ? 'No matching inverters' : 'No inverter records found'}
          </td>
        </tr>
      );
    }

    return currentPageInverters.map((inv, idx) => {
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
          <div className="inv-search">
            <input
              type="text"
              placeholder="Search by Plant, ID, Collector, or State"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
                <th>Status</th>
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </div>

        <div className="inv-footer">
          <div className="inv-pager">
            <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
              ‹
            </button>
            <span className="page-pill">{page}</span>
            <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

