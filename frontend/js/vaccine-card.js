let cardData = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });

  document.getElementById('downloadPdfBtn').addEventListener('click', downloadPdf);

  loadCard();
});

const STATUS_REMARK = {
  completed: 'Given',
  due: 'Due now',
  overdue: 'Overdue',
  upcoming: 'Upcoming'
};

async function loadCard() {
  try {
    const babiesResult = await apiRequest('/babies');
    const babies = babiesResult.data;

    if (babies.length === 0) {
      document.getElementById('noBabiesState').classList.remove('d-none');
      return;
    }

    const preferredBabyId = localStorage.getItem('babycare_selected_baby');
    const matchExists = babies.some((b) => String(b.id) === String(preferredBabyId));
    const baby = babies.find((b) => String(b.id) === String(matchExists ? preferredBabyId : babies[0].id));

    document.getElementById('cardBabyName').textContent = baby.full_name;
    document.getElementById('cardBabyDob').textContent = formatDate(baby.date_of_birth);
    document.getElementById('cardBabySex').textContent = baby.gender === 'male' ? 'Male' : 'Female';

    const result = await apiRequest(`/vaccinations/${baby.id}`);
    const schedule = result.data.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    document.getElementById('cardContent').classList.remove('d-none');

    const completedCount = schedule.filter((v) => v.status === 'completed').length;
    const total = schedule.length;
    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    document.getElementById('cardProgressText').textContent = `${completedCount} of ${total} vaccines completed`;
    document.getElementById('cardProgressFill').style.width = `${pct}%`;

    const tbody = document.getElementById('cardTableBody');
    tbody.innerHTML = schedule.map((v) => `
      <tr class="${v.status === 'completed' ? 'vaccine-card-row-done' : ''}">
        <td class="vaccine-card-name">${v.vaccines.name}</td>
        <td>${v.vaccines.dose_number ? 'Dose ' + v.vaccines.dose_number : '—'}</td>
        <td>${formatDate(v.scheduled_date)}</td>
        <td>
          ${v.status === 'completed'
            ? `<span class="vaccine-card-check"><i data-lucide="check-circle-2" style="width:16px;height:16px;"></i> Given ${formatDate(v.completed_date)}</span>`
            : `<span class="text-muted-soft">${STATUS_REMARK[v.status] || v.status}</span>`}
        </td>
      </tr>
    `).join('');

    lucide.createIcons();

    cardData = { baby, schedule, completedCount, total, pct };
    document.getElementById('downloadPdfBtn').classList.remove('d-none');
  } catch (err) {
    showAlert('pageAlert', err.message);
  }
}

function remarkText(v) {
  if (v.status === 'completed') {
    return v.completed_date ? `Given ${formatDate(v.completed_date)}` : 'Given';
  }
  return STATUS_REMARK[v.status] || v.status;
}

const PDF_SIZES = [
  { font: 10, pad: 3 },
  { font: 9.5, pad: 2.5 },
  { font: 9, pad: 2 },
  { font: 8.5, pad: 1.6 },
  { font: 8, pad: 1.3 },
  { font: 7.5, pad: 1 },
  { font: 7, pad: 0.8 }
];

function buildCardPdf(cardInfo, size, twoColumns) {
  const { baby, schedule, completedCount, total, pct } = cardInfo;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const frame = 6;
  const margin = 12;
  const contentW = pageW - margin * 2;
  const tableBottom = 16;

  doc.setFillColor(139, 111, 209);
  doc.roundedRect(margin, margin, contentW, 16, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BabyCare Immunization Record', margin + 6, margin + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const generatedOn = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila'
  });
  doc.text(`Generated on ${generatedOn}`, margin + contentW - 6, margin + 10, { align: 'right' });

  const details = [
    ["CHILD'S NAME", baby.full_name],
    ['DATE OF BIRTH', formatDate(baby.date_of_birth)],
    ['SEX', baby.gender === 'male' ? 'Male' : 'Female']
  ];
  const colX = [margin + 2, margin + 110, margin + 200];
  details.forEach(([label, value], i) => {
    doc.setTextColor(140, 123, 142);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(label, colX[i], margin + 24);
    doc.setTextColor(74, 62, 78);
    doc.setFontSize(11);
    doc.text(String(value), colX[i], margin + 30);
  });

  doc.setTextColor(74, 62, 78);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`${completedCount} of ${total} vaccines completed (${pct}%)`, margin + 2, margin + 38);
  doc.setFillColor(242, 239, 255);
  doc.roundedRect(margin, margin + 40, contentW, 3, 1.5, 1.5, 'F');
  if (pct > 0) {
    doc.setFillColor(139, 111, 209);
    doc.roundedRect(margin, margin + 40, Math.max(3, (contentW * pct) / 100), 3, 1.5, 1.5, 'F');
  }

  const startY = margin + 48;

  const drawTable = (items, left, right, widths) => {
    doc.autoTable({
      startY,
      margin: { left, right, top: margin, bottom: tableBottom },
      head: [['Vaccine', 'Dose', 'Scheduled Date', 'Remarks']],
      body: items.map((v) => [
        v.vaccines.name,
        v.vaccines.dose_number ? `Dose ${v.vaccines.dose_number}` : '-',
        formatDate(v.scheduled_date),
        remarkText(v)
      ]),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: size.font,
        cellPadding: size.pad,
        textColor: [74, 62, 78],
        lineColor: [234, 221, 201],
        lineWidth: 0.2,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [255, 216, 115],
        textColor: [74, 62, 78],
        fontStyle: 'bold',
        lineColor: [232, 200, 96]
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { cellWidth: widths[0] },
        2: { cellWidth: widths[1] },
        3: { cellWidth: widths[2] }
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const item = items[data.row.index];
        if (!item) return;
        if (item.status === 'completed') {
          data.cell.styles.fillColor = [228, 245, 234];
          if (data.column.index === 3) {
            data.cell.styles.textColor = [95, 174, 127];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (item.status === 'overdue' && data.column.index === 3) {
          data.cell.styles.textColor = [222, 122, 122];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
  };

  if (twoColumns) {
    const gap = 6;
    const colW = (contentW - gap) / 2;
    const half = Math.ceil(schedule.length / 2);
    drawTable(schedule.slice(0, half), margin, pageW - margin - colW, [18, 28, 32]);
    drawTable(schedule.slice(half), margin + colW + gap, margin, [18, 28, 32]);
  } else {
    drawTable(schedule, margin, margin, [28, 45, 65]);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(139, 111, 209);
    doc.setLineWidth(0.6);
    doc.roundedRect(frame, frame, pageW - frame * 2, pageH - frame * 2, 3, 3, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 123, 142);
    doc.text(`BabyCare Immunization Record  |  Page ${i} of ${pageCount}`, pageW / 2, pageH - frame - 3.5, { align: 'center' });
  }

  return doc;
}

function downloadPdf() {
  if (!cardData) return;

  if (!window.jspdf || !window.jspdf.jsPDF) {
    showAlert('pageAlert', 'PDF library failed to load. Please check your internet connection and refresh the page.');
    return;
  }

  const attempts = [];
  PDF_SIZES.forEach((size) => attempts.push({ size, twoColumns: false }));
  PDF_SIZES.forEach((size) => attempts.push({ size, twoColumns: true }));

  let doc = null;
  for (let i = 0; i < attempts.length; i += 1) {
    doc = buildCardPdf(cardData, attempts[i].size, attempts[i].twoColumns);
    if (doc.getNumberOfPages() === 1) break;
  }

  const safeName = String(cardData.baby.full_name).trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'baby';
  doc.save(`vaccine-card-${safeName}.pdf`);
}