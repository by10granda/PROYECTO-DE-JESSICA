# Recetas Jessica

Sistema web para gestionar pacientes y recetas médicas con Google Sheets como base de datos, Bootstrap 5 y jsPDF.

## Archivos

- `index.html`: interfaz principal.
- `css/styles.css`: estilos responsive.
- `js/config.js`: configuración del sistema y URL del Web App.
- `js/api.js`: conexión con Google Apps Script o modo local.
- `js/patients.js`: CRUD y búsqueda de pacientes.
- `js/prescriptions.js`: recetas, historial y duplicado.
- `js/pdf.js`: generación de PDF profesional.
- `apps-script/Code.gs`: backend para Google Sheets.

## Configurar Google Sheets

1. Abra la hoja: `https://docs.google.com/spreadsheets/d/16dXfmZbyFqNHVDKPPetcVdRXSydX6oIMpOrRRY_8uac/edit`.
2. Vaya a `Extensiones > Apps Script`.
3. Pegue el contenido de `apps-script/Code.gs` en el editor.
4. Guarde el proyecto.
5. Ejecute una vez la función `setupDatabase_` y autorice los permisos.
6. Publique en `Implementar > Nueva implementación > Aplicación web`.
7. Use estos permisos: ejecutar como usted y acceso para cualquier usuario con el enlace.
8. Copie la URL del Web App.
9. Pegue la URL en `js/config.js`, propiedad `appsScriptUrl`.

## Uso

Abra `index.html` en el navegador. Si `appsScriptUrl` está vacío, el sistema funciona en modo local usando `localStorage` para pruebas.

## Funciones Incluidas

- Registro, edición, eliminación y búsqueda de pacientes.
- ID automático único con formato `PAC-000001`.
- Edad calculada automáticamente.
- Recetas con múltiples medicamentos dinámicos.
- Historial por paciente.
- Consulta, reimpresión, PDF y duplicado de recetas.
- Datos configurables del médico, logo y firma por URL pública.
- PDF tamaño A4 listo para imprimir.
