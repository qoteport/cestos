


<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Maintenance / Breakdown Repair Job Card</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-navy: #184877;
      --navy-dark: #12375c;
      --header-bg: #dbe7f4;
      --grid-border: #000000;
      --cell-hover: #f3f7fd;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #e5e7eb;
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #000;
      padding: 24px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Action bar on top for quick operations */
    .toolbar {
      width: 100%;
      max-width: 900px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 10px 16px;
      border-radius: 6px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }

    .toolbar-title {
      font-weight: 700;
      font-size: 14px;
      color: var(--primary-navy);
      letter-spacing: 0.5px;
    }

    .btn-group {
      display: flex;
      gap: 8px;
    }

    .btn {
      cursor: pointer;
      border: 1px solid #cbd5e1;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      background: #ffffff;
      color: #334155;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease-in-out;
    }

    .btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-primary {
      background: var(--primary-navy);
      border-color: var(--primary-navy);
      color: #ffffff;
    }

    .btn-primary:hover {
      background: var(--navy-dark);
      border-color: var(--navy-dark);
    }

    .sheet-wrapper {
      width: 100%;
      max-width: 900px;
      background: #ffffff;
      padding: 24px 28px 30px 28px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
      border-radius: 2px;
    }

    /* Main Document Title */
    .doc-main-title {
      text-align: center;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
      color: #000000;
      text-transform: uppercase;
    }

    /* Section Banner Headers */
    .section-header {
      background-color: var(--primary-navy);
      color: #ffffff;
      font-weight: 800;
      font-size: 11.5px;
      text-align: center;
      padding: 4px 6px;
      letter-spacing: 0.5px;
      border: 1.5px solid var(--grid-border);
      border-bottom: none;
      text-transform: uppercase;
      user-select: none;
    }

    .form-section {
      margin-bottom: 7px;
    }

    .grid-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 1.5px solid var(--grid-border);
    }

    .grid-table th,
    .grid-table td {
      border: 1px solid var(--grid-border);
      padding: 0;
      font-size: 11px;
      height: 24px;
      vertical-align: middle;
    }

    /* Column Headers & Label Cells (Light Sky Blue from reference) */
    .cell-label {
      background-color: var(--header-bg);
      font-weight: 700;
      font-size: 10.5px;
      color: #000;
      padding: 2px 5px;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      user-select: none;
    }

    .table-head-th {
      background-color: var(--header-bg);
      font-weight: 700;
      font-size: 10px;
      color: #000;
      text-align: left;
      padding: 3px 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      user-select: none;
    }

    /* Input Cells (Pure White background) */
    .cell-input {
      background-color: #ffffff;
      position: relative;
    }

    .cell-input input {
      width: 100%;
      height: 100%;
      min-height: 23px;
      border: none;
      outline: none;
      background: transparent;
      padding: 1px 5px;
      font-size: 11px;
      font-family: inherit;
      color: #111827;
      border-radius: 0;
    }

    .cell-input input:focus {
      background-color: #f8fbff;
    }

    .textarea-box {
      border: 1.5px solid var(--grid-border);
      background: #ffffff;
      width: 100%;
    }

    .textarea-box textarea {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      resize: vertical;
      font-family: inherit;
      font-size: 11px;
      padding: 6px 8px;
      display: block;
      color: #111827;
      line-height: 1.45;
    }

    .textarea-box textarea:focus {
      background-color: #fbfdff;
    }

    .box-sm {
      min-height: 52px;
    }
    .box-sm textarea {
      min-height: 52px;
    }

    .box-md {
      min-height: 82px;
    }
    .box-md textarea {
      min-height: 82px;
    }

    .box-lg {
      min-height: 130px;
    }
    .box-lg textarea {
      min-height: 130px;
    }

    /* Row height helpers */
    .row-h-24 {
      height: 24px;
    }

    /* Print specific optimization to guarantee single page A4 output */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .toolbar {
        display: none !important;
      }

      .sheet-wrapper {
        box-shadow: none !important;
        padding: 6mm 8mm !important;
        max-width: 100% !important;
        width: 100% !important;
      }

      .form-section {
        margin-bottom: 6px !important;
      }

      .section-header {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background-color: #184877 !important;
        color: #ffffff !important;
      }

      .cell-label,
      .table-head-th {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background-color: #dbe7f4 !important;
      }

      input, textarea {
        font-size: 10.5px !important;
      }

      @page {
        size: A4 portrait;
        margin: 6mm;
      }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <div class="toolbar-title">
      MAINTENANCE JOB CARD PORTAL
    </div>
    <div class="btn-group">
      <button class="btn" onclick="fillSampleData()" title="Populate form with example maintenance record">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Sample Data
      </button>
      <button class="btn" onclick="clearForm()" title="Clear all input fields">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Clear
      </button>
      <button class="btn btn-primary" onclick="window.print()" title="Print or save as PDF">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / PDF
      </button>
    </div>
  </div>

  <main class="sheet-wrapper" id="jobCardForm">

    <!-- 1. Top Document Title -->
    <h1 class="doc-main-title">DAILY MAINTENANCE / BREAKDOWN REPAIR JOB CARD</h1>

    <!-- 2. JOB CONTROL & MACHINE IDENTIFICATION SECTION -->
    <section class="form-section">
      <div class="section-header">JOB CONTROL &amp; MACHINE IDENTIFICATION</div>
      <table class="grid-table">
        <colgroup>
          <col style="width: 14%;">
          <col style="width: 13%;">
          <col style="width: 13%;">
          <col style="width: 13%;">
          <col style="width: 12%;">
          <col style="width: 12%;">
          <col style="width: 11%;">
          <col style="width: 12%;">
        </colgroup>
        <tbody>
          <!-- Row 1 -->
          <tr>
            <td class="cell-label">Equipment</td>
            <td class="cell-input"><input type="text" id="equipment" aria-label="Equipment"></td>
            <td class="cell-label">Fleet / Unit ID</td>
            <td class="cell-input"><input type="text" id="fleetId" aria-label="Fleet / Unit ID"></td>
            <td class="cell-label">Location</td>
            <td class="cell-input"><input type="text" id="location" aria-label="Location"></td>
            <td class="cell-label">Hour /KM</td>
            <td class="cell-input"><input type="text" id="hourKm" aria-label="Hour / KM"></td>
          </tr>
          <!-- Row 2 -->
          <tr>
            <td class="cell-label">Operator / Driver</td>
            <td class="cell-input"><input type="text" id="operator" aria-label="Operator / Driver"></td>
            <td class="cell-label">Department</td>
            <td class="cell-input"><input type="text" id="department" aria-label="Department"></td>
            <td class="cell-label">Time Reported</td>
            <td class="cell-input"><input type="text" id="timeReported" placeholder="HH:MM" aria-label="Time Reported"></td>
            <td class="cell-label">Time Attended</td>
            <td class="cell-input"><input type="text" id="timeAttended" placeholder="HH:MM" aria-label="Time Attended"></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 3. REPORTED FAILURE / REQUEST SECTION -->
    <section class="form-section">
      <div class="section-header">REPORTED FAILURE / REQUEST</div>
      <div class="textarea-box box-sm">
        <textarea id="reportedFailure" rows="3" aria-label="Reported Failure / Request"></textarea>
      </div>
    </section>

    <!-- 4. CORRECTIVE ACTION / WORK COMPLETED SECTION -->
    <section class="form-section">
      <div class="section-header">CORRECTIVE ACTION / WORK COMPLETED</div>
      <div class="textarea-box box-lg">
        <textarea id="correctiveAction" rows="7" aria-label="Corrective Action / Work Completed"></textarea>
      </div>
    </section>

    <!-- 5. PARTS, CONSUMABLES & MATERIALS SECTION -->
    <section class="form-section">
      <div class="section-header">PARTS, CONSUMABLES &amp; MATERIALS</div>
      <table class="grid-table">
        <colgroup>
          <col style="width: 14%;">
          <col style="width: 13%;">
          <col style="width: 13%;">
          <col style="width: 13%;">
          <col style="width: 12%;">
          <col style="width: 12%;">
          <col style="width: 11%;">
          <col style="width: 12%;">
        </colgroup>
        <thead>
          <tr>
            <th class="table-head-th">Description</th>
            <th class="table-head-th">Part No.</th>
            <th class="table-head-th">Qty</th>
            <th class="table-head-th">Unit</th>
            <th class="table-head-th">Source</th>
            <th class="table-head-th">Condition</th>
            <th class="table-head-th">Old Part Retu</th>
            <th class="table-head-th">Remarks</th>
          </tr>
        </thead>
        <tbody id="partsTableBody">
          <!-- 4 Data Rows Matching Original Image Layout -->
          <tr class="row-h-24">
            <td class="cell-input"><input type="text" aria-label="Description Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Part No Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Qty Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Unit Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Source Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Condition Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Old Part Return Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Remarks Row 1"></td>
          </tr>
          <tr class="row-h-24">
            <td class="cell-input"><input type="text" aria-label="Description Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Part No Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Qty Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Unit Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Source Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Condition Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Old Part Return Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Remarks Row 2"></td>
          </tr>
          <tr class="row-h-24">
            <td class="cell-input"><input type="text" aria-label="Description Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Part No Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Qty Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Unit Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Source Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Condition Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Old Part Return Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Remarks Row 3"></td>
          </tr>
          <tr class="row-h-24">
            <td class="cell-input"><input type="text" aria-label="Description Row 4"></td>
            <td class="cell-input"><input type="text" aria-label="Part No Row 4"></td>
            <td class="cell-input"><input type="text" aria-label="Qty Row 4"></td>
            <td class="cell-input"><input type="text" aria-label="Unit Row 4"></td>
            <td class="cell-input"><input type="text" aria-label="Source Row 4"></td>
            <td class="cell-input"><input type="text" aria-label="Condition Row 4"></td>
            <td class="cell-input"><input type="text" aria-label="Old Part Return Row 4"></td>
            <td class="cell-input"><input type="text" aria-label="Remarks Row 4"></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 6. LABOUR & DOWNTIME SECTION -->
    <section class="form-section">
      <div class="section-header">LABOUR &amp; DOWNTIME</div>
      <table class="grid-table">
        <colgroup>
          <col style="width: 14%;">
          <col style="width: 13%;">
          <col style="width: 13%;">
          <col style="width: 13%;">
          <col style="width: 12%;">
          <col style="width: 12%;">
          <col style="width: 23%;">
        </colgroup>
        <thead>
          <tr>
            <th class="table-head-th">Technician</th>
            <th class="table-head-th">Start</th>
            <th class="table-head-th">Finish</th>
            <th class="table-head-th">Labour Hrs</th>
            <th class="table-head-th">Machine Down</th>
            <th class="table-head-th">Work Hrs</th>
            <th class="table-head-th">Remarks</th>
          </tr>
        </thead>
        <tbody id="labourTableBody">
          <!-- 3 Data Rows Matching Original Image Layout -->
          <tr class="row-h-24">
            <td class="cell-input"><input type="text" aria-label="Technician Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Start Time Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Finish Time Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Labour Hours Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Machine Down Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Work Hours Row 1"></td>
            <td class="cell-input"><input type="text" aria-label="Remarks Row 1"></td>
          </tr>
          <tr class="row-h-24">
            <td class="cell-input"><input type="text" aria-label="Technician Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Start Time Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Finish Time Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Labour Hours Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Machine Down Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Work Hours Row 2"></td>
            <td class="cell-input"><input type="text" aria-label="Remarks Row 2"></td>
          </tr>
          <tr class="row-h-24">
            <td class="cell-input"><input type="text" aria-label="Technician Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Start Time Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Finish Time Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Labour Hours Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Machine Down Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Work Hours Row 3"></td>
            <td class="cell-input"><input type="text" aria-label="Remarks Row 3"></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 7. TEST, RELEASE & REMARKS SECTION -->
    <section class="form-section">
      <div class="section-header">TEST, RELEASE &amp; REMARKS</div>
      <div class="textarea-box box-md">
        <textarea id="testReleaseRemarks" rows="4" aria-label="Test, Release &amp; Remarks"></textarea>
      </div>
    </section>

    <!-- 8. SIGNATURES & DATE FOOTER TABLE -->
    <section class="form-section" style="margin-bottom: 0;">
      <table class="grid-table">
        <colgroup>
          <col style="width: 14%;">
          <col style="width: 13%;">
          <col style="width: 13%;">
          <col style="width: 13%;">
          <col style="width: 12%;">
          <col style="width: 12%;">
          <col style="width: 10%;">
          <col style="width: 13%;">
        </colgroup>
        <tbody>
          <tr class="row-h-24">
            <td class="cell-label">Technician Sign</td>
            <td class="cell-input"><input type="text" id="techSign" aria-label="Technician Signature"></td>
            <td class="cell-label">Supervisor Sign</td>
            <td class="cell-input"><input type="text" id="supSign" aria-label="Supervisor Signature"></td>
            <td class="cell-label">Operator Sign</td>
            <td class="cell-input"><input type="text" id="opSign" aria-label="Operator Signature"></td>
            <td class="cell-label">Date</td>
            <td class="cell-input"><input type="date" id="docDate" aria-label="Date"></td>
          </tr>
        </tbody>
      </table>
    </section>

  </main>

  <script>
    // Quick helper to populate example data for verification
    function fillSampleData() {
      document.getElementById('equipment').value = 'Excavator CAT 320D';
      document.getElementById('fleetId').value = 'EX-042';
      document.getElementById('location').value = 'Pit Section B';
      document.getElementById('hourKm').value = '14,850 hrs';
      document.getElementById('operator').value = 'J. Doe';
      document.getElementById('department').value = 'Earthmoving';
      document.getElementById('timeReported').value = '08:15 AM';
      document.getElementById('timeAttended').value = '08:40 AM';

      document.getElementById('reportedFailure').value = 'Hydraulic pressure drop on main arm cylinder. Audible fluid hissing and sluggish boom retraction.';
      document.getElementById('correctiveAction').value = '1. Isolated hydraulic circuit and relieved residual system pressure.\n2. Inspected high-pressure hydraulic hose line; identified rupture near elbow joint.\n3. Replaced defective hose assembly and renewed O-ring seals.\n4. Flushed contaminated fluid port, refilled hydraulic reservoir, and bled air from circuit.\n5. Conducted full load cycle test at normal operating RPM; zero leaks detected.';

      // Sample Parts
      const partsInputs = document.querySelectorAll('#partsTableBody tr:first-child input');
      if (partsInputs.length >= 8) {
        partsInputs[0].value = 'Hydraulic Hose Assy';
        partsInputs[1].value = '1P-5842';
        partsInputs[2].value = '1';
        partsInputs[3].value = 'Pcs';
        partsInputs[4].value = 'Main Store';
        partsInputs[5].value = 'New';
        partsInputs[6].value = 'Yes';
        partsInputs[7].value = 'Scrapped defect';
      }

      // Sample Labour
      const labourInputs = document.querySelectorAll('#labourTableBody tr:first-child input');
      if (labourInputs.length >= 7) {
        labourInputs[0].value = 'M. Santos (Tech)';
        labourInputs[1].value = '08:45';
        labourInputs[2].value = '11:15';
        labourInputs[3].value = '2.5';
        labourInputs[4].value = '3.0';
        labourInputs[5].value = '2.5';
        labourInputs[6].value = 'Completed on site';
      }

      document.getElementById('testReleaseRemarks').value = 'Full system pressure verified at 350 bar. Machine tested under operational load and handed back to field supervisor.';
      document.getElementById('techSign').value = 'M. Santos';
      document.getElementById('supSign').value = 'R. Vance';
      document.getElementById('opSign').value = 'J. Doe';
      
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('docDate').value = today;
    }

    // Clear all inputs and textareas
    function clearForm() {
      const inputs = document.querySelectorAll('#jobCardForm input');
      inputs.forEach(input => input.value = '');
      const textareas = document.querySelectorAll('#jobCardForm textarea');
      textareas.forEach(textarea => textarea.value = '');
    }

    // Set today's date as default on load
    window.addEventListener('DOMContentLoaded', () => {
      const dateInput = document.getElementById('docDate');
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    });
  </script>
</body>
</html>