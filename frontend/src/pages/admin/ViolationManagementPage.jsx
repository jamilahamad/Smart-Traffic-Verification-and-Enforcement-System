import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Edit3,
  Eye,
  FileWarning,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import api from '../../lib/api';
import '../../styles/ViolationManagementPage.css';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  fineAmount: '',
  severity: 'medium',
  points: 0,
  status: 'active',
  applicableTo: [],
};

const severityOptions = ['low', 'medium', 'high', 'critical'];
const statusOptions = ['active', 'inactive'];

const normalizeCode = (value) => {
  return String(value || '')
    .trim()
    .replace(/[–—−]/g, '-')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
};

const normalizeViolationType = (item = {}) => {
  const applicableTo = Array.isArray(item.applicableTo) ? item.applicableTo : [];

  return {
    ...item,
    id: item._id || item.id || '',
    code: item.code || '',
    name: item.name || item.label || '',
    description: item.description || '',
    fineAmount: Number(item.fineAmount ?? item.fine ?? 0),
    severity: item.severity || 'medium',
    points: Number(item.points || 0),
    status: item.status || 'active',
    applicableTo,
  };
};

const formatMoney = (value) => {
  return `৳${Number(value || 0).toLocaleString()}`;
};

const getApplicableLabel = (applicableTo = []) => {
  const list = Array.isArray(applicableTo) ? applicableTo : [];

  if (list.includes('driver') && list.includes('owner')) {
    return 'Both';
  }

  if (list.includes('driver')) {
    return 'Driver';
  }

  if (list.includes('owner')) {
    return 'Owner';
  }

  return 'Not Set';
};

const getSeverityClass = (severity) => {
  const value = String(severity || '').toLowerCase();

  if (value === 'critical') {
    return 'bg-red-50 text-red-700 border-red-100';
  }

  if (value === 'high') {
    return 'bg-orange-50 text-orange-700 border-orange-100';
  }

  if (value === 'medium') {
    return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  }

  return 'bg-green-50 text-green-700 border-green-100';
};

const getStatusClass = (status) => {
  return status === 'active'
    ? 'bg-green-50 text-green-700 border-green-100'
    : 'bg-gray-100 text-gray-600 border-gray-200';
};

const getApplicableClass = (applicableTo = []) => {
  const label = getApplicableLabel(applicableTo).toLowerCase();

  if (label === 'driver') {
    return 'bg-blue-50 text-blue-700 border-blue-100';
  }

  if (label === 'both') {
    return 'bg-purple-50 text-purple-700 border-purple-100';
  }

  return 'bg-orange-50 text-orange-700 border-orange-100';
};

