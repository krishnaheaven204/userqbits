'use client';

import { useEffect, useMemo, useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import './StationList.css';
import '../user-list/all-users/AllUsers.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const normalizeApiBase = (input) => {
  if (!input) return '';
  let base = input.trim();
  const queryIndex = base.indexOf('?');
  if (queryIndex !== -1) {
    base = base.substring(0, queryIndex);
  }
  base = base.replace(/\/client\/index\/?$/i, '');
  base = base.replace(/\/client\/?$/i, '');
  base = base.replace(/\/$/, '');
  return base;
};

const API_BASE_ROOT = normalizeApiBase(API_BASE_URL) || 'https://qbits.quickestimate.co/api/v1';
const ROWS_PER_PAGE = 25;

const SortableHeader = ({ label, field, sortConfig, onSort }) => {
  const isActive = sortConfig.field === field;
  const direction = sortConfig.direction;
  return (
    <button
      type="button"
      className={`sortable-header ${isActive ? 'active' : ''}`}
      onClick={() => onSort(field)}
    >
      {label}
      <span className="sort-arrows">
        <span className={`arrow up ${isActive && direction === 'asc' ? 'active' : ''}`}>▲</span>
        <span className={`arrow down ${isActive && direction === 'desc' ? 'active' : ''}`}>▼</span>
      </span>
    </button>
  );
};

