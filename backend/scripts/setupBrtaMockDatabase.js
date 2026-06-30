require("dotenv").config();
const mongoose = require("mongoose");

const getMongoUri = () => {
  return (
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL ||
    process.env.DB_URI ||
    ""
  );
};

const now = new Date();

// Replace these demo Cloudinary URLs with your own Cloudinary secure_url values.
const BRTA_OWNER_PHOTO_URL =
  process.env.BRTA_OWNER_PHOTO_URL ||
  "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v0000000000/stves/brta/owners/mock-owner-one.jpg";

const BRTA_DRIVER_PHOTO_URL =
  process.env.BRTA_DRIVER_PHOTO_URL ||
  "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v0000000000/stves/brta/drivers/mock-driver-one.jpg";

const normalize = (value = "") => String(value || "").trim().toUpperCase();

const vehicleQR = (plate) => {
  const value = normalize(plate);
  return value.startsWith("STVES-VEH:") ? value : `STVES-VEH:${value}`;
};

const licenseQR = (licenseNumber) => {
  const value = normalize(licenseNumber);
  return value.startsWith("STVES-LIC:") ? value : `STVES-LIC:${value}`;
};

async function createIndexes(db) {
  await db.collection("brta_owners").createIndex({ brtaOwnerId: 1 }, { unique: true });
  await db.collection("brta_owners").createIndex({ nid: 1 }, { unique: true });

  await db.collection("brta_drivers").createIndex({ brtaDriverId: 1 }, { unique: true });
  await db.collection("brta_drivers").createIndex({ nid: 1 }, { unique: true });

  await db.collection("brta_vehicles").createIndex({ registrationNumber: 1 }, { unique: true });
  await db.collection("brta_vehicles").createIndex({ qrCode: 1 }, { unique: true });
  await db.collection("brta_vehicles").createIndex({ chassisNumber: 1 }, { unique: true });
  await db.collection("brta_vehicles").createIndex({ engineNumber: 1 }, { unique: true });
  await db.collection("brta_vehicles").createIndex({ brtaOwnerId: 1 });
  await db.collection("brta_vehicles").createIndex({ status: 1 });

  await db.collection("brta_vehicle_documents").createIndex(
    { registrationNumber: 1 },
    { unique: true }
  );

  await db.collection("brta_tax_tokens").createIndex({ tokenNo: 1 }, { unique: true });
  await db.collection("brta_tax_tokens").createIndex({ registrationNumber: 1 });
  await db.collection("brta_tax_tokens").createIndex({ expiryDate: 1 });

  await db.collection("brta_fitness_certificates").createIndex(
    { certificateNo: 1 },
    { unique: true }
  );
  await db.collection("brta_fitness_certificates").createIndex({ registrationNumber: 1 });

  await db.collection("brta_insurance_certificates").createIndex(
    { policyNo: 1 },
    { unique: true }
  );
  await db.collection("brta_insurance_certificates").createIndex({ registrationNumber: 1 });

  await db.collection("brta_route_permits").createIndex({ permitNo: 1 }, { unique: true });
  await db.collection("brta_route_permits").createIndex({ registrationNumber: 1 });

  await db.collection("brta_driving_licenses").createIndex(
    { licenseNumber: 1 },
    { unique: true }
  );
  await db.collection("brta_driving_licenses").createIndex({ qrCode: 1 }, { unique: true });
  await db.collection("brta_driving_licenses").createIndex({ brtaDriverId: 1 });
  await db.collection("brta_driving_licenses").createIndex({ nid: 1 });
  await db.collection("brta_driving_licenses").createIndex({ status: 1 });
  await db.collection("brta_driving_licenses").createIndex({ expiryDate: 1 });

  await db.collection("brta_license_classes").createIndex(
    { classCode: 1 },
    { unique: true }
  );

  await db.collection("brta_driver_vehicle_authorizations").createIndex({
    registrationNumber: 1,
    licenseNumber: 1,
    status: 1,
  });
  await db.collection("brta_driver_vehicle_authorizations").createIndex({
    brtaDriverId: 1,
  });

  await db.collection("brta_blacklist_records").createIndex({
    entityType: 1,
    status: 1,
  });
  await db.collection("brta_blacklist_records").createIndex({ registrationNumber: 1 });
  await db.collection("brta_blacklist_records").createIndex({ licenseNumber: 1 });
  await db.collection("brta_blacklist_records").createIndex({ brtaDriverId: 1 });

  console.log("✅ BRTA mock indexes created");
}

