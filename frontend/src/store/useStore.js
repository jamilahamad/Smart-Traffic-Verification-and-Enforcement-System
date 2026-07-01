import { create } from 'zustand';

import api, { tokenStorage } from '../lib/api';
import {
  seedUsers,
  seedLicenses,
  seedVehicles,
  seedViolations,
  seedActivityLogs,
  generateId,
  VIOLATION_TYPES,
} from './database';
import { parseSTVESQR, QR_TYPES } from '../utils/qr';

const normalizeId = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item._id || item.id || item.value || '';
};

const isObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const toDateOnly = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const normalizeArray = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.payload?.[key])) return data.payload[key];
  if (Array.isArray(data?.result?.[key])) return data.result[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (key === 'activityLogs' && Array.isArray(data?.activities)) return data.activities;
  if (key === 'activityLogs' && Array.isArray(data?.logs)) return data.logs;
  return [];
};

const normalizeStats = (data = {}) => {
  return data.stats || data.analytics || data;
};

const normalizeVehicleTypeForBackend = (type = 'car') => {
  const normalized = String(type).toLowerCase();

  if (['sedan', 'suv', 'car'].includes(normalized)) return 'car';
  if (['bus'].includes(normalized)) return 'bus';
  if (['truck', 'pickup'].includes(normalized)) return 'truck';
  if (['motorcycle', 'bike'].includes(normalized)) return 'motorcycle';
  if (['cng'].includes(normalized)) return 'cng';
  if (['microbus', 'van'].includes(normalized)) return 'microbus';

  return 'other';
};

const getNestedDate = (...values) => {
  const found = values.find((value) => value !== undefined && value !== null && value !== '');
  return toDateOnly(found);
};

const getDocumentPart = (documents = {}, ...keys) => {
  for (const key of keys) {
    if (documents?.[key] && typeof documents[key] === 'object') {
      return documents[key];
    }
  }

  return {};
};

const normalizeDriverList = (vehicle = {}) => {
  const source = Array.isArray(vehicle.assignedDrivers)
    ? vehicle.assignedDrivers
    : Array.isArray(vehicle.authorizedDrivers)
      ? vehicle.authorizedDrivers
      : Array.isArray(vehicle.drivers)
        ? vehicle.drivers
        : [];

  return source
    .map((driver) => {
      if (!driver) return null;

      if (typeof driver === 'string') {
        return driver;
      }

      return {
        ...driver,
        id: normalizeId(driver),
        _id: normalizeId(driver),
      };
    })
    .filter(Boolean);
};

const mapUser = (user = {}) => {
  const id = normalizeId(user);

  return {
    ...user,
    id,
    _id: id,
    name: user.name || user.fullName || 'Unknown User',
    email: user.email || '',
    role: user.role || 'driver',
    status: user.status || 'active',
  };
};

const mapVehicle = (vehicle = {}) => {
  const id =
    normalizeId(vehicle) ||
    vehicle.registrationNumber ||
    vehicle.plateNumber ||
    vehicle.plate ||
    '';

  const owner = vehicle.owner || vehicle.brtaOwner || null;
  const ownerIsObject = isObject(owner);

  const registrationNumber =
    vehicle.registrationNumber || vehicle.plateNumber || vehicle.plate || '';

  const documents = vehicle.documents || {};

  const registrationCertificate = getDocumentPart(
    documents,
    'registrationCertificate',
    'registration'
  );

  const fitnessCertificate = getDocumentPart(
    documents,
    'fitnessCertificate',
    'fitness'
  );

  const taxToken = getDocumentPart(documents, 'taxToken', 'tax');
  const routePermit = getDocumentPart(documents, 'routePermit', 'route');
  const insurance = getDocumentPart(documents, 'insurance', 'insuranceCertificate');

  const assignedDrivers = normalizeDriverList(vehicle);

  return {
    ...vehicle,
    id,
    _id: id,
    registrationNumber,
    plateNumber: registrationNumber,

    ownerId: ownerIsObject
      ? normalizeId(owner)
      : owner || vehicle.ownerId || '',

    ownerName: ownerIsObject
      ? owner.name || owner.ownerName || owner.fullName || ''
      : vehicle.ownerName || '',

    vehicleType: vehicle.vehicleType || vehicle.type || 'car',
    brand: vehicle.brand || vehicle.make || '',
    model: vehicle.model || '',
    year: vehicle.year || '',
    color: vehicle.color || '',
    status: vehicle.status || 'active',

    registrationDate: toDateOnly(vehicle.registrationDate),

    registrationExpiry: getNestedDate(
      vehicle.registrationExpiry,
      documents.registrationExpiry,
      registrationCertificate.expiryDate
    ),

    fitnessExpiry: getNestedDate(
      vehicle.fitnessExpiry,
      documents.fitnessExpiry,
      fitnessCertificate.expiryDate
    ),

    taxTokenExpiry: getNestedDate(
      vehicle.taxTokenExpiry,
      documents.taxTokenExpiry,
      taxToken.expiryDate
    ),

    routePermitExpiry: getNestedDate(
      vehicle.routePermitExpiry,
      documents.routePermitExpiry,
      routePermit.expiryDate
    ),

    insuranceExpiry: getNestedDate(
      vehicle.insuranceExpiry,
      documents.insuranceExpiry,
      insurance.expiryDate
    ),

    assignedDrivers,

    authorizedDrivers: Array.isArray(vehicle.authorizedDrivers)
      ? vehicle.authorizedDrivers
      : assignedDrivers,

    assignedDriverCount: vehicle.assignedDriverCount ?? assignedDrivers.length,

    qrCode: vehicle.qrCode || (registrationNumber ? `STVES-VEH:${registrationNumber}` : ''),

    safetyScore: vehicle.safetyScore ?? vehicle.verification?.safetyScore ?? 100,

    complianceScore:
      vehicle.complianceScore ?? vehicle.verification?.complianceScore ?? 100,

    riskLevel: vehicle.riskLevel || vehicle.verification?.riskLevel || 'Low Risk',

    issues: vehicle.issues || vehicle.verification?.issues || [],
  };
};

