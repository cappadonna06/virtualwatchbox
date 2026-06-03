// ServiceHorizon.jsx — horizontal "service runway" showing every watch's next-due
// Left bucket = overdue · centre axis = next 24 months · right bucket = beyond 2yr.

function addMonths(d, m) { const nd = parseDate(d); nd.setMonth(nd.getMonth() + m); return nd; }

const ServiceHorizon = ({ collection, onPick, activeId }) => {
  const HORIZON = 24;       // months on the axis
  const zL = 13;            // % — overdue zone width / NOW line
  const zR = 87;            // % — axis end / beyond zone start
  const trackH = 178;

  const placed = collection.map(w => {
    const st = serviceStatus(w);
    const m = monthsBetween(TODAY, st.due);
    let xPct, bucket = null;
    if (m < 0) { bucket = 'overdue'; xPct = zL / 2; }
    else if (m > HORIZON) { bucket = 'beyond'; xPct = (zR + 100) / 2; }
    else { xPct = zL + (m / HORIZON) * (zR - zL); }
    return { w, st, m, xPct, bucket };
  });

  // greedy lane assignment to avoid overlap
  const LANES = 3;
  const laneLast = Array(LANES).fill(-100);
  [...placed].sort((a, b) => a.xPct - b.xPct).forEach(p => {
    let lane = laneLast.indexOf(Math.min(...laneLast));
    for (let i = 0; i < LANES; i++) { if (p.xPct - laneLast[i] > 20) { lane = i; break; } }
    laneLast[lane] = p.xPct; p.lane = lane;
  });

  const ticks = [0, 6, 12, 18, 24];
  const overdueN = placed.filter(p => p.bucket === 'overdue').length;
  const beyondN = placed.filter(p => p.bucket === 'beyond').length;
  const xOf = t => zL + (t / HORIZON) * (zR - zL);

  return (
    <div>
      {/* axis labels */}
      <div style={{ position: 'relative', height: 15, marginBottom: 5 }}>
        <div style={{ position: 'absolute', left: `${zL / 2}%`, transform: 'translateX(-50%)' }}>
          <Meta style={{ fontSize: 9, color: overdueN ? STATUS.overdue.fg : C.muted }}>Overdue</Meta>
        </div>
        {ticks.map(t => (
          <div key={t} style={{ position: 'absolute', left: `${xOf(t)}%`, transform: 'translateX(-50%)' }}>
            <Meta style={{ fontSize: 9 }}>{t === 0 ? 'Now' : fmtMonthYear(addMonths(TODAY, t))}</Meta>
          </div>
        ))}
        <div style={{ position: 'absolute', left: `${(zR + 100) / 2}%`, transform: 'translateX(-50%)' }}>
          <Meta style={{ fontSize: 9 }}>Beyond</Meta>
        </div>
      </div>

      {/* track */}
      <div style={{ position: 'relative', height: trackH, borderRadius: 12, background: C.card,
        border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {/* zone tints */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${zL}%`,
          background: 'rgba(178,58,58,0.05)', borderRight: `1px solid rgba(178,58,58,0.16)` }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${zR}%`, right: 0,
          background: C.bg, borderLeft: `1px dashed ${C.borderLight}` }} />
        {/* gridlines */}
        {ticks.map(t => (
          <div key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: `${xOf(t)}%`,
            borderLeft: t === 0 ? `1.5px solid ${C.ink}` : `1px dashed ${C.border}`, opacity: t === 0 ? 0.5 : 1 }} />
        ))}

        {/* markers — the status dot sits EXACTLY on the due month */}
        {placed.map(p => {
          const top = 20 + p.lane * ((trackH - 40 - 40) / (LANES - 1));
          const nearRight = p.xPct > 68;
          const isActive = activeId === p.w.id;
          const dated = p.bucket === null; // precise date only inside the axis
          const sub = p.bucket === 'overdue' ? `${Math.round(Math.abs(p.m))} mo overdue`
            : p.bucket === 'beyond' ? `${fmtMonthYear(p.st.due)}`
            : fmtMonthYear(p.st.due);
          return (
            <div key={p.w.id} style={{ position: 'absolute', left: `${p.xPct}%`, top: top + 18 }}>
              {/* faint guide line from the dot down to the month ticks */}
              {dated && (
                <div style={{ position: 'absolute', left: 0, top: 0, width: 1.5, height: trackH - (top + 18) - 4,
                  transform: 'translateX(-50%)', background: p.st.dot, opacity: 0.28 }} />
              )}
              {/* anchor dot — THIS is the due date */}
              <span style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%,-50%)',
                width: 12, height: 12, borderRadius: 12, background: p.st.dot,
                border: `2.5px solid ${C.card}`, boxShadow: `0 0 0 1px ${p.st.dot}55`, zIndex: 3 }} />
              {/* label pill flows away from the dot */}
              <button type="button" onClick={() => onPick(p.w)}
                title={`${p.w.brand} ${p.w.model} — ${p.st.label} · ${fmtDate(p.st.due)}`}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  transform: `translateY(-50%) translateX(${nearRight ? 'calc(-100% - 13px)' : '13px'})`,
                  display: 'flex', alignItems: 'center', gap: 9,
                  background: isActive ? '#FBF7EE' : C.card,
                  border: `1px solid ${isActive ? p.st.dot : C.border}`,
                  boxShadow: isActive ? `0 4px 14px ${p.st.dot}33` : '0 1px 4px rgba(26,20,16,0.06)',
                  borderRadius: 26, padding: '5px 13px 5px 5px', cursor: 'pointer',
                  transition: 'all 0.15s ease', whiteSpace: 'nowrap', zIndex: isActive ? 5 : 2,
                }}>
                <span style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0 }}>
                  <img src={p.w.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 5px rgba(26,20,16,0.22))' }} />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.18, textAlign: 'left' }}>
                  <span style={{ fontFamily: C.sans, fontSize: 11.5, fontWeight: 600, color: C.ink }}>{p.w.brand}</span>
                  <span style={{ fontFamily: C.sans, fontSize: 10, fontWeight: 500, color: p.st.fg, letterSpacing: '0.02em' }}>{sub}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
        {[STATUS.overdue, STATUS.due, STATUS.ok].map(s => (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.sans, fontSize: 11, color: C.muted }}>
            <span style={{ width: 7, height: 7, borderRadius: 7, background: s.dot }} />{s.label}
          </span>
        ))}
        {beyondN > 0 && <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted, marginLeft: 'auto' }}>{beyondN} resting comfortably past two years</span>}
      </div>
    </div>
  );
};

Object.assign(window, { ServiceHorizon, addMonths });
