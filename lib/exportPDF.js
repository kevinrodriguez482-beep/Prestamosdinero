import { calcTotal, formatCOP, formatDate } from './storage';

export async function exportPDF(prestamos) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210, MARGIN = 14, CONTENT_W = PAGE_W - MARGIN * 2;

  const C = {
    bg: [13,13,11], bg2: [26,24,16], bg3: [28,28,20],
    accent: [61,220,132], gold: [201,168,76], text: [240,235,220],
    text2: [160,152,128], text3: [90,85,69], red: [224,85,85],
    blue: [102,153,204], border: [42,40,28],
  };

  function addBg() {
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, 210, 297, 'F');
  }

  addBg();

  // Header
  doc.setFillColor(...C.bg2);
  doc.rect(0, 0, 210, 46, 'F');
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(0, 46, 210, 46);

  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...C.text);
  doc.text('Préstamos', MARGIN, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.text3);
  const now = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Generado el ${now}  ·  ${prestamos.length} registros`, MARGIN, 31);

  // Stats
  const activos = prestamos.filter(p => p.estado !== 'pagado');
  const pagados = prestamos.filter(p => p.estado === 'pagado');
  const porCobrar = activos.reduce((a, p) => {
    const t = calcTotal(p.monto, p.interes);
    const ab = (p.pagos||[]).reduce((s,x)=>s+x.monto,0);
    return a + Math.max(0, t - ab);
  }, 0);
  const recuperado = pagados.reduce((a,p) => a + calcTotal(p.monto, p.interes), 0);

  [
    { label: 'Por cobrar', val: formatCOP(porCobrar), col: C.accent },
    { label: 'Recuperado', val: formatCOP(recuperado), col: C.blue },
    { label: 'Total registros', val: String(prestamos.length), col: C.gold },
  ].forEach((s, i) => {
    const x = PAGE_W - MARGIN - 44 * (2 - i);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C.text3);
    doc.text(s.label.toUpperCase(), x, 20);
    doc.setFont('times','bold'); doc.setFontSize(11); doc.setTextColor(...s.col);
    doc.text(s.val, x, 28);
  });

  let y = 56;

  const groups = [
    { label: 'Préstamos activos', key: 'activo', col: C.accent },
    { label: 'Vencidos', key: 'vencido', col: C.red },
    { label: 'Pagados', key: 'pagado', col: C.blue },
  ];

  for (const group of groups) {
    const list = prestamos.filter(p => p.estado === group.key);
    if (!list.length) continue;

    // Section header
    doc.setFillColor(...group.col);
    doc.rect(MARGIN, y, 3, 6, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...group.col);
    doc.text(group.label.toUpperCase(), MARGIN + 6, y + 4.5);
    const sub = list.reduce((a,p)=>a+calcTotal(p.monto,p.interes),0);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.text3);
    doc.text(`${list.length} · ${formatCOP(sub)}`, PAGE_W - MARGIN, y + 4.5, { align: 'right' });
    y += 10;

    // Main table
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Nombre','Cédula','Teléfono','Monto','Interés','Total','Ingreso','Préstamo','Vence','Abonado','Pendiente']],
      body: list.map(p => {
        const total = calcTotal(p.monto, p.interes);
        const ab = (p.pagos||[]).reduce((a,x)=>a+x.monto,0);
        return [
          p.nombre,
          p.cedula || '—',
          [p.telefono, p.telefono2].filter(Boolean).join(' / ') || '—',
          formatCOP(p.monto),
          p.interes ? `${p.interes}%` : '—',
          formatCOP(total),
          p.fechaIngreso ? formatDate(p.fechaIngreso) : '—',
          p.fechaPrestamo ? formatDate(p.fechaPrestamo) : '—',
          p.fechaVence ? formatDate(p.fechaVence) : '—',
          ab > 0 ? formatCOP(ab) : '—',
          formatCOP(Math.max(0, total - ab)),
        ];
      }),
      styles: { font:'helvetica', fontSize:7.5, textColor:[200,192,172], fillColor:[20,20,14], lineColor:C.border, lineWidth:0.2, cellPadding:2.5 },
      headStyles: { fillColor:[28,28,20], textColor:C.text3, fontStyle:'bold', fontSize:6.5 },
      alternateRowStyles: { fillColor:[24,24,16] },
      columnStyles: {
        0: { cellWidth:28 }, 1: { cellWidth:18 }, 2: { cellWidth:22 },
        3: { cellWidth:20, halign:'right' }, 4: { cellWidth:12, halign:'center' },
        5: { cellWidth:22, halign:'right', textColor:group.col },
        6: { cellWidth:18 }, 7: { cellWidth:18 }, 8: { cellWidth:18 },
        9: { cellWidth:18, halign:'right' }, 10: { cellWidth:20, halign:'right' },
      },
    });
    y = doc.lastAutoTable.finalY + 6;

    // Cuotas sub-table for loans that have them
    const conCuotas = list.filter(p => p.cuotasTotal > 0);
    if (conCuotas.length > 0) {
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C.text3);
      doc.text('PLAN DE CUOTAS', MARGIN, y + 4);
      y += 7;
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Nombre','Cuotas pagas','Total cuotas','Valor cuota','Frecuencia','Primera cuota','Próx. cuota']],
        body: conCuotas.map(p => {
          const paid = (p.pagos||[]).length;
          let nextDate = '—';
          if (p.fechaPrimeraCuota && paid < p.cuotasTotal) {
            const d = new Date(p.fechaPrimeraCuota + 'T12:00:00');
            const f = p.cuotaFrecuencia;
            if (f==='diario') d.setDate(d.getDate()+paid);
            else if (f==='semanal') d.setDate(d.getDate()+paid*7);
            else if (f==='quincenal') d.setDate(d.getDate()+paid*15);
            else d.setMonth(d.getMonth()+paid);
            nextDate = formatDate(d.toISOString().split('T')[0]);
          }
          return [
            p.nombre, String(paid), String(p.cuotasTotal),
            p.cuotaMonto ? formatCOP(p.cuotaMonto) : '—',
            p.cuotaFrecuencia || '—',
            p.fechaPrimeraCuota ? formatDate(p.fechaPrimeraCuota) : '—',
            nextDate,
          ];
        }),
        styles: { font:'helvetica', fontSize:7.5, textColor:[200,192,172], fillColor:[18,18,12], lineColor:C.border, lineWidth:0.2, cellPadding:2.5 },
        headStyles: { fillColor:[22,22,14], textColor:C.text3, fontStyle:'bold', fontSize:6.5 },
        alternateRowStyles: { fillColor:[20,20,14] },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Client addresses sub-table
    const conDireccion = list.filter(p => p.direccion || p.barrio || p.ciudad || p.referencia);
    if (conDireccion.length > 0) {
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C.text3);
      doc.text('INFORMACIÓN DE CONTACTO', MARGIN, y + 4);
      y += 7;
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Nombre','Ocupación','Dirección','Barrio','Ciudad','Email','Referencia']],
        body: conDireccion.map(p => [
          p.nombre,
          p.ocupacion || '—',
          p.direccion || '—',
          p.barrio || '—',
          p.ciudad || '—',
          p.email || '—',
          p.referencia || '—',
        ]),
        styles: { font:'helvetica', fontSize:7.5, textColor:[200,192,172], fillColor:[18,18,12], lineColor:C.border, lineWidth:0.2, cellPadding:2.5 },
        headStyles: { fillColor:[22,22,14], textColor:C.text3, fontStyle:'bold', fontSize:6.5 },
        alternateRowStyles: { fillColor:[20,20,14] },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    if (y > 250 && group !== groups[groups.length-1]) {
      doc.addPage(); addBg(); y = MARGIN;
    }
  }

  // Footer
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
    doc.line(MARGIN, 285, PAGE_W-MARGIN, 285);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C.text3);
    doc.text('Préstamos — Reporte confidencial', MARGIN, 291);
    doc.text(`Pág. ${i} / ${pages}`, PAGE_W-MARGIN, 291, { align:'right' });
  }

  doc.save(`prestamos-${new Date().toISOString().split('T')[0]}.pdf`);
}
