# STVES Backend Architecture

## Overview
This folder contains the backend architecture documentation and mock API design for the Smart Traffic Verification and Enforcement System (STVES).

In the current academic implementation, the backend logic is simulated client-side using Zustand state management. In a production deployment, this would be replaced with a full Node.js/Express.js server.

## Technology Stack
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: MongoDB (or PostgreSQL)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt for password hashing, RBAC middleware

## Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "name": "String",
  "email": "String (unique)",
  "password": "String (hashed)",
  "role": "String (admin|police|driver|owner)",
  "phone": "String",
  "nid": "String",
  "badge": "String (police only)",
  "station": "String (police only)",
  "status": "String (active|suspended|blacklisted)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### DrivingLicenses Collection
```json
{
  "_id": "ObjectId",
  "licenseNumber": "String (unique)",
  "driverId": "ObjectId (ref: Users)",
  "driverName": "String",
  "category": "String",
  "issueDate": "Date",
  "expiryDate": "Date",
  "bloodGroup": "String",
  "status": "String (valid|expired|suspended|revoked)",
  "nid": "String",
  "address": "String"
}
```

### Vehicles Collection
```json
{
  "_id": "ObjectId",
  "plateNumber": "String (unique)",
  "ownerId": "ObjectId (ref: Users)",
  "ownerName": "String",
  "vehicleType": "String",
  "brand": "String",
  "model": "String",
  "year": "Number",
  "color": "String",
  "engineNumber": "String",
  "chassisNumber": "String",
  "registrationDate": "Date",
  "registrationExpiry": "Date",
  "fitnessExpiry": "Date",
  "taxTokenExpiry": "Date",
  "routePermitExpiry": "Date",
  "insuranceExpiry": "Date",
  "status": "String (active|suspended|blacklisted)",
  "assignedDrivers": ["ObjectId (ref: Users)"],
  "qrCode": "String (unique)",
  "safetyScore": "Number (0-100)"
}
```

### Violations Collection
```json
{
  "_id": "ObjectId",
  "caseId": "String (unique, e.g., EC-2025-100001)",
  "vehicleId": "ObjectId (ref: Vehicles)",
  "driverId": "ObjectId (ref: Users)",
  "officerId": "ObjectId (ref: Users)",
  "plateNumber": "String",
  "driverName": "String",
  "officerName": "String",
  "violationType": "String (violation code)",
  "description": "String",
  "fineAmount": "Number",
  "status": "String (pending|approved|dismissed|paid)",
  "location": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### ActivityLogs Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: Users)",
  "userName": "String",
  "action": "String",
  "details": "String",
  "type": "String (verification|case|admin|auth|system)",
  "timestamp": "Date"
}
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and receive JWT |
| POST | /api/auth/logout | Invalidate session |
| GET | /api/auth/me | Get current user profile |

### Verification Engine (Mock BRTA API)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/verify/vehicle/:plateNumber | Verify vehicle by plate |
| GET | /api/verify/driver/:licenseNumber | Verify driver by license |
| GET | /api/verify/qr/:qrCode | Verify by QR code |

### Vehicles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/vehicles | List all vehicles (admin) |
| GET | /api/vehicles/my | Get owner's vehicles |
| POST | /api/vehicles | Register new vehicle |
| PUT | /api/vehicles/:id | Update vehicle details |
| PUT | /api/vehicles/:id/status | Update vehicle status |
| POST | /api/vehicles/:id/assign-driver | Assign driver |
| DELETE | /api/vehicles/:id/remove-driver/:driverId | Remove driver |

### Violations (E-Challan)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/violations | List all violations |
| GET | /api/violations/my | Get user's violations |
| POST | /api/violations | Create new violation |
| PUT | /api/violations/:id/status | Update violation status |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users |
| PUT | /api/users/:id/status | Update user status |
| DELETE | /api/users/:id | Delete user |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/stats | Get system statistics |
| GET | /api/analytics/logs | Get activity logs |

## RBAC Middleware
```
Admin:    Full access to all endpoints
Police:   Verification, violation creation, own cases
Driver:   Own profile, own license, own violations
Owner:    Own vehicles, driver assignment, vehicle violations
```

## Security Features
- JWT tokens with 24-hour expiry
- bcrypt password hashing (salt rounds: 12)
- Rate limiting on verification endpoints
- CORS configuration for frontend origin only
- Request validation with express-validator
- Helmet.js for HTTP security headers