const mapLicense = (license = {}) => {
  const id = normalizeId(license) || license.licenseNumber || '';
  const driver = license.driver || license.user || null;

  return {
    ...license,
    id,
    _id: id,
    licenseNumber: license.licenseNumber || license.number || '',
    driverId:
      typeof driver === 'object'
        ? normalizeId(driver)
        : driver || license.driverId || '',
    driverName:
      license.holderName ||
      license.driverName ||
      license.name ||
      (typeof driver === 'object' ? driver.name : '') ||
      '',
    category: license.licenseClass || license.category || license.licenseType || '',
    licenseClass:
      license.licenseClass || license.category || license.licenseType || '',
    issueDate: toDateOnly(license.issueDate),
    expiryDate: toDateOnly(license.expiryDate),
    status: license.status || 'valid',
  };
};

const mapViolation = (violation = {}) => {
  const id = normalizeId(violation);
  const vehicle = violation.vehicle;
  const driver = violation.driver;
  const officer = violation.officer;
  const license = violation.license;

  const vehicleIsObject = isObject(vehicle);
  const driverIsObject = isObject(driver);
  const officerIsObject = isObject(officer);
  const licenseIsObject = isObject(license);

  const registrationNumber =
    violation.registrationNumber ||
    violation.plateNumber ||
    (vehicleIsObject ? vehicle.registrationNumber || vehicle.plateNumber : '') ||
    '';

  const paymentStatus =
    violation.paymentStatus || (violation.status === 'paid' ? 'paid' : 'unpaid');

  return {
    ...violation,
    id,
    _id: id,
    vehicleId: vehicleIsObject
      ? normalizeId(vehicle)
      : vehicle || violation.vehicleId || '',
    driverId: driverIsObject
      ? normalizeId(driver)
      : driver || violation.driverId || '',
    licenseId: licenseIsObject
      ? normalizeId(license)
      : license || violation.licenseId || '',
    officerId: officerIsObject
      ? normalizeId(officer)
      : officer || violation.officerId || '',
    registrationNumber,
    plateNumber: registrationNumber,
    licenseNumber:
      violation.licenseNumber ||
      (licenseIsObject ? license.licenseNumber : '') ||
      '',
    driverName: driverIsObject ? driver.name : violation.driverName || '',
    officerName: officerIsObject ? officer.name : violation.officerName || '',
    violationType: violation.violationCode || violation.violationType || '',
    violationLabel:
      violation.violationType || violation.violationLabel || violation.violationCode || '',
    fineAmount: Number(violation.fineAmount) || 0,
    status: violation.status || 'pending',
    paymentStatus,
    createdAt: violation.createdAt || violation.issuedAt || new Date().toISOString(),
    updatedAt:
      violation.updatedAt || violation.createdAt || new Date().toISOString(),
  };
};

