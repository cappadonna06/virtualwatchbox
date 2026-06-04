// StrapDrawer.jsx — page root: nav, header stats, grid, sidebar sheet, modal, toast.

const useIsMobile = (bp = 760) => {
  const [m, setM] = React.useState(typeof window !== 'undefined' && window.innerWidth <= bp);
  React.useEffect(() => {
    const on = () => setM(window.innerWidth <= bp);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [bp]);
  return m;
};

// ─── Nav ─────────────────────────────────────────────────────────────────
const DrawerNav = () => {
  const links = [['My Collection', false], ['Playground', false], ['Straps', true], ['Discover', false], ['News', false]];
  return React.createElement('nav', { style: {
    borderBottom: `1px solid ${T.border}`, background: 'rgba(250,248,244,0.92)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    position: 'sticky', top: 0, zIndex: 100,
  } },
    React.createElement('div', { className: 'sd-nav-inner', style: {
      maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '18px 40px',
    } },
      React.createElement('span', { style: { fontFamily: T.serif, fontSize: 20, fontWeight: 500, letterSpacing: '0.03em', color: T.ink } }, 'Virtual Watchbox'),
      React.createElement('div', { className: 'sd-nav-links', style: { display: 'flex', gap: 28, alignItems: 'center' } },
        links.map(([label, active]) => React.createElement('span', { key: label, style: {
          fontFamily: T.sans, fontSize: 12, fontWeight: active ? 500 : 400, letterSpacing: '0.04em',
          color: active ? T.ink : T.muted, cursor: 'pointer',
          borderBottom: active ? `1px solid ${T.ink}` : 'none', paddingBottom: active ? 1 : 0,
        } }, label)),
      ),
      React.createElement('button', { className: 'sd-nav-signin', style: {
        fontFamily: T.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', whiteSpace: 'nowrap',
        padding: '9px 20px', background: T.ink, color: T.slot, border: 'none', borderRadius: 4, cursor: 'pointer',
      } }, 'Sign In'),
    ),
  );
};

// ─── Header ──────────────────────────────────────────────────────────────
const DrawerHeader = ({ straps, watches, overrides, onAdd, mobile }) => {
  const N = straps.length;
  const M = watches.filter(w => compatibleStraps(w, straps, overrides).length > 0).length;
  const P = totalCombos(watches, straps, overrides);
  const stat = (num, label) => React.createElement('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 6 } },
    React.createElement('span', { style: { fontFamily: T.serif, fontSize: mobile ? 19 : 22, color: T.ink, fontWeight: 500 } }, num),
    React.createElement('span', { style: { fontFamily: T.sans, fontSize: 11, color: T.muted, letterSpacing: '0.04em', whiteSpace: 'nowrap' } }, label),
  );
  const dot = () => React.createElement('span', { style: { width: 3, height: 3, borderRadius: '50%', background: T.borderLight } });

  return React.createElement('div', { style: { paddingTop: mobile ? 22 : 36, paddingBottom: mobile ? 18 : 26 } },
    React.createElement('a', { href: 'collection_redesign/My Collection.html', style: {
      display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.sans, fontSize: 11, fontWeight: 500,
      letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted, textDecoration: 'none', marginBottom: 16,
    } }, React.createElement(Icon, { name: 'arrowLeft', size: 14 }), 'Collection'),
    React.createElement('div', { className: 'sd-header-row', style: {
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
    } },
      React.createElement('div', null,
        React.createElement(Kicker, { color: T.gold, style: { marginBottom: 10 } }, 'The Strap Drawer'),
        React.createElement('h1', { style: {
          fontFamily: T.serif, fontSize: mobile ? 38 : 54, fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em',
          color: T.ink, margin: 0, whiteSpace: 'nowrap',
        } }, 'Strap Drawer'),
      ),
      !mobile && React.createElement(PrimaryBtn, { onClick: onAdd },
        React.createElement(Icon, { name: 'plus', size: 14 }), 'Add Strap'),
    ),
    // Stats pill row
    React.createElement('div', { className: 'sd-stats', style: {
      display: 'flex', width: 'fit-content', maxWidth: '100%',
      alignItems: 'center', gap: mobile ? 12 : 18, flexWrap: mobile ? 'wrap' : 'nowrap',
      marginTop: 20, padding: mobile ? '12px 16px' : '13px 22px',
      background: T.slot, border: `1px solid ${T.borderMid}`, borderRadius: 10,
      boxShadow: '0 1px 4px rgba(26,20,16,0.04)',
    } },
      stat(N, N === 1 ? 'strap' : 'straps'), dot(),
      stat(M, 'compatible watches'), dot(),
      stat(P, 'combinations'),
    ),
  );
};

// ─── Toast ───────────────────────────────────────────────────────────────
const Toast = ({ msg }) => msg ? React.createElement('div', { style: {
  position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 400,
  background: T.ink, color: T.slot, fontFamily: T.sans, fontSize: 12.5, fontWeight: 500,
  letterSpacing: '0.03em', padding: '12px 20px', borderRadius: 8,
  boxShadow: '0 8px 28px rgba(26,20,16,0.28)', display: 'flex', alignItems: 'center', gap: 9,
} },
  React.createElement('span', { style: { color: T.gold, display: 'flex' } }, React.createElement(Icon, { name: 'check', size: 15 })),
  msg,
) : null;

// ─── Sheet container (right panel / bottom sheet) ────────────────────────
const Sheet = ({ open, mobile, onClose, children }) => {
  if (!open) return null;
  return React.createElement('div', { style: {
    position: 'fixed', inset: 0, zIndex: 300, display: 'flex',
    justifyContent: mobile ? 'center' : 'flex-end', alignItems: mobile ? 'flex-end' : 'stretch',
  } },
    React.createElement('div', { onClick: onClose, style: { position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.42)', backdropFilter: 'blur(2px)', animation: 'sdFade 0.2s ease' } }),
    React.createElement('div', { style: {
      position: 'relative', background: T.slot,
      width: mobile ? '100%' : 'min(412px, 100vw)',
      height: mobile ? '90vh' : '100%',
      borderRadius: mobile ? '16px 16px 0 0' : 0,
      borderLeft: mobile ? 'none' : `1px solid ${T.borderMid}`,
      boxShadow: mobile ? '0 -12px 40px rgba(26,20,16,0.2)' : '-12px 0 40px rgba(26,20,16,0.12)',
      overflow: 'hidden',
      animation: mobile ? 'sdSlideUp 0.26s cubic-bezier(0.22,1,0.36,1)' : 'sdSlideIn 0.26s cubic-bezier(0.22,1,0.36,1)',
    } },
      mobile && React.createElement('div', { style: { display: 'flex', justifyContent: 'center', padding: '8px 0 0' } },
        React.createElement('div', { style: { width: 38, height: 4, borderRadius: 2, background: T.borderLight } })),
      children,
    ),
  );
};

// ─── Root ────────────────────────────────────────────────────────────────
const StrapDrawerRoot = () => {
  const mobile = useIsMobile();
  const [straps, setStraps] = React.useState(STRAPS);
  const [overrides, setOverrides] = React.useState(SEED_OVERRIDES);
  const [filters, setFilters] = React.useState({ material: [], width: [], style: null });
  const [sort, setSort] = React.useState('recent');
  const [selected, setSelected] = React.useState(null);   // strap object for sidebar
  const [modal, setModal] = React.useState(null);          // null | {} (new) | strap (edit)
  const [toast, setToast] = React.useState('');
  const [focusId, setFocusId] = React.useState(null);      // watch id for the Fit Finder
  const watches = OWNED_WATCHES;
  const focusWatch = watches.find(w => w.id === focusId) || null;

  const flash = (m) => { setToast(m); clearTimeout(window.__sdT); window.__sdT = setTimeout(() => setToast(''), 2400); };

  // Deep-link via hash so the mobile showcase can present live states
  React.useEffect(() => {
    const h = (window.location.hash || '').replace('#', '');
    if (h === 'add') setModal({});
    else if (h.startsWith('strap=')) {
      const s = STRAPS.find(x => x.id === h.slice(6));
      if (s) setSelected(s);
    } else if (h === 'empty') setStraps([]);
    else if (h.startsWith('watch=')) setFocusId(h.slice(6));
  }, []);

  const baseStraps = focusWatch ? compatibleStraps(focusWatch, straps, overrides) : straps;
  const visible = applySort(applyFilters(baseStraps, filters), sort, watches, overrides);

  // override ops
  const setStrapWatchOverride = (strapId, watchId, state) => setOverrides(prev => {
    const rest = prev.filter(o => !(o.strapId === strapId && o.watchId === watchId));
    return [...rest, { strapId, watchId, override: state }];
  });
  const removeStrapWatchOverride = (strapId, watchId) => setOverrides(prev =>
    prev.filter(o => !(o.strapId === strapId && o.watchId === watchId)));

  // strap ops (optimistic)
  const saveStrap = (data) => {
    setStraps(prev => {
      const exists = prev.some(s => s.id === data.id);
      return exists ? prev.map(s => s.id === data.id ? data : s) : [{ ...data, sortOrder: prev.length }, ...prev];
    });
    setModal(null);
    flash(straps.some(s => s.id === data.id) ? 'Strap updated' : 'Strap added to your drawer');
    if (selected && selected.id === data.id) setSelected(data);
  };
  const deleteStrap = (strap) => {
    setStraps(prev => prev.filter(s => s.id !== strap.id));
    setOverrides(prev => prev.filter(o => o.strapId !== strap.id));
    setSelected(null);
    flash('Strap deleted');
  };

  const selectedLive = selected ? straps.find(s => s.id === selected.id) || selected : null;

  return React.createElement('div', { style: { background: T.bg, minHeight: '100vh', color: T.ink } },
    React.createElement(DrawerNav),
    React.createElement('div', { className: 'sd-page', style: { maxWidth: 1280, margin: '0 auto', padding: mobile ? '0 18px 100px' : '0 40px 80px' } },
      React.createElement(DrawerHeader, { straps, watches, overrides, onAdd: () => setModal({}), mobile }),

      straps.length === 0
        ? React.createElement(EmptyDrawer, { onAdd: () => setModal({}) })
        : React.createElement(React.Fragment, null,
            React.createElement(WatchFocusBar, { watches, straps, overrides, focusId, setFocus: setFocusId }),
            focusWatch && React.createElement(FocusBanner, {
              watch: focusWatch, count: compatibleStraps(focusWatch, straps, overrides).length, onClear: () => setFocusId(null),
            }),
            React.createElement(FilterBar, { filters, setFilters, watches, sort, setSort, total: focusWatch ? baseStraps.length : straps.length, shown: visible.length }),
            visible.length === 0
              ? React.createElement('div', { style: { textAlign: 'center', padding: '60px 20px', fontFamily: T.serif, fontStyle: 'italic', fontSize: 17, color: T.muted } },
                  focusWatch
                    ? (compatibleStraps(focusWatch, straps, overrides).length === 0
                        ? `No straps in your drawer fit the ${focusWatch.model} yet. Add one, or mark a fit from a strap\u2019s detail.`
                        : 'No fitting straps match these filters.')
                    : 'No straps match these filters.')
              : React.createElement(StrapGrid, { straps: visible, watches, overrides, focusWatch, activeId: selectedLive?.id, onSelect: setSelected }),
          ),
    ),

    // Sidebar sheet
    React.createElement(Sheet, { open: !!selectedLive, mobile, onClose: () => setSelected(null) },
      selectedLive && React.createElement(StrapSidebar, {
        strap: selectedLive, watches, overrides,
        onClose: () => setSelected(null),
        onSetOverride: (watchId, state) => { setStrapWatchOverride(selectedLive.id, watchId, state); flash('Override saved'); },
        onRemoveOverride: (watchId) => { removeStrapWatchOverride(selectedLive.id, watchId); flash('Reset to automatic'); },
        onEdit: (s) => { setSelected(null); setModal(s); },
        onDelete: deleteStrap,
        onOpenWatch: (w) => flash(`Would open ${w.brand} ${w.model}`),
      }),
    ),

    // Modal
    modal && React.createElement('div', { style: {
      position: 'fixed', inset: 0, zIndex: 320, display: 'flex',
      alignItems: mobile ? 'flex-end' : 'center', justifyContent: 'center',
      padding: mobile ? 0 : 24,
    } },
      React.createElement('div', { onClick: () => setModal(null), style: { position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.5)', backdropFilter: 'blur(3px)', animation: 'sdFade 0.2s ease' } }),
      React.createElement('div', { style: { position: 'relative', width: 'min(880px,100%)', animation: mobile ? 'sdSlideUp 0.26s cubic-bezier(0.22,1,0.36,1)' : 'sdPop 0.22s cubic-bezier(0.22,1,0.36,1)' } },
        React.createElement(StrapModal, {
          initial: modal && modal.id ? modal : null, watches, onSave: saveStrap, onClose: () => setModal(null),
        }),
      ),
    ),

    // Mobile add FAB
    mobile && !modal && !selectedLive && React.createElement('button', { onClick: () => setModal({}), style: {
      position: 'fixed', bottom: 20, left: 18, right: 18, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
      background: T.ink, color: T.slot, border: 'none', borderRadius: 10, padding: '15px',
      boxShadow: '0 8px 28px rgba(26,20,16,0.28)',
    } }, React.createElement(Icon, { name: 'plus', size: 16 }), 'Add Strap'),

    React.createElement(Toast, { msg: toast }),
  );
};

Object.assign(window, { StrapDrawerRoot });
