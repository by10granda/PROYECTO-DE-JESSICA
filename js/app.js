window.App = (() => {
  const showView = (viewId) => {
    document.querySelectorAll('.app-view').forEach((view) => view.classList.toggle('d-none', view.id !== viewId));
    document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === viewId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const bindNavigation = () => {
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => showView(button.dataset.view));
    });
    document.getElementById('newPrescriptionShortcut').addEventListener('click', () => {
      PrescriptionModule.clearForm();
      showView('prescriptionView');
    });
  };

  const init = async () => {
    bindNavigation();
    PrescriptionModule.bind();
    try {
      await PrescriptionModule.loadHistory();
      if (!window.AppConfig.appsScriptUrl) {
        Utils.showAlert('Modo local activo. Configure js/config.js con la URL del Web App de Apps Script para usar Google Sheets.', 'info');
      }
    } catch (error) {
      console.error(error);
      Utils.showAlert(error.message || 'No se pudo cargar la información.', 'danger');
    }
  };

  return { init, showView };
})();

document.addEventListener('DOMContentLoaded', App.init);
