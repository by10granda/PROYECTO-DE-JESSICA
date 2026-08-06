window.PrescriptionModule = (() => {
  let prescriptions = [];

  const doctorDefaults = () => ({ ...window.AppConfig.defaultDoctor });

  const getDoctor = () => ({
    ...doctorDefaults(),
    ...JSON.parse(localStorage.getItem(window.AppConfig.doctorStorageKey) || '{}')
  });

  const saveDoctor = (doctor) => localStorage.setItem(window.AppConfig.doctorStorageKey, JSON.stringify(doctor));

  const updateRecipeBadge = (id = '') => {
    document.getElementById('recipeNumberBadge').textContent = id || 'REC-PENDIENTE';
  };

  const patientFromForm = () => ({
    id: document.getElementById('rxPatientNationalId').value.trim(),
    firstName: document.getElementById('rxPatientName').value.trim(),
    lastName: '',
    nationalId: document.getElementById('rxPatientNationalId').value.trim(),
    age: document.getElementById('rxPatientAge').value,
    sex: document.getElementById('rxPatientSex').value,
    weight: document.getElementById('rxPatientWeight').value,
    phone: document.getElementById('rxPatientPhone').value.trim(),
    address: document.getElementById('rxPatientAddress').value.trim()
  });

  const patientFromPrescription = (prescription) => ({
    id: prescription.patientId || prescription.patientNationalId || '',
    firstName: prescription.patientName || '',
    lastName: '',
    nationalId: prescription.patientNationalId || prescription.patientId || '',
    age: prescription.patientAge || '',
    sex: prescription.patientSex || '',
    weight: prescription.patientWeight || '',
    phone: prescription.patientPhone || '',
    address: prescription.patientAddress || ''
  });

  const addMedicine = (medicine = {}) => {
    const template = document.getElementById('medicineTemplate');
    const node = template.content.firstElementChild.cloneNode(true);
    Object.entries(medicine).forEach(([key, value]) => {
      const field = node.querySelector(`[data-field="${key}"]`);
      if (field) field.value = value || '';
    });
    document.getElementById('medicinesList').appendChild(node);
    refreshMedicineIndexes();
  };

  const refreshMedicineIndexes = () => {
    const cards = document.querySelectorAll('#medicinesList .medicine-card');
    cards.forEach((card, index) => {
      card.querySelector('[data-med-index]').textContent = index + 1;
      card.querySelector('[data-remove-medicine]').disabled = cards.length === 1;
    });
  };

  const collectMedicines = () => [...document.querySelectorAll('#medicinesList .medicine-card')].map((card) => {
    const medicine = {};
    card.querySelectorAll('[data-field]').forEach((field) => {
      medicine[field.dataset.field] = field.value.trim();
    });
    return medicine;
  });

  const serializePrescription = () => {
    const patient = patientFromForm();
    const doctor = getDoctor();
    const medicines = collectMedicines();
    return {
      id: document.getElementById('editingPrescriptionId').value,
      patientId: patient.nationalId || patient.firstName,
      patientName: patient.firstName,
      patientNationalId: patient.nationalId,
      patientAge: patient.age,
      patientSex: patient.sex,
      patientWeight: patient.weight,
      patientPhone: patient.phone,
      patientAddress: patient.address,
      date: document.getElementById('prescriptionDate').value,
      nextAppointment: document.getElementById('nextAppointment').value,
      diagnosis: document.getElementById('diagnosis').value.trim(),
      medicines,
      medicinesSummary: medicines.map((medicine, index) => `${index + 1}. ${medicine.name} ${medicine.dose} ${medicine.route} ${medicine.frequency} ${medicine.duration}`.trim()).join('\n'),
      generalInstructions: document.getElementById('generalInstructions').value.trim(),
      doctorName: doctor.name || '',
      doctorSpecialty: doctor.specialty || '',
      doctorLicense: doctor.license || '',
      doctorAddress: doctor.address || '',
      doctorPhone: doctor.phone || '',
      doctorEmail: doctor.email || ''
    };
  };

  const clearForm = () => {
    document.getElementById('prescriptionForm').reset();
    document.getElementById('prescriptionForm').classList.remove('was-validated');
    document.getElementById('editingPrescriptionId').value = '';
    document.getElementById('prescriptionDate').value = Utils.todayISO();
    document.getElementById('medicinesList').innerHTML = '';
    updateRecipeBadge();
    addMedicine();
  };

  const fillPrescription = (prescription, duplicate = false) => {
    document.getElementById('editingPrescriptionId').value = duplicate ? '' : prescription.id;
    document.getElementById('rxPatientName').value = prescription.patientName || '';
    document.getElementById('rxPatientNationalId').value = prescription.patientNationalId || prescription.patientId || '';
    document.getElementById('rxPatientAge').value = prescription.patientAge || '';
    document.getElementById('rxPatientSex').value = prescription.patientSex || '';
    document.getElementById('rxPatientWeight').value = prescription.patientWeight || '';
    document.getElementById('rxPatientPhone').value = prescription.patientPhone || '';
    document.getElementById('rxPatientAddress').value = prescription.patientAddress || '';
    document.getElementById('prescriptionDate').value = duplicate ? Utils.todayISO() : prescription.date;
    document.getElementById('nextAppointment').value = duplicate ? '' : (prescription.nextAppointment || '');
    document.getElementById('diagnosis').value = prescription.diagnosis || '';
    document.getElementById('generalInstructions').value = prescription.generalInstructions || '';
    document.getElementById('medicinesList').innerHTML = '';
    (prescription.medicines || []).forEach(addMedicine);
    if (!document.querySelector('#medicinesList .medicine-card')) addMedicine();
    updateRecipeBadge(duplicate ? '' : prescription.id);
    App.showView('prescriptionView');
  };

  const loadHistory = async () => {
    const response = await Api.listPrescriptions();
    if (!Array.isArray(response)) throw new Error('Google Apps Script no devolvió una lista de recetas.');
    prescriptions = response;
    renderHistory();
  };

  const matchesHistory = (prescription, query) => {
    const normalized = Utils.normalize(query);
    if (!normalized) return true;
    const medicinesText = (prescription.medicines || []).map((medicine) => Object.values(medicine).join(' ')).join(' ');
    return [
      prescription.id,
      prescription.patientName,
      prescription.patientId,
      prescription.patientNationalId,
      prescription.patientPhone,
      prescription.patientAddress,
      prescription.date,
      prescription.nextAppointment,
      prescription.diagnosis,
      prescription.generalInstructions,
      prescription.medicinesSummary,
      medicinesText
    ].some((value) => Utils.normalize(value).includes(normalized));
  };

  const matchesHistoryFilters = (prescription) => {
    const patientInput = document.getElementById('historyPatientFilter').value;
    const fromDate = document.getElementById('historyFromDate').value;
    const toDate = document.getElementById('historyToDate').value;
    if (patientInput && !matchesHistory(prescription, patientInput)) return false;
    if (fromDate && prescription.date < fromDate) return false;
    if (toDate && prescription.date > toDate) return false;
    return true;
  };

  const renderHistory = () => {
    const query = document.getElementById('historySearch').value;
    const rows = prescriptions.filter((prescription) => matchesHistory(prescription, query) && matchesHistoryFilters(prescription));
    const table = document.getElementById('historyTable');
    if (!rows.length) {
      table.innerHTML = '<tr><td class="empty-state" colspan="5">No hay recetas registradas.</td></tr>';
      return;
    }
    table.innerHTML = rows.map((prescription) => `
      <tr>
        <td><span class="badge text-bg-light">${prescription.id}</span></td>
        <td>${prescription.date || '-'}</td>
        <td><strong>${prescription.patientName || '-'}</strong><small class="d-block text-muted">${prescription.patientNationalId || prescription.patientId || ''}</small></td>
        <td>${prescription.diagnosis || '-'}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-view-prescription="${prescription.id}">Consultar</button>
            <button class="btn btn-outline-success" data-pdf-prescription="${prescription.id}">PDF</button>
            <button class="btn btn-outline-secondary" data-duplicate-prescription="${prescription.id}">Duplicar</button>
          </div>
        </td>
      </tr>`).join('');
  };

  const createPdfFor = async (prescription) => {
    const patient = patientFromPrescription(prescription);
    if (!patient.firstName) throw new Error('Complete el nombre del paciente.');
    const doc = await PdfModule.buildPrescriptionPdf({ prescription, patient, doctor: getDoctor() });
    Utils.downloadPdf(doc, `${prescription.id || 'REC-PREVIA'}-${patient.firstName}.pdf`);
  };

  const bind = () => {
    document.getElementById('prescriptionDate').value = Utils.todayISO();
    document.getElementById('addMedicine').addEventListener('click', () => addMedicine());
    document.getElementById('clearPrescriptionForm').addEventListener('click', clearForm);
    document.getElementById('historySearch').addEventListener('input', renderHistory);
    document.getElementById('historyPatientFilter').addEventListener('input', renderHistory);
    document.getElementById('historyFromDate').addEventListener('change', renderHistory);
    document.getElementById('historyToDate').addEventListener('change', renderHistory);
    document.getElementById('clearHistoryFilters').addEventListener('click', () => {
      document.getElementById('historySearch').value = '';
      document.getElementById('historyPatientFilter').value = '';
      document.getElementById('historyFromDate').value = '';
      document.getElementById('historyToDate').value = '';
      renderHistory();
    });

    document.getElementById('medicinesList').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-medicine]');
      if (!button) return;
      button.closest('.medicine-card').remove();
      refreshMedicineIndexes();
    });

    document.getElementById('prescriptionForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!Utils.requireValidForm(form)) return;
      try {
        const saved = await Api.savePrescription(serializePrescription());
        Utils.showAlert(`Receta ${saved.id} guardada correctamente.`);
        clearForm();
        await loadHistory();
        await createPdfFor(saved);
      } catch (error) {
        Utils.showAlert(error.message || 'No se pudo guardar la receta.', 'danger');
      }
    });

    document.getElementById('previewPdf').addEventListener('click', async () => {
      try {
        const prescription = serializePrescription();
        prescription.id = prescription.id || 'REC-PREVIA';
        await createPdfFor(prescription);
      } catch (error) {
        Utils.showAlert(error.message, 'danger');
      }
    });

    document.getElementById('historyTable').addEventListener('click', async (event) => {
      const viewId = event.target.closest('[data-view-prescription]')?.dataset.viewPrescription;
      const pdfId = event.target.closest('[data-pdf-prescription]')?.dataset.pdfPrescription;
      const duplicateId = event.target.closest('[data-duplicate-prescription]')?.dataset.duplicatePrescription;
      const id = viewId || pdfId || duplicateId;
      if (!id) return;
      const prescription = prescriptions.find((item) => item.id === id);
      if (viewId) fillPrescription(prescription, false);
      if (duplicateId) fillPrescription(prescription, true);
      if (pdfId) await createPdfFor(prescription);
    });

    document.getElementById('doctorForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const doctor = {
        name: document.getElementById('doctorName').value.trim(),
        specialty: document.getElementById('doctorSpecialty').value.trim(),
        license: document.getElementById('doctorLicense').value.trim(),
        address: document.getElementById('doctorAddress').value.trim(),
        phone: document.getElementById('doctorPhone').value.trim(),
        email: document.getElementById('doctorEmail').value.trim(),
        logoUrl: document.getElementById('doctorLogo').value.trim(),
        signatureUrl: document.getElementById('doctorSignature').value.trim()
      };
      saveDoctor(doctor);
      Utils.showAlert('Datos del médico guardados.');
    });

    const doctor = getDoctor();
    document.getElementById('doctorName').value = doctor.name;
    document.getElementById('doctorSpecialty').value = doctor.specialty;
    document.getElementById('doctorLicense').value = doctor.license;
    document.getElementById('doctorAddress').value = doctor.address;
    document.getElementById('doctorPhone').value = doctor.phone;
    document.getElementById('doctorEmail').value = doctor.email;
    document.getElementById('doctorLogo').value = doctor.logoUrl;
    document.getElementById('doctorSignature').value = doctor.signatureUrl;
    clearForm();
  };

  return { bind, loadHistory, clearForm };
})();