const mapAssignment = (assignment = {}) => {
  const id = normalizeId(assignment);
  const vehicle = assignment.vehicle;
  const driver = assignment.driver;
  const owner = assignment.owner;

  const vehicleIsObject = isObject(vehicle);
  const driverIsObject = isObject(driver);
  const ownerIsObject = isObject(owner);

  return {
    ...assignment,
    id,
    _id: id,

    vehicleId: vehicleIsObject
      ? normalizeId(vehicle)
      : vehicle || assignment.vehicleId || '',

    driverId: driverIsObject
      ? normalizeId(driver)
      : driver || assignment.driverId || '',

    ownerId: ownerIsObject
      ? normalizeId(owner)
      : owner || assignment.ownerId || '',

    driverName: driverIsObject
      ? driver.name || assignment.driverName || ''
      : assignment.driverName || '',

    vehiclePlate: vehicleIsObject
      ? vehicle.registrationNumber || vehicle.plateNumber || assignment.vehiclePlate || ''
      : assignment.vehiclePlate || assignment.registrationNumber || '',

    registrationNumber: assignment.registrationNumber ||
      (vehicleIsObject ? vehicle.registrationNumber || vehicle.plateNumber : '') ||
      '',

    licenseNumber: assignment.licenseNumber ||
      (driverIsObject ? driver.licenseNumber : '') ||
      '',

    status: assignment.status || 'active',
  };
};

const mapLog = (log = {}) => {
  const source = isObject(log) ? log : {};
  const user = source.user || source.officer || null;
  const userIsObject = isObject(user);
  const searchType = source.searchType || source.type || 'system';

  const searchValue =
    source.searchValue ||
    source.query ||
    source.registrationNumber ||
    source.licenseNumber ||
    '';

  return {
    ...source,
    id: normalizeId(log) || generateId('LOG'),
    userId: userIsObject ? normalizeId(user) : user || source.userId || '',
    userName: userIsObject
      ? user.name || user.email || 'System'
      : source.userName || source.officerName || 'System',
    action:
      source.action || (searchType ? `${searchType} verification` : 'System Activity'),
    details:
      source.details ||
      source.description ||
      (searchValue ? `Searched ${searchType}: ${searchValue}` : ''),
    type: source.logType || source.type || (source.searchType ? 'verification' : 'system'),
    result: source.result || source.verification?.result || '',
    timestamp:
      source.timestamp || source.createdAt || source.verifiedAt || new Date().toISOString(),
  };
};

const buildStatsFromState = (state) => {
  const paidCases = state.violations.filter(
    (item) => item.paymentStatus === 'paid' || item.status === 'paid'
  ).length;

  return {
    totalUsers: state.users.length,
    totalAdmins: state.users.filter((user) => user.role === 'admin').length,
    totalPolice: state.users.filter((user) => user.role === 'police').length,
    totalDrivers: state.users.filter((user) => user.role === 'driver').length,
    totalOwners: state.users.filter((user) => user.role === 'owner').length,

    totalVehicles: state.vehicles.length,
    totalLicenses: state.licenses.length,
    totalViolations: state.violations.length,

    pendingCases: state.violations.filter((item) => item.status === 'pending')
      .length,
    approvedCases: state.violations.filter((item) => item.status === 'approved')
      .length,
    dismissedCases: state.violations.filter((item) => item.status === 'dismissed')
      .length,
    paidCases,
    unpaidCases: state.violations.filter(
      (item) =>
        item.paymentStatus !== 'paid' &&
        item.status !== 'paid' &&
        item.status !== 'dismissed'
    ).length,

    activeVehicles: state.vehicles.filter((item) => item.status === 'active')
      .length,
    suspendedVehicles: state.vehicles.filter((item) => item.status === 'suspended')
      .length,
    blacklistedVehicles: state.vehicles.filter(
      (item) => item.status === 'blacklisted'
    ).length,

    validLicenses: state.licenses.filter((item) =>
      ['valid', 'active'].includes(item.status)
    ).length,
    expiredLicenses: state.licenses.filter((item) => item.status === 'expired')
      .length,

    activeAssignments: state.assignments.filter((item) => item.status === 'active')
      .length,
    totalVerificationLogs: state.verificationLogs.length,

    totalFines: state.violations.reduce(
      (sum, item) => sum + (Number(item.fineAmount) || 0),
      0
    ),
  };
};

const syncVehicleAssignments = (vehicles, assignments) => {
  const activeAssignments = assignments.filter((item) => item.status === 'active');

  return vehicles.map((vehicle) => {
    const matchedAssignedDrivers = activeAssignments
      .filter((assignment) => {
        const assignmentVehicleId =
          assignment.vehicleId ||
          assignment.vehicle?._id ||
          assignment.vehicle;

        const assignmentPlate =
          assignment.vehiclePlate ||
          assignment.registrationNumber;

        return (
          assignmentVehicleId === vehicle.id ||
          assignmentVehicleId === vehicle._id ||
          assignmentPlate === vehicle.registrationNumber ||
          assignmentPlate === vehicle.plateNumber
        );
      })
      .map((assignment) => assignment.driverId || assignment.driver?._id || assignment.driver)
      .filter(Boolean);

    const existingDrivers = Array.isArray(vehicle.assignedDrivers)
      ? vehicle.assignedDrivers
      : Array.isArray(vehicle.authorizedDrivers)
        ? vehicle.authorizedDrivers
        : [];

    const finalAssignedDrivers =
      matchedAssignedDrivers.length > 0 ? matchedAssignedDrivers : existingDrivers;

    return {
      ...vehicle,
      assignedDrivers: finalAssignedDrivers,
      assignedDriverCount:
        matchedAssignedDrivers.length > 0
          ? finalAssignedDrivers.length
          : vehicle.assignedDriverCount ?? finalAssignedDrivers.length,
    };
  });
};

