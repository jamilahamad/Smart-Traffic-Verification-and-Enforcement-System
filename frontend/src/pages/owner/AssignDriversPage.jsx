import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle,
  Eye,
  Filter,
  IdCard,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';

import api from '../../lib/api';
import useStore from '../../store/useStore';
import '../../styles/AssignDriversPage.css';

const initialForm = {
  vehicleId: '',
  startDate: '',
  note: '',
};

const filterOptions = ['all', 'assigned', 'unassigned'];

const getId = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return item._id || item.id || '';
};

const formatLabel = (value = '') => {
  const text = String(value || 'N/A').replace(/_/g, ' ');
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

const getVehiclePlate = (vehicle) => {
  return vehicle?.registrationNumber || vehicle?.plateNumber || vehicle?.plate || 'N/A';
};

const getVehicleTitle = (vehicle) => {
  const title = `${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim();
  return title || 'Unknown Vehicle';
};

const getDriverName = (driver) => {
  return driver?.name || driver?.driverName || 'Unknown Driver';
};

const getDriverPhone = (driver) => {
  return driver?.phone || driver?.mobile || 'N/A';
};

const getDriverEmail = (driver) => {
  return driver?.email || 'N/A';
};

const getAssignmentStatusClass = (status) => {
  const value = String(status || '').toLowerCase();

  if (value === 'active') {
    return 'bg-green-100 text-green-700';
  }

  if (value === 'pending_driver_approval') {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (value === 'invitation_pending') {
    return 'bg-orange-100 text-orange-700';
  }

  if (['rejected', 'cancelled', 'removed', 'inactive'].includes(value)) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const getAssignmentVehicleId = (assignment) => {
  return getId(assignment?.vehicle) || assignment?.vehicleId || '';
};

const getAssignmentDriverId = (assignment) => {
  return getId(assignment?.driver) || assignment?.driverId || '';
};

const getAssignmentVehiclePlate = (assignment) => {
  return (
    assignment?.registrationNumber ||
    assignment?.vehicleRegistrationNumber ||
    assignment?.vehicle?.registrationNumber ||
    assignment?.vehicle?.plateNumber ||
    ''
  );
};

const getVehicleSelectValue = (vehicle) => {
  return getVehiclePlate(vehicle);
};

const getAssignmentId = (assignment) => {
  return getId(assignment);
};

const getAssignmentStatus = (assignment) => {
  return assignment?.status || 'active';
};

const getAssignmentDriverLabel = (assignment, driver) => {
  if (driver) {
    return getDriverName(driver);
  }

  if (assignment?.driverSource === 'BRTA_ONLY' || assignment?.brtaDriverId) {
    return 'BRTA Driver Invitation';
  }

  return 'Driver Request';
};

const getAssignmentContactText = (assignment, driver) => {
  if (driver) {
    return `${getDriverEmail(driver)} • ${getDriverPhone(driver)}`;
  }

  const phone = assignment?.invitationContact?.phone;
  const email = assignment?.invitationContact?.email;

  if (phone || email) {
    return [email, phone].filter(Boolean).join(' • ');
  }

  if (assignment?.brtaDriverId) {
    return `BRTA ID: ${assignment.brtaDriverId}`;
  }

  return 'Contact information unavailable';
};

const getAssignmentLicenseText = (assignment, license) => {
  return assignment?.licenseNumber || license?.licenseNumber || 'License N/A';
};

const getAssignmentNote = (assignment) => {
  return assignment?.requestNote || assignment?.note || assignment?.notes || '';
};

const getDriverAvatarUrl = (driver) => {
  return (
    driver?.avatarUrl ||
    driver?.photoUrl ||
    driver?.profileImage ||
    driver?.profilePhoto ||
    driver?.image ||
    driver?.photo ||
    driver?.cloudinaryUrl ||
    ''
  );
};

const getAvatarInitials = (name = '') => {
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    return 'DR';
  }

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const maskSensitiveValue = (value) => {
  const text = String(value || '').trim();

  if (!text) {
    return 'N/A';
  }

  if (text.length <= 4) {
    return '****';
  }

  return `${text.slice(0, 2)}${'*'.repeat(Math.min(6, text.length - 4))}${text.slice(-2)}`;
};

const getAssignmentEmail = (assignment, driver) => {
  return driver?.email || assignment?.invitationContact?.email || 'N/A';
};

const getAssignmentPhone = (assignment, driver) => {
  return driver?.phone || driver?.mobile || assignment?.invitationContact?.phone || 'N/A';
};

const getAssignmentSource = (assignment) => {
  if (assignment?.driverSource) {
    return assignment.driverSource;
  }

  if (assignment?.brtaDriverId) {
    return 'BRTA_ONLY';
  }

  return 'STVES_ACCOUNT';
};

const extractAssignmentsFromResponse = (response) => {
  const payload = response?.data || response || {};

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.assignments)) {
    return payload.assignments;
  }

  if (Array.isArray(payload.data?.assignments)) {
    return payload.data.assignments;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
};

const getCreateAssignmentFunction = () => {
  if (typeof api.createAssignment === 'function') {
    return api.createAssignment;
  }

  if (typeof api.assignDriver === 'function') {
    return api.assignDriver;
  }

  if (typeof api.assignDriverToVehicle === 'function') {
    return api.assignDriverToVehicle;
  }

  return null;
};

const getRemoveAssignmentFunction = () => {
  if (typeof api.removeAssignment === 'function') {
    return api.removeAssignment;
  }

  if (typeof api.deleteAssignment === 'function') {
    return api.deleteAssignment;
  }

  return null;
};

export default function AssignDriversPage({ onNavigate = () => { } }) {
  const currentUser = useStore((state) => state.currentUser);
  const vehicles = useStore((state) => state.vehicles);
  const users = useStore((state) => state.users);
  const licenses = useStore((state) => state.licenses);
  const assignments = useStore((state) => state.assignments);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);
  const addLog = useStore((state) => state.addLog);
  const isLoading = useStore((state) => state.isLoading);
  const apiError = useStore((state) => state.apiError);

  const [form, setForm] = useState(initialForm);
  const [searchQ, setSearchQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [driverSearchResult, setDriverSearchResult] = useState(null);
  const [driverSearchLoading, setDriverSearchLoading] = useState(false);
  const [driverSearchError, setDriverSearchError] = useState('');
  const [localAssignments, setLocalAssignments] = useState([]);

  const vehicleList = Array.isArray(vehicles) ? vehicles : [];
  const userList = Array.isArray(users) ? users : [];
  const licenseList = Array.isArray(licenses) ? licenses : [];
  const storeAssignmentList = Array.isArray(assignments) ? assignments : [];
  const assignmentList = localAssignments.length > 0 ? localAssignments : storeAssignmentList;

  const ownerVehicles = useMemo(() => {
    return vehicleList;
  }, [vehicleList]);

  const ownerVehicleIds = ownerVehicles.map((vehicle) => getId(vehicle)).filter(Boolean);
  const ownerVehiclePlates = ownerVehicles.map((vehicle) => getVehiclePlate(vehicle)).filter(Boolean);

  const ownerAssignments = useMemo(() => {
    return assignmentList.filter((assignment) => {
      const assignmentVehicleId = getAssignmentVehicleId(assignment);
      const assignmentPlate = getAssignmentVehiclePlate(assignment);

      return (
        getAssignmentStatus(assignment) !== 'removed' &&
        (
          ownerVehicleIds.includes(assignmentVehicleId) ||
          ownerVehiclePlates.includes(assignmentPlate)
        )
      );
    });
  }, [assignmentList, ownerVehicleIds, ownerVehiclePlates]);

  const driverUsers = useMemo(() => {
    const roleDrivers = userList.filter((user) => user.role === 'driver');

    const licenseDrivers = licenseList
      .map((license) => {
        if (typeof license.driver === 'object' && license.driver) {
          return license.driver;
        }

        return null;
      })
      .filter(Boolean);

    const driverMap = new Map();

    [...roleDrivers, ...licenseDrivers].forEach((driver) => {
      const driverId = getId(driver);

      if (driverId && !driverMap.has(driverId)) {
        driverMap.set(driverId, driver);
      }
    });

    return Array.from(driverMap.values());
  }, [userList, licenseList]);

  const getDriverLicense = (driverId) => {
    return licenseList.find((license) => {
      const licenseDriverId = getId(license.driver) || license.driverId || license.userId;
      return String(licenseDriverId) === String(driverId);
    });
  };

  const getVehicleAssignments = (vehicleOrId) => {
    const vehicle =
      typeof vehicleOrId === 'object'
        ? vehicleOrId
        : ownerVehicles.find((item) => {
          return (
            String(getId(item)) === String(vehicleOrId) ||
            String(getVehiclePlate(item)) === String(vehicleOrId)
          );
        });

    const vehicleId = getId(vehicle);
    const vehiclePlate = getVehiclePlate(vehicle);

    return ownerAssignments.filter((assignment) => {
      return (
        String(getAssignmentVehicleId(assignment)) === String(vehicleId) ||
        String(getAssignmentVehiclePlate(assignment)) === String(vehiclePlate)
      );
    });
  };

  const getAssignedDriversForVehicle = (vehicleId) => {
    const vehicleAssignments = getVehicleAssignments(vehicleId);

    return vehicleAssignments.map((assignment) => {
      const driverId = getAssignmentDriverId(assignment);

      const driver =
        typeof assignment.driver === 'object' && assignment.driver
          ? assignment.driver
          : driverUsers.find((item) => String(getId(item)) === String(driverId));

      return {
        assignment,
        driver: driver || null,
      };
    });
  };

  const filteredVehicles = useMemo(() => {
    let nextList = ownerVehicles;

    if (filter === 'assigned') {
      nextList = nextList.filter((vehicle) => getVehicleAssignments(getId(vehicle)).length > 0);
    }

    if (filter === 'unassigned') {
      nextList = nextList.filter((vehicle) => getVehicleAssignments(getId(vehicle)).length === 0);
    }

    const query = searchQ.trim().toLowerCase();

    if (!query) {
      return nextList;
    }

    return nextList.filter((vehicle) => {
      const vehicleId = getId(vehicle);
      const assignedDrivers = getAssignedDriversForVehicle(vehicleId);

      return (
        getVehiclePlate(vehicle).toLowerCase().includes(query) ||
        getVehicleTitle(vehicle).toLowerCase().includes(query) ||
        String(vehicle.vehicleType || '').toLowerCase().includes(query) ||
        assignedDrivers.some((item) => {
          const driver = item.driver;
          const assignment = item.assignment;

          return (
            getAssignmentDriverLabel(assignment, driver).toLowerCase().includes(query) ||
            getAssignmentContactText(assignment, driver).toLowerCase().includes(query) ||
            String(assignment?.licenseNumber || '').toLowerCase().includes(query) ||
            String(assignment?.brtaDriverId || '').toLowerCase().includes(query) ||
            String(assignment?.status || '').toLowerCase().includes(query)
          );
        })
      );
    });
  }, [ownerVehicles, filter, searchQ, ownerAssignments, driverUsers]);

  const hasOwnerVehicles = ownerVehicles.length > 0;
  const hasActiveSearchOrFilter = Boolean(searchQ.trim()) || filter !== 'all';

  const emptyStateTitle = hasOwnerVehicles
    ? 'No vehicles match your search'
    : 'No vehicles available for assignment';

  const emptyStateDescription = hasOwnerVehicles
    ? 'Try changing the search keyword or selected assignment filter.'
    : 'Register a vehicle first before assigning drivers.';

  const canCreateAssignment =
    hasOwnerVehicles &&
    form.vehicleId &&
    driverSearchResult?.driver &&
    (
      (driverSearchResult.matchType === 'STVES_ACCOUNT' &&
        driverSearchResult.canRequestAssignment) ||
      (driverSearchResult.matchType === 'BRTA_ONLY' &&
        driverSearchResult.canInvite)
    ) &&
    !submitting;

  const approvedAssignments = ownerAssignments.filter(
    (assignment) => getAssignmentStatus(assignment) === 'active'
  );

  const pendingAssignments = ownerAssignments.filter(
    (assignment) => getAssignmentStatus(assignment) === 'pending_driver_approval'
  );

  const invitationAssignments = ownerAssignments.filter(
    (assignment) => getAssignmentStatus(assignment) === 'invitation_pending'
  );

  const summaryCards = [
    {
      label: 'Owner Vehicles',
      value: ownerVehicles.length,
      icon: Car,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Active Assignments',
      value: approvedAssignments.length,
      icon: UserPlus,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Pending Requests',
      value: pendingAssignments.length,
      icon: Users,
      color: 'bg-yellow-50 text-yellow-700',
    },
    {
      label: 'Invitations',
      value: invitationAssignments.length,
      icon: AlertTriangle,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const loadOwnerAssignments = async () => {
    if (typeof api.getMyAssignments !== 'function') {
      return;
    }

    try {
      const response = await api.getMyAssignments();
      setLocalAssignments(extractAssignmentsFromResponse(response));
    } catch (err) {
      console.error('Failed to load owner assignments:', err);
    }
  };

  useEffect(() => {
    loadOwnerAssignments();
  }, []);

  const handleRefresh = async () => {
    if (typeof fetchDashboardData === 'function') {
      await fetchDashboardData();
    }

    await loadOwnerAssignments();
  };

  const handleSearchDriver = async () => {
    const query = driverSearchQuery.trim();

    if (!query) {
      setDriverSearchError('Enter driver license number, phone, NID, or email.');
      setDriverSearchResult(null);
      return;
    }

    if (typeof api.searchAssignmentDriver !== 'function') {
      setDriverSearchError('api.searchAssignmentDriver() function not found in api.js.');
      setDriverSearchResult(null);
      return;
    }

    try {
      setDriverSearchLoading(true);
      setDriverSearchError('');
      setDriverSearchResult(null);
      setLocalError('');
      setSuccess('');

      const response = await api.searchAssignmentDriver(query);
      const result = response?.data || response;

      if (!result?.driver) {
        setDriverSearchError(result?.message || 'No valid driver found.');
        return;
      }

      setDriverSearchResult(result);
    } catch (err) {
      console.error('Driver search failed:', err);
      setDriverSearchResult(null);
      setDriverSearchError(err.message || 'No valid driver found.');
    } finally {
      setDriverSearchLoading(false);
    }
  };

  const validateForm = () => {
    if (!hasOwnerVehicles) {
      return 'Please register a vehicle before assigning a driver.';
    }

    if (!form.vehicleId) {
      return 'Please select a vehicle.';
    }

    if (!driverSearchResult?.driver) {
      return 'Please search and select a verified driver first.';
    }

    if (
      driverSearchResult.matchType === 'STVES_ACCOUNT' &&
      !driverSearchResult.canRequestAssignment
    ) {
      return 'This driver is not eligible for assignment request.';
    }

    if (
      driverSearchResult.matchType === 'BRTA_ONLY' &&
      !driverSearchResult.canInvite
    ) {
      return 'This BRTA driver is not eligible for invitation.';
    }

    const foundDriver = driverSearchResult.driver;

    const alreadyExists = ownerAssignments.some((assignment) => {
      const sameVehicle =
        String(getAssignmentVehicleId(assignment)) === String(form.vehicleId) ||
        String(getAssignmentVehiclePlate(assignment)) === String(form.vehicleId);

      const sameDriver =
        String(getAssignmentDriverId(assignment)) === String(foundDriver.id) ||
        String(assignment.licenseNumber || '') === String(foundDriver.licenseNumber || '') ||
        String(assignment.brtaDriverId || '') === String(foundDriver.brtaDriverId || '');

      return sameVehicle && sameDriver;
    });

    if (alreadyExists) {
      return 'An assignment request or invitation already exists for this driver and vehicle.';
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

    const createAssignment = getCreateAssignmentFunction();

    if (!createAssignment) {
      setLocalError('api.createAssignment() or api.assignDriver() function not found in api.js.');
      return;
    }

    try {
      setSubmitting(true);

      const selectedVehicle = ownerVehicles.find((vehicle) => {
        return (
          String(getVehicleSelectValue(vehicle)) === String(form.vehicleId) ||
          String(getId(vehicle)) === String(form.vehicleId)
        );
      });

      if (!selectedVehicle) {
        setLocalError('Selected vehicle was not found in your owner vehicle list.');
        return;
      }

      const foundDriver = driverSearchResult.driver;

      if (driverSearchResult.matchType === 'STVES_ACCOUNT') {
        const payload = {
          registrationNumber: getVehiclePlate(selectedVehicle),
          driver: foundDriver.id,
          driverId: foundDriver.id,
          licenseNumber: foundDriver.licenseNumber,
          startDate: form.startDate || undefined,
          note: form.note.trim(),
          notes: form.note.trim(),
          requestNote: form.note.trim(),
        };

        await createAssignment(payload);

        setSuccess('Assignment request sent to driver for approval.');
      } else if (driverSearchResult.matchType === 'BRTA_ONLY') {
        if (typeof api.createAssignmentInvitation !== 'function') {
          setLocalError('api.createAssignmentInvitation() function not found in api.js.');
          return;
        }

        const payload = {
          registrationNumber: getVehiclePlate(selectedVehicle),
          brtaDriverId: foundDriver.brtaDriverId,
          licenseNumber: foundDriver.licenseNumber,
          startDate: form.startDate || undefined,
          note: form.note.trim(),
          notes: form.note.trim(),
          requestNote: form.note.trim(),
        };

        await api.createAssignmentInvitation(payload);

        setSuccess('STVES invitation created for BRTA-only driver.');
      } else {
        setLocalError('No valid driver found for assignment.');
        return;
      }

      if (typeof fetchDashboardData === 'function') {
        await fetchDashboardData();
      }

      await loadOwnerAssignments();

      if (typeof addLog === 'function' && currentUser) {
        addLog({
          userId: currentUser.id || currentUser._id,
          userName: currentUser.name || 'Vehicle Owner',
          action: 'Driver Assignment Request',
          details: `Assignment request created for ${getVehiclePlate(selectedVehicle)}.`,
          type: 'vehicle',
        });
      }

      setForm(initialForm);
      setDriverSearchQuery('');
      setDriverSearchResult(null);
      setDriverSearchError('');
    } catch (err) {
      console.error('Driver assignment request failed:', err);
      setLocalError(err.message || 'Driver assignment request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignment) => {
    const assignmentId = getAssignmentId(assignment);

    if (!assignmentId) {
      setLocalError('Unable to find assignment ID.');
      return;
    }

    const removeAssignment = getRemoveAssignmentFunction();

    if (!removeAssignment) {
      setLocalError('api.removeAssignment() function not found in api.js.');
      return;
    }

    try {
      setLocalError('');
      setSuccess('');
      setRemovingId(assignmentId);

      await removeAssignment(assignmentId);

      if (typeof fetchDashboardData === 'function') {
        await fetchDashboardData();
      }

      await loadOwnerAssignments();

      if (typeof addLog === 'function' && currentUser) {
        addLog({
          userId: currentUser.id || currentUser._id,
          userName: currentUser.name || 'Vehicle Owner',
          action: 'Driver Assignment Removed',
          details: `Assignment ${assignmentId} removed by owner.`,
          type: 'vehicle',
        });
      }

      setSuccess('Driver assignment removed successfully.');
    } catch (err) {
      console.error('Remove assignment failed:', err);
      setLocalError(err.message || 'Failed to remove driver assignment.');
    } finally {
      setRemovingId('');
    }
  };

  return (
    <div className="assign-drivers-wrapper animate-fade-in space-y-6">
      <header className="assign-drivers-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="assign-drivers-header-content flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus size={26} />
              Assign Drivers
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              Assign authorized drivers to your registered vehicles and manage active assignments.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="assign-drivers-refresh-button bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {(apiError || localError) && (
        <div className="assign-drivers-alert bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <XCircle size={18} className="shrink-0 mt-0.5" />
          <span>{localError || apiError}</span>
        </div>
      )}

      {success && (
        <div className="assign-drivers-alert bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <section className="assign-drivers-summary-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="assign-drivers-summary-card bg-white rounded-xl px-5 py-4 border border-gray-100 shadow-sm hover:shadow-md"
            >
              <div
                className={`assign-drivers-summary-icon w-9 h-9 rounded-xl ${card.color} flex items-center justify-center`}
              >
                <Icon size={18} />
              </div>

              <p className="assign-drivers-summary-value text-2xl font-bold text-gray-900">
                {card.value}
              </p>

              <p className="assign-drivers-summary-label text-xs text-gray-500">
                {card.label}
              </p>
            </article>
          );
        })}
      </section>

      {hasOwnerVehicles ? (
        <section className="assign-drivers-form-card bg-white rounded-2xl border border-gray-100 p-6">
          <div className="assign-drivers-form-head flex items-center gap-2 mb-5">
            <UserPlus size={18} className="text-gray-500" />

            <div>
              <h2 className="font-semibold text-gray-800">Create New Assignment</h2>

              <p className="text-xs text-gray-400 mt-0.5">
                Select a vehicle, search a verified driver, then send an approval request.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="assign-drivers-form space-y-4">
            <div className="assign-drivers-form-grid grid lg:grid-cols-2 gap-4">
              <FormSelect
                label="Select Vehicle *"
                value={form.vehicleId}
                onChange={(value) => setField('vehicleId', value)}
                placeholder="Choose vehicle"
                options={ownerVehicles.map((vehicle) => ({
                  value: getVehicleSelectValue(vehicle),
                  label: `${getVehiclePlate(vehicle)} — ${getVehicleTitle(vehicle)}`,
                }))}
              />

              <div className="assign-drivers-form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Search Driver *
                </label>

                <div className="assign-drivers-driver-search-row flex gap-2">
                  <input
                    type="text"
                    value={driverSearchQuery}
                    onChange={(event) => setDriverSearchQuery(event.target.value)}
                    placeholder="License number, phone, NID, or email"
                    className="assign-drivers-input flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                  />

                  <button
                    type="button"
                    onClick={handleSearchDriver}
                    disabled={driverSearchLoading}
                    className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60 flex items-center gap-2"
                  >
                    {driverSearchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Search
                  </button>
                </div>

                {driverSearchError && (
                  <p className="mt-2 text-xs text-red-600">
                    {driverSearchError}
                  </p>
                )}
              </div>

              <FormInput
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={(value) => setField('startDate', value)}
              />

              <FormInput
                label="Note"
                value={form.note}
                onChange={(value) => setField('note', value)}
                placeholder="Example: Assigned for daily office route"
              />
            </div>

            {driverSearchResult?.driver && (
              <div className="assign-drivers-driver-result rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">
                      {driverSearchResult.driver.name}
                    </h3>

                    <p className="mt-1 text-xs text-gray-600">
                      License: {driverSearchResult.driver.licenseNumber || 'N/A'}
                    </p>

                    <p className="mt-1 text-xs text-gray-600">
                      Status: {formatLabel(driverSearchResult.driver.licenseStatus || 'unknown')}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Phone: {driverSearchResult.driver.phoneMasked || 'Hidden'}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                      driverSearchResult.matchType === 'STVES_ACCOUNT'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {driverSearchResult.matchType === 'STVES_ACCOUNT'
                      ? 'STVES Account'
                      : 'BRTA Only'}
                  </span>
                </div>

                <p className="mt-3 text-xs text-gray-600">
                  {driverSearchResult.message}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canCreateAssignment}
              className="assign-drivers-submit-button w-full rounded-xl bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] px-5 py-3 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {submitting
                ? 'Processing...'
                : driverSearchResult?.matchType === 'BRTA_ONLY'
                  ? 'Send STVES Invitation'
                  : 'Send Assignment Request'}
            </button>
          </form>
        </section>
      ) : (
        <section className="assign-drivers-form-card bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0f4c81]">
            <Car size={24} />
          </div>

          <h2 className="mt-4 text-base font-bold text-gray-800">
            Register a vehicle first
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
            Driver assignment is only available after you register at least one vehicle under your ownership.
          </p>

          <button
            type="button"
            onClick={() => onNavigate('my-vehicles')}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f4c81] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98]"
          >
            <Plus size={16} />
            Register Vehicle
          </button>
        </section>
      )}

      {hasOwnerVehicles && (
        <section className="assign-drivers-filter-card bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="assign-drivers-filter-row flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="assign-drivers-search-wrap relative flex-1">
              <Search
                size={18}
                className="assign-drivers-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={searchQ}
                onChange={(event) => setSearchQ(event.target.value)}
                placeholder="Search by vehicle, driver, email, phone, or vehicle type..."
                className="assign-drivers-search-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
              />
            </div>

            <div className="assign-drivers-filter-buttons flex items-center gap-2 flex-wrap">
              <Filter size={16} className="text-gray-400" />

              {filterOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`assign-drivers-filter-button px-3 py-1.5 rounded-lg text-xs font-medium ${filter === item
                    ? 'bg-[#0f4c81] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {formatLabel(item)}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasOwnerVehicles && (
        <section className="assign-drivers-vehicle-grid grid lg:grid-cols-2 gap-5 items-start">
          {filteredVehicles.length === 0 ? (
            <div className="assign-drivers-empty-state lg:col-span-2 bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
              <Car size={46} className="mx-auto mb-3 opacity-30" />

              <h3 className="text-sm font-semibold text-gray-700">
                {emptyStateTitle}
              </h3>

              <p className="text-xs mt-1">
                {emptyStateDescription}
              </p>

              {hasOwnerVehicles && hasActiveSearchOrFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQ('');
                    setFilter('all');
                  }}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:scale-[0.98]"
                >
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            filteredVehicles.map((vehicle) => {
              const vehicleId = getId(vehicle);
              const vehicleSelectValue = getVehicleSelectValue(vehicle);
              const assignedDrivers = getAssignedDriversForVehicle(vehicle);

              return (
                <article
                  key={vehicleId || getVehiclePlate(vehicle)}
                  className="assign-drivers-vehicle-card bg-white rounded-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="assign-drivers-vehicle-top p-5">
                    <div className="assign-drivers-vehicle-head flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-800">
                          {getVehiclePlate(vehicle)}
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                          {getVehicleTitle(vehicle)}
                          {vehicle.year ? ` (${vehicle.year})` : ''}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          {vehicle.vehicleType || 'Vehicle'} • {vehicle.color || 'Unknown color'}
                        </p>
                      </div>

                      <div className="assign-drivers-count-badge bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {assignedDrivers.length} Assignment(s)
                      </div>
                    </div>

                    <div className="assign-drivers-actions-row mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({
                            ...current,
                            vehicleId: vehicleSelectValue,
                          }));
                          setSelectedVehicleId(vehicleSelectValue);
                        }}
                        className="assign-drivers-action-button flex-1 rounded-xl bg-[#0f4c81] px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <UserPlus size={16} />
                        Assign
                      </button>
                    </div>
                  </div>

                  {assignedDrivers.length > 0 && (
                    <div className="assign-drivers-list-box border-t border-gray-100 bg-gray-50 p-5">
                      {assignedDrivers.length === 0 ? (
                        <div className="assign-drivers-no-driver rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-400">
                          <Users size={34} className="mx-auto mb-2 opacity-30" />

                          <p className="text-sm font-medium">No driver assigned</p>

                          <p className="text-xs mt-1">
                            Use the assignment form to add a driver.
                          </p>
                        </div>
                      ) : (
                        <div className="assign-drivers-driver-list space-y-3">
                          {assignedDrivers.map(({ assignment, driver }) => {
                            const assignmentId = getAssignmentId(assignment);
                            const license = driver ? getDriverLicense(getId(driver)) : null;
                            const isRemoving = removingId === assignmentId;
                            const assignmentStatus = getAssignmentStatus(assignment);
                            const assignmentNote = getAssignmentNote(assignment);
                            const driverLabel = getAssignmentDriverLabel(assignment, driver);
                            const avatarUrl = getDriverAvatarUrl(driver);
                            const rowKey =
                              assignmentId ||
                              assignment?.licenseNumber ||
                              assignment?.brtaDriverId ||
                              getId(driver);

                            return (
                              <div
                                key={rowKey}
                                className="assign-drivers-driver-card rounded-xl bg-white border border-gray-100 p-4"
                              >
                                <div className="assign-drivers-driver-row flex items-start justify-between gap-4">
                                  <div className="assign-drivers-driver-left flex items-start gap-3 min-w-0">
                                    <div
                                      className={`assign-drivers-driver-avatar w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden font-bold text-sm ${
                                        assignmentStatus === 'active'
                                          ? 'bg-green-50 text-green-600'
                                          : assignmentStatus === 'pending_driver_approval'
                                            ? 'bg-yellow-50 text-yellow-700'
                                            : assignmentStatus === 'invitation_pending'
                                              ? 'bg-orange-50 text-orange-700'
                                              : 'bg-gray-50 text-gray-600'
                                      }`}
                                    >
                                      {avatarUrl ? (
                                        <img
                                          src={avatarUrl}
                                          alt={driverLabel}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span>{getAvatarInitials(driverLabel)}</span>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-gray-800">
                                          {driverLabel}
                                        </p>

                                        <span
                                          className={`assign-drivers-status-badge px-2 py-0.5 rounded-full text-[10px] font-semibold ${getAssignmentStatusClass(
                                            assignmentStatus
                                          )}`}
                                        >
                                          {formatLabel(assignmentStatus)}
                                        </span>
                                      </div>

                                      <p className="text-xs text-gray-500 mt-1">
                                        {getAssignmentContactText(assignment, driver)}
                                      </p>

                                      <div className="assign-drivers-driver-meta flex flex-wrap gap-2 mt-2">
                                        <SmallMeta
                                          icon={IdCard}
                                          text={getAssignmentLicenseText(assignment, license)}
                                        />

                                        <SmallMeta
                                          icon={CalendarDays}
                                          text={`Since ${formatDate(
                                            assignment.startDate || assignment.createdAt
                                          )}`}
                                        />
                                      </div>

                                      {assignmentStatus === 'pending_driver_approval' && (
                                        <p className="mt-2 text-xs text-yellow-700">
                                          Waiting for driver approval.
                                        </p>
                                      )}

                                      {assignmentStatus === 'invitation_pending' && (
                                        <p className="mt-2 text-xs text-orange-700">
                                          STVES invitation pending for BRTA-only driver.
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedAssignmentDetails({
                                          assignment,
                                          driver,
                                          license,
                                        })
                                      }
                                      className="assign-drivers-details-button rounded-lg bg-blue-50 text-[#0f4c81] px-3 py-2 text-xs font-semibold hover:bg-blue-100 active:scale-[0.98] flex items-center justify-center gap-1"
                                    >
                                      <Eye size={14} />
                                      View Details
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAssignment(assignment)}
                                      disabled={isRemoving}
                                      className="assign-drivers-remove-button rounded-lg bg-red-50 text-red-600 px-3 py-2 text-xs font-semibold hover:bg-red-100 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-1"
                                    >
                                      {isRemoving ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <Trash2 size={14} />
                                      )}
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                {assignmentNote && (
                                  <p className="assign-drivers-note mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                                    {assignmentNote}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      )}

      {selectedAssignmentDetails && (
        <AssignmentDetailsModal
          assignment={selectedAssignmentDetails.assignment}
          driver={selectedAssignmentDetails.driver}
          license={selectedAssignmentDetails.license}
          onClose={() => setSelectedAssignmentDetails(null)}
        />
      )}

      {hasOwnerVehicles && (
        <p className="assign-drivers-footer-count text-xs text-gray-400">
          Showing {filteredVehicles.length} of {ownerVehicles.length} vehicles.
        </p>
      )}
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="assign-drivers-form-group">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="assign-drivers-input w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, placeholder, options }) {
  return (
    <div className="assign-drivers-form-group">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="assign-drivers-input w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SmallMeta({ icon: Icon, text }) {
  return (
    <span className="assign-drivers-small-meta inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
      <Icon size={11} />
      {text}
    </span>
  );
}

function AssignmentDetailsModal({ assignment, driver, license, onClose }) {
  const assignmentStatus = getAssignmentStatus(assignment);
  const driverLabel = getAssignmentDriverLabel(assignment, driver);
  const avatarUrl = getDriverAvatarUrl(driver);
  const assignmentNote = getAssignmentNote(assignment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <section className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] px-6 py-5 text-white">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white/15 flex items-center justify-center text-lg font-bold">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={driverLabel}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{getAvatarInitials(driverLabel)}</span>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold">{driverLabel}</h2>

              <p className="mt-1 text-sm text-blue-100">
                {getAssignmentLicenseText(assignment, license)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getAssignmentStatusClass(
                assignmentStatus
              )}`}
            >
              {formatLabel(assignmentStatus)}
            </span>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {formatLabel(getAssignmentSource(assignment))}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AssignmentDetailItem label="Driver Name" value={driverLabel} />
            <AssignmentDetailItem label="Email" value={getAssignmentEmail(assignment, driver)} />
            <AssignmentDetailItem label="Phone" value={getAssignmentPhone(assignment, driver)} />
            <AssignmentDetailItem label="License Number" value={getAssignmentLicenseText(assignment, license)} />
            <AssignmentDetailItem label="NID" value={maskSensitiveValue(driver?.nid)} />
            <AssignmentDetailItem label="Assignment Status" value={formatLabel(assignmentStatus)} />
            <AssignmentDetailItem label="Driver Source" value={formatLabel(getAssignmentSource(assignment))} />
            <AssignmentDetailItem label="BRTA Driver ID" value={assignment?.brtaDriverId || 'N/A'} />
            <AssignmentDetailItem label="Vehicle" value={assignment?.registrationNumber || getAssignmentVehiclePlate(assignment)} />
            <AssignmentDetailItem label="Start Date" value={formatDate(assignment.startDate || assignment.createdAt)} />
            <AssignmentDetailItem label="Approved At" value={formatDate(assignment.approvedByDriverAt)} />
          </div>

          {assignmentNote && (
            <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Note
              </p>

              <p className="mt-1 text-sm text-gray-700">
                {assignmentNote}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#0f4c81] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b3f6c]"
            >
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function AssignmentDetailItem({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-gray-700">
        {value || 'N/A'}
      </p>
    </div>
  );
}
