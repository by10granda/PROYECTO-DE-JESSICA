const SPREADSHEET_ID = '16dXfmZbyFqNHVDKPPetcVdRXSydX6oIMpOrRRY_8uac';
const DATABASE_SHEET = 'BaseDatos';

const HEADERS = [
  'recordType', 'primaryId', 'patientId', 'prescriptionId',
  'firstName', 'lastName', 'patientName', 'nationalId', 'birthDate', 'age', 'sex', 'weight', 'height',
  'address', 'phone', 'email', 'allergies', 'personalHistory', 'familyHistory', 'observations',
  'patientNationalId', 'patientPhone', 'patientAddress',
  'date', 'nextAppointment', 'diagnosis', 'generalInstructions', 'medicinesSummary', 'medicinesJson',
  'medicine1Name', 'medicine1Presentation', 'medicine1Concentration', 'medicine1Dose', 'medicine1Route', 'medicine1Frequency', 'medicine1Duration', 'medicine1Quantity', 'medicine1Instructions',
  'medicine2Name', 'medicine2Presentation', 'medicine2Concentration', 'medicine2Dose', 'medicine2Route', 'medicine2Frequency', 'medicine2Duration', 'medicine2Quantity', 'medicine2Instructions',
  'medicine3Name', 'medicine3Presentation', 'medicine3Concentration', 'medicine3Dose', 'medicine3Route', 'medicine3Frequency', 'medicine3Duration', 'medicine3Quantity', 'medicine3Instructions',
  'medicine4Name', 'medicine4Presentation', 'medicine4Concentration', 'medicine4Dose', 'medicine4Route', 'medicine4Frequency', 'medicine4Duration', 'medicine4Quantity', 'medicine4Instructions',
  'medicine5Name', 'medicine5Presentation', 'medicine5Concentration', 'medicine5Dose', 'medicine5Route', 'medicine5Frequency', 'medicine5Duration', 'medicine5Quantity', 'medicine5Instructions',
  'doctorName', 'doctorSpecialty', 'doctorLicense', 'doctorAddress', 'doctorPhone', 'doctorEmail',
  'createdAt', 'updatedAt'
];

function doGet(event) {
  return handleRequest_(event);
}

function doPost(event) {
  return handleRequest_(event);
}

function handleRequest_(event) {
  try {
    setupDatabase_();
    const body = getRequestBody_(event);
    const action = body.action;
    const payload = body.payload || {};
    if (!action) return json_({ ok: true, data: { message: 'Recetas Jessica API activa', sheet: DATABASE_SHEET } });
    const handlers = {
      listPatients: () => listPatients_(),
      savePatient: () => savePatient_(payload.patient),
      deletePatient: () => deletePatient_(payload.id),
      listPrescriptions: () => listPrescriptions_(),
      savePrescription: () => savePrescription_(payload.prescription)
    };
    if (!handlers[action]) throw new Error('Acción no soportada: ' + action);
    return json_({ ok: true, data: handlers[action]() });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function getRequestBody_(event) {
  if (!event) return {};
  if (event.parameter && event.parameter.action) {
    return {
      action: event.parameter.action,
      payload: event.parameter.payload ? JSON.parse(event.parameter.payload) : {}
    };
  }
  if (event.postData && event.postData.contents) return JSON.parse(event.postData.contents || '{}');
  return {};
}

function setupDatabase_() {
  const sheet = getSheet_();
  ensureHeaders_(sheet);
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const existing = ss.getSheetByName(DATABASE_SHEET);
  if (existing) return existing;
  const firstSheet = ss.getSheets()[0] || ss.insertSheet(DATABASE_SHEET);
  firstSheet.setName(DATABASE_SHEET);
  return firstSheet;
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = HEADERS.some((header, index) => current[index] !== header);
  if (needsHeaders) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, Math.min(HEADERS.length, 25));
}

function listRows_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues().filter((row) => row[0]).map((row) => {
    return HEADERS.reduce((object, header, index) => {
      object[header] = row[index];
      return object;
    }, {});
  });
}

function listPatients_() {
  return listRows_().filter((row) => row.recordType === 'PATIENT').map(rowToPatient_);
}

function listPrescriptions_() {
  return listRows_().filter((row) => row.recordType === 'PRESCRIPTION').map(rowToPrescription_);
}

function savePatient_(patient) {
  if (!patient) throw new Error('Paciente vacío.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getSheet_();
    const rows = listRows_();
    const now = new Date().toISOString();
    const id = patient.id || nextUniqueId_('patient', 'PAC', rows.map((row) => row.patientId || row.primaryId));
    const existingIndex = rows.findIndex((row) => row.recordType === 'PATIENT' && row.patientId === id);
    const saved = Object.assign({}, patient, {
      id,
      recordType: 'PATIENT',
      primaryId: id,
      patientId: id,
      patientName: fullName_(patient),
      updatedAt: now,
      createdAt: existingIndex >= 0 ? rows[existingIndex].createdAt : now
    });
    writeRow_(sheet, existingIndex, patientToRow_(saved));
    return rowToPatient_(saved);
  } finally {
    lock.releaseLock();
  }
}

function deletePatient_(id) {
  if (!id) throw new Error('ID de paciente requerido.');
  const sheet = getSheet_();
  for (let row = sheet.getLastRow(); row >= 2; row -= 1) {
    const recordType = sheet.getRange(row, 1).getValue();
    const patientId = sheet.getRange(row, 3).getValue();
    if ((recordType === 'PATIENT' || recordType === 'PRESCRIPTION') && patientId === id) sheet.deleteRow(row);
  }
  return { ok: true };
}

