// ============================================================
// Application Constants
// Centralized configuration and static data
// ============================================================
// App Information
export const APP_NAME = 'STVES';
export const APP_FULL_NAME = 'Smart Traffic Verification & Enforcement System';
export const APP_VERSION = '1.0.0';
export const APP_YEAR = 2025;
// Theme Colors
export const COLORS = {
    primary: '#0f4c81',
    secondary: '#1a73e8',
    accent: '#00c853',
    danger: '#e53935',
    warning: '#ff9800',
    info: '#2196f3',
    dark: '#0d1b2a',
    light: '#f0f4f8',
};
// User Roles
export const USER_ROLES = {
    ADMIN: 'admin',
    POLICE: 'police',
    DRIVER: 'driver',
    OWNER: 'owner',
};
export const ROLE_LABELS = {
    admin: 'System Administrator',
    police: 'Traffic Police Officer',
    driver: 'Licensed Driver',
    owner: 'Vehicle Owner',
};
export const ROLE_COLORS = {
    admin: 'bg-red-100 text-red-700',
    police: 'bg-blue-100 text-blue-700',
    driver: 'bg-green-100 text-green-700',
    owner: 'bg-purple-100 text-purple-700',
};
// Status Types
export const USER_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    BLACKLISTED: 'blacklisted',
};
export const VEHICLE_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    BLACKLISTED: 'blacklisted',
};
export const LICENSE_STATUS = {
    VALID: 'valid',
    EXPIRED: 'expired',
    SUSPENDED: 'suspended',
    REVOKED: 'revoked',
};
export const CASE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    DISMISSED: 'dismissed',
    PAID: 'paid',
};
export const STATUS_COLORS = {
    active: 'bg-green-100 text-green-700',
    valid: 'bg-green-100 text-green-700',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-blue-100 text-blue-700',
    pending: 'bg-orange-100 text-orange-700',
    suspended: 'bg-orange-100 text-orange-700',
    expired: 'bg-red-100 text-red-700',
    blacklisted: 'bg-red-100 text-red-700',
    revoked: 'bg-red-100 text-red-700',
    dismissed: 'bg-red-100 text-red-700',
};
// Vehicle Types
export const VEHICLE_TYPES = [
    'Sedan',
    'SUV',
    'Hatchback',
    'Bus',
    'Minibus',
    'Microbus',
    'Truck',
    'Pickup',
    'Van',
    'CNG',
    'Auto Rickshaw',
    'Motorcycle',
    'Ambulance',
    'Fire Truck',
    'Police Vehicle',
];
// License Categories
export const LICENSE_CATEGORIES = [
    'Light Vehicle',
    'Heavy Vehicle',
    'Motorcycle',
    'Professional',
    'Commercial',
    'PSV (Public Service Vehicle)',
];
// Blood Groups
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
// Violation Types with Fines
// Violation rules are now database-driven through `/api/violation-types`.
// Keep this empty to prevent old hardcoded rules from being used accidentally.
export const VIOLATION_TYPES = [];
// Traffic Zones (Bangladesh)
export const TRAFFIC_ZONES = [
    'Motijheel Traffic Zone',
    'Gulshan Traffic Zone',
    'Ramna Traffic Zone',
    'Tejgaon Traffic Zone',
    'Mirpur Traffic Zone',
    'Uttara Traffic Zone',
    'Dhanmondi Traffic Zone',
    'Mohammadpur Traffic Zone',
    'Lalbagh Traffic Zone',
    'Wari Traffic Zone',
];
// Date Format
export const DATE_FORMAT = 'DD MMM YYYY';
export const DATETIME_FORMAT = 'DD MMM YYYY, HH:mm';
// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
// Validation Patterns
export const PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_BD: /^01[3-9]\d{8}$/,
    NID: /^(\d{10}|\d{13}|\d{17})$/,
    PLATE_NUMBER: /^[A-Z]{2,4}[-\s]?[A-Z]{1,3}[-\s]?\d{2}[-\s]?\d{4}$/i,
    LICENSE_NUMBER: /^DL-[A-Z]{2,4}-\d{4}-\d{5,6}$/i,
};
// API Endpoints (for future backend integration)
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        ME: '/api/auth/me',
    },
    USERS: {
        BASE: '/api/users',
        STATUS: (id) => `/api/users/${id}/status`,
    },
    VEHICLES: {
        BASE: '/api/vehicles',
        MY: '/api/vehicles/my',
        ASSIGN_DRIVER: (id) => `/api/vehicles/${id}/assign-driver`,
    },
    VIOLATIONS: {
        BASE: '/api/violations',
        MY: '/api/violations/my',
        STATUS: (id) => `/api/violations/${id}/status`,
    },
    VERIFY: {
        VEHICLE: (plate) => `/api/verify/vehicle/${plate}`,
        DRIVER: (license) => `/api/verify/driver/${license}`,
        QR: (code) => `/api/verify/qr/${code}`,
    },
    ANALYTICS: {
        STATS: '/api/analytics/stats',
        LOGS: '/api/analytics/logs',
    },
};
// Demo Account Credentials
export const DEMO_ACCOUNTS = [
    { role: 'Admin', email: 'admin@stves.gov.bd', password: 'admin123' },
    { role: 'Police', email: 'police@stves.gov.bd', password: 'police123' },
    { role: 'Driver', email: 'driver@stves.gov.bd', password: 'driver123' },
    { role: 'Owner', email: 'owner@stves.gov.bd', password: 'owner123' },
];
