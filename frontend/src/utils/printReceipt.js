const safeText = (value = '') => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const safeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMoney = (amount) => {
  return `BDT ${safeNumber(amount).toLocaleString()}`;
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getCaseId = (violation = {}) => {
  return violation.caseId || violation.id || violation._id || 'N/A';
};

const getVehiclePlate = (violation = {}) => {
  return (
    violation.registrationNumber ||
    violation.plateNumber ||
    violation.vehiclePlate ||
    violation.vehicle?.registrationNumber ||
    violation.vehicle?.plateNumber ||
    'N/A'
  );
};

const getLicenseNumber = (violation = {}) => {
  return (
    violation.licenseNumber ||
    violation.license?.licenseNumber ||
    violation.driverLicenseNumber ||
    'N/A'
  );
};

const getViolationTitle = (violation = {}) => {
  return (
    violation.violationLabel ||
    violation.violationType ||
    violation.violationCode ||
    'Traffic Violation'
  );
};

const getLocation = (violation = {}) => {
  if (typeof violation.location === 'string') {
    return violation.location;
  }

  if (violation.location?.address) {
    return violation.location.address;
  }

  return violation.locationName || violation.place || 'N/A';
};

const buildReceiptHtml = ({ violation = {}, payer = {} }) => {
  const caseId = getCaseId(violation);
  const paidAt =
    violation.paidAt ||
    violation.paymentDate ||
    violation.updatedAt ||
    new Date().toISOString();

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>STVES E-Challan Receipt - ${safeText(caseId)}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 32px;
      background: #f3f6fb;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    .receipt {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #dbe3ee;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
    }

    .header {
      padding: 28px;
      color: #ffffff;
      background: linear-gradient(135deg, #0f4c81, #1a73e8);
    }

    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand-title {
      font-size: 26px;
      font-weight: 900;
      margin: 0;
    }

    .brand-subtitle {
      margin: 5px 0 0;
      font-size: 13px;
      color: #dbeafe;
    }

    .status {
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      background: rgba(255,255,255,0.12);
    }

    .body {
      padding: 28px;
    }

    .title-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      border-bottom: 1px solid #e5edf7;
      padding-bottom: 20px;
      margin-bottom: 22px;
    }

    .title {
      margin: 0;
      font-size: 22px;
      font-weight: 900;
    }

    .case-id {
      margin-top: 6px;
      color: #64748b;
      font-size: 13px;
    }

    .amount {
      text-align: right;
    }

    .amount-label {
      color: #64748b;
      font-size: 12px;
      margin: 0 0 5px;
    }

    .amount-value {
      margin: 0;
      font-size: 28px;
      font-weight: 900;
      color: #0f4c81;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .item {
      border: 1px solid #edf2f7;
      border-radius: 14px;
      padding: 14px;
      background: #fbfdff;
    }

    .label {
      margin: 0 0 6px;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .value {
      margin: 0;
      color: #0f172a;
      font-size: 14px;
      font-weight: 700;
      word-break: break-word;
    }

    .note {
      margin-top: 22px;
      border-radius: 14px;
      padding: 14px;
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      color: #047857;
      font-size: 13px;
      font-weight: 700;
    }

    .footer {
      padding: 18px 28px;
      border-top: 1px solid #e5edf7;
      color: #64748b;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }

      .receipt {
        box-shadow: none;
        border-radius: 0;
        border: none;
      }
    }

    @media (max-width: 640px) {
      body {
        padding: 16px;
      }

      .title-row,
      .footer {
        flex-direction: column;
      }

      .amount {
        text-align: left;
      }

      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>

<body>
  <main class="receipt">
    <section class="header">
      <div class="brand">
        <div>
          <h1 class="brand-title">STVES</h1>
          <p class="brand-subtitle">Smart Traffic Verification & Enforcement System</p>
        </div>

        <div class="status">Paid Receipt</div>
      </div>
    </section>

    <section class="body">
      <div class="title-row">
        <div>
          <h2 class="title">E-Challan Payment Receipt</h2>
          <p class="case-id">Case ID: ${safeText(caseId)}</p>
        </div>

        <div class="amount">
          <p class="amount-label">Fine Amount</p>
          <p class="amount-value">${safeText(formatMoney(violation.fineAmount))}</p>
        </div>
      </div>

      <div class="grid">
        <div class="item">
          <p class="label">Violation Type</p>
          <p class="value">${safeText(getViolationTitle(violation))}</p>
        </div>

        <div class="item">
          <p class="label">Payment Status</p>
          <p class="value">${safeText(violation.paymentStatus || 'paid')}</p>
        </div>

        <div class="item">
          <p class="label">Vehicle Number</p>
          <p class="value">${safeText(getVehiclePlate(violation))}</p>
        </div>

        <div class="item">
          <p class="label">License Number</p>
          <p class="value">${safeText(getLicenseNumber(violation))}</p>
        </div>

        <div class="item">
          <p class="label">Location</p>
          <p class="value">${safeText(getLocation(violation))}</p>
        </div>

        <div class="item">
          <p class="label">Issued At</p>
          <p class="value">${safeText(formatDateTime(violation.createdAt || violation.issuedAt))}</p>
        </div>

        <div class="item">
          <p class="label">Paid At</p>
          <p class="value">${safeText(formatDateTime(paidAt))}</p>
        </div>

        <div class="item">
          <p class="label">Payer</p>
          <p class="value">${safeText(payer.name || payer.email || 'STVES User')}</p>
        </div>
      </div>

      <div class="note">
        This receipt confirms that the e-challan fine has been marked as paid in STVES.
      </div>
    </section>

    <section class="footer">
      <span>Generated by STVES</span>
      <span>© 2025 STVES. All rights reserved.</span>
    </section>
  </main>

  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;
};

export const printEChallanReceipt = ({ violation, payer }) => {
  if (!violation) {
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700');

  if (!printWindow) {
    alert('Popup blocked. Please allow popups to print the receipt.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildReceiptHtml({ violation, payer }));
  printWindow.document.close();
};

export default printEChallanReceipt;