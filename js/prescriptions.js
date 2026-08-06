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
    document.querySelectorAll('#medicinesList .medicine-card').forEach((card, index) => {
      card.querySelector('[data-med-index]').textContent = index + 1;
      card.querySelector('[data-remove-medicine]').disabled = document.querySelectorAll('#medicinesList .medicine-card').length === 1;
    });
  };

  const collectMedicines = () => [...document.querySelectorAll('#medicinesList .medicine-card')].map((card) => {
    const medicine = {};
    card.querySelectorAll('[data-field]').forEach((field) => {
      medicine[field.dataset.field] = field.value.trim();
    });
    return medicine;
  });

  const selectedPatient = () => {
    const id = document.getElementById('prescriptionPatientId').value;
    return PatientModule.getPatientById(id) || PatientModule.resolvePatientFromInput(document.getElementById('prescriptionPatientSearch').value);
  };

  const serializePrescription = () => {
    const patient = selectedPatient();
    return {
      id: document.getElementById('editingPrescriptionId').value,
      patientId: patient?.id || '',
      date: document.getElementById('prescriptionDate').value,
      nextAppointment: document.getElementById('nextAppointment').value,
      diagnosis: document.getElementById('diagnosis').value.trim(),
      medicines: collectMedicines(),
      generalInstructions: document.getElementById('generalInstructions').value.trim()
    };
  };

  const clearForm = () => {
    document.getElementById('prescriptionForm').reset();
    document.getElementById('prescriptionForm').classList.remove('was-validated');
    document.getElementById('editingPrescriptionId').value = '';
    document.getElementById('prescriptionPatientId').value = '';
    document.getElementById('prescriptionDate').value = Utils.todayISO();
    document.getElementById('medicinesList').innerHTML = '';
    updateRecipeBadge();
    addMedicine();
  };

  const fillPrescription = (prescription, duplicate = false) => {
    const patient = PatientModule.getPatientById(prescription.patientId);
    document.getElementById('editingPrescriptionId').value = duplicate ? '' : prescription.id;
    document.getElementById('prescriptionPatientId').value = patient?.id || '';
    document.getElementById('prescriptionPatientSearch').value = patient ? PatientModule.patientToSuggestion(patient) : '';
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

  const startForPatient = (patientId) => {
    clearForm();
    const patient = PatientModule.getPatientById(patientId);
    if (patient) {
      document.getElementById('prescriptionPatientId').value = patient.id;
      document.getElementById('prescriptionPatientSearch').value = PatientModule.patientToSuggestion(patient);
    }
    App.showView('prescriptionView');
  };

  const loadHistory = async () => {
    prescriptions = await Api.listPrescriptions();
    renderHistory();
  };

  const matchesHistory = (prescription, query) => {
    const patient = PatientModule.getPatientById(prescription.patientId);
    const normalized = Utils.normalize(query);
    if (!normalized) return true;
    return [prescription.id, prescription.diagnosis, patient?.id, patient && Utils.fullName(patient)]
      .some((value) => Utils.normalize(value).includes(normalized));
  };

  const renderHistory = () => {
    const query = document.getElementById('historySearch').value;
    const rows = prescriptions.filter((prescription) => matchesHistory(prescription, query));
    const table = document.getElementById('historyTable');
    if (!rows.length) {
      table.innerHTML = '<tr><td class="empty-state" colspan="5">No hay recetas registradas.</td></tr>';
      return;
    }
    table.innerHTML = rows.map((prescription) => {
      const patient = PatientModule.getPatientById(prescription.patientId);
      return `
        <tr>
          <td><span class="badge text-bg-light">${prescription.id}</span></td>
          <td>${prescription.date || '-'}</td>
          <td><strong>${patient ? Utils.fullName(patient) : prescription.patientId}</strong><small class="d-block text-muted">${prescription.patientId}</small></td>
          <td>${prescription.diagnosis || '-'}</td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" data-view-prescription="${prescription.id}">Consultar</button>
              <button class="btn btn-outline-success" data-pdf-prescription="${prescription.id}">PDF</button>
              <button class="btn btn-outline-secondary" data-duplicate-prescription="${prescription.id}">Duplicar</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  };

  const createPdfFor = async (prescription) => {
    const patient = PatientModule.getPatientById(prescription.patientId);
    if (!patient) throw new Error('Seleccione un paciente válido.');
    const doc = await PdfModule.buildPrescriptionPdf({ prescription, patient, doctor: getDoctor() });
    Utils.downloadPdf(doc, `${prescription.id || 'REC-PREVIA'}-${Utils.fullName(patient)}.pdf`);
  };

  const bind = () => {
    document.getElementById('prescriptionDate').value = Utils.todayISO();
    document.getElementById('addMedicine').addEventListener('click', () => addMedicine());
    document.getElementById('clearPrescriptionForm').addEventListener('click', clearForm);
    document.getElementById('historySearch').addEventListener('input', renderHistory);

    document.getElementById('prescriptionPatientSearch').addEventListener('change', (event) => {
      const patient = PatientModule.resolvePatientFromInput(event.target.value);
      document.getElementById('prescriptionPatientId').value = patient?.id || '';
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
      const patient = selectedPatient();
      if (patient) document.getElementById('prescriptionPatientId').value = patient.id;
      if (!Utils.requireValidForm(form) || !patient) {
        Utils.showAlert('Seleccione un paciente válido y complete los campos obligatorios.', 'danger');
        return;
      }
      const saved = await Api.savePrescription(serializePrescription());
      Utils.showAlert(`Receta ${saved.id} guardada correctamente.`);
      clearForm();
      await loadHistory();
      await createPdfFor(saved);
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

  return { bind, loadHistory, startForPatient, clearForm };
})();
