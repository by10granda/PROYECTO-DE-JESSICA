window.Utils = (() => {
  const pad = (value, size = 6) => String(value).padStart(size, '0');

  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const birth = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDelta = today.getMonth() - birth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
    return Math.max(age, 0);
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);

  const fullName = (patient) => `${patient.firstName || ''} ${patient.lastName || ''}`.trim();

  const showAlert = (message, type = 'success') => {
    const host = document.getElementById('alertHost');
    const wrapper = document.createElement('div');
    wrapper.className = `alert alert-${type} alert-dismissible fade show shadow-sm`;
    wrapper.role = 'alert';
    wrapper.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>`;
    host.appendChild(wrapper);
    setTimeout(() => bootstrap.Alert.getOrCreateInstance(wrapper).close(), 4500);
  };

  const requireValidForm = (form) => {
    form.classList.add('was-validated');
    return form.checkValidity();
  };

  const downloadPdf = (doc, filename) => doc.save(filename.replace(/[\\/:*?"<>|]+/g, '-'));

  return { pad, normalize, calculateAge, todayISO, fullName, showAlert, requireValidForm, downloadPdf };
})();
