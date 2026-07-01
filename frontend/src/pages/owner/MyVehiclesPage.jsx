import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Shield,
  Users,
  XCircle,
} from 'lucide-react';

import api from '../../lib/api';
import useStore from '../../store/useStore';
import '../../styles/MyVehiclesPage.css';

const initialForm = {
  registrationNumber: '',
  vehicleType: 'car',
  brand: '',
  model: '',
  year: '',
  color: '',
  chassisNumber: '',
  engineNumber: '',
  registrationDate: '',
  registrationExpiry: '',
  fitnessExpiry: '',
  taxTokenExpiry: '',
  routePermitExpiry: '',
  insuranceExpiry: '',
};

const statusFilters = ['all', 'active', 'suspended', 'blacklisted'];

const documentFields = [
  { label: 'Registration', key: 'registrationExpiry' },
  { label: 'Fitness', key: 'fitnessExpiry' },
  { label: 'Tax Token', key: 'taxTokenExpiry' },
  { label: 'Route Permit', key: 'routePermitExpiry' },
  { label: 'Insurance', key: 'insuranceExpiry' },
];

const getId = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return item._id || item.id || '';
};

const cleanPlate = (value) => {
  return String(value || '')
    .trim()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase();
};

const formatLabel = (value = '') => {
  const text = String(value || 'N/A');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10) || 'N/A';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const isExpiredDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const today = new Date();

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date < today;
};

const getOwnerId = (vehicle) => {
  return getId(vehicle?.owner) || vehicle?.ownerId || '';
};

const getVehiclePlate = (vehicle) => {
  return vehicle?.registrationNumber || vehicle?.plateNumber || vehicle?.plate || 'N/A';
};

