import jsPDF from 'jspdf'

export function downloadContractPDF(contract) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const margin = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - margin * 2
  let y = margin

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(contract.title, margin, y)
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Status: ${contract.status.toUpperCase()}`, margin, y)
  y += 6
  if (contract.start_date) doc.text(`Start Date: ${contract.start_date}`, margin, y), (y += 6)
  if (contract.end_date) doc.text(`End Date: ${contract.end_date}`, margin, y), (y += 6)
  y += 4

  // Divider
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // Content
  doc.setFontSize(11)
  doc.setTextColor(30)
  doc.setFont('helvetica', 'normal')

  const lines = doc.splitTextToSize(contract.content || '', maxWidth)
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
    doc.text(line, margin, y)
    y += 6
  }

  // Signers section
  if (contract.signers?.length) {
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Signatures', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    for (const signer of contract.signers) {
      const sigLine = signer.signed_at
        ? `${signer.name || signer.email} — Signed on ${new Date(signer.signed_at).toLocaleString()} (IP: ${signer.ip_address || 'N/A'})`
        : `${signer.email} — Pending`
      doc.text(sigLine, margin, y)
      y += 6
    }
  }

  doc.save(`${contract.title.replace(/\s+/g, '_')}.pdf`)
}