const useStore = create((set, get) => ({
  currentUser: tokenStorage.getUser(),
  isAuthenticated: Boolean(tokenStorage.getToken()),
  authLoading: false,
  isLoading: false,
  apiError: '',
  stats: null,
  verificationResult: null,
  qrVerificationPayload: null,

  users: seedUsers.map(mapUser),
  licenses: seedLicenses.map(mapLicense),
  vehicles: seedVehicles.map(mapVehicle),
  violations: seedViolations.map(mapViolation),
  activityLogs: seedActivityLogs.map(mapLog),
  assignments: [],
  verificationLogs: [],

  setApiError: (message = '') => set({ apiError: message }),
  clearApiError: () => set({ apiError: '' }),

  setVerificationResult: (result) => set({ verificationResult: result }),
  clearVerificationResult: () => set({ verificationResult: null }),
  setQRVerificationPayload: (payload) => set({ qrVerificationPayload: payload }),
  clearQRVerificationPayload: () => set({ qrVerificationPayload: null }),

  setCurrentUser: (user) => {
    const mappedUser = user ? mapUser(user) : null;
    tokenStorage.setUser(mappedUser);
    set({ currentUser: mappedUser });
  },

  initAuth: async () => {
    const token = tokenStorage.getToken();

    if (!token) {
      set({
        currentUser: null,
        isAuthenticated: false,
        authLoading: false,
      });
      return;
    }

    try {
      set({ authLoading: true, apiError: '' });

      const data = await api.me();
      const user = mapUser(data.user || data);

      tokenStorage.setUser(user);

      set({
        currentUser: user,
        isAuthenticated: true,
        authLoading: false,
      });

      await get().fetchDashboardData();
    } catch (error) {
      tokenStorage.removeToken();

      set({
        currentUser: null,
        isAuthenticated: false,
        authLoading: false,
        apiError: error.message || 'Session expired. Please login again.',
      });
    }
  },

<<<<<<< HEAD
  login: async (email, password) => {
=======
    login: async (email, password) => {
>>>>>>> 7f8c0f2 (register/login bug fixing)
    try {
      set({ authLoading: true, apiError: '' });

      const data = await api.login(email, password);
<<<<<<< HEAD
=======

      if (!data?.token || !data?.user) {
        throw new Error(data?.message || 'Invalid email or password.');
      }

>>>>>>> 7f8c0f2 (register/login bug fixing)
      const user = mapUser(data.user);

      tokenStorage.setToken(data.token);
      tokenStorage.setUser(user);

      set({
        currentUser: user,
        isAuthenticated: true,
        authLoading: false,
      });

<<<<<<< HEAD
      await get().fetchDashboardData();
=======
      try {
        await get().fetchDashboardData();
      } catch {
        // Dashboard data fail korleo login fail dhora hobe na
      }
>>>>>>> 7f8c0f2 (register/login bug fixing)

      return {
        success: true,
        user,
        message: data.message || 'Login successful.',
      };
    } catch (error) {
<<<<<<< HEAD
      set({
        authLoading: false,
        apiError: error.message || 'Login failed.',
=======
      tokenStorage.removeToken();

      const message = error.message || 'Invalid email or password.';

      set({
        currentUser: null,
        isAuthenticated: false,
        authLoading: false,
        apiError: message,
>>>>>>> 7f8c0f2 (register/login bug fixing)
      });

      return {
        success: false,
<<<<<<< HEAD
        message: error.message || 'Login failed.',
=======
        message,
>>>>>>> 7f8c0f2 (register/login bug fixing)
      };
    }
  },

<<<<<<< HEAD
  register: async (payload) => {
=======
    register: async (payload) => {
>>>>>>> 7f8c0f2 (register/login bug fixing)
    try {
      set({ authLoading: true, apiError: '' });

      const data = await api.register(payload);

<<<<<<< HEAD
=======
      if (data?.success === false) {
        throw new Error(data.message || 'Registration failed.');
      }

>>>>>>> 7f8c0f2 (register/login bug fixing)
      set({ authLoading: false });

      return {
        success: true,
        message: data.message || 'Registration successful.',
      };
    } catch (error) {
<<<<<<< HEAD
      set({
        authLoading: false,
        apiError: error.message || 'Registration failed.',
=======
      const message =
        error?.message ||
        'BRTA information did not match. Please check your name, phone, and NID.';

      set({
        authLoading: false,
        apiError: message,
>>>>>>> 7f8c0f2 (register/login bug fixing)
      });

      return {
        success: false,
<<<<<<< HEAD
        message: error.message || 'Registration failed.',
=======
        message,
>>>>>>> 7f8c0f2 (register/login bug fixing)
      };
    }
  },

  logout: () => {
    tokenStorage.removeToken();

    set({
      currentUser: null,
      isAuthenticated: false,
      authLoading: false,
      apiError: '',
      stats: null,
      verificationResult: null,
    });
  },

  updateProfile: async (payload) => {
    const user = get().currentUser;

    if (!user?.id) {
      return {
        success: false,
        message: 'User is not logged in.',
      };
    }

    try {
      set({ isLoading: true, apiError: '' });

      const data = await api.updateProfile(user.id, payload);
      const updatedUser = mapUser(data.user || { ...user, ...payload });

      tokenStorage.setUser(updatedUser);

      set((state) => ({
        currentUser: updatedUser,
        users: state.users.map((item) =>
          item.id === updatedUser.id ? updatedUser : item
        ),
        isLoading: false,
      }));

      return {
        success: true,
        user: updatedUser,
        message: data.message || 'Profile updated.',
      };
    } catch (error) {
      set({
        isLoading: false,
        apiError: error.message || 'Profile update failed.',
      });

      return {
        success: false,
        message: error.message || 'Profile update failed.',
      };
    }
  },

  fetchAdminCases: async () => {
    try {
      const data = await api.getAdminCases();
      const cases = normalizeArray(data, 'cases').map(mapViolation);

      set({
        violations: cases,
        apiError: '',
      });

      return cases;
    } catch (error) {
      set({
        apiError: error.message || 'Failed to load admin cases.',
      });

      return [];
    }
  },

  fetchDashboardData: async () => {
    const user = get().currentUser;

    if (!user) return;

    try {
      set({ isLoading: true, apiError: '' });

      const tasks = [];

      if (user.role === 'admin') {
        tasks.push(
          api.getAnalyticsStats().then((data) =>
            set({
              stats: normalizeStats(data),
            })
          )
        );

        tasks.push(
          api.getUsers().then((data) =>
            set({
              users: normalizeArray(data, 'users').map(mapUser),
            })
          )
        );

        tasks.push(
          api.getVehicles().then((data) =>
            set({
              vehicles: normalizeArray(data, 'vehicles').map(mapVehicle),
            })
          )
        );

        tasks.push(
          api.getLicenses().then((data) =>
            set({
              licenses: normalizeArray(data, 'licenses').map(mapLicense),
            })
          )
        );

        tasks.push(
          api.getAdminCases().then((data) =>
            set({
              violations: normalizeArray(data, 'cases').map(mapViolation),
            })
          )
        );

        tasks.push(
          api.getAssignments().then((data) =>
            set({
              assignments: normalizeArray(data, 'assignments').map(mapAssignment),
            })
          )
        );

        tasks.push(
          api.getVerificationLogs().then((data) =>
            set({
              verificationLogs: normalizeArray(data, 'logs').map(mapLog),
            })
          )
        );

        tasks.push(
          api.getActivityLogs().then((data) =>
            set({
              activityLogs: normalizeArray(data, 'activityLogs').map(mapLog),
            })
          )
        );
      }

      if (user.role === 'police') {
        tasks.push(
          api.getVehicles().then((data) =>
            set({
              vehicles: normalizeArray(data, 'vehicles').map(mapVehicle),
            })
          )
        );

        tasks.push(
          api.getLicenses().then((data) =>
            set({
              licenses: normalizeArray(data, 'licenses').map(mapLicense),
            })
          )
        );

        tasks.push(
          api.getViolations().then((data) =>
            set({
              violations: normalizeArray(data, 'violations').map(mapViolation),
            })
          )
        );

        tasks.push(
          api
            .getAssignments()
            .then((data) =>
              set({
                assignments: normalizeArray(data, 'assignments').map(mapAssignment),
              })
            )
            .catch(() => { })
        );

        tasks.push(
          api
            .getVerificationLogs()
            .then((data) =>
              set({
                verificationLogs: normalizeArray(data, 'logs').map(mapLog),
              })
            )
            .catch(() => { })
        );

        tasks.push(
          api
            .getActivityLogs()
            .then((data) =>
              set({
                activityLogs: normalizeArray(data, 'activityLogs').map(mapLog),
              })
            )
            .catch(() => { })
        );
      }

      if (user.role === 'driver') {
        tasks.push(
          api.getDriverLicenses().then((data) =>
            set({
              licenses: normalizeArray(data, 'licenses').map(mapLicense),
            })
          )
        );

        tasks.push(
          api.getDriverViolations().then((data) =>
            set({
              violations: normalizeArray(data, 'violations').map(mapViolation),
            })
          )
        );

        tasks.push(
          api
            .getMyAssignments()
            .then((data) =>
              set({
                assignments: normalizeArray(data, 'assignments').map(mapAssignment),
              })
            )
            .catch(() => { })
        );
      }

      if (user.role === 'owner') {
        tasks.push(
          api.getMyVehicles().then((data) =>
            set({
              vehicles: normalizeArray(data, 'vehicles').map(mapVehicle),
            })
          )
        );

        tasks.push(
          api.getMyAssignments().then((data) =>
            set({
              assignments: normalizeArray(data, 'assignments').map(mapAssignment),
            })
          )
        );

        tasks.push(
          api
            .getMyViolations()
            .then((data) =>
              set({
                violations: normalizeArray(data, 'violations').map(mapViolation),
              })
            )
            .catch(() => { })
        );
      }

      await Promise.allSettled(tasks);

      const latest = get();

      set({
        vehicles: syncVehicleAssignments(latest.vehicles, latest.assignments),
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        apiError: error.message || 'Failed to load dashboard data.',
      });
    }
  },

  refreshStats: async () => {
    try {
      const data = await api.getAnalyticsStats();
      const stats = normalizeStats(data);

      set({ stats });

      return stats;
    } catch (error) {
      set({
        apiError: error.message || 'Failed to refresh analytics.',
      });

      return get().getStats();
    }
  },

  addVehicle: async (vehicleData) => {
    try {
      set({ isLoading: true, apiError: '' });

      const payload = {
        ...vehicleData,
        registrationNumber:
          vehicleData.registrationNumber || vehicleData.plateNumber,
        vehicleType: normalizeVehicleTypeForBackend(vehicleData.vehicleType),
        year: Number(vehicleData.year) || new Date().getFullYear(),
      };

      const data = await api.createVehicle(payload);
      const vehicle = mapVehicle(data.vehicle || data);

      set((state) => ({
        vehicles: [
          vehicle,
          ...state.vehicles.filter((item) => item.id !== vehicle.id),
        ],
        isLoading: false,
      }));

      await get().refreshStats();

      return {
        success: true,
        vehicle,
        message: data.message || 'Vehicle registered successfully.',
      };
    } catch (error) {
      set({
        isLoading: false,
        apiError: error.message || 'Vehicle registration failed.',
      });

      return {
        success: false,
        message: error.message || 'Vehicle registration failed.',
      };
    }
  },

  updateVehicle: async (id, payload) => {
    try {
      set({ isLoading: true, apiError: '' });

      const data = await api.updateVehicle(id, payload);
      const vehicle = mapVehicle(data.vehicle || { ...payload, id });

      set((state) => ({
        vehicles: state.vehicles.map((item) =>
          item.id === id ? { ...item, ...vehicle } : item
        ),
        isLoading: false,
      }));

      return {
        success: true,
        vehicle,
        message: data.message || 'Vehicle updated.',
      };
    } catch (error) {
      set({
        isLoading: false,
        apiError: error.message || 'Vehicle update failed.',
      });

      return {
        success: false,
        message: error.message || 'Vehicle update failed.',
      };
    }
  },

  updateVehicleStatus: async (id, status) => {
    set((state) => ({
      vehicles: state.vehicles.map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    }));

    try {
      await api.updateVehicleStatus(id, status);
      await get().fetchDashboardData();

      return { success: true };
    } catch (error) {
      set({
        apiError: error.message || 'Vehicle status update failed.',
      });

      await get().fetchDashboardData();

      return {
        success: false,
        message: error.message || 'Vehicle status update failed.',
      };
    }
  },

  activateVehicle: (id) => get().updateVehicleStatus(id, 'active'),
  suspendVehicle: (id) => get().updateVehicleStatus(id, 'suspended'),
  blacklistVehicle: (id) => get().updateVehicleStatus(id, 'blacklisted'),

  assignDriver: async (vehicleId, driverId) => {
    try {
      set({ isLoading: true, apiError: '' });

      const data = await api.createAssignment({
        vehicle: vehicleId,
        driver: driverId,
      });

      const assignment = mapAssignment(data.assignment || data);

      set((state) => {
        const assignments = [
          assignment,
          ...state.assignments.filter((item) => item.id !== assignment.id),
        ];

        return {
          assignments,
          vehicles: syncVehicleAssignments(state.vehicles, assignments),
          isLoading: false,
        };
      });

      await get().refreshStats();

      return {
        success: true,
        assignment,
        message: data.message || 'Driver assigned successfully.',
      };
    } catch (error) {
      set({
        isLoading: false,
        apiError: error.message || 'Driver assignment failed.',
      });

      return {
        success: false,
        message: error.message || 'Driver assignment failed.',
      };
    }
  },

  removeDriver: async (vehicleId, driverId, reason = '') => {
    try {
      set({ isLoading: true, apiError: '' });

      const assignment = get().assignments.find(
        (item) =>
          item.vehicleId === vehicleId &&
          item.driverId === driverId &&
          item.status === 'active'
      );

      if (assignment?.id) {
        await api.removeAssignment(assignment.id, reason);
      }

      set((state) => {
        const assignments = state.assignments.map((item) =>
          item.id === assignment?.id ? { ...item, status: 'removed' } : item
        );

        return {
          assignments,
          vehicles: syncVehicleAssignments(state.vehicles, assignments),
          isLoading: false,
        };
      });

      await get().refreshStats();

      return {
        success: true,
        message: 'Driver removed successfully.',
      };
    } catch (error) {
      set({
        isLoading: false,
        apiError: error.message || 'Driver removal failed.',
      });

      return {
        success: false,
        message: error.message || 'Driver removal failed.',
      };
    }
  },

  addLicense: (licenseData) => {
    const license = mapLicense({
      ...licenseData,
      id: generateId('LIC'),
    });

    set((state) => ({
      licenses: [license, ...state.licenses],
    }));

    return license;
  },

  updateLicense: (id, payload) => {
    set((state) => ({
      licenses: state.licenses.map((item) =>
        item.id === id ? { ...item, ...payload } : item
      ),
    }));
  },

  createViolation: async (violationData) => {
    try {
      set({ isLoading: true, apiError: '' });

      const violationType = VIOLATION_TYPES.find(
        (item) =>
          item.code === violationData.violationType ||
          item.label === violationData.violationType
      );

      const license = violationData.licenseId
        ? get().licenses.find((item) => item.id === violationData.licenseId)
        : get().licenses.find((item) => item.driverId === violationData.driverId);

      const payload = {
        vehicle: violationData.vehicleId || violationData.vehicle,
        driver: violationData.driverId || violationData.driver || undefined,
        license: violationData.licenseId || license?.id || undefined,
        registrationNumber:
          violationData.registrationNumber || violationData.plateNumber,
        licenseNumber: violationData.licenseNumber || license?.licenseNumber,
        violationType:
          violationType?.label ||
          violationData.violationLabel ||
          violationData.violationType,
        violationCode:
          violationType?.code ||
          violationData.violationCode ||
          violationData.violationType,
        description: violationData.description,
        location:
          typeof violationData.location === 'object'
            ? violationData.location
            : {
              address: violationData.location || 'Unknown location',
              city: '',
            },
        fineAmount:
          Number(violationData.fineAmount) || violationType?.fine || 0,
        evidence: violationData.evidence || [],
      };

      const data = await api.createViolation(payload);
      const violation = mapViolation(data.violation || data);

      set((state) => ({
        violations: [
          violation,
          ...state.violations.filter((item) => item.id !== violation.id),
        ],
        isLoading: false,
      }));

      await get().refreshStats();

      return violation.caseId || violation.id;
    } catch (error) {
      set({
        isLoading: false,
        apiError: error.message || 'E-Challan creation failed.',
      });

      throw error;
    }
  },

  updateViolationStatus: async (id, status, note = '') => {
    const isPayment = ['paid', 'unpaid', 'waived'].includes(status);

    set((state) => ({
      violations: state.violations.map((item) => {
        if (item.id !== id) return item;

        return isPayment
          ? {
            ...item,
            paymentStatus: status,
            status: status === 'paid' ? 'paid' : item.status,
          }
          : {
            ...item,
            status,
          };
      }),
    }));

    try {
      const data = await api.updateViolationStatus(id, status, note);
      const violation = mapViolation(data.violation || data);

      set((state) => ({
        violations: state.violations.map((item) =>
          item.id === id ? { ...item, ...violation } : item
        ),
      }));

      await get().refreshStats();

      return {
        success: true,
        violation,
      };
    } catch (error) {
      set({
        apiError: error.message || 'Violation status update failed.',
      });

      await get().fetchDashboardData();

      return {
        success: false,
        message: error.message || 'Violation status update failed.',
      };
    }
  },

  createUser: async (payload) => {
    try {
      set({ isLoading: true, apiError: '' });

      const staffPayload = {
        ...payload,
        role: 'police',
      };

      const data = await api.createUser(staffPayload);
      const user = mapUser(data.user || data);

      set((state) => ({
        users: [user, ...state.users.filter((item) => item.id !== user.id)],
        isLoading: false,
      }));

      await get().refreshStats();

      return {
        success: true,
        user,
        message: data.message || 'Staff account created successfully.',
      };
    } catch (error) {
      set({
        isLoading: false,
        apiError: error.message || 'Staff account creation failed.',
      });

      return {
        success: false,
        message: error.message || 'Staff account creation failed.',
      };
    }
  },

  updateUserStatus: async (id, status) => {
    set((state) => ({
      users: state.users.map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    }));

    try {
      const data = await api.updateUserStatus(id, status);
      const user = mapUser(data.user || { id, status });

      set((state) => ({
        users: state.users.map((item) =>
          item.id === id ? { ...item, ...user } : item
        ),
      }));

      await get().refreshStats();

      return {
        success: true,
        user,
      };
    } catch (error) {
      set({
        apiError: error.message || 'User status update failed.',
      });

      await get().fetchDashboardData();

      return {
        success: false,
        message: error.message || 'User status update failed.',
      };
    }
  },

  deleteUser: (id) => {
    set((state) => ({
      users: state.users.filter((item) => item.id !== id),
    }));
  },

  verifyVehicle: async (registrationNumber, licenseNumber = '') => {
    try {
      const data = await api.verifyVehicle(registrationNumber, licenseNumber);
      const vehicle = mapVehicle(data.vehicle || data);
      const issues = data.issues || data.verification?.issues || [];

      const result = {
        found: true,
        type: 'vehicle',
        vehicle,
        owner: data.owner || vehicle.owner || null,
        documents: data.documents || vehicle.documents || null,
        driverAuthorization: data.driverAuthorization || null,
        issues,
        isCompliant: Boolean(
          data.verification?.isCompliant ?? data.isCompliant ?? issues.length === 0
        ),
        safetyScore:
          data.safetyScore ?? data.verification?.safetyScore ?? vehicle.safetyScore,
        complianceScore:
          data.complianceScore ??
          data.verification?.complianceScore ??
          vehicle.complianceScore,
        riskLevel: data.riskLevel || data.verification?.riskLevel || vehicle.riskLevel,
        raw: data,
      };

      set((state) => ({
        vehicles: [
          vehicle,
          ...state.vehicles.filter((item) => item.id !== vehicle.id),
        ],
        verificationResult: result,
      }));

      return result;
    } catch (error) {
      const result = {
        found: false,
        type: 'vehicle',
        message: error.message || 'Vehicle not found.',
      };

      set({ verificationResult: result });

      return result;
    }
  },

  verifyDriver: async (licenseNumber) => {
    try {
      const data = await api.verifyLicense(licenseNumber);
      const license = mapLicense(data.license || data);
      const issues = data.issues || data.verification?.issues || [];

      const result = {
        found: true,
        type: 'license',
        license,
        driver: data.driver || data.license?.driver || null,
        issues,
        isCompliant: Boolean(
          data.verification?.isCompliant ?? data.isCompliant ?? issues.length === 0
        ),
        raw: data,
      };

      set((state) => ({
        licenses: [
          license,
          ...state.licenses.filter((item) => item.id !== license.id),
        ],
        verificationResult: result,
      }));

      return result;
    } catch (error) {
      const result = {
        found: false,
        type: 'license',
        message: error.message || 'License not found.',
      };

      set({ verificationResult: result });

      return result;
    }
  },

  verifyByQR: async (qrValue) => {
    const parsed = parseSTVESQR(qrValue);

    if (!parsed.isValid) {
      const result = {
        found: false,
        type: 'qr',
        message: parsed.error || 'Invalid QR code.',
      };

      set({ verificationResult: result });

      return result;
    }

    if (parsed.type === QR_TYPES.VEHICLE) {
      return get().verifyVehicle(parsed.value);
    }

    if (parsed.type === QR_TYPES.LICENSE) {
      return get().verifyDriver(parsed.value);
    }

    const result = {
      found: false,
      type: 'qr',
      message: 'Unsupported QR code.',
    };

    set({ verificationResult: result });

    return result;
  },

  addLog: (logData) => {
    const log = mapLog({
      ...logData,
      id: generateId('LOG'),
      timestamp: new Date().toISOString(),
    });

    set((state) => ({
      activityLogs: [log, ...state.activityLogs],
    }));

    return log;
  },

  getViolationTypes: () => VIOLATION_TYPES,

  getStats: () => {
    const state = get();
    const localStats = buildStatsFromState(state);

    return {
      ...localStats,
      ...(state.stats || {}),
      activeVehicles: state.stats?.activeVehicles ?? localStats.activeVehicles,
      suspendedVehicles:
        state.stats?.suspendedVehicles ?? localStats.suspendedVehicles,
      blacklistedVehicles:
        state.stats?.blacklistedVehicles ?? localStats.blacklistedVehicles,
      validLicenses: state.stats?.validLicenses ?? localStats.validLicenses,
      expiredLicenses: state.stats?.expiredLicenses ?? localStats.expiredLicenses,
    };
  },
}));

export default useStore;