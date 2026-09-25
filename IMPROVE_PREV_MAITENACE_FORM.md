<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MAINTENANCE CONTROL — PREVENTIVE MAINTENANCE JOB CARD</title>
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
      color: #000000;
      padding: 24px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Top Toolbar (Non-printable) */
    .toolbar {
      width: 100%;
      max-width: 980px;
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
      font-size: 13.5px;
      color: var(--primary-navy);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .btn-group {
      display: flex;
      gap: 8px;
    }

    .btn {
      cursor: pointer;
      border: 1px solid #cbd5e1;
      padding: 6px 14px;
      font-size: 12.5px;
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

    /* Main Job Card Document Wrapper */
    .sheet-wrapper {
      width: 100%;
      max-width: 980px;
      background: #ffffff;
      padding: 22px 26px 26px 26px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
      border-radius: 2px;
    }

    /* Header Section */
    .doc-header {
      text-align: center;
      margin-bottom: 10px;
    }

    .doc-main-title {
      font-size: 14.5px;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #000000;
      text-transform: uppercase;
      line-height: 1.25;
    }

    .doc-subtitle {
      font-size: 11px;
      font-style: italic;
      color: #2b2b2b;
      margin-top: 2px;
      letter-spacing: 0.3px;
    }

    /* Section Banner Headers */
    .section-header {
      background-color: var(--primary-navy);
      color: #ffffff;
      font-weight: 800;
      font-size: 11.5px;
      text-align: left;
      padding: 3px 8px;
      letter-spacing: 0.5px;
      border: 1.5px solid var(--grid-border);
      border-bottom: none;
      text-transform: uppercase;
      user-select: none;
    }

    .form-section {
      margin-bottom: 9px;
    }

    /* Table Grid Styling */
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
      font-size: 10.5px;
      vertical-align: middle;
    }

    .row-h-26 {
      height: 26px;
    }

    .row-h-24 {
      height: 24px;
    }

    /* Label Cells (Pale blue) */
    .cell-label {
      background-color: var(--header-bg);
      font-weight: 700;
      font-size: 10.5px;
      color: #000000;
      padding: 2px 6px;
      text-align: left;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Checklist Component Name Column */
    .col-system {
      background-color: #ffffff;
      font-weight: 600;
      font-size: 10.5px;
      padding: 2px 6px;
      color: #000000;
      white-space: normal;
      line-height: 1.2;
    }

    /* Checklist Scope Column */
    .col-scope {
      background-color: #ffffff;
      font-size: 9.5px;
      color: #262626;
      padding: 2px 6px;
      line-height: 1.2;
      white-space: normal;
    }

    /* Input Cells */
    .cell-input {
      background-color: #ffffff;
      position: relative;
    }

    .cell-input input[type="text"],
    .cell-input input[type="number"],
    .cell-input input[type="date"] {
      width: 100%;
      height: 100%;
      min-height: 23px;
      border: none;
      outline: none;
      background: transparent;
      padding: 1px 5px;
      font-size: 10.5px;
      font-family: inherit;
      color: #111827;
      border-radius: 0;
    }

    .cell-input select {
      width: 100%;
      height: 100%;
      min-height: 23px;
      border: none;
      outline: none;
      background: transparent;
      padding: 1px 4px;
      font-size: 10px;
      font-family: inherit;
      color: #111827;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 4px center;
      background-size: 11px;
      padding-right: 18px;
    }

    .cell-input input:focus,
    .cell-input select:focus {
      background-color: #f8fbff;
    }

    .col-check-cell {
      text-align: center;
      background: #ffffff;
      position: relative;
    }

    .col-check-cell input {
      width: 100%;
      height: 100%;
      min-height: 25px;
      border: none;
      outline: none;
      background: transparent;
      text-align: center;
      font-size: 10.5px;
      font-weight: 500;
      font-family: inherit;
      color: #111827;
    }

    .col-check-cell input:focus {
      background-color: #f8fbff;
    }

    /* Multi-line comment / remark boxes */
    .textarea-container {
      border: 1.5px solid var(--grid-border);
      border-top: none;
      background: #ffffff;
      padding: 4px 6px 6px 6px;
    }

    .textarea-label {
      font-size: 10.5px;
      color: #2b2b2b;
      margin-bottom: 2px;
      display: block;
      font-weight: 500;
      user-select: none;
    }

    .textarea-container textarea {
      width: 100%;
      border: 1px solid #c9c9c9;
      outline: none;
      background: transparent;
      resize: vertical;
      font-family: inherit;
      font-size: 10.5px;
      padding: 4px 6px;
      line-height: 1.35;
      color: #111827;
    }

    .textarea-container textarea:focus {
      background-color: #fbfdff;
      border-color: #64748b;
    }

    .box-c {
      min-height: 48px;
    }

    .box-d {
      min-height: 42px;
    }

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
        padding: 4mm 6mm !important;
        max-width: 100% !important;
        width: 100% !important;
      }

      .form-section {
        margin-bottom: 5px !important;
      }

      .section-header {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background-color: #184877 !important;
        color: #ffffff !important;
      }

      .cell-label {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background-color: #dbe7f4 !important;
      }

      input, textarea, select {
        font-size: 10px !important;
      }

      .cell-input select {
        background-image: none !important;
      }

      @page {
        size: A4 portrait;
        margin: 5mm;
      }
    }
  </style>
</head>
<body>

  <!-- Top Operation Bar (Screen Only) -->
  <div class="toolbar">
    <div class="toolbar-title">Preventive Maintenance Job Card</div>
    <div class="btn-group">
      <button class="btn" onclick="fillDemoData()" title="Populate demo inspection data">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Demo Data
      </button>
      <button class="btn" onclick="clearForm()" title="Clear all fields">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Clear
      </button>
      <button class="btn btn-primary" onclick="window.print()" title="Print to A4 / Save as PDF">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / PDF
      </button>
    </div>
  </div>

  <!-- Document Sheet -->
  <main class="sheet-wrapper" id="pmForm">

    <!-- Header -->
    <header class="doc-header">
      <h1 class="doc-main-title">MAINTENANCE CONTROL &mdash; PREVENTIVE MAINTENANCE JOB CARD</h1>
      <p class="doc-subtitle">Controlled PM record &bull; Inspect &rarr; Service &rarr; Measure &rarr; Verify &rarr; Release</p>
    </header>

    <!-- SECTION A: PM CONTROL -->
    <section class="form-section">
      <div class="section-header">A. PM CONTROL</div>
      <table class="grid-table">
        <colgroup>
          <col style="width: 14%;">
          <col style="width: 17%;">
          <col style="width: 11.5%;">
          <col style="width: 11.5%;">
          <col style="width: 11.5%;">
          <col style="width: 11.5%;">
          <col style="width: 11.5%;">
          <col style="width: 11.5%;">
        </colgroup>
        <tbody>
          <!-- Row 1: Electrical -->
          <tr class="row-h-26">
            <td class="col-system">Electrical</td>
            <td class="col-scope">Battery, terminals, charging, lights, wiring</td>
            <td class="col-check-cell"><input type="text" aria-label="Electrical check 1"></td>
            <td class="col-check-cell"><input type="text" aria-label="Electrical check 2"></td>
            <td class="col-check-cell"><input type="text" aria-label="Electrical check 3"></td>
            <td class="col-check-cell"><input type="text" aria-label="Electrical check 4"></td>
            <td class="col-check-cell"><input type="text" aria-label="Electrical check 5"></td>
            <td class="col-check-cell"><input type="text" aria-label="Electrical check 6"></td>
          </tr>
          <!-- Row 2: Drilling / Working System -->
          <tr class="row-h-26">
            <td class="col-system">Drilling / Working System</td>
            <td class="col-scope">Feed, rotation, percussion, controls,</td>
            <td class="col-check-cell"><input type="text" aria-label="Drilling check 1"></td>
            <td class="col-check-cell"><input type="text" aria-label="Drilling check 2"></td>
            <td class="col-check-cell"><input type="text" aria-label="Drilling check 3"></td>
            <td class="col-check-cell"><input type="text" aria-label="Drilling check 4"></td>
            <td class="col-check-cell"><input type="text" aria-label="Drilling check 5"></td>
            <td class="col-check-cell"><input type="text" aria-label="Drilling check 6"></td>
          </tr>
          <!-- Row 3: Air / Pneumatic -->
          <tr class="row-h-26">
            <td class="col-system">Air / Pneumatic</td>
            <td class="col-scope">Compressor, receiver, hoses, drains, pressure</td>
            <td class="col-check-cell"><input type="text" aria-label="Pneumatics check 1"></td>
            <td class="col-check-cell"><input type="text" aria-label="Pneumatics check 2"></td>
            <td class="col-check-cell"><input type="text" aria-label="Pneumatics check 3"></td>
            <td class="col-check-cell"><input type="text" aria-label="Pneumatics check 4"></td>
            <td class="col-check-cell"><input type="text" aria-label="Pneumatics check 5"></td>
            <td class="col-check-cell"><input type="text" aria-label="Pneumatics check 6"></td>
          </tr>
          <!-- Row 4: Undercarriage / Chassis -->
          <tr class="row-h-26">
            <td class="col-system">Undercarriage / Chassis</td>
            <td class="col-scope">Fasteners, wear, cracks, pins, bushes</td>
            <td class="col-check-cell"><input type="text" aria-label="Undercarriage check 1"></td>
            <td class="col-check-cell"><input type="text" aria-label="Undercarriage check 2"></td>
            <td class="col-check-cell"><input type="text" aria-label="Undercarriage check 3"></td>
            <td class="col-check-cell"><input type="text" aria-label="Undercarriage check 4"></td>
            <td class="col-check-cell"><input type="text" aria-label="Undercarriage check 5"></td>
            <td class="col-check-cell"><input type="text" aria-label="Undercarriage check 6"></td>
          </tr>
          <!-- Row 5: Safety Systems -->
          <tr class="row-h-26">
            <td class="col-system">Safety Systems</td>
            <td class="col-scope">Emergency stops, alarms, guards, fire</td>
            <td class="col-check-cell"><input type="text" aria-label="Safety check 1"></td>
            <td class="col-check-cell"><input type="text" aria-label="Safety check 2"></td>
            <td class="col-check-cell"><input type="text" aria-label="Safety check 3"></td>
            <td class="col-check-cell"><input type="text" aria-label="Safety check 4"></td>
            <td class="col-check-cell"><input type="text" aria-label="Safety check 5"></td>
            <td class="col-check-cell"><input type="text" aria-label="Safety check 6"></td>
          </tr>
          <!-- Row 6: Lubrication -->
          <tr class="row-h-26">
            <td class="col-system">Lubrication</td>
            <td class="col-scope">Grease points, specified lubricant, contamination</td>
            <td class="col-check-cell"><input type="text" aria-label="Lubrication check 1"></td>
            <td class="col-check-cell"><input type="text" aria-label="Lubrication check 2"></td>
            <td class="col-check-cell"><input type="text" aria-label="Lubrication check 3"></td>
            <td class="col-check-cell"><input type="text" aria-label="Lubrication check 4"></td>
            <td class="col-check-cell"><input type="text" aria-label="Lubrication check 5"></td>
            <td class="col-check-cell"><input type="text" aria-label="Lubrication check 6"></td>
          </tr>
          <!-- Row 7: Tyres / Wheels / Brakes -->
          <tr class="row-h-26">
            <td class="col-system">Tyres / Wheels / Brakes</td>
            <td class="col-scope">Condition, pressure, wheel nuts, braking</td>
            <td class="col-check-cell"><input type="text" aria-label="Brakes check 1"></td>
            <td class="col-check-cell"><input type="text" aria-label="Brakes check 2"></td>
            <td class="col-check-cell"><input type="text" aria-label="Brakes check 3"></td>
            <td class="col-check-cell"><input type="text" aria-label="Brakes check 4"></td>
            <td class="col-check-cell"><input type="text" aria-label="Brakes check 5"></td>
            <td class="col-check-cell"><input type="text" aria-label="Brakes check 6"></td>
          </tr>
          <!-- Row 8: Final Functional Test -->
          <tr class="row-h-26">
            <td class="col-system">Final Functional Test</td>
            <td class="col-scope">Run/test machine and verify abnormal</td>
            <td class="col-check-cell"><input type="text" aria-label="Test check 1"></td>
            <td class="col-check-cell"><input type="text" aria-label="Test check 2"></td>
            <td class="col-check-cell"><input type="text" aria-label="Test check 3"></td>
            <td class="col-check-cell"><input type="text" aria-label="Test check 4"></td>
            <td class="col-check-cell"><input type="text" aria-label="Test check 5"></td>
            <td class="col-check-cell"><input type="text" aria-label="Test check 6"></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- SECTION C: SERVICE INTERVAL & PM COMPLETION -->
    <section class="form-section">
      <div class="section-header">C. SERVICE INTERVAL &amp; PM COMPLETION</div>
      <table class="grid-table">
        <colgroup>
          <col style="width: 14%;">
          <col style="width: 17%;">
          <col style="width: 15%;">
          <col style="width: 16%;">
          <col style="width: 13%;">
          <col style="width: 8%;">
          <col style="width: 13%;">
          <col style="width: 4%;">
        </colgroup>
        <tbody>
          <tr class="row-h-24">
            <td class="cell-label">PM Level</td>
            <td class="cell-input"><input type="text" id="pmLevel" aria-label="PM Level"></td>
            <td class="cell-label">Next Due</td>
            <td class="cell-input"><input type="text" id="nextDue" aria-label="Next Due"></td>
            <td class="cell-label">Total Labour Hrs</td>
            <td class="cell-input"><input type="text" id="totalLabour" aria-label="Total Labour Hours"></td>
            <td class="cell-label">Machine Down Hrs</td>
            <td class="cell-input"><input type="text" id="machineDown" aria-label="Machine Down Hours"></td>
          </tr>
        </tbody>
      </table>
      <div class="textarea-container">
        <label for="defectsRemarks" class="textarea-label">Defects found / corrective actions required / parts to order / recommendations:</label>
        <textarea id="defectsRemarks" class="box-c" rows="2" aria-label="Defects found, corrective actions, parts to order, recommendations"></textarea>
      </div>
    </section>

    <!-- SECTION D: RELEASE & SIGN-OFF -->
    <section class="form-section" style="margin-bottom: 0;">
      <div class="section-header">D. RELEASE &amp; SIGN-OFF</div>
      <table class="grid-table">
        <colgroup>
          <col style="width: 14%;">
          <col style="width: 17%;">
          <col style="width: 15%;">
          <col style="width: 16%;">
          <col style="width: 13%;">
          <col style="width: 12%;">
          <col style="width: 12%;">
          <col style="width: 1%;">
        </colgroup>
        <tbody>
          <tr class="row-h-24">
            <td class="cell-label">PM Result</td>
            <td class="cell-input">
              <select id="pmResult" aria-label="PM Result">
                <option value=""></option>
                <option value="PASS">PASS</option>
                <option value="CONDITIONAL PASS">CONDITIONAL PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="INCOMPLETE">INCOMPLETE</option>
              </select>
            </td>
            <td class="cell-label">Machine Status</td>
            <td class="cell-input">
              <select id="machineStatus" aria-label="Machine Status">
                <option value=""></option>
                <option value="OPERATIONAL">OPERATIONAL</option>
                <option value="TAGGED OUT">TAGGED OUT</option>
                <option value="AWAITING SPARES">AWAITING SPARES</option>
                <option value="RESTRICTED USE">RESTRICTED USE</option>
              </select>
            </td>
            <td class="cell-label">Technician Sign</td>
            <td class="cell-input"><input type="text" id="technicianSign" aria-label="Technician Signature"></td>
            <td class="cell-label">Supervisor Sign</td>
            <td class="cell-input"><input type="text" id="supervisorSign" aria-label="Supervisor Signature"></td>
          </tr>
        </tbody>
      </table>
      <div class="textarea-container">
        <label for="supervisorRemarks" class="textarea-label">Supervisor comments / outstanding defects / next inspection focus:</label>
        <textarea id="supervisorRemarks" class="box-d" rows="2" aria-label="Supervisor comments, outstanding defects, next inspection focus"></textarea>
      </div>
    </section>

  </main>

  <script>
    function fillDemoData() {
      // Sample checks for Section A
      const rows = document.querySelectorAll('tbody tr');
      rows.forEach((row, idx) => {
        if (idx < 8) {
          const checkInputs = row.querySelectorAll('.col-check-cell input');
          if (checkInputs.length >= 6) {
            checkInputs[0].value = 'OK';
            checkInputs[1].value = 'OK';
            checkInputs[2].value = (idx === 2 || idx === 6) ? 'ADJ' : 'OK';
            checkInputs[3].value = (idx === 5) ? 'LUBE' : 'OK';
            checkInputs[4].value = 'OK';
            checkInputs[5].value = 'VERIFIED';
          }
        }
      });

      // Section C fields
      document.getElementById('pmLevel').value = 'PM-250 (Level 2)';
      document.getElementById('nextDue').value = '15,100 hrs / 25-Oct-2026';
      document.getElementById('totalLabour').value = '4.5';
      document.getElementById('machineDown').value = '5.0';
      document.getElementById('defectsRemarks').value = 'Cleaned compressor intake valve & changed air filter element. Slight tension adjustment applied to alternator drive belt. Minor wear observed on LH track links (within allowable tolerance; re-evaluate at next PM).';

      // Section D fields
      document.getElementById('pmResult').value = 'PASS';
      document.getElementById('machineStatus').value = 'OPERATIONAL';
      document.getElementById('technicianSign').value = 'D. Miller (Tech)';
      document.getElementById('supervisorSign').value = 'K. Reynolds (Maint Sup)';
      document.getElementById('supervisorRemarks').value = 'Unit inspected post-test run under full load. Operating pressures and thermal limits normal. Authorized for production handover.';
    }

    function clearForm() {
      const inputs = document.querySelectorAll('#pmForm input');
      inputs.forEach(input => input.value = '');
      const textareas = document.querySelectorAll('#pmForm textarea');
      textareas.forEach(textarea => textarea.value = '');
      const selects = document.querySelectorAll('#pmForm select');
      selects.forEach(select => select.selectedIndex = 0);
    }
  </script>
</body>
</html>