window.PdfModule = (() => {
  const lineHeight = 5;

  const addWrapped = (doc, text, x, y, maxWidth, size = 9, style = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || '-', maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  };

  const cleanParts = (parts) => parts.map((part) => String(part || '').trim()).filter(Boolean);

  const imageCache = {};

  const svgToPngDataUrl = async (path, size = 512) => {
    if (imageCache[path]) return imageCache[path];
    const response = await fetch(path);
    if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
    const svg = await response.text();
    const image = new Image();
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d').drawImage(image, 0, 0, size, size);
    imageCache[path] = canvas.toDataURL('image/png');
    return imageCache[path];
  };

  const medicineRecipeText = (medicine) => cleanParts([
    medicine.name,
    medicine.concentration,
    medicine.presentation,
    medicine.quantity ? `#${String(medicine.quantity).replace(/^#\s*/, '')}` : ''
  ]).join(' ').toUpperCase();

  const medicineInstructionText = (medicine) => cleanParts([
    medicine.name,
    medicine.concentration,
    medicine.dose,
    medicine.presentation,
    medicine.route,
    medicine.frequency,
    medicine.duration
  ]).join(' ').toUpperCase();

  const drawLogoFallback = (doc, x, y) => {
    const size = 22;
    const centerX = x + size / 2;
    doc.setFillColor(0, 135, 55);
    doc.rect(x, y, size, size, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.1);
    doc.roundedRect(x + 5.8, y + 5, 10.4, 10.6, 0.6, 0.6);
    doc.line(x + 6.8, y + 12.4, x + 9.3, y + 10.1);
    doc.line(x + 9.3, y + 10.1, x + 11.1, y + 11.8);
    doc.line(x + 11.1, y + 11.8, x + 12.7, y + 11.9);
    doc.line(x + 12.7, y + 11.9, x + 15.4, y + 14.1);
    doc.line(x + 7.1, y + 17.2, x + 10.1, y + 17.2);
    doc.line(x + 11.9, y + 17.2, x + 15, y + 17.2);
    doc.line(centerX, y + 15.7, centerX, y + 17.7);
    doc.line(x + 8.8, y + 7.4, x + 9.8, y + 6.3);
    doc.line(x + 9.8, y + 6.3, x + 10.5, y + 7.2);
    doc.line(x + 10.5, y + 7.2, x + 11.5, y + 6.3);
    doc.line(x + 11.5, y + 6.3, x + 12.2, y + 7.2);
    doc.line(x + 12.2, y + 7.2, x + 13.2, y + 6.3);
    doc.line(x + 13.2, y + 6.3, x + 14.1, y + 7.4);
  };

  const drawLogo = async (doc, x, y) => {
    try {
      doc.addImage(await svgToPngDataUrl('assets/logo-superior.svg'), 'PNG', x, y, 22, 22);
    } catch (error) {
      console.error(error);
      drawLogoFallback(doc, x, y);
    }
  };

  const drawWatermarkFallback = (doc, centerX, centerY) => {
    doc.setLineWidth(1.4);
    doc.setDrawColor(255, 205, 205);
    doc.circle(centerX, centerY, 40);
    doc.setDrawColor(205, 232, 205);
    doc.circle(centerX, centerY, 32);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(205, 215, 210);
    doc.setFontSize(9);
    doc.text('ESCUELA SUPERIOR POLITECNICA DE CHIMBORAZO', centerX, centerY - 26, { align: 'center' });

    doc.setTextColor(220, 232, 225);
    doc.setFontSize(21);
    doc.text('ESPOCH', centerX, centerY - 4, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text('Fundada en 1972', centerX, centerY + 10, { align: 'center' });
    doc.text('Riobamba - Ecuador', centerX, centerY + 17, { align: 'center' });

    doc.setDrawColor(220, 232, 225);
    doc.setLineWidth(0.8);
    doc.roundedRect(centerX - 17, centerY - 16, 34, 28, 3, 3);
    doc.line(centerX - 15, centerY - 2, centerX - 7, centerY - 10);
    doc.line(centerX - 7, centerY - 10, centerX - 2, centerY - 5);
    doc.line(centerX - 2, centerY - 5, centerX + 4, centerY - 8);
    doc.line(centerX + 4, centerY - 8, centerX + 15, centerY + 1);
    doc.setTextColor(0, 0, 0);
  };

  const drawWatermark = async (doc, centerX, centerY) => {
    const size = 82;
    try {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.15 }));
      doc.addImage(await svgToPngDataUrl('assets/marca-agua-espoch.svg', 760), 'PNG', centerX - size / 2, centerY - size / 2, size, size);
      doc.restoreGraphicsState();
    } catch (error) {
      console.error(error);
      drawWatermarkFallback(doc, centerX, centerY);
    }
  };

  const drawHeader = async (doc, x, y, width, prescription) => {
    await drawLogo(doc, x, y - 2);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('DIRECCION DE BIENESTAR ESTUDIANTIL Y', x + width / 2 + 5, y + 5, { align: 'center' });
    doc.text('POLITECNICO - SEDE ORELLANA', x + width / 2 + 5, y + 12, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('CONSULTORIO MEDICINA GENERAL', x + width / 2 + 5, y + 19, { align: 'center' });

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.8);
    doc.text(`Fecha: ${prescription.date || '___/___/___'}`, x, y + 31);
    doc.text('Receta N°', x + width - 37, y + 31);
    doc.setTextColor(220, 0, 0);
    doc.text(String(prescription.id || 'PENDIENTE').replace('REC-', ''), x + width - 13, y + 31, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  const drawDoctorInfo = (doc, x, y, width, doctor) => {
    const info = cleanParts([
      doctor.name,
      doctor.specialty,
      doctor.license ? `Reg. ${doctor.license}` : '',
      doctor.phone,
      doctor.email
    ]).join(' | ');
    if (!info) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.text(doc.splitTextToSize(info, width - 4), x + width / 2, y + 36, { align: 'center' });
  };

  const drawLeftSide = async (doc, x, y, width, prescription, patient, doctor) => {
    await drawHeader(doc, x, y, width, prescription);
    drawDoctorInfo(doc, x, y, width, doctor);
    let cursor = y + 47;
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.6);
    doc.text(`Nombres y Apellidos: ${patient.firstName || '_____________________________'}`, x, cursor);
    cursor += 6;
    doc.text(`Documento identidad: ${patient.nationalId || '___________'} HCL: ${patient.hcl || '______________'}`, x, cursor);
    cursor += 6;
    doc.text(`Nacionalidad: ${patient.nationality || '__________'} Edad: ${patient.age || '____'} años Peso: ${patient.weight || '____'} kg.`, x, cursor);
    cursor += 6;
    const sex = patient.sex || '';
    const allergyStatus = patient.allergyStatus || (patient.allergies ? 'Si' : 'No');
    doc.text(`Sexo: M__ F__ Antecedentes de Alergias: Si __ No __ Cie 10: ${patient.cie10 || '_____'}`, x, cursor);
    if (sex.toLowerCase().startsWith('m')) doc.text('X', x + 31, cursor);
    if (sex.toLowerCase().startsWith('f')) doc.text('X', x + 37, cursor);
    if (allergyStatus.toLowerCase().startsWith('s')) doc.text('X', x + 84, cursor);
    if (allergyStatus.toLowerCase().startsWith('n')) doc.text('X', x + 96, cursor);
    if (patient.allergies) {
      cursor += 5;
      cursor = addWrapped(doc, `Alergias: ${patient.allergies}`, x, cursor, width - 6, 7.4, 'bold');
    }

    cursor += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Receta', x + width / 2, cursor, { align: 'center' });

    await drawWatermark(doc, x + width / 2, y + 125);
    cursor += 13;
    (prescription.medicines || []).forEach((medicine, index) => {
      const text = medicineRecipeText(medicine);
      cursor = addWrapped(doc, `${index + 1}. ${text}`, x + 4, cursor, width - 8, 9, 'bold');
      cursor += 3;
    });
  };

  const drawRightSide = async (doc, x, y, width, prescription, patient, doctor) => {
    await drawHeader(doc, x, y, width, prescription);
    drawDoctorInfo(doc, x, y, width, doctor);
    let cursor = y + 53;
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.6);
    doc.text(`Nombres y Apellidos: ${patient.firstName || '_____________________________'}`, x, cursor);
    cursor += 23;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Indicaciones:', x, cursor);
    await drawWatermark(doc, x + width / 2, y + 125);
    cursor += 12;

    (prescription.medicines || []).forEach((medicine, index) => {
      const instructions = medicineInstructionText(medicine) || medicine.instructions;
      if (instructions) {
        cursor = addWrapped(doc, `${index + 1}. ${instructions}`, x + 4, cursor, width - 8, 8.5);
        cursor += 2;
      }
    });

    if (prescription.generalInstructions) {
      cursor = addWrapped(doc, prescription.generalInstructions, x + 4, cursor + 2, width - 8, 8.8);
    }
  };

  const buildPrescriptionPdf = async ({ prescription, patient, doctor }) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const half = pageWidth / 2;

    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(half, 0, half, pageHeight);
    doc.setLineDashPattern([], 0);

    await drawLeftSide(doc, 7, 8, half - 14, prescription, patient, doctor);
    await drawRightSide(doc, half + 7, 8, half - 14, prescription, patient, doctor);
    return doc;
  };

  return { buildPrescriptionPdf };
})();
