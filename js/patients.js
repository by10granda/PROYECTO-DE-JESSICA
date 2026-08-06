window.PatientModule = (() => {
  let patients = [];

  const fields = [
    'patientId', 'firstName', 'lastName', 'nationalId', 'birthDate', 'age', 'sex', 'weight', 'height',
    'address', 'phone', 'email', 'allergies', 'personalHistory', 'familyHistory', 'observations'
  ];

  const getPatientById = (id) => patients.find((patient) => patient.id === id);

  const getPatients = () => [...patients];

  const patientToSuggestion = (patient) => `${patient.id} - ${Utils.fullName(patient)}${patient.nationalId ? ` - CI: ${patient.nationalId}` : ''}`;

  const refreshSuggestions = () => {
    const list = document.getElementById('patientSuggestions');
    list.innerHTML = patients.map((patient) => `<option value="${patientToSuggestion(patient)}"></option>`).join('');
  };

  const serializeForm = () => ({
    id: document.getElementById('patientId').value,
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    nationalId: document.getElementById('nationalId').value.trim(),
    birthDate: document.getElementById('birthDate').value,
    age: Number(document.getElementById('age').value || 0),
    sex: document.getElementById('sex').value,
    weight: document.getElementById('weight').value,
    height: document.getElementById('height').value,
    address: document.getElementById('address').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    allergies: document.getElementById('allergies').value.trim(),
    personalHistory: document.getElementById('personalHistory').value.trim(),
    familyHistory: document.getElementById('familyHistory').value.trim(),
    observations: document.getElementById('observations').value.trim()
  });

  const fillForm = (patient) => {
    document.getElementById('patientId').value = patient.id || '';
    document.getElementById('firstName').value = patient.firstName || '';
    document.getElementById('lastName').value = patient.lastName || '';
    document.getElementById('nationalId').value = patient.nationalId || '';
    document.getElementById('birthDate').value = patient.birthDate || '';
    document.getElementById('age').value = patient.age || Utils.calculateAge(patient.birthDate);
    document.getElementById('sex').value = patient.sex || '';
    document.getElementById('weight').value = patient.weight || '';
    document.getElementById('height').value = patient.height || '';
    document.getElementById('address').value = patient.address || '';
    document.getElementById('phone').value = patient.phone || '';
    document.getElementById('email').value = patient.email || '';
    document.getElementById('allergies').value = patient.allergies || '';
    document.getElementById('personalHistory').value = patient.personalHistory || '';
    document.getElementById('familyHistory').value = patient.familyHistory || '';
    document.getElementById('observations').value = patient.observations || '';
    document.getElementById('patientFormTitle').textContent = patient.id ? `Editar paciente ${patient.id}` : 'Registrar paciente';
  };

  const clearForm = () => {
    document.getElementById('patientForm').reset();
    document.getElementById('patientForm').classList.remove('was-validated');
    fields.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.value = '';
    });
    document.getElementById('patientFormTitle').textContent = 'Registrar paciente';
  };

  const matchesSearch = (patient, query) => {
    const normalized = Utils.normalize(query);
    if (!normalized) return true;
    return [patient.id, Utils.fullName(patient), patient.nationalId].some((value) => Utils.normalize(value).includes(normalized));
  };

  const renderTable = () => {
    const query = document.getElementById('patientSearch').value;
    const rows = patients.filter((patient) => matchesSearch(patient, query));
    const table = document.getElementById('patientsTable');
    if (!rows.length) {
      table.innerHTML = '<tr><td class="empty-state" colspan="6">No hay pacientes para mostrar.</td></tr>';
      return;
    }
    table.innerHTML = rows.map((patient) => `
      <tr>
        <td><span class="badge text-bg-light">${patient.id}</span></td>
        <td><strong>${Utils.fullName(patient)}</strong><small class="d-block text-muted">${patient.sex || 'Sin sexo registrado'}</small></td>
        <td>${patient.nationalId || '-'}</td>
        <td>${patient.age || Utils.calculateAge(patient.birthDate) || '-'}</td>
        <td>${patient.phone || '-'}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-edit-patient="${patient.id}">Editar</button>
            <button class="btn btn-outline-success" data-prescribe-patient="${patient.id}">Receta</button>
            <button class="btn btn-outline-danger" data-delete-patient="${patient.id}">Eliminar</button>
          </div>
        </td>
      </tr>`).join('');
  };

  const load = async () => {
    patients = await Api.listPatients();
    patients = patients.map((patient) => ({ ...patient, age: patient.age || Utils.calculateAge(patient.birthDate) }));
    refreshSuggestions();
    renderTable();
  };

  const resolvePatientFromInput = (value) => {
    const normalized = Utils.normalize(value);
    return patients.find((patient) => {
      const suggestion = Utils.normalize(patientToSuggestion(patient));
      return suggestion === normalized
        || Utils.normalize(patient.id) === normalized
        || Utils.normalize(patient.nationalId) === normalized
        || Utils.normalize(Utils.fullName(patient)) === normalized;
    });
  };

  const bind = () => {
    document.getElementById('birthDate').addEventListener('change', (event) => {
      document.getElementById('age').value = Utils.calculateAge(event.target.value);
    });

    document.getElementById('clearPatientForm').addEventListener('click', clearForm);
    document.getElementById('patientSearch').addEventListener('input', renderTable);

    document.getElementById('patientForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      document.getElementById('age').value = Utils.calculateAge(document.getElementById('birthDate').value);
      if (!Utils.requireValidForm(form)) return;
      const patient = await Api.savePatient(serializeForm());
      Utils.showAlert(`Paciente ${patient.id} guardado correctamente.`);
      clearForm();
      await load();
    });

    document.getElementById('patientsTable').addEventListener('click', async (event) => {
      const editId = event.target.closest('[data-edit-patient]')?.dataset.editPatient;
      const prescribeId = event.target.closest('[data-prescribe-patient]')?.dataset.prescribePatient;
      const deleteId = event.target.closest('[data-delete-patient]')?.dataset.deletePatient;

      if (editId) fillForm(getPatientById(editId));
      if (prescribeId) PrescriptionModule.startForPatient(prescribeId);
      if (deleteId && confirm('¿Eliminar este paciente y sus recetas asociadas?')) {
        await Api.deletePatient(deleteId);
        Utils.showAlert('Paciente eliminado correctamente.', 'warning');
        await load();
        await PrescriptionModule.loadHistory();
      }
    });
  };

  return { bind, load, renderTable, getPatients, getPatientById, resolvePatientFromInput, patientToSuggestion, clearForm };
})();
