// dossier-export.jsx — build & download a branded, print-ready service dossier

function downloadDossier(watches, filename) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => fmt(n || 0);

  const watchSection = w => {
    const st = serviceStatus(w);
    const lf = lastFullService(w);
    const records = [...(w.records || [])].sort((a, b) => parseDate(b.date) - parseDate(a.date));
    const ws = warrantyStatus(w);

    const rows = records.map(r => `
      <tr>
        <td class="dt">${esc(fmtDate(r.date))}</td>
        <td><strong>${esc(serviceType(r.type).label)}</strong>${r.notes ? `<div class="note">${esc(r.notes)}</div>` : ''}</td>
        <td>${esc(r.provider)}</td>
        <td class="num">${r.cost ? esc(money(r.cost)) : '—'}</td>
      </tr>`).join('');

    const docs = (w.documents || []).map(d => `<li><span class="dtag">${esc(docType(d.type).label)}</span> ${esc(d.label)} <span class="muted">· ${esc(fmtDate(d.date))}</span></li>`).join('');

    return `
    <section class="watch">
      <div class="whead">
        <div>
          <div class="brand">${esc(w.brand)}</div>
          <h2>${esc(w.model)}</h2>
          <div class="muted">Ref. ${esc(w.ref)} · ${esc(w.caseSizeMm)}mm · ${esc(w.caseMaterial)} · ${esc(w.movement)}</div>
        </div>
        <div class="status ${st.key}">${esc(st.label)} · ${esc(fmtDate(st.due, { year: 'numeric', month: 'short' }))}</div>
      </div>

      <div class="summary">
        <div><span class="lbl">Acquired</span>${esc(fmtDate(w.acquiredDate))} · ${esc(ACQ_LABEL[w.acquiredFrom])}</div>
        <div><span class="lbl">Last full service</span>${lf ? esc(fmtDate(lf.date)) : 'Never'}</div>
        <div><span class="lbl">Service interval</span>${esc(w.intervalYears)} years</div>
        <div><span class="lbl">Lifetime upkeep</span>${esc(money(lifetimeCost(w)))}</div>
        <div><span class="lbl">Box &amp; papers</span>${w.hasBox ? 'Box' : 'No box'} · ${w.hasPapers ? 'Papers' : 'No papers'}</div>
        <div><span class="lbl">Warranty</span>${ws ? (ws.key === 'expired' ? 'Expired ' : 'Valid to ') + esc(fmtDate(ws.date)) : '—'}</div>
      </div>

      <h3>Service history</h3>
      <table>
        <thead><tr><th>Date</th><th>Service</th><th>Provider</th><th class="num">Cost</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="muted">No service logged.</td></tr>'}</tbody>
      </table>

      <h3>Papers &amp; provenance</h3>
      <ul class="docs">${docs || '<li class="muted">No documents on file.</li>'}</ul>
    </section>`;
  };

  const totalCost = watches.reduce((s, w) => s + lifetimeCost(w), 0);
  const isAll = watches.length > 1;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${esc(isAll ? 'Collection Service Dossier' : watches[0].brand + ' ' + watches[0].model + ' — Dossier')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; color: #1A1410; background: #FAF8F4; padding: 48px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc { max-width: 820px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1A1410; padding-bottom: 18px; margin-bottom: 6px; }
  .eyebrow { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #C9A84C; }
  .top h1 { font-family: 'Cormorant Garamond', serif; font-size: 40px; font-weight: 300; line-height: 1; margin-top: 6px; }
  .vw { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 500; color: #C9A84C; }
  .meta { font-size: 11px; color: #A89880; margin: 14px 0 26px; }
  .watch { margin-bottom: 38px; padding-bottom: 30px; border-bottom: 1px solid #EAE5DC; page-break-inside: avoid; }
  .whead { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
  .brand { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #A89880; }
  .whead h2 { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 400; line-height: 1.05; margin: 2px 0 4px; }
  .muted { color: #A89880; }
  .status { font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 20px; white-space: nowrap; }
  .status.ok { background: #E8F4E8; color: #2D6A2D; } .status.due { background: #FFF3E0; color: #8A5010; } .status.overdue { background: #FAE8E8; color: #8A2020; }
  .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 24px; background: #FFF; border: 1px solid #EAE5DC; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px; font-size: 13px; }
  .summary .lbl { display: block; font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #A89880; margin-bottom: 3px; }
  h3 { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-weight: 500; margin: 18px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #A89880; padding: 6px 10px; border-bottom: 1px solid #EAE5DC; }
  td { padding: 9px 10px; border-bottom: 1px solid #F0EBE3; vertical-align: top; }
  td.dt { white-space: nowrap; color: #A89880; } .num { text-align: right; white-space: nowrap; }
  .note { font-size: 11px; color: #A89880; margin-top: 3px; line-height: 1.45; }
  ul.docs { list-style: none; font-size: 12.5px; } ul.docs li { padding: 6px 0; border-bottom: 1px solid #F0EBE3; }
  .dtag { display: inline-block; font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #C9A84C; min-width: 96px; }
  .totals { display: flex; justify-content: space-between; align-items: center; background: #1A1410; color: #FAF8F4; border-radius: 10px; padding: 16px 22px; margin-top: 8px; }
  .totals .big { font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #C9A84C; }
  .foot { margin-top: 26px; font-size: 10px; letter-spacing: 0.06em; color: #A89880; text-align: center; }
  @media print { body { padding: 0; background: #FFF; } .doc { max-width: none; } }
</style></head>
<body><div class="doc">
  <div class="top">
    <div><div class="eyebrow">Virtual Watchbox · Service Dossier</div>
    <h1>${esc(isAll ? 'Collection Service Record' : watches[0].brand + ' ' + watches[0].model)}</h1></div>
    <div class="vw">VW</div>
  </div>
  <div class="meta">Generated ${esc(fmtDate(TODAY))} · ${watches.length} piece${watches.length === 1 ? '' : 's'} · Lifetime upkeep ${esc(money(totalCost))}</div>
  ${watches.map(watchSection).join('')}
  ${isAll ? `<div class="totals"><span>Total lifetime maintenance across ${watches.length} pieces</span><span class="big">${esc(money(totalCost))}</span></div>` : ''}
  <div class="foot">VIRTUALWATCHBOX.COM · YOUR SOURCE OF TRUTH FOR THE LIFE OF EVERY PIECE</div>
</div></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = (filename || 'service-dossier').replace(/[^a-z0-9-]+/gi, '-') + '.html';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

Object.assign(window, { downloadDossier });