const getVehicleTitle = (vehicle) => {
  const title = `${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim();
  return title || 'Unknown Vehicle';
};

const getAssignedDrivers = (vehicle) => {
  if (Array.isArray(vehicle?.assignedDrivers)) {
    return vehicle.assignedDrivers;
  }

  if (Array.isArray(vehicle?.authorizedDrivers)) {
    return vehicle.authorizedDrivers;
  }

  if (Array.isArray(vehicle?.drivers)) {
    return vehicle.drivers;
  }

  return [];
};

const getStatusClass = (status) => {
  if (status === 'active') {
    return 'bg-green-100 text-green-700';
  }

  if (status === 'suspended') {
    return 'bg-orange-100 text-orange-700';
  }

  if (status === 'blacklisted') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const getSafetyScore = (vehicle) => {
  if (typeof vehicle?.safetyScore === 'number') {
    return Math.max(0, Math.min(100, vehicle.safetyScore));
  }

  let score = 100;

  documentFields.forEach((field) => {
    if (isExpiredDate(vehicle?.[field.key])) {
      score -= 15;
    }
  });

  if (vehicle?.status && vehicle.status !== 'active') {
    score -= 30;
  }

  return Math.max(0, Math.min(100, score));
};

const getSafetyClass = (score) => {
  if (score >= 80) {
    return 'bg-green-500';
  }

  if (score >= 50) {
    return 'bg-yellow-500';
  }

  return 'bg-red-500';
};

const getIssueCount = (vehicle) => {
  let count = 0;

  documentFields.forEach((field) => {
    if (isExpiredDate(vehicle?.[field.key])) {
      count += 1;
    }
  });

  if (vehicle?.status && vehicle.status !== 'active') {
    count += 1;
  }

  return count;
};

const getCreateVehicleFunction = () => {
  if (typeof api.createVehicle === 'function') {
    return api.createVehicle;
  }

  if (typeof api.registerVehicle === 'function') {
    return api.registerVehicle;
  }

  if (typeof api.addVehicle === 'function') {
    return api.addVehicle;
  }

  return null;
};

export default function MyVehiclesPage({ onNavigate = () => { } }) {
  const currentUser = useStore((state) => state.currentUser);
  const vehicles = useStore((state) => state.vehicles);
  const assignments = useStore((state) => state.assignments);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);
  const addLog = useStore((state) => state.addLog);
  const isLoading = useStore((state) => state.isLoading);
  const apiError = useStore((state) => state.apiError);

  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

  const currentUserId = getId(currentUser);
  const vehicleList = Array.isArray(vehicles) ? vehicles : [];
  const assignmentList = Array.isArray(assignments) ? assignments : [];

  const ownerVehicles = useMemo(() => {
    return vehicleList;
  }, [vehicleList]);

  const filteredVehicles = useMemo(() => {
    let nextList =
      statusFilter === 'all'
        ? ownerVehicles
        : ownerVehicles.filter((vehicle) => vehicle.status === statusFilter);

    const query = searchQ.trim().toLowerCase();

    if (!query) {
      return nextList;
    }

    nextList = nextList.filter((vehicle) => {
      return (
        getVehiclePlate(vehicle).toLowerCase().includes(query) ||
        getVehicleTitle(vehicle).toLowerCase().includes(query) ||
        String(vehicle.vehicleType || '').toLowerCase().includes(query) ||
        String(vehicle.color || '').toLowerCase().includes(query) ||
        String(vehicle.engineNumber || '').toLowerCase().includes(query) ||
        String(vehicle.chassisNumber || '').toLowerCase().includes(query)
      );
    });

    return nextList;
  }, [ownerVehicles, searchQ, statusFilter]);

  const activeVehicles = ownerVehicles.filter(
    (vehicle) => !vehicle.status || vehicle.status === 'active'
  ).length;

  const suspendedVehicles = ownerVehicles.filter(
    (vehicle) => vehicle.status === 'suspended'
  ).length;

  const blacklistedVehicles = ownerVehicles.filter(
    (vehicle) => vehicle.status === 'blacklisted'
  ).length;

  const issueVehicles = ownerVehicles.filter(
    (vehicle) => getIssueCount(vehicle) > 0
  ).length;

  const hasOwnerVehicles = ownerVehicles.length > 0;
  const hasActiveSearchOrFilter = Boolean(searchQ.trim()) || statusFilter !== 'all';

  const emptyStateTitle = hasOwnerVehicles
    ? 'No vehicles match your search'
    : 'No vehicles registered yet';

  const emptyStateDescription = hasOwnerVehicles
    ? 'Try changing the search keyword or selected status filter.'
    : 'Register your first vehicle to start monitoring compliance.';

  const summaryCards = [
    {
      label: 'Total Vehicles',
      value: ownerVehicles.length,
      icon: Car,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Active',
      value: activeVehicles,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Suspended',
      value: suspendedVehicles,
      icon: AlertTriangle,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Need Attention',
      value: issueVehicles + blacklistedVehicles,
      icon: Shield,
      color: 'bg-red-50 text-red-600',
    },
  ];

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setLocalError('');
    setSuccess('');
  };

  const handleRefresh = async () => {
    if (typeof fetchDashboardData === 'function') {
      await fetchDashboardData();
    }
  };

  const validateForm = () => {
    if (!cleanPlate(form.registrationNumber)) {
      return 'Vehicle registration number is required.';
    }

    if (!form.brand.trim()) {
      return 'Vehicle brand is required.';
    }

    if (!form.model.trim()) {
      return 'Vehicle model is required.';
    }

    if (!form.chassisNumber.trim()) {
      return 'Chassis number is required.';
    }

    if (!form.engineNumber.trim()) {
      return 'Engine number is required.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLocalError('');
    setSuccess('');

    const validationError = validateForm();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    const createVehicle = getCreateVehicleFunction();

    if (!createVehicle) {
      setLocalError('api.createVehicle() function not found in api.js.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...form,
        registrationNumber: cleanPlate(form.registrationNumber),
        year: form.year ? Number(form.year) : undefined,
        owner: currentUserId || undefined,
        ownerId: currentUserId || undefined,
        status: 'active',
      };

      await createVehicle(payload);

      if (typeof fetchDashboardData === 'function') {
        await fetchDashboardData();
      }

      if (typeof addLog === 'function' && currentUser) {
        addLog({
          userId: currentUser.id || currentUser._id,
          userName: currentUser.name || 'Vehicle Owner',
          action: 'Vehicle Registered',
          details: `Vehicle ${payload.registrationNumber} registered by owner.`,
          type: 'vehicle',
        });
      }

      setSuccess('Vehicle registered successfully.');
      setForm(initialForm);
      setShowForm(false);
    } catch (err) {
      console.error('Vehicle registration failed:', err);
      setLocalError(err.message || 'Vehicle registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="my-vehicles-wrapper animate-fade-in space-y-6">
      <header className="my-vehicles-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="my-vehicles-header-content flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Car size={26} />
              My Vehicles
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              Register, monitor, and review compliance status of your vehicles.
            </p>
          </div>

          <div className="my-vehicles-header-actions flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="my-vehicles-refresh-button bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForm((current) => !current);
                resetForm();
              }}
              className="my-vehicles-add-button bg-white text-[#0f4c81] rounded-xl px-4 py-2 text-sm font-semibold hover:shadow-lg flex items-center gap-2"
            >
              <Plus size={16} />
              {showForm ? 'Close Form' : 'Register Vehicle'}
            </button>
          </div>
        </div>
      </header>

      {(apiError || localError) && (
        <div className="my-vehicles-alert bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <XCircle size={18} className="shrink-0 mt-0.5" />
          <span>{localError || apiError}</span>
        </div>
      )}

      {success && (
        <div className="my-vehicles-alert bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <section className="my-vehicles-summary-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="my-vehicles-summary-card bg-white rounded-xl px-5 py-4 border border-gray-100 shadow-sm hover:shadow-md"
            >
              <div
                className={`my-vehicles-summary-icon w-9 h-9 rounded-xl ${card.color} flex items-center justify-center`}
              >
                <Icon size={18} />
              </div>

              <p className="my-vehicles-summary-value text-2xl font-bold text-gray-900">
                {card.value}
              </p>

              <p className="my-vehicles-summary-label text-xs text-gray-500">
                {card.label}
              </p>
            </article>
          );
        })}
      </section>

      {showForm && (
        <section className="my-vehicles-form-card bg-white rounded-2xl border border-gray-100 p-6">
          <div className="my-vehicles-form-head flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">Register New Vehicle</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Add vehicle information and document expiry dates.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="my-vehicles-close-button rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="my-vehicles-form space-y-5">
            <div className="my-vehicles-form-grid grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormInput
                label="Registration Number *"
                value={form.registrationNumber}
                onChange={(value) => setField('registrationNumber', value)}
                placeholder="SYL-METRO-GA-11-1234"
              />

              <FormSelect
                label="Vehicle Type"
                value={form.vehicleType}
                onChange={(value) => setField('vehicleType', value)}
                options={['car', 'bike', 'bus', 'truck', 'cng', 'microbus']}
              />

              <FormInput
                label="Brand *"
                value={form.brand}
                onChange={(value) => setField('brand', value)}
                placeholder="Toyota"
              />

              <FormInput
                label="Model *"
                value={form.model}
                onChange={(value) => setField('model', value)}
                placeholder="Axio"
              />

              <FormInput
                label="Year"
                type="number"
                value={form.year}
                onChange={(value) => setField('year', value)}
                placeholder="2020"
              />

              <FormInput
                label="Color"
                value={form.color}
                onChange={(value) => setField('color', value)}
                placeholder="White"
              />

              <FormInput
                label="Chassis Number *"
                value={form.chassisNumber}
                onChange={(value) => setField('chassisNumber', value)}
                placeholder="CHS-123456"
              />

              <FormInput
                label="Engine Number *"
                value={form.engineNumber}
                onChange={(value) => setField('engineNumber', value)}
                placeholder="ENG-123456"
              />

              <FormInput
                label="Registration Date"
                type="date"
                value={form.registrationDate}
                onChange={(value) => setField('registrationDate', value)}
              />

              <FormInput
                label="Registration Expiry"
                type="date"
                value={form.registrationExpiry}
                onChange={(value) => setField('registrationExpiry', value)}
              />

              <FormInput
                label="Fitness Expiry"
                type="date"
                value={form.fitnessExpiry}
                onChange={(value) => setField('fitnessExpiry', value)}
              />

              <FormInput
                label="Tax Token Expiry"
                type="date"
                value={form.taxTokenExpiry}
                onChange={(value) => setField('taxTokenExpiry', value)}
              />

              <FormInput
                label="Route Permit Expiry"
                type="date"
                value={form.routePermitExpiry}
                onChange={(value) => setField('routePermitExpiry', value)}
              />

              <FormInput
                label="Insurance Expiry"
                type="date"
                value={form.insuranceExpiry}
                onChange={(value) => setField('insuranceExpiry', value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="my-vehicles-submit-button w-full rounded-xl bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] px-5 py-3 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {submitting ? 'Registering Vehicle...' : 'Register Vehicle'}
            </button>
          </form>
        </section>
      )}

      {hasOwnerVehicles && (
        <section className="my-vehicles-filter-card bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="my-vehicles-filter-row flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="my-vehicles-search-wrap relative flex-1">
              <Search
                size={18}
                className="my-vehicles-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={searchQ}
                onChange={(event) => setSearchQ(event.target.value)}
                placeholder="Search by plate, brand, model, type, color, engine, or chassis..."
                className="my-vehicles-search-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
              />
            </div>

            <div className="my-vehicles-filter-buttons flex items-center gap-2 flex-wrap">
              <Filter size={16} className="text-gray-400" />

              {statusFilters.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`my-vehicles-filter-button px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === status
                    ? 'bg-[#0f4c81] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {formatLabel(status)}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="my-vehicles-list-grid grid lg:grid-cols-2 gap-5">
        {filteredVehicles.length === 0 ? (
          <div className="my-vehicles-empty-state lg:col-span-2 bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
            <Car size={46} className="mx-auto mb-3 opacity-30" />

            <h3 className="text-sm font-semibold text-gray-700">
              {emptyStateTitle}
            </h3>

            <p className="text-xs mt-1">
              {emptyStateDescription}
            </p>

            {!hasOwnerVehicles && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  resetForm();
                }}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f4c81] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98]"
              >
                <Plus size={16} />
                Register Vehicle
              </button>
            )}

            {hasOwnerVehicles && hasActiveSearchOrFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchQ('');
                  setStatusFilter('all');
                }}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:scale-[0.98]"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          filteredVehicles.map((vehicle) => {
            const vehicleId = getId(vehicle) || getVehiclePlate(vehicle);
            const safetyScore = getSafetyScore(vehicle);
            const issueCount = getIssueCount(vehicle);
            const assignedDrivers = getAssignedDrivers(vehicle);
            const vehicleAssignments = assignmentList.filter((assignment) => {
              return (
                assignment.status !== 'removed' &&
                String(assignment.vehicleId || getId(assignment.vehicle)) === String(getId(vehicle))
              );
            });

            const totalDrivers = assignedDrivers.length || vehicleAssignments.length;
            const detailsOpen = selectedVehicleId === vehicleId;

            return (
              <article
                key={vehicleId}
                className="my-vehicles-card bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div className="my-vehicles-card-top p-5">
                  <div className="my-vehicles-card-head flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-800">
                          {getVehiclePlate(vehicle)}
                        </h2>

                        <span
                          className={`my-vehicles-status-badge px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                            vehicle.status || 'active'
                          )}`}
                        >
                          {formatLabel(vehicle.status || 'active')}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        {getVehicleTitle(vehicle)}
                        {vehicle.year ? ` (${vehicle.year})` : ''}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        {vehicle.vehicleType || 'Vehicle'} • {vehicle.color || 'Unknown color'}
                      </p>
                    </div>

                    <div
                      className={`my-vehicles-health-icon w-11 h-11 rounded-xl flex items-center justify-center ${issueCount > 0
                        ? 'bg-red-50 text-red-600'
                        : 'bg-green-50 text-green-600'
                        }`}
                    >
                      {issueCount > 0 ? <AlertTriangle size={22} /> : <CheckCircle size={22} />}
                    </div>
                  </div>

                  <div className="my-vehicles-safety-row flex items-center gap-2 mt-5">
                    <span className="text-xs text-gray-400">Safety</span>

                    <div className="my-vehicles-safety-track flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`my-vehicles-safety-fill h-full rounded-full ${getSafetyClass(
                          safetyScore
                        )}`}
                        style={{ width: `${safetyScore}%` }}
                      />
                    </div>

                    <span className="text-xs font-bold text-gray-700">
                      {safetyScore}/100
                    </span>
                  </div>

                  <div className="my-vehicles-mini-grid grid grid-cols-3 gap-3 mt-5">
                    <MiniInfo icon={Users} label="Drivers" value={totalDrivers} />
                    <MiniInfo icon={FileText} label="Issues" value={issueCount} />
                    <MiniInfo icon={QrCode} label="QR" value={vehicle.qrCode ? 'Yes' : 'Ready'} />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedVehicleId((current) =>
                        current === vehicleId ? '' : vehicleId
                      )
                    }
                    className="my-vehicles-details-button mt-5 w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    {detailsOpen ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {detailsOpen && (
                  <div className="my-vehicles-details-box border-t border-gray-100 bg-gray-50 p-5">
                    <div className="my-vehicles-info-grid grid sm:grid-cols-2 gap-4">
                      <InfoItem label="Engine Number" value={vehicle.engineNumber} />
                      <InfoItem label="Chassis Number" value={vehicle.chassisNumber} />
                      <InfoItem label="Registration Date" value={formatDate(vehicle.registrationDate)} />
                      <InfoItem label="Vehicle Type" value={vehicle.vehicleType} />
                    </div>

                    <div className="my-vehicles-doc-list grid sm:grid-cols-2 gap-3 mt-5">
                      {documentFields.map((field) => (
                        <DocumentStatus
                          key={field.key}
                          label={field.label}
                          value={vehicle[field.key]}
                        />
                      ))}
                    </div>

                    <div className="my-vehicles-qr-box rounded-xl bg-white border border-gray-100 p-4 mt-5">
                      <p className="text-xs text-gray-400 mb-1">QR Code Value</p>

                      <code className="text-sm font-semibold text-gray-800 break-all">
                        {vehicle.qrCode || `STVES-VEH:${getVehiclePlate(vehicle)}`}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('assign-drivers')}
                      className="my-vehicles-assign-button mt-4 w-full rounded-xl bg-[#0f4c81] px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Users size={16} />
                      Manage Drivers
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      {hasOwnerVehicles && (
        <p className="my-vehicles-footer-count text-xs text-gray-400">
          Showing {filteredVehicles.length} of {ownerVehicles.length} vehicles.
        </p>
      )}
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="my-vehicles-form-group">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="my-vehicles-input w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div className="my-vehicles-form-group">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="my-vehicles-input w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

function MiniInfo({ icon: Icon, label, value }) {
  return (
    <div className="my-vehicles-mini-info rounded-xl bg-gray-50 p-3">
      <Icon size={16} className="text-[#0f4c81] mb-2" />

      <p className="text-lg font-bold text-gray-800">{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="my-vehicles-info-item">
      <p className="text-xs text-gray-400">{label}</p>

      <p className="mt-1 text-sm font-semibold text-gray-800 break-words">
        {value || 'N/A'}
      </p>
    </div>
  );
}

function DocumentStatus({ label, value }) {
  if (!value) {
    return (
      <div className="my-vehicles-document-status rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold text-gray-500">Not added</p>
          <p className="text-[11px] text-gray-400">N/A</p>
        </div>
      </div>
    );
  }

  const expired = isExpiredDate(value);

  return (
    <div
      className={`my-vehicles-document-status rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${expired ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
        }`}
    >
      <div className="flex items-center gap-2">
        {expired ? (
          <AlertTriangle size={15} className="text-red-600" />
        ) : (
          <CalendarDays size={15} className="text-green-600" />
        )}

        <span className="text-sm font-semibold text-gray-800">{label}</span>
      </div>

      <div className="text-right">
        <p className={`text-xs font-bold ${expired ? 'text-red-700' : 'text-green-700'}`}>
          {expired ? 'Expired' : 'Valid'}
        </p>

        <p className="text-[11px] text-gray-500">{formatDate(value)}</p>
      </div>
    </div>
  );
}