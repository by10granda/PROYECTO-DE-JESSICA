window.Api = (() => {
  const { appsScriptUrl, localStorageKey } = window.AppConfig;

  const emptyDb = () => ({ patients: [], prescriptions: [], counters: { patient: 0, prescription: 0 } });

  const readLocal = () => {
    const raw = localStorage.getItem(localStorageKey);
    return raw ? JSON.parse(raw) : emptyDb();
  };

  const writeLocal = (db) => localStorage.setItem(localStorageKey, JSON.stringify(db));

  const localRequest = async (action, payload = {}) => {
    const db = readLocal();
    if (action === 'listPatients') return db.patients;
    if (action === 'listPrescriptions') return db.prescriptions;

    if (action === 'savePatient') {
      const patient = { ...payload.patient, updatedAt: new Date().toISOString() };
      const index = db.patients.findIndex((item) => item.id === patient.id);
      if (index >= 0) db.patients[index] = patient;
      else {
        db.counters.patient += 1;
        patient.id = `PAC-${Utils.pad(db.counters.patient)}`;
        patient.createdAt = new Date().toISOString();
        db.patients.push(patient);
      }
      writeLocal(db);
      return patient;
    }

    if (action === 'deletePatient') {
      db.patients = db.patients.filter((patient) => patient.id !== payload.id);
      db.prescriptions = db.prescriptions.filter((recipe) => recipe.patientId !== payload.id);
      writeLocal(db);
      return { ok: true };
    }

    if (action === 'savePrescription') {
      const prescription = { ...payload.prescription, updatedAt: new Date().toISOString() };
      const index = db.prescriptions.findIndex((item) => item.id === prescription.id);
      if (index >= 0) db.prescriptions[index] = prescription;
      else {
        db.counters.prescription += 1;
        prescription.id = `REC-${Utils.pad(db.counters.prescription)}`;
        prescription.createdAt = new Date().toISOString();
        db.prescriptions.push(prescription);
      }
      writeLocal(db);
      return prescription;
    }

    throw new Error(`Acción local no soportada: ${action}`);
  };

  const remoteRequest = async (action, payload = {}) => {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    if (!response.ok) {
      throw new Error(`Google Apps Script respondió ${response.status}. Revise que el Web App permita acceso a cualquier persona.`);
    }
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Error en Google Apps Script');
    return result.data;
  };

  const request = (action, payload) => appsScriptUrl ? remoteRequest(action, payload) : localRequest(action, payload);

  return {
    listPatients: () => request('listPatients'),
    savePatient: (patient) => request('savePatient', { patient }),
    deletePatient: (id) => request('deletePatient', { id }),
    listPrescriptions: () => request('listPrescriptions'),
    savePrescription: (prescription) => request('savePrescription', { prescription })
  };
})();