function savePrescription_(prescription) {
  if (!prescription) throw new Error('Receta vacía.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getSheet_();
    const rows = listRows_();
    const now = new Date().toISOString();
    const id = prescription.id || nextUniqueId_('prescription', 'REC', rows.map((row) => row.prescriptionId || row.primaryId));
    const medicines = prescription.medicines || [];
    const existingIndex = rows.findIndex((row) => row.recordType === 'PRESCRIPTION' && row.prescriptionId === id);
    const saved = Object.assign({}, prescription, {
      id,
      recordType: 'PRESCRIPTION',
      primaryId: id,
      prescriptionId: id,
      medicines,
      medicinesSummary: prescription.medicinesSummary || buildMedicinesSummary_(medicines),
      medicinesJson: JSON.stringify(medicines),
      updatedAt: now,
      createdAt: existingIndex >= 0 ? rows[existingIndex].createdAt : now
    });
    writeRow_(sheet, existingIndex, prescriptionToRow_(saved));
    return rowToPrescription_(saved);
  } finally {
    lock.releaseLock();
  }
}

function writeRow_(sheet, existingIndex, rowObject) {
  const values = [HEADERS.map((header) => rowObject[header] == null ? '' : rowObject[header])];
  if (existingIndex >= 0) sheet.getRange(existingIndex + 2, 1, 1, HEADERS.length).setValues(values);
  else sheet.appendRow(values[0]);
}

function patientToRow_(patient) {
  return Object.assign({}, patient, {
    firstName: patient.firstName || '',
    lastName: patient.lastName || '',
    patientName: patient.patientName || fullName_(patient),
    nationalId: patient.nationalId || '',
    birthDate: patient.birthDate || '',
    age: patient.age || '',
    sex: patient.sex || '',
    weight: patient.weight || '',
    height: patient.height || '',
    address: patient.address || '',
    phone: patient.phone || '',
    email: patient.email || '',
    allergies: patient.allergies || '',
    personalHistory: patient.personalHistory || '',
    familyHistory: patient.familyHistory || '',
    observations: patient.observations || ''
  });
}

function prescriptionToRow_(prescription) {
  const row = Object.assign({}, prescription, {
    patientName: prescription.patientName || '',
    patientNationalId: prescription.patientNationalId || '',
    patientPhone: prescription.patientPhone || '',
    patientAddress: prescription.patientAddress || '',
    age: prescription.patientAge || '',
    sex: prescription.patientSex || '',
    weight: prescription.patientWeight || '',
    date: prescription.date || '',
    nextAppointment: prescription.nextAppointment || '',
    diagnosis: prescription.diagnosis || '',
    generalInstructions: prescription.generalInstructions || '',
    medicinesSummary: prescription.medicinesSummary || '',
    medicinesJson: prescription.medicinesJson || JSON.stringify(prescription.medicines || [])
  });
  (prescription.medicines || []).slice(0, 5).forEach((medicine, index) => {
    const prefix = `medicine${index + 1}`;
    row[`${prefix}Name`] = medicine.name || '';
    row[`${prefix}Presentation`] = medicine.presentation || '';
    row[`${prefix}Concentration`] = medicine.concentration || '';
    row[`${prefix}Dose`] = medicine.dose || '';
    row[`${prefix}Route`] = medicine.route || '';
    row[`${prefix}Frequency`] = medicine.frequency || '';
    row[`${prefix}Duration`] = medicine.duration || '';
    row[`${prefix}Quantity`] = medicine.quantity || '';
    row[`${prefix}Instructions`] = medicine.instructions || '';
  });
  return row;
}

function rowToPatient_(row) {
  return {
    id: row.patientId || row.primaryId,
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    nationalId: row.nationalId || '',
    birthDate: row.birthDate || '',
    age: Number(row.age || 0) || '',
    sex: row.sex || '',
    weight: row.weight || '',
    height: row.height || '',
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    allergies: row.allergies || '',
    personalHistory: row.personalHistory || '',
    familyHistory: row.familyHistory || '',
    observations: row.observations || '',
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || ''
  };
}

function rowToPrescription_(row) {
  const copy = Object.assign({}, row, {
    id: row.prescriptionId || row.primaryId,
    medicines: parseMedicines_(row.medicinesJson),
    patientNationalId: row.patientNationalId || row.nationalId || '',
    patientPhone: row.patientPhone || row.phone || '',
    patientAddress: row.patientAddress || row.address || '',
    patientAge: row.age || '',
    patientSex: row.sex || '',
    patientWeight: row.weight || ''
  });
  if (!copy.medicines.length) copy.medicines = parseMedicines_(row.medicinesSummary);
  return copy;
}

function parseMedicines_(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function buildMedicinesSummary_(medicines) {
  return medicines.map((medicine, index) => {
    return `${index + 1}. ${medicine.name || ''} ${medicine.dose || ''} ${medicine.route || ''} ${medicine.frequency || ''} ${medicine.duration || ''}`.trim();
  }).join('\n');
}

function nextUniqueId_(counterKey, prefix, existingIds) {
  const properties = PropertiesService.getScriptProperties();
  let value = Number(properties.getProperty(counterKey) || 0);
  let id = '';
  do {
    value += 1;
    id = `${prefix}-${String(value).padStart(6, '0')}`;
  } while (existingIds.indexOf(id) >= 0);
  properties.setProperty(counterKey, String(value));
  return id;
}

function fullName_(patient) {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
