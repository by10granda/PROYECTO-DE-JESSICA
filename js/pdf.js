window.PdfModule = (() => {
  const lineHeight = 6;

  const addWrapped = (doc, text, x, y, maxWidth, size = 10) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || '-', maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  };

  const tryImage = async (doc, url, x, y, w, h) => {
    if (!url) return;
    try {
      doc.addImage(url, undefined, x, y, w, h);
    } catch (error) {
      console.warn('No se pudo insertar imagen en PDF:', error);
    }
  };

  const buildPrescriptionPdf = async ({ prescription, patient, doctor }) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    let y = 16;

    await tryImage(doc, doctor.logoUrl, margin, y, 24, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(doctor.name || 'Médico tratante', doctor.logoUrl ? 46 : margin, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(doctor.specialty || 'Medicina General', doctor.logoUrl ? 46 : margin, y + 14);
    doc.text(`Registro profesional: ${doctor.license || '-'}`, doctor.logoUrl ? 46 : margin, y + 20);

    doc.setFontSize(9);
    doc.text(`Receta: ${prescription.id || 'PENDIENTE'}`, pageWidth - margin, y + 6, { align: 'right' });
    doc.text(`Fecha: ${prescription.date || Utils.todayISO()}`, pageWidth - margin, y + 12, { align: 'right' });
    y += 32;

    doc.setDrawColor(47, 111, 115);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Datos del paciente', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${Utils.fullName(patient)}`, margin, y);
    doc.text(`Edad: ${patient.age || Utils.calculateAge(patient.birthDate) || '-'} años`, 118, y);
    y += 6;
    doc.text(`Sexo: ${patient.sex || '-'}`, margin, y);
    doc.text(`Peso: ${patient.weight || '-'} kg`, 72, y);
    doc.text(`ID: ${patient.id || '-'}`, 118, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Diagnóstico', margin, y);
    y = addWrapped(doc, prescription.diagnosis, margin, y + 6, pageWidth - (margin * 2), 10) + 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Medicamentos', margin, y);
    y += 7;
    prescription.medicines.forEach((medicine, index) => {
      if (y > 260) {
        doc.addPage();
        y = 18;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${medicine.name}`, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const detail = [medicine.presentation, medicine.concentration, medicine.dose, medicine.route, medicine.frequency, medicine.duration, medicine.quantity]
        .filter(Boolean)
        .join(' | ');
      y = addWrapped(doc, detail, margin + 4, y, pageWidth - (margin * 2) - 4, 9);
      if (medicine.instructions) y = addWrapped(doc, `Indicaciones: ${medicine.instructions}`, margin + 4, y, pageWidth - (margin * 2) - 4, 9);
      y += 3;
    });

    if (prescription.generalInstructions) {
      if (y > 246) {
        doc.addPage();
        y = 18;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Indicaciones generales', margin, y);
      y = addWrapped(doc, prescription.generalInstructions, margin, y + 6, pageWidth - (margin * 2), 10) + 4;
    }

    if (prescription.nextAppointment) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Próxima cita: ${prescription.nextAppointment}`, margin, y + 2);
    }

    const footerY = 274;
    await tryImage(doc, doctor.signatureUrl, pageWidth - 72, footerY - 26, 44, 22);
    doc.setDrawColor(80, 80, 80);
    doc.line(pageWidth - 78, footerY, pageWidth - margin, footerY);
    doc.setFontSize(9);
    doc.text(doctor.name || 'Firma del médico', pageWidth - 47, footerY + 5, { align: 'center' });
    doc.text([doctor.address, doctor.phone, doctor.email].filter(Boolean).join(' | '), margin, 288);

    return doc;
  };

  return { buildPrescriptionPdf };
})();