export default function StationList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('standby');
  const [groupedClients, setGroupedClients] = useState({
    all_plant: [],
    normal_plant: [],
    alarm_plant: [],
    offline_plant: []
  });
  const [totals, setTotals] = useState({
    total_all_plant: 0,
    total_normal_plant: 0,
    total_alarm_plant: 0,
    total_offline_plant: 0
  });
  const [sortConfig, setSortConfig] = useState({ field: 'id', direction: 'asc' });

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const getUsernameSortKey = (rawName) => {
    const name = (rawName || '').trim();
    if (!name) return { group: 2, value: '' };
    const first = name[0].toLowerCase();
    if (first >= 'a' && first <= 'z') return { group: 0, value: name.toLowerCase() };
    if (first >= '0' && first <= '9') return { group: 1, value: name.toLowerCase() };
    return { group: 2, value: name.toLowerCase() };
  };

  const sortData = (data) => {
    const sorted = [...data];
    const { field, direction } = sortConfig;
    sorted.sort((a, b) => {
      if (field === 'id') {
        const va = Number(a.id) || 0;
        const vb = Number(b.id) || 0;
        return direction === 'asc' ? va - vb : vb - va;
      }
      if (field === 'username') {
        const ka = getUsernameSortKey(a.username);
        const kb = getUsernameSortKey(b.username);
        if (ka.group !== kb.group) {
          return direction === 'asc' ? ka.group - kb.group : kb.group - ka.group;
        }
        const cmp = ka.value.localeCompare(kb.value);
        return direction === 'asc' ? cmp : -cmp;
      }
      if (field === 'password') {
        const va = (a.password || '').toLowerCase();
        const vb = (b.password || '').toLowerCase();
        const cmp = va.localeCompare(vb);
        return direction === 'asc' ? cmp : -cmp;
      }
      if (field === 'company_code') {
        const va = (a.company_code || '').toLowerCase();
        const vb = (b.company_code || '').toLowerCase();
        const cmp = va.localeCompare(vb);
        return direction === 'asc' ? cmp : -cmp;
      }
      if (field === 'phone') {
        const va = (a.phone || '').toLowerCase();
        const vb = (b.phone || '').toLowerCase();
        const cmp = va.localeCompare(vb);
        return direction === 'asc' ? cmp : -cmp;
      }
      if (field === 'email') {
        const va = (a.email || '').toLowerCase();
        const vb = (b.email || '').toLowerCase();
        const cmp = va.localeCompare(vb);
        return direction === 'asc' ? cmp : -cmp;
      }
      if (field === 'updated_at') {
        const va = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const vb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return direction === 'asc' ? va - vb : vb - va;
      }
      return 0;
    });
    return sorted;
  };

  const fetchGroupedClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setError('No authentication token');
        setLoading(false);
        return;
      }

      const encodedSearch = '';
      const url = `${API_BASE_ROOT}/frontend/grouped-clients?search=${encodedSearch}&per_page=${ROWS_PER_PAGE}&page_all=1&page_normal=1&page_alarm=1&page_offline=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const all = json?.data?.all_plant?.data || [];
      const normal = json?.data?.normal_plant?.data || [];
      const alarm = json?.data?.alarm_plant?.data || [];
      const offline = json?.data?.offline_plant?.data || [];

      setGroupedClients({
        all_plant: all,
        normal_plant: normal,
        alarm_plant: alarm,
        offline_plant: offline
      });

      setTotals({
        total_all_plant: json?.data?.all_plant?.total ?? all.length,
        total_normal_plant: json?.data?.normal_plant?.total ?? normal.length,
        total_alarm_plant: json?.data?.alarm_plant?.total ?? alarm.length,
        total_offline_plant: json?.data?.offline_plant?.total ?? offline.length
      });
    } catch (err) {
      setError('Failed to load station list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupedClients();
  }, []);

  const tableData = useMemo(() => {
    if (selectedStatus === 'normal') return groupedClients.normal_plant;
    if (selectedStatus === 'warning') return groupedClients.alarm_plant;
    if (selectedStatus === 'fault') return groupedClients.offline_plant;
    return groupedClients.all_plant;
  }, [selectedStatus, groupedClients]);

  const sortedData = useMemo(() => sortData(tableData), [tableData, sortConfig]);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const emptyState = !loading && sortedData.length === 0;

  return (
    <div className="station-list-page user-list-page-alluser">
      <div className="ul-card-allusers">
        <div className="ul-header">
          <div className="ul-header-text">
            <h4 className="ul-title">Station List</h4>
            <p className="ul-subtitle">Monitor all plants by status</p>
          </div>
        </div>

        <div className="ul-body">
        {loading ? (
          <div className="ul-empty"><p className="ul-muted">Loading stations...</p></div>
        ) : error ? (
          <div className="ul-error" role="alert">{error}</div>
        ) : (
          <div>
            <div className="status-box-container">
              <div
                className={`status-card standby ${selectedStatus === 'standby' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('standby')}
              >
                <div className="status-left">
                  <div className="status-icon">✔</div>
                  <div className="status-title">Total</div>
                </div>
                <div className="status-percent">{totals.total_all_plant}</div>
              </div>

              <div
                className={`status-card normal ${selectedStatus === 'normal' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('normal')}
              >
                <div className="status-left">
                  <div className="status-icon">●</div>
                  <div className="status-title">Normal</div>
                </div>
                <div className="status-percent">{totals.total_normal_plant}</div>
              </div>

              <div
                className={`status-card warning ${selectedStatus === 'warning' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('warning')}
              >
                <div className="status-left">
                  <div className="status-icon">▲</div>
                  <div className="status-title">Fault</div>
                </div>
                <div className="status-percent">{totals.total_alarm_plant}</div>
              </div>

              <div
                className={`status-card fault ${selectedStatus === 'fault' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('fault')}
              >
                <div className="status-left">
                  <div className="status-icon">⚠</div>
                  <div className="status-title">Offline</div>
                </div>
                <div className="status-percent">{totals.total_offline_plant}</div>
              </div>
            </div>

            <div className="table-scroll-container">
              <div className="table-inner-force-allusers">
                {emptyState ? (
                  <div className="ul-empty"><p className="ul-muted">No stations found</p></div>
                ) : (
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th className="sticky-col col-index">No.</th>
                        <th className="sticky-col col-id">
                          <SortableHeader label="ID" field="id" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th className="sticky-col col-code">
                          <SortableHeader label="Code" field="company_code" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th className="sticky-col col-username">
                          <SortableHeader label="Username" field="username" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>
                          <SortableHeader label="Phone" field="phone" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>
                          <SortableHeader label="Email" field="email" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>
                          <SortableHeader label="Password" field="password" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>
                          <SortableHeader label="Created At" field="created_at" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>
                          <SortableHeader label="Updated At" field="updated_at" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((item, idx) => (
                        <tr key={item.id ?? idx}>
                          <td className="sticky-col col-index">{idx + 1}</td>
                          <td className="sticky-col col-id">{item.id ?? 'N/A'}</td>
                          <td className="sticky-col col-code">{item.company_code || item.qbits_company_code || 'N/A'}</td>
                          <td className="sticky-col col-username">{item.username || 'N/A'}</td>
                          <td>{item.phone || 'N/A'}</td>
                          <td>{item.email || 'N/A'}</td>
                          <td>{item.password || 'N/A'}</td>
                          <td>{formatDate(item.created_at)}</td>
                          <td>{formatDate(item.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
