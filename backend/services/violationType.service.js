const mongoose = require("mongoose");

const ViolationType = require("../models/ViolationType");
const AppError = require("../utils/AppError");
const { DEFAULT_VIOLATION_TYPES } = require("../constants/violationTypes");

const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_STATUSES = new Set(["active", "inactive"]);
const VALID_APPLICABLE_TO = new Set(["driver", "owner"]);

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const clean = (value) => String(value || "").trim();

const escapeRegex = (value) => {
  return clean(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeCode = (value) => {
  return clean(value)
    .replace(/[–—−]/g, "-")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
};

const buildCodeFromName = (name) => normalizeCode(name).slice(0, 40);

const normalizeSeverity = (value) => {
  const severity = clean(value || "medium").toLowerCase();

  if (!VALID_SEVERITIES.has(severity)) {
    throw new AppError(
      "Invalid severity. Allowed: low, medium, high, critical.",
      400
    );
  }

  return severity;
};

const normalizeStatus = (value) => {
  const status = clean(value || "active").toLowerCase();

  if (!VALID_STATUSES.has(status)) {
    throw new AppError("Invalid status. Allowed: active, inactive.", 400);
  }

  return status;
};

const normalizeApplicableTo = (value) => {
  const rawList = Array.isArray(value) ? value : [value];
  const normalized = [];

  rawList.forEach((item) => {
    const userType = clean(item).toLowerCase();

    if (userType === "both") {
      normalized.push("driver", "owner");
      return;
    }

    if (VALID_APPLICABLE_TO.has(userType)) {
      normalized.push(userType);
    }
  });

  const unique = [...new Set(normalized)];

  if (unique.length === 0) {
    throw new AppError(
      "Applicable To is required. Select driver, owner, or both.",
      400
    );
  }

  return unique;
};

const getApplicableMode = (applicableTo = []) => {
  const list = normalizeApplicableTo(applicableTo);

  if (list.includes("driver") && list.includes("owner")) {
    return "both";
  }

  return list[0];
};

const mapViolationType = (item = {}) => {
  const obj = typeof item.toObject === "function" ? item.toObject() : item;
  const applicableTo = Array.isArray(obj.applicableTo) ? obj.applicableTo : [];

  return {
    ...obj,
    id: String(obj._id || obj.id || ""),
    applicableTo,
    responsibility: getApplicableMode(applicableTo),
    label: obj.name,
    fine: Number(obj.fineAmount || 0),
  };
};

const ensureDefaultViolationTypesSeeded = async (actor = null) => {
  const existingCount = await ViolationType.countDocuments({});

  if (existingCount > 0) {
    return false;
  }

  const docs = DEFAULT_VIOLATION_TYPES.map((item) => ({
    ...item,
    code: normalizeCode(item.code),
    severity: normalizeSeverity(item.severity),
    status: normalizeStatus(item.status),
    applicableTo: normalizeApplicableTo(item.applicableTo),
    createdBy: actor?._id,
    updatedBy: actor?._id,
  }));

  await ViolationType.insertMany(docs, { ordered: true });
  return true;
};

const buildListQuery = (filters = {}, includeDeleted = false) => {
  const query = includeDeleted ? {} : { isDeleted: false };

  if (filters.status) {
    query.status = normalizeStatus(filters.status);
  }

  if (filters.severity) {
    query.severity = normalizeSeverity(filters.severity);
  }

  if (filters.applicableTo) {
    query.applicableTo = clean(filters.applicableTo).toLowerCase();
  }

  if (filters.search) {
    const search = clean(filters.search);

    query.$or = [
      { code: new RegExp(escapeRegex(search), "i") },
      { name: new RegExp(escapeRegex(search), "i") },
      { description: new RegExp(escapeRegex(search), "i") },
    ];
  }

  return query;
};

const getViolationTypes = async ({
  filters = {},
  includeDeleted = false,
} = {}) => {
  await ensureDefaultViolationTypesSeeded();

  const limit = Math.min(Number(filters.limit || 100), 500);
  const query = buildListQuery(filters, includeDeleted);

  const items = await ViolationType.find(query)
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role")
    .sort({ isDeleted: 1, status: 1, name: 1 })
    .limit(limit)
    .lean();

  return items.map(mapViolationType);
};

const getActiveViolationTypes = async (filters = {}) => {
  return getViolationTypes({
    filters: {
      ...filters,
      status: "active",
    },
    includeDeleted: false,
  });
};

const findViolationTypeForCase = async ({ id, code, name }) => {
  await ensureDefaultViolationTypesSeeded();

  const query = {
    isDeleted: false,
    status: "active",
  };

  if (id && isObjectId(id)) {
    query._id = id;
  } else if (code) {
    query.code = normalizeCode(code);
  } else if (name) {
    query.name = clean(name);
  } else {
    throw new AppError("Violation type is required.", 400);
  }

  const violationType = await ViolationType.findOne(query).lean();

  if (!violationType) {
    throw new AppError(
      "Selected violation type is inactive, deleted, or not found.",
      404
    );
  }

  return mapViolationType(violationType);
};

const createViolationType = async (payload = {}, actor) => {
  const name = clean(payload.name || payload.label || payload.violationName);

  if (!name) {
    throw new AppError("Violation name is required.", 400);
  }

  const code = normalizeCode(payload.code || buildCodeFromName(name));

  if (!code) {
    throw new AppError("Violation code is required.", 400);
  }

  const existing = await ViolationType.findOne({
    isDeleted: false,
    $or: [{ code }, { name: new RegExp(`^${escapeRegex(name)}$`, "i") }],
  });

  if (existing) {
    throw new AppError(
      "A violation with the same code or name already exists.",
      409
    );
  }

  const fineAmount = Number(payload.fineAmount ?? payload.fine ?? 0);

  if (!Number.isFinite(fineAmount) || fineAmount < 0) {
    throw new AppError("Valid fine amount is required.", 400);
  }

  const violationType = await ViolationType.create({
    code,
    name,
    description: clean(payload.description),
    fineAmount,
    severity: normalizeSeverity(payload.severity),
    points: Math.max(Number(payload.points || 0), 0),
    applicableTo: normalizeApplicableTo(
      payload.applicableTo || payload.responsibility
    ),
    status: normalizeStatus(payload.status),
    createdBy: actor?._id,
    updatedBy: actor?._id,
  });

  return mapViolationType(violationType);
};

const getViolationTypeById = async (id) => {
  if (!isObjectId(id)) {
    throw new AppError("Invalid violation type id.", 400);
  }

  await ensureDefaultViolationTypesSeeded();

  const violationType = await ViolationType.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role")
    .lean();

  if (!violationType) {
    throw new AppError("Violation type not found.", 404);
  }

  return mapViolationType(violationType);
};

const updateViolationType = async (id, payload = {}, actor) => {
  if (!isObjectId(id)) {
    throw new AppError("Invalid violation type id.", 400);
  }

  const existing = await ViolationType.findOne({ _id: id, isDeleted: false });

  if (!existing) {
    throw new AppError("Violation type not found.", 404);
  }

  const update = {};

  if (payload.name !== undefined) {
    const name = clean(payload.name);

    if (!name) {
      throw new AppError("Violation name is required.", 400);
    }

    const duplicateName = await ViolationType.findOne({
      _id: { $ne: id },
      isDeleted: false,
      name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    });

    if (duplicateName) {
      throw new AppError("A violation with the same name already exists.", 409);
    }

    update.name = name;
  }

  if (payload.code !== undefined) {
    const code = normalizeCode(payload.code);

    if (!code) {
      throw new AppError("Violation code is required.", 400);
    }

    const duplicateCode = await ViolationType.findOne({
      _id: { $ne: id },
      isDeleted: false,
      code,
    });

    if (duplicateCode) {
      throw new AppError("A violation with the same code already exists.", 409);
    }

    update.code = code;
  }

  if (payload.description !== undefined) {
    update.description = clean(payload.description);
  }

  if (payload.fineAmount !== undefined || payload.fine !== undefined) {
    const fineAmount = Number(payload.fineAmount ?? payload.fine);

    if (!Number.isFinite(fineAmount) || fineAmount < 0) {
      throw new AppError("Valid fine amount is required.", 400);
    }

    update.fineAmount = fineAmount;
  }

  if (payload.severity !== undefined) {
    update.severity = normalizeSeverity(payload.severity);
  }

  if (payload.points !== undefined) {
    update.points = Math.max(Number(payload.points || 0), 0);
  }

  if (
    payload.applicableTo !== undefined ||
    payload.responsibility !== undefined
  ) {
    update.applicableTo = normalizeApplicableTo(
      payload.applicableTo || payload.responsibility
    );
  }

  if (payload.status !== undefined) {
    update.status = normalizeStatus(payload.status);
  }

  update.updatedBy = actor?._id;

  const updated = await ViolationType.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  ).lean();

  return {
    before: mapViolationType(existing),
    after: mapViolationType(updated),
  };
};

const updateViolationTypeStatus = async (id, status, actor) => {
  return updateViolationType(id, { status }, actor);
};

const softDeleteViolationType = async (id, actor) => {
  if (!isObjectId(id)) {
    throw new AppError("Invalid violation type id.", 400);
  }

  const existing = await ViolationType.findOne({ _id: id, isDeleted: false });

  if (!existing) {
    throw new AppError("Violation type not found.", 404);
  }

  const updated = await ViolationType.findByIdAndUpdate(
    id,
    {
      $set: {
        isDeleted: true,
        status: "inactive",
        deletedBy: actor?._id,
        deletedAt: new Date(),
        updatedBy: actor?._id,
      },
    },
    { new: true }
  ).lean();

  return {
    before: mapViolationType(existing),
    after: mapViolationType(updated),
  };
};

module.exports = {
  normalizeApplicableTo,
  getApplicableMode,
  mapViolationType,
  ensureDefaultViolationTypesSeeded,
  getViolationTypes,
  getActiveViolationTypes,
  getViolationTypeById,
  findViolationTypeForCase,
  createViolationType,
  updateViolationType,
  updateViolationTypeStatus,
  softDeleteViolationType,
};