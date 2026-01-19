'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('standby');
  const [tablePage, setTablePage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
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

      const encodedSearch = encodeURIComponent(search.trim());
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
  }, [search]);

  // Debounce search input -> search value
  useEffect(() => {
    const normalizedInput = searchInput.trim();
    const handler = setTimeout(() => {
      if (normalizedInput === search) return;
      setSearch(normalizedInput);
      setTablePage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput, search]);

  const tableData = useMemo(() => {
    if (selectedStatus === 'normal') return groupedClients.normal_plant;
    if (selectedStatus === 'warning') return groupedClients.alarm_plant;
    if (selectedStatus === 'fault') return groupedClients.offline_plant;
    return groupedClients.all_plant;
  }, [selectedStatus, groupedClients]);

  const filteredData = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    if (!term) return tableData;
    return tableData.filter((item) => {
      const fields = [
        item.username,
        item.company_code || item.qbits_company_code,
        item.phone,
        item.email,
        item.id,
      ];
      return fields.some((f) => String(f || '').toLowerCase().includes(term));
    });
  }, [tableData, searchInput]);

  const sortedData = useMemo(() => sortData(filteredData), [filteredData, sortConfig]);

  const totalTablePages = Math.max(1, Math.ceil(sortedData.length / ROWS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (tablePage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(start, start + ROWS_PER_PAGE);
  }, [sortedData, tablePage]);

  useEffect(() => {
    setTablePage(1);
  }, [selectedStatus, groupedClients]);

  const handleTablePrevious = () => {
    setTablePage((prev) => Math.max(1, prev - 1));
  };

  const handleTableNext = () => {
    setTablePage((prev) => Math.min(totalTablePages, prev + 1));
  };

  const getPageNumbers = (currentPage, totalPages) => {
    const maxVisible = 5;
    const pages = [];

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        endPage = Math.min(totalPages - 1, 4);
      }
      if (currentPage >= totalPages - 1) {
        startPage = Math.max(2, totalPages - 3);
      }

      if (startPage > 2) pages.push('...');
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const handleNavigateToPlants = (item) => {
    if (!item?.id) return;
    const username = item?.username ? `?username=${encodeURIComponent(item.username)}` : '';
    router.push(`/user-plants/${item.id}${username}`);
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = Number(value);
    if (Number.isFinite(num)) return num.toFixed(2);
    return String(value);
  };

  const getPlantTypeLabel = (v) => {
    if (v === 0) return 'Solar System';
    if (v === 1) return 'Battery Storage';
    if (v === 2) return 'Solar with Limitation';
    return v ?? 'N/A';
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
          <form onSubmit={(e) => e.preventDefault()} className="ul-search">
            <div className="ul-search-input">
              <span className="ul-search-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.85-3.85Zm-5.242.656a5 5 0 1 1 0-10.001 5 5 0 0 1 0 10Z" />
                </svg>
              </span>
              <input
                type="text"
                className="ul-input"
                placeholder="Search by username, company code, collector..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </form>
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
                        <th className="sticky-col col-username">
                          <SortableHeader label="Username" field="username" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>
                          <SortableHeader label="Company Code" field="company_code" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>
                          <SortableHeader label="Phone" field="phone" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>
                          <SortableHeader label="Email" field="email" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>Inverter Type</th>
                        <th>Plant Name</th>
                        <th>City</th>
                        <th>Collector</th>
                        <th>Longitude</th>
                        <th>Latitude</th>
                        <th>GMT</th>
                        <th>Plant Type</th>
                        <th>Capacity (kW)</th>
                        <th>Day Production</th>
                        <th>Total Production</th>
                        <th>
                          <SortableHeader label="Created At" field="created_at" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                        <th>
                          <SortableHeader label="Updated At" field="updated_at" sortConfig={sortConfig} onSort={handleSort} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, idx) => (
                        <tr
                          key={item.id ?? idx}
                          onClick={() => handleNavigateToPlants(item)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="sticky-col col-index">{(tablePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                          <td className="sticky-col col-id">{item.id ?? 'N/A'}</td>
                          <td className="sticky-col col-username">{item.username || 'N/A'}</td>
                          <td>{item.company_code || item.qbits_company_code || 'N/A'}</td>
                          <td>{item.phone || 'N/A'}</td>
                          <td>{item.email || 'N/A'}</td>
                          <td>{item.inverter_type || item.inverterType || 'N/A'}</td>
                          <td>{item.plant_name || 'N/A'}</td>
                          <td>{item.city || item.remark1 || 'N/A'}</td>
                          <td>{item.collector || item.collector_sn || 'N/A'}</td>
                          <td>{item.longitude || 'N/A'}</td>
                          <td>{item.latitude || 'N/A'}</td>
                          <td>{item.gmt || item.timezone || 'N/A'}</td>
                          <td>{getPlantTypeLabel(item.plant_type)}</td>
                          <td>{formatNumber(item.capacity)}</td>
                          <td>{formatNumber(item.day_production || item.eday)}</td>
                          <td>{formatNumber(item.total_production || item.etot)}</td>
                          <td>{formatDate(item.created_at)}</td>
                          <td>{formatDate(item.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            {!emptyState && (
              <div className="station-pagination">
                <button
                  type="button"
                  className="pagination-arrow-btn"
                  onClick={handleTablePrevious}
                  disabled={tablePage === 1}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <div className="pagination-numbers">
                  {getPageNumbers(tablePage, totalTablePages).map((pageNum, idx) => (
                    pageNum === '...'
                      ? (
                        <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                          {pageNum}
                        </span>
                      )
                      : (
                        <button
                          key={pageNum}
                          type="button"
                          className={`pagination-number ${tablePage === pageNum ? 'active' : ''}`}
                          onClick={() => setTablePage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                  ))}
                </div>
                <button
                  type="button"
                  className="pagination-arrow-btn"
                  onClick={handleTableNext}
                  disabled={tablePage === totalTablePages}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