async function seedBrtaData(db) {
  const owners = db.collection("brta_owners");
  const drivers = db.collection("brta_drivers");
  const vehicles = db.collection("brta_vehicles");
  const vehicleDocs = db.collection("brta_vehicle_documents");
  const taxTokens = db.collection("brta_tax_tokens");
  const fitness = db.collection("brta_fitness_certificates");
  const insurance = db.collection("brta_insurance_certificates");
  const routePermits = db.collection("brta_route_permits");
  const licenses = db.collection("brta_driving_licenses");
  const licenseClasses = db.collection("brta_license_classes");
  const authorizations = db.collection("brta_driver_vehicle_authorizations");
  const blacklist = db.collection("brta_blacklist_records");

  await owners.updateOne(
    { brtaOwnerId: "BRTA-OWN-0001" },
    {
      $set: {
        brtaOwnerId: "BRTA-OWN-0001",
        name: "Mock Owner One",
        nid: "1000000001",
        phone: "01700000001",
        photoUrl: BRTA_OWNER_PHOTO_URL,
        photoPublicId: "stves/brta/owners/mock-owner-one",
        address: {
          line: "Zindabazar",
          city: "Sylhet",
          district: "Sylhet",
          division: "Sylhet",
        },
        status: "active",
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await drivers.updateOne(
    { brtaDriverId: "BRTA-DRV-0001" },
    {
      $set: {
        brtaDriverId: "BRTA-DRV-0001",
        name: "Mock Driver One",
        nid: "2000000001",
        phone: "01800000001",
        photoUrl: BRTA_DRIVER_PHOTO_URL,
        photoPublicId: "stves/brta/drivers/mock-driver-one",
        bloodGroup: "O+",
        dateOfBirth: new Date("1998-01-01"),
        address: {
          line: "Amberkhana",
          city: "Sylhet",
          district: "Sylhet",
          division: "Sylhet",
        },
        status: "active",
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  const vehicleList = [
    {
      registrationNumber: "SYL-METRO-GA-11-1234",
      brtaOwnerId: "BRTA-OWN-0001",
      vehicleType: "car",
      brand: "Toyota",
      model: "Axio",
      year: 2020,
      color: "White",
      chassisNumber: "BRTA-CHS-001",
      engineNumber: "BRTA-ENG-001",
      registrationDate: new Date("2026-01-01"),
      registrationExpiry: new Date("2028-01-01"),
      status: "active",
    },
    {
      registrationNumber: "SYL-METRO-GA-22-5678",
      brtaOwnerId: "BRTA-OWN-0001",
      vehicleType: "car",
      brand: "Honda",
      model: "Civic",
      year: 2022,
      color: "Black",
      chassisNumber: "BRTA-CHS-002",
      engineNumber: "BRTA-ENG-002",
      registrationDate: new Date("2026-01-01"),
      registrationExpiry: new Date("2029-01-01"),
      status: "active",
    },
  ];

  for (const item of vehicleList) {
    const plate = normalize(item.registrationNumber);

    await vehicles.updateOne(
      { registrationNumber: plate },
      {
        $set: {
          ...item,
          registrationNumber: plate,
          qrCode: vehicleQR(plate),
          brtaSource: "BRTA_MOCK",
          brtaProvider: "Mock BRTA Registry",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    await vehicleDocs.updateOne(
      { registrationNumber: plate },
      {
        $set: {
          registrationNumber: plate,
          registrationCertificate: {
            certificateNo: `REG-${plate}`,
            issueDate: new Date("2026-01-01"),
            expiryDate: item.registrationExpiry,
            status: "valid",
          },
          fitnessCertificate: {
            certificateNo: `FIT-${plate}`,
            issueDate: new Date("2026-01-01"),
            expiryDate: new Date("2028-01-01"),
            status: "valid",
          },
          taxToken: {
            tokenNo: `TAX-${plate}`,
            issueDate: new Date("2026-01-01"),
            expiryDate: new Date("2027-12-31"),
            status: "valid",
          },
          insurance: {
            policyNo: `INS-${plate}`,
            provider: "Mock Insurance Ltd",
            issueDate: new Date("2026-01-01"),
            expiryDate: new Date("2027-12-31"),
            status: "valid",
          },
          routePermit: {
            permitNo: `RTP-${plate}`,
            route: "Sylhet Metro",
            issueDate: new Date("2026-01-01"),
            expiryDate: new Date("2027-12-31"),
            status: "valid",
          },
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    await taxTokens.updateOne(
      { tokenNo: `TAX-${plate}` },
      {
        $set: {
          tokenNo: `TAX-${plate}`,
          registrationNumber: plate,
          issueDate: new Date("2026-01-01"),
          expiryDate: new Date("2027-12-31"),
          amount: 3000,
          status: "valid",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    await fitness.updateOne(
      { certificateNo: `FIT-${plate}` },
      {
        $set: {
          certificateNo: `FIT-${plate}`,
          registrationNumber: plate,
          issueDate: new Date("2026-01-01"),
          expiryDate: new Date("2028-01-01"),
          inspectionCenter: "BRTA Sylhet",
          status: "valid",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    await insurance.updateOne(
      { policyNo: `INS-${plate}` },
      {
        $set: {
          policyNo: `INS-${plate}`,
          registrationNumber: plate,
          provider: "Mock Insurance Ltd",
          issueDate: new Date("2026-01-01"),
          expiryDate: new Date("2027-12-31"),
          status: "valid",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    await routePermits.updateOne(
      { permitNo: `RTP-${plate}` },
      {
        $set: {
          permitNo: `RTP-${plate}`,
          registrationNumber: plate,
          route: "Sylhet Metro",
          issueDate: new Date("2026-01-01"),
          expiryDate: new Date("2027-12-31"),
          status: "valid",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }

  await licenseClasses.updateOne(
    { classCode: "light" },
    {
      $set: {
        classCode: "light",
        className: "Light Motor Vehicle",
        allowedVehicleTypes: ["car", "microbus"],
        minimumAge: 18,
        description: "Allowed to drive light motor vehicles.",
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await licenseClasses.updateOne(
    { classCode: "motorcycle" },
    {
      $set: {
        classCode: "motorcycle",
        className: "Motorcycle",
        allowedVehicleTypes: ["bike"],
        minimumAge: 18,
        description: "Allowed to drive motorcycle.",
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  const licenseList = [
    {
      licenseNumber: "DL-SYL-2026-001",
      brtaDriverId: "BRTA-DRV-0001",
      holderName: "Mock Driver One",
      nid: "2000000001",
      bloodGroup: "O+",
      dateOfBirth: new Date("1998-01-01"),
      licenseClass: "light",
      issueDate: new Date("2026-01-01"),
      expiryDate: new Date("2029-01-01"),
      issuingAuthority: "BRTA Sylhet",
      status: "valid",
    },
    {
      licenseNumber: "DL-SYL-2026-002",
      brtaDriverId: "BRTA-DRV-0001",
      holderName: "Mock Driver One",
      nid: "2000000001",
      bloodGroup: "O+",
      dateOfBirth: new Date("1998-01-01"),
      licenseClass: "motorcycle",
      issueDate: new Date("2026-01-01"),
      expiryDate: new Date("2030-01-01"),
      issuingAuthority: "BRTA Sylhet",
      status: "valid",
    },
  ];

  for (const item of licenseList) {
    const licenseNumber = normalize(item.licenseNumber);

    await licenses.updateOne(
      { licenseNumber },
      {
        $set: {
          ...item,
          licenseNumber,
          qrCode: licenseQR(licenseNumber),
          brtaSource: "BRTA_MOCK",
          brtaProvider: "Mock BRTA Registry",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }

  await authorizations.updateOne(
    {
      registrationNumber: "SYL-METRO-GA-11-1234",
      licenseNumber: "DL-SYL-2026-001",
      status: "active",
    },
    {
      $set: {
        registrationNumber: "SYL-METRO-GA-11-1234",
        licenseNumber: "DL-SYL-2026-001",
        brtaDriverId: "BRTA-DRV-0001",
        authorizationType: "assigned_driver",
        status: "active",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2029-01-01"),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await blacklist.updateOne(
    {
      entityType: "vehicle",
      registrationNumber: "SYL-METRO-GA-99-9999",
      status: "active",
    },
    {
      $set: {
        entityType: "vehicle",
        registrationNumber: "SYL-METRO-GA-99-9999",
        status: "active",
        reason: "Mock blacklisted vehicle for testing",
        severity: "critical",
        issuedBy: "Mock BRTA Registry",
        issuedAt: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  console.log("✅ BRTA mock data seeded successfully");
}

async function main() {
  const mongoUri = getMongoUri();

  if (!mongoUri) {
    throw new Error(
      "MongoDB URI missing in backend/.env. Add one of: MONGO_URI, MONGODB_URI, MONGO_URL, DATABASE_URL, or DB_URI"
    );
  }

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  console.log("✅ MongoDB connected");
  await createIndexes(db);
  await seedBrtaData(db);

  await mongoose.connection.close();
  console.log("✅ BRTA mock database setup complete");
}

main().catch(async (error) => {
  console.error("❌ BRTA mock database setup failed:", error);
  try {
    await mongoose.connection.close();
  } catch (_) { }
  process.exit(1);
});