const SPREADSHEET_ID = '16dXfmZbyFqNHVDKPPetcVdRXSydX6oIMpOrRRY_8uac';

const SHEETS = {
  patients: 'Pacientes',
  prescriptions: 'Recetas',
  counters: 'Contadores'
};

const PATIENT_HEADERS = [
  'id', 'firstName', 'lastName', 'nationalId', 'birthDate', 'age', 'sex', 'weight', 'height',
  'address', 'phone', 'email', 'allergies', 'personalHistory', 'familyHistory', 'observations',
  'createdAt', 'updatedAt'
];

const PRESCRIPTION_HEADERS = [
  'id', 'patientId', 'date', 'nextAppointment', 'diagnosis', 'medicines', 'generalInstructions',
  'createdAt', 'updatedAt'
];

function doGet() {
  setupDatabase_();
  return json_({ ok: true, data: { message: 'Recetas Jessica API activa' } });
}

function doPost(event) {
  try {
    setupDatabase_();
    const body = JSON.parse(event.postData.contents || '{}');
    const action = body.action;
    const payload = body.payload || {};
    const handlers = {
      listPatients: () => listRows_(SHEETS.patients, PATIENT_HEADERS).map(normalizePatient_),
      savePatient: () => savePatient_(payload.patient),
      deletePatient: () => deletePatient_(payload.id),
      listPrescriptions: () => listRows_(SHEETS.prescriptions, PRESCRIPTION_HEADERS).map(normalizePrescription_),
      savePrescription: () => savePrescription_(payload.prescription)
    };
    if (!handlers[action]) throw new Error('Acción no soportada: ' + action);
    return json_({ ok: true, data: handlers[action]() });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function setupDatabase_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureSheet_(ss, SHEETS.patients, PATIENT_HEADERS);
  ensureSheet_(ss, SHEETS.prescriptions, PRESCRIPTION_HEADERS);
  ensureSheet_(ss, SHEETS.counters, ['key', 'value']);
  const counters = ss.getSheetByName(SHEETS.counters);
  if (counters.getLastRow() < 2) counters.getRange(2, 1, 2, 2).setValues([['patient', 0], ['prescription', 0]]);
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = headers.some((header, index) => current[index] !== header);
  if (needsHeaders) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function listRows_(sheetName, headers) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, headers.length).getValues().filter((row) => row[0]).map((row) => {
    return headers.reduce((object, header, index) => {
      object[header] = row[index];
      return object;
    }, {});
  });
}

function savePatient_(patient) {
  if (!patient) throw new Error('Paciente vacío.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.patients);
    const rows = listRows_(SHEETS.patients, PATIENT_HEADERS);
    const now = new Date().toISOString();
    const existingIndex = rows.findIndex((row) => row.id === patient.id);
    const saved = Object.assign({}, patient, { updatedAt: now });
    if (existingIndex >= 0) {
      saved.createdAt = rows[existingIndex].createdAt || now;
      sheet.getRange(existingIndex + 2, 1, 1, PATIENT_HEADERS.length).setValues([toRow_(saved, PATIENT_HEADERS)]);
    } else {
      saved.id = nextUniqueId_('patient', 'PAC', rows.map((row) => row.id));
      saved.createdAt = now;
      sheet.appendRow(toRow_(saved, PATIENT_HEADERS));
    }
    return normalizePatient_(saved);
  } finally {
    lock.releaseLock();
  }
}

function deletePatient_(id) {
  if (!id) throw new Error('ID de paciente requerido.');
  deleteRowsByValue_(SHEETS.patients, 1, id);
  deleteRowsByValue_(SHEETS.prescriptions, 2, id);
  return { ok: true };
}

function savePrescription_(prescription) {
  if (!prescription) throw new Error('Receta vacía.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.prescriptions);
    const rows = listRows_(SHEETS.prescriptions, PRESCRIPTION_HEADERS);
    const now = new Date().toISOString();
    const existingIndex = rows.findIndex((row) => row.id === prescription.id);
    const saved = Object.assign({}, prescription, {
      medicines: JSON.stringify(prescription.medicines || []),
      updatedAt: now
    });
    if (existingIndex >= 0) {
      saved.createdAt = rows[existingIndex].createdAt || now;
      sheet.getRange(existingIndex + 2, 1, 1, PRESCRIPTION_HEADERS.length).setValues([toRow_(saved, PRESCRIPTION_HEADERS)]);
    } else {
      saved.id = nextUniqueId_('prescription', 'REC', rows.map((row) => row.id));
      saved.createdAt = now;
      sheet.appendRow(toRow_(saved, PRESCRIPTION_HEADERS));
    }
    return normalizePrescription_(saved);
  } finally {
    lock.releaseLock();
  }
}

function nextUniqueId_(counterKey, prefix, existingIds) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.counters);
  const data = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 2).getValues();
  let rowIndex = data.findIndex((row) => row[0] === counterKey);
  if (rowIndex < 0) {
    sheet.appendRow([counterKey, 0]);
    rowIndex = sheet.getLastRow() - 2;
  }
  let value = Number(sheet.getRange(rowIndex + 2, 2).getValue() || 0);
  let id = '';
  do {
    value += 1;
    id = `${prefix}-${String(value).padStart(6, '0')}`;
  } while (existingIds.indexOf(id) >= 0);
  sheet.getRange(rowIndex + 2, 2).setValue(value);
  return id;
}

function deleteRowsByValue_(sheetName, column, value) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  for (let row = sheet.getLastRow(); row >= 2; row -= 1) {
    if (sheet.getRange(row, column).getValue() === value) sheet.deleteRow(row);
  }
}

function toRow_(object, headers) {
  return headers.map((header) => object[header] == null ? '' : object[header]);
}

function normalizePatient_(patient) {
  return Object.assign({}, patient, { age: Number(patient.age || 0) || '' });
}

function normalizePrescription_(prescription) {
  const copy = Object.assign({}, prescription);
  if (typeof copy.medicines === 'string') {
    try {
      copy.medicines = JSON.parse(copy.medicines || '[]');
    } catch (error) {
      copy.medicines = [];
    }
  }
  return copy;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
