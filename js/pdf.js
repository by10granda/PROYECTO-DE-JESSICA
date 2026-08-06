window.PdfModule = (() => {
  const lineHeight = 5;

  const addWrapped = (doc, text, x, y, maxWidth, size = 9, style = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || '-', maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  };

  const drawLogo = (doc, x, y) => {
    doc.setFillColor(0, 135, 55);
    doc.rect(x, y, 15, 20, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.7);
    doc.rect(x + 3.2, y + 4, 8.6, 9.5);
    doc.line(x + 4, y + 10.5, x + 6.4, y + 8.4);
    doc.line(x + 6.4, y + 8.4, x + 8.4, y + 10.2);
    doc.line(x + 8.4, y + 10.2, x + 11, y + 7.5);
    doc.line(x + 7.5, y + 13.5, x + 7.5, y + 17);
    doc.line(x + 4.5, y + 17, x + 10.5, y + 17);
  };

  const drawWatermark = (doc, centerX, centerY) => {
    doc.setTextColor(210, 225, 218);
    doc.setDrawColor(230, 238, 233);
    doc.setLineWidth(1.2);
    doc.circle(centerX, centerY, 38);
    doc.circle(centerX, centerY, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('ESPOCH', centerX, centerY - 4, { align: 'center' });
    doc.setFontSize(8);
    doc.text('ESCUELA SUPERIOR POLITECNICA', centerX, centerY + 7, { align: 'center' });
    doc.text('RIOBAMBA - ECUADOR', centerX, centerY + 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  };

  const drawHeader = (doc, x, y, width, prescription) => {
    drawLogo(doc, x, y - 2);
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

  const drawFooter = async (doc, x, y, width, doctor) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text('DATOS DEL PRESCRIPTOR', x + width / 2, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('NOMBRE Y APELLIDO', x + 2, y + 17);
    doc.text('FIRMA Y SELLO DEL PRESCRIPTOR', x + width - 2, y + 17, { align: 'right' });
    doc.line(x + 2, y + 14, x + 46, y + 14);
    doc.line(x + width - 58, y + 14, x + width - 2, y + 14);
    doc.text(doctor.name || '', x + 2, y + 23);
    doc.text(doctor.license ? `Reg. ${doctor.license}` : '', x + width - 2, y + 23, { align: 'right' });
  };

  const drawLeftSide = async (doc, x, y, width, prescription, patient, doctor) => {
    drawHeader(doc, x, y, width, prescription);
    let cursor = y + 39;
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

    drawWatermark(doc, x + width / 2, y + 125);
    cursor += 13;
    (prescription.medicines || []).forEach((medicine, index) => {
      const title = `${index + 1}. ${medicine.name || ''}`.trim();
      const detail = [medicine.presentation, medicine.concentration, medicine.dose, medicine.route, medicine.frequency, medicine.duration, medicine.quantity]
        .filter(Boolean)
        .join(' | ');
      cursor = addWrapped(doc, title, x + 4, cursor, width - 8, 9, 'bold');
      if (detail) cursor = addWrapped(doc, detail, x + 7, cursor, width - 11, 8.2);
      cursor += 3;
    });
    await drawFooter(doc, x, 270, width, doctor);
  };

  const drawRightSide = async (doc, x, y, width, prescription, patient, doctor) => {
    drawHeader(doc, x, y, width, prescription);
    let cursor = y + 45;
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.6);
    doc.text(`Nombres y Apellidos: ${patient.firstName || '_____________________________'}`, x, cursor);
    cursor += 23;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Indicaciones:', x, cursor);
    drawWatermark(doc, x + width / 2, y + 125);
    cursor += 12;

    (prescription.medicines || []).forEach((medicine, index) => {
      if (medicine.instructions) {
        cursor = addWrapped(doc, `${index + 1}. ${medicine.instructions}`, x + 4, cursor, width - 8, 8.5);
        cursor += 2;
      }
    });

    if (prescription.generalInstructions) {
      cursor = addWrapped(doc, prescription.generalInstructions, x + 4, cursor + 2, width - 8, 8.8);
    }

    await drawFooter(doc, x, 270, width, doctor);
  };

  const buildPrescriptionPdf = async ({ prescription, patient, doctor }) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
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
