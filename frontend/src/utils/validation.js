// ============================================================
// Form Validation Utilities
// Reusable validation functions and patterns
// ============================================================
// Email validation
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// Bangladesh phone number validation (11 digits starting with 01)
export function isValidPhone(phone) {
    const phoneRegex = /^01[3-9]\d{8}$/;
    return phoneRegex.test(phone);
}
// Bangladesh NID validation (10, 13, or 17 digits)
export function isValidNID(nid) {
    const nidRegex = /^(\d{10}|\d{13}|\d{17})$/;
    return nidRegex.test(nid);
}
// Vehicle plate number validation (Bangladesh format)
export function isValidPlateNumber(plate) {
    // Format: DHA-KA-12-3456 or similar
    const plateRegex = /^[A-Z]{2,4}[-\s]?[A-Z]{1,3}[-\s]?\d{2}[-\s]?\d{4}$/i;
    return plateRegex.test(plate.replace(/\s/g, ''));
}
// Driving license number validation
export function isValidLicenseNumber(license) {
    // Format: DL-DHK-2020-00451
    const licenseRegex = /^DL-[A-Z]{2,4}-\d{4}-\d{5,6}$/i;
    return licenseRegex.test(license);
}
export function checkPasswordStrength(password) {
    const requirements = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    const score = Object.values(requirements).filter(Boolean).length;
    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];
    return {
        score,
        label: labels[score] || labels[0],
        color: colors[score] || colors[0],
        requirements,
    };
}
// Date validation helpers
export function isExpired(dateString) {
    if (!dateString)
        return false;
    const today = new Date().toISOString().split('T')[0];
    return dateString < today;
}
export function isExpiringSoon(dateString, daysThreshold = 30) {
    if (!dateString)
        return false;
    const today = new Date();
    const expiryDate = new Date(dateString);
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= daysThreshold;
}
export function daysUntilExpiry(dateString) {
    if (!dateString)
        return 0;
    const today = new Date();
    const expiryDate = new Date(dateString);
    return Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
export function validateField(value, rules) {
    for (const rule of rules) {
        if (rule.required && !value.trim()) {
            return rule.message;
        }
        if (rule.minLength && value.length < rule.minLength) {
            return rule.message;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
            return rule.message;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
            return rule.message;
        }
        if (rule.custom && !rule.custom(value)) {
            return rule.message;
        }
    }
    return null;
}
// Common validation schemas
export const validationSchemas = {
    email: [
        { required: true, message: 'Email is required' },
        { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' },
    ],
    password: [
        { required: true, message: 'Password is required' },
        { minLength: 6, message: 'Password must be at least 6 characters' },
    ],
    phone: [
        { required: true, message: 'Phone is required' },
        { pattern: /^01[3-9]\d{8}$/, message: 'Invalid phone number (must be 11 digits starting with 01)' },
    ],
    nid: [
        { required: true, message: 'NID is required' },
        { pattern: /^(\d{10}|\d{13}|\d{17})$/, message: 'Invalid NID (must be 10, 13, or 17 digits)' },
    ],
    plateNumber: [
        { required: true, message: 'Plate number is required' },
        { custom: isValidPlateNumber, message: 'Invalid plate number format (e.g., DHA-KA-12-3456)' },
    ],
};
// Format helpers
export function formatPlateNumber(plate) {
    // Convert to uppercase and standardize format
    const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Try to format as: ABC-XY-12-3456
    if (clean.length >= 10) {
        const parts = clean.match(/^([A-Z]{2,4})([A-Z]{1,3})(\d{2})(\d{4})$/);
        if (parts) {
            return `${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}`;
        }
    }
    return plate.toUpperCase();
}
export function formatPhone(phone) {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11 && clean.startsWith('01')) {
        return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
    }
    return phone;
}
