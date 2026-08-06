# Recetas Jessica

Sistema web para crear, guardar, buscar, reimprimir y duplicar recetas médicas con Google Sheets como base de datos, Bootstrap 5 y jsPDF.

## Archivos

- `index.html`: interfaz principal.
- `css/styles.css`: estilos responsive.
- `js/config.js`: configuración del sistema y URL del Web App.
- `js/api.js`: conexión con Google Apps Script o modo local.
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

- Recetas con múltiples medicamentos dinámicos.
- Buscador de consultas por paciente, fecha, diagnóstico, medicamento y número de receta.
- Consulta, reimpresión, PDF y duplicado de recetas.
- Una sola tabla visible en Google Sheets: `BaseDatos`.
- Las recetas se guardan en la tabla usando la columna `recordType` con valor `PRESCRIPTION`.
- Las variables principales de paciente, receta, médico y hasta 5 medicamentos quedan en columnas visibles.
- Datos configurables del médico, logo y firma por URL pública.
- PDF tamaño A4 listo para imprimir.

## Tabla Que Crea Apps Script

- `BaseDatos`: una sola hoja con todas las recetas.
- La columna `recordType` identifica las recetas con valor `PRESCRIPTION`.
- La primera hoja del documento se renombra automáticamente como `BaseDatos`, para que no quede una hoja vacía al abrir el archivo.