export default function ViolationManagementPage() {
  const [violationTypes, setViolationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [applicableFilter, setApplicableFilter] = useState('');

  const [modalMode, setModalMode] = useState('closed');
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadViolationTypes = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await api.getViolationTypes({
        search,
        status: statusFilter,
        severity: severityFilter,
        applicableTo: applicableFilter,
      });

      const items = data.violationTypes || data.items || data || [];

      setViolationTypes(
        Array.isArray(items) ? items.map(normalizeViolationType) : []
      );
    } catch (err) {
      setError(err.message || 'Failed to load violation types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadViolationTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, severityFilter, applicableFilter]);

  const stats = useMemo(() => {
    return {
      total: violationTypes.length,
      active: violationTypes.filter((item) => item.status === 'active').length,
      inactive: violationTypes.filter((item) => item.status === 'inactive').length,
      critical: violationTypes.filter((item) => item.severity === 'critical').length,
    };
  }, [violationTypes]);

  const openCreateModal = () => {
    setSelectedViolation(null);
    setForm(emptyForm);
    setModalMode('create');
    setError('');
    setSuccess('');
  };

  const openEditModal = (violationType) => {
    const item = normalizeViolationType(violationType);

    setSelectedViolation(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description,
      fineAmount: item.fineAmount,
      severity: item.severity,
      points: item.points,
      status: item.status,
      applicableTo: item.applicableTo,
    });
    setModalMode('edit');
    setError('');
    setSuccess('');
  };

  const openViewModal = (violationType) => {
    setSelectedViolation(normalizeViolationType(violationType));
    setModalMode('view');
    setError('');
    setSuccess('');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedViolation(null);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleApplicable = (value) => {
    setForm((current) => {
      const currentList = Array.isArray(current.applicableTo)
        ? current.applicableTo
        : [];

      if (value === 'both') {
        const hasBoth =
          currentList.includes('driver') && currentList.includes('owner');

        return {
          ...current,
          applicableTo: hasBoth ? [] : ['driver', 'owner'],
        };
      }

      const nextList = currentList.includes(value)
        ? currentList.filter((item) => item !== value)
        : [...currentList, value];

      return {
        ...current,
        applicableTo: [...new Set(nextList)],
      };
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return 'Violation name is required.';
    }

    if (!form.code.trim()) {
      return 'Violation code is required.';
    }

    if (Number(form.fineAmount) < 0 || form.fineAmount === '') {
      return 'Valid fine amount is required.';
    }

    if (!form.applicableTo.length) {
      return 'Please select Applicable To: Driver, Owner, or Both.';
    }

    return '';
  };

  const submitForm = async (event) => {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const payload = {
      code: normalizeCode(form.code),
      name: form.name.trim(),
      description: form.description.trim(),
      fineAmount: Number(form.fineAmount || 0),
      severity: form.severity,
      points: Number(form.points || 0),
      status: form.status,
      applicableTo: form.applicableTo,
    };

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (modalMode === 'edit' && selectedViolation?.id) {
        await api.updateViolationType(selectedViolation.id, payload);
        setSuccess('Violation updated successfully.');
      } else {
        await api.createViolationType(payload);
        setSuccess('Violation created successfully.');
      }

      closeModal();
      await loadViolationTypes();
    } catch (err) {
      setError(err.message || 'Failed to save violation.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (violationType) => {
    const item = normalizeViolationType(violationType);
    const nextStatus = item.status === 'active' ? 'inactive' : 'active';

    try {
      setError('');
      setSuccess('');
      await api.updateViolationTypeStatus(item.id, nextStatus);
      setSuccess(`Violation ${nextStatus === 'active' ? 'enabled' : 'disabled'} successfully.`);
      await loadViolationTypes();
    } catch (err) {
      setError(err.message || 'Failed to update violation status.');
    }
  };

  const deleteViolation = async (violationType) => {
    const item = normalizeViolationType(violationType);
    const confirmed = window.confirm(
      `Soft delete violation "${item.name}"? Existing cases will remain safe.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.deleteViolationType(item.id);
      setSuccess('Violation soft deleted successfully.');
      await loadViolationTypes();
    } catch (err) {
      setError(err.message || 'Failed to delete violation.');
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadViolationTypes();
  };

  const isViewMode = modalMode === 'view';
  const isModalOpen = modalMode !== 'closed';

  return (
    <div className="violation-management-page space-y-6">
      <section className="violation-management-header rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <FileWarning size={14} />
              Dynamic Rule Management
            </div>
            <h1 className="text-2xl font-bold text-slate-950">
              Violation Management
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Create, update, enable, disable, and soft-delete traffic violation
              rules. Police E-Challan will use only active database rules.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="violation-create-button inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Create Violation
          </button>
        </div>
      </section>

      <section className="violation-stats-grid grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Rules
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{stats.total}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active
          </p>
          <h2 className="mt-2 text-2xl font-bold text-green-700">{stats.active}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Inactive
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-600">{stats.inactive}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Critical
          </p>
          <h2 className="mt-2 text-2xl font-bold text-red-700">{stats.critical}</h2>
        </div>
      </section>

      {(error || success) && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            error
              ? 'border-red-100 bg-red-50 text-red-700'
              : 'border-green-100 bg-green-50 text-green-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {error ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span>{error || success}</span>
          </div>
        </div>
      )}

      <section className="violation-filter-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          onSubmit={handleSearchSubmit}
          className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_auto]"
        >
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by code, name, or description"
              className="violation-search-input w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="">All Severity</option>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>

          <select
            value={applicableFilter}
            onChange={(event) => setApplicableFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="">Applicable To</option>
            <option value="driver">Driver</option>
            <option value="owner">Owner</option>
          </select>

          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </section>

      <section className="violation-table-card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center text-slate-500">
            <Loader2 className="mr-2 animate-spin" size={20} />
            Loading violation rules...
          </div>
        ) : violationTypes.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <FileWarning className="mb-3 text-slate-300" size={42} />
            <h3 className="text-lg font-semibold text-slate-900">
              No violation rules found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Create a rule or adjust your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Violation
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Fine
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Severity
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Points
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Applicable To
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {violationTypes.map((item) => (
                  <tr key={item.id || item.code} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-slate-950">{item.name}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                          {item.code}
                        </p>
                        {item.description && (
                          <p className="mt-1 max-w-md truncate text-sm text-slate-500">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {formatMoney(item.fineAmount)}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getSeverityClass(item.severity)}`}>
                        {item.severity}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      {item.points}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getApplicableClass(item.applicableTo)}`}>
                        {getApplicableLabel(item.applicableTo)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openViewModal(item)}
                          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStatus(item)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {item.status === 'active' ? 'Disable' : 'Enable'}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteViolation(item)}
                          className="rounded-xl border border-red-100 p-2 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="violation-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="violation-modal w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {modalMode === 'create'
                    ? 'Create Violation'
                    : modalMode === 'edit'
                      ? 'Edit Violation'
                      : 'Violation Details'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure rule definition used by Police E-Challan.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {isViewMode ? (
              <div className="space-y-4 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Name
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-950">
                    {selectedViolation?.name}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Code
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedViolation?.code}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Fine
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {formatMoney(selectedViolation?.fineAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Applicable To
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {getApplicableLabel(selectedViolation?.applicableTo)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Description
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {selectedViolation?.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={submitForm} className="space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Violation Name *
                    </span>
                    <input
                      value={form.name}
                      onChange={(event) => updateForm('name', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="Helmet Not Worn"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Violation Code *
                    </span>
                    <input
                      value={form.code}
                      onChange={(event) => updateForm('code', normalizeCode(event.target.value))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-slate-400"
                      placeholder="HELMET"
                    />
                  </label>
                </div>

                <label className="space-y-2 block">
                  <span className="text-sm font-semibold text-slate-700">
                    Description
                  </span>
                  <textarea
                    value={form.description}
                    onChange={(event) => updateForm('description', event.target.value)}
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    placeholder="Describe the traffic violation rule..."
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Fine Amount *
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={form.fineAmount}
                      onChange={(event) => updateForm('fineAmount', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="1000"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Severity
                    </span>
                    <select
                      value={form.severity}
                      onChange={(event) => updateForm('severity', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm capitalize outline-none focus:border-slate-400"
                    >
                      {severityOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Points
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={form.points}
                      onChange={(event) => updateForm('points', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Status
                    </span>
                    <select
                      value={form.status}
                      onChange={(event) => updateForm('status', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm capitalize outline-none focus:border-slate-400"
                    >
                      {statusOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    Applicable To *
                  </p>

                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { value: 'driver', label: 'Driver' },
                      { value: 'owner', label: 'Owner' },
                      { value: 'both', label: 'Both' },
                    ].map((item) => {
                      const checked =
                        item.value === 'both'
                          ? form.applicableTo.includes('driver') &&
                            form.applicableTo.includes('owner')
                          : form.applicableTo.includes(item.value);

                      return (
                        <label
                          key={item.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            checked
                              ? 'border-slate-950 bg-slate-950 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleApplicable(item.value)}
                            className="h-4 w-4"
                          />
                          {item.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {modalMode === 'edit' ? 'Update Violation' : 'Create Violation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}