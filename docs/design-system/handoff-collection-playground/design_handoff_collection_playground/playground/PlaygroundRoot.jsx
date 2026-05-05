// PlaygroundRoot.jsx — Playground page
// Unified with My Collection header pattern:
//  - Title + tagline on one row
//  - Meta row: + Add Watch | Watches · Est. Value · Stats↓
//  - Box tabs (Playground-specific)
//  - Box meta row (name with inline rename, tags, Delete Box)
//  - Toolbar: View switcher | (Order if cards) + Share Box
//  - Watchbox / Cards grid + Sidebar

const IconPlus = window.IconPlus || (({ size = 13 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' },
    React.createElement('line', { x1: 7, y1: 2.5, x2: 7, y2: 11.5 }),
    React.createElement('line', { x1: 2.5, y1: 7, x2: 11.5, y2: 7 })
  )
);

const IconPhoto = ({ size = 16 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('rect', { x: 3, y: 4, width: 14, height: 11, rx: 1.5 }),
    React.createElement('circle', { cx: 7.5, cy: 8, r: 1.2 }),
    React.createElement('polyline', { points: '4,14 8.5,10 11.5,12.5 16,8.5' })
  );

const IconTrash = ({ size = 12 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '2.5,3.5 11.5,3.5' }),
    React.createElement('path', { d: 'M5 3.5V2.5a1 1 0 011-1h2a1 1 0 011 1v1' }),
    React.createElement('path', { d: 'M3.5 3.5l.7 8a1 1 0 001 .9h3.6a1 1 0 001-.9l.7-8' })
  );

const IconPencil = ({ size = 12 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M2 12l2.2-.5L11 4.7l-1.7-1.7L2.5 9.8 2 12z' }),
    React.createElement('line', { x1: 9, y1: 5, x2: 10.7, y2: 6.7 })
  );

// ---------- View switcher (3 icons; Photo disabled) ----------

const PlaygroundViewSwitcher = ({ view, setView }) => {
  const items = [
    { id: 'watchbox', label: 'Watchbox', Icon: IconWatchbox, disabled: false },
    { id: 'cards', label: 'Cards', Icon: IconCards, disabled: false },
    { id: 'photo', label: 'Photo', Icon: IconPhoto, disabled: true },
  ];
  return React.createElement('div', {
    role: 'tablist',
    style: { display: 'inline-flex', gap: 2, background: '#F0EBE3', borderRadius: 6, padding: 3 }
  },
    items.map(({ id, label, Icon, disabled }) => {
      const active = view === id;
      return React.createElement('button', {
        key: id,
        role: 'tab',
        'aria-selected': active,
        'aria-disabled': disabled,
        title: disabled ? `${label} — coming soon` : label,
        onClick: () => !disabled && setView(id),
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.06em',
          padding: '7px 12px', borderRadius: 4, border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: active ? '#FFFFFF' : 'transparent',
          color: disabled ? '#D4CBBF' : (active ? '#1A1410' : '#A89880'),
          boxShadow: active ? '0 1px 3px rgba(26,20,16,0.08)' : 'none',
          transition: 'background 0.15s, color 0.15s',
          opacity: disabled ? 0.65 : 1,
          position: 'relative',
        }
      },
        React.createElement(Icon, { size: 15 }),
        React.createElement('span', { style: { fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase' } }, label),
        disabled && React.createElement('span', {
          style: {
            fontSize: 7.5, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase',
            background: '#FAF8F4', color: '#A89880', padding: '1px 5px', borderRadius: 8,
            border: '1px solid #EAE5DC', marginLeft: 2,
          }
        }, 'Soon')
      );
    })
  );
};

// ---------- Box tab strip ----------

const BoxTabs = ({ boxes, activeId, onSelect, onCreate }) =>
  React.createElement('div', {
    style: {
      display: 'flex', gap: 4, alignItems: 'flex-end',
      borderBottom: '1px solid #EAE5DC',
      overflowX: 'auto',
    }
  },
    boxes.map(box => {
      const active = box.id === activeId;
      return React.createElement('button', {
        key: box.id,
        onClick: () => onSelect(box.id),
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: 'DM Sans,sans-serif', fontSize: 12,
          fontWeight: active ? 500 : 400,
          padding: '10px 18px',
          background: active ? '#FAF8F4' : 'transparent',
          color: active ? '#1A1410' : '#A89880',
          border: '1px solid',
          borderColor: active ? '#EAE5DC' : 'transparent',
          borderBottom: active ? '1px solid #FAF8F4' : '1px solid transparent',
          borderRadius: '8px 8px 0 0',
          marginBottom: -1,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }
      },
        box.name,
        React.createElement('span', { style: { fontSize: 10, color: active ? '#A89880' : '#C8BCA9', fontVariantNumeric: 'tabular-nums' } }, `· ${box.watchIds.length}`)
      );
    }),
    React.createElement('button', {
      onClick: onCreate,
      title: 'New box',
      style: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, marginLeft: 4, marginBottom: 6,
        background: 'transparent', border: '1px dashed #D4CBBF', color: '#A89880',
        borderRadius: 6, cursor: 'pointer', fontSize: 16, fontWeight: 300,
      }
    }, '+')
  );

// ---------- Box meta strip (name, tags, delete) ----------

const BoxMetaStrip = ({ box, onRename, onDelete, canDelete, onAddWatch, watchCount, totalValue, onJumpStats }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(box.name);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => { setDraft(box.name); setEditing(false); setConfirmDel(false); }, [box.id, box.name]);
  React.useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 0); }, [editing]);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== box.name) onRename(v);
    setEditing(false);
  };

  const metaLabel = { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880' };
  const metaValue = { fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 500, color: '#1A1410' };

  return React.createElement('div', {
    style: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 20, padding: '16px 0 20px', borderBottom: '1px solid #EAE5DC',
      flexWrap: 'wrap',
    }
  },
    // LEFT: name + pencil + tags
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 } },
      editing
        ? React.createElement('input', {
            ref: inputRef, value: draft,
            onChange: e => setDraft(e.target.value),
            onBlur: commit,
            onKeyDown: e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(box.name); setEditing(false); } },
            style: {
              fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 24, fontWeight: 400,
              color: '#1A1410', background: 'transparent', border: 'none',
              borderBottom: '1.5px solid #C9A84C', outline: 'none', minWidth: 220, padding: '0 0 2px',
            }
          })
        : React.createElement('h2', {
            onClick: () => setEditing(true),
            title: 'Click to rename',
            style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 24, fontWeight: 400, color: '#1A1410', margin: 0, lineHeight: 1.1, cursor: 'text' }
          }, box.name),
      !editing && React.createElement('button', {
        onClick: () => setEditing(true),
        title: 'Rename', 'aria-label': 'Rename box',
        style: {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: 6, border: '1px solid #EAE5DC',
          background: '#FFFFFF', color: '#A89880', cursor: 'pointer',
        }
      }, React.createElement(IconPencil, { size: 12 })),
      box.tags.length > 0 && React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
        box.tags.map(t => React.createElement('span', {
          key: t,
          style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, padding: '2px 9px', borderRadius: 20, border: '1px solid #EAE5DC', color: '#A89880' }
        }, t))
      )
    ),

    // RIGHT: watch count · Add Watch · Delete (stats/value live in Collection, not here)
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
      React.createElement('span', { style: { ...metaLabel, fontSize: 10.5 } },
        `${watchCount} ${watchCount === 1 ? 'Watch' : 'Watches'}`
      ),
      React.createElement('button', {
        onClick: onAddWatch,
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '8px 14px', background: '#1A1410', color: '#FAF8F4',
          border: 'none', borderRadius: 4, cursor: 'pointer',
        }
      },
        React.createElement(IconPlus, { size: 12 }),
        'Add Watch'
      ),

      canDelete && (
      confirmDel
        ? React.createElement('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
            React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#A89880' } }, 'Delete?'),
            React.createElement('button', {
              onClick: () => setConfirmDel(false),
              style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', padding: '6px 10px', background: 'transparent', color: '#A89880', border: '1px solid #EAE5DC', borderRadius: 6, cursor: 'pointer' }
            }, 'Cancel'),
            React.createElement('button', {
              onClick: () => { onDelete(); setConfirmDel(false); },
              style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '6px 10px', background: '#1A1410', color: '#FAF8F4', border: 'none', borderRadius: 6, cursor: 'pointer' }
            }, 'Delete')
          )
        : React.createElement('button', {
            onClick: () => setConfirmDel(true),
            style: {
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '7px 14px', background: '#FFFFFF', color: '#A89880',
              border: '1px solid #EAE5DC', borderRadius: 6, cursor: 'pointer',
            }
          },
            React.createElement(IconTrash, { size: 12 }),
            'Delete Box'
          )
      )
    )
  );
};

// ---------- New Box modal ----------

const TAG_PRESETS = ['Dream Box', 'Under $10K', 'Travel', 'Dress', 'GMT Only', 'Vintage', 'Color Study', 'Upgrade Path'];

const NewBoxModal = ({ onClose, onCreate }) => {
  const [name, setName] = React.useState('');
  const [tags, setTags] = React.useState([]);
  const inputRef = React.useRef(null);
  React.useEffect(() => { setTimeout(() => inputRef.current?.focus(), 0); }, []);

  const toggleTag = t => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const submit = () => { if (name.trim()) onCreate(name.trim(), tags); };

  return React.createElement(React.Fragment, null,
    React.createElement('div', {
      onClick: onClose,
      style: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(26,20,16,0.5)', backdropFilter: 'blur(4px)' }
    }),
    React.createElement('div', {
      style: {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 201, width: '90vw', maxWidth: 460,
        background: '#FFFCF7', border: '1px solid #EAE5DC', borderRadius: 14,
        boxShadow: '0 24px 60px rgba(26,20,16,0.32)', padding: 24,
      }
    },
      React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 } }, 'New Box'),
      React.createElement('h3', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 28, fontWeight: 400, color: '#1A1410', margin: '0 0 18px', lineHeight: 1.1 } }, 'Start a new playground box'),
      React.createElement('label', { style: { display: 'block', marginBottom: 18 } },
        React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880', marginBottom: 8 } }, 'Box Name'),
        React.createElement('input', {
          ref: inputRef,
          value: name,
          onChange: e => setName(e.target.value),
          onKeyDown: e => { if (e.key === 'Enter') submit(); },
          placeholder: 'e.g. Vintage Divers',
          style: {
            width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            border: '1px solid #EAE5DC', borderRadius: 6,
            fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#1A1410',
            background: '#FFFFFF', outline: 'none',
          }
        })
      ),
      React.createElement('div', { style: { marginBottom: 22 } },
        React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880', marginBottom: 8 } }, 'Tags · optional'),
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
          TAG_PRESETS.map(t => {
            const on = tags.includes(t);
            return React.createElement('button', {
              key: t,
              onClick: () => toggleTag(t),
              style: {
                fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
                padding: '5px 11px', borderRadius: 20, cursor: 'pointer',
                background: on ? '#1A1410' : 'transparent',
                color: on ? '#FAF8F4' : '#A89880',
                border: on ? '1px solid #1A1410' : '1px solid #EAE5DC',
              }
            }, t);
          })
        )
      ),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
        React.createElement('button', {
          onClick: onClose,
          style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 12px', background: 'transparent', color: '#1A1410', border: '1px solid #D4CBBF', borderRadius: 6, cursor: 'pointer' }
        }, 'Cancel'),
        React.createElement('button', {
          onClick: submit, disabled: !name.trim(),
          style: {
            fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '10px 12px',
            background: name.trim() ? '#1A1410' : '#D4CBBF',
            color: '#FAF8F4', border: 'none', borderRadius: 6,
            cursor: name.trim() ? 'pointer' : 'not-allowed',
          }
        }, 'Create Box')
      )
    )
  );
};

// ---------- Empty box state ----------

const EmptyBox = ({ onAdd }) =>
  React.createElement('div', {
    style: {
      background: '#FFFCF7', border: '1px dashed #D4CBBF', borderRadius: 12,
      padding: '64px 24px', textAlign: 'center',
    }
  },
    React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 } }, 'Empty box'),
    React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 22, color: '#1A1410', marginBottom: 16 } }, 'Add a watch to start dreaming.'),
    React.createElement('button', {
      onClick: onAdd,
      style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 22px', background: '#1A1410', color: '#FAF8F4', border: 'none', borderRadius: 4, cursor: 'pointer' }
    }, '+ Add Watch')
  );

// ---------- Root ----------

const PlaygroundRoot = () => {
  const [boxes, setBoxes] = React.useState(PLAYGROUND_BOXES);
  const [activeBoxId, setActiveBoxId] = React.useState(boxes[0].id);
  const [view, setView] = React.useState('watchbox');
  const [activeWatch, setActiveWatch] = React.useState(null);
  const [activeIdx, setActiveIdx] = React.useState(null);
  const [sort, setSort] = React.useState('recent');
  const [newBoxOpen, setNewBoxOpen] = React.useState(false);
  const [toast, setToast] = React.useState('');

  const activeBox = boxes.find(b => b.id === activeBoxId) || boxes[0];
  const watchesById = React.useMemo(() => {
    const m = {};
    PLAYGROUND_WATCHES.forEach(w => { m[w.id] = w; });
    return m;
  }, []);
  const boxWatches = activeBox.watchIds.map(id => watchesById[id]).filter(Boolean);
  const totalEstValue = boxWatches.reduce((s, w) => s + w.estimatedValue, 0);

  const switchBox = id => {
    setActiveBoxId(id);
    setActiveWatch(null); setActiveIdx(null); setSort('recent');
  };

  const handleBoxSlotClick = idx => {
    if (idx === null) return;
    setActiveIdx(prev => {
      const n = prev === idx ? null : idx;
      setActiveWatch(n !== null ? boxWatches[n] : null);
      return n;
    });
  };
  const handleCardSelect = w => setActiveWatch(prev => (prev?.id === w.id ? null : w));

  const flash = msg => { setToast(msg); setTimeout(() => setToast(''), 1800); };

  const handleRename = newName => {
    setBoxes(prev => prev.map(b => b.id === activeBoxId ? { ...b, name: newName } : b));
    flash('Box renamed');
  };
  const handleDelete = () => {
    setBoxes(prev => {
      const next = prev.filter(b => b.id !== activeBoxId);
      if (next.length > 0) setActiveBoxId(next[0].id);
      return next.length ? next : PLAYGROUND_BOXES;
    });
    setActiveWatch(null); setActiveIdx(null);
    flash('Box deleted');
  };
  const handleCreate = (name, tags) => {
    const id = 'box-' + Date.now();
    const newBox = { id, name, tags, watchIds: [], slotCount: 6 };
    setBoxes(prev => [...prev, newBox]);
    setActiveBoxId(id);
    setActiveWatch(null); setActiveIdx(null);
    setNewBoxOpen(false);
    flash('Box created');
  };
  const handleRemoveFromBox = w => {
    setBoxes(prev => prev.map(b => b.id === activeBoxId
      ? { ...b, watchIds: b.watchIds.filter(id => id !== w.id) }
      : b));
    setActiveWatch(null); setActiveIdx(null);
    flash('Removed from box');
  };

  const sorted = sortWatches(boxWatches, sort);
  const onJumpStats = () => document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return React.createElement('div', { style: { minHeight: '100vh', background: '#FAF8F4' } },

    // ============ HEADER ============
    React.createElement('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '40px 56px 0' } },

      // Title row: serif title + tagline on the right (baseline-aligned)
      React.createElement('div', { style: { marginBottom: 28, display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap' } },
        React.createElement('h1', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 48, fontWeight: 400, lineHeight: 1.1, color: '#1A1410', margin: 0 } }, 'Playground'),
        React.createElement('p', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#A89880', margin: 0, letterSpacing: '0.02em' } }, 'Build your dream collection. No limits.')
      ),

      // Box tabs
      React.createElement(BoxTabs, {
        boxes, activeId: activeBoxId,
        onSelect: switchBox,
        onCreate: () => setNewBoxOpen(true),
      }),

      // Box meta strip — name, tags, Add Watch, stats, Delete (everything box-scoped)
      React.createElement(BoxMetaStrip, {
        box: activeBox,
        onRename: handleRename,
        onDelete: handleDelete,
        canDelete: boxes.length > 1,
        onAddWatch: () => flash('Add Watch flow opens'),
        watchCount: boxWatches.length,
        totalValue: totalEstValue,
        onJumpStats,
      })
    ),

    // ============ MAIN CONTENT ============
    React.createElement('div', {
      style: {
        maxWidth: 1280, margin: '0 auto',
        padding: '20px 56px 64px',
        display: 'grid',
        gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start',
      }
    },
      React.createElement('div', null,
        // Toolbar mirrors Collection: View | (Order if cards) + Share
        React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, minHeight: 36 }
        },
          React.createElement(PlaygroundViewSwitcher, { view, setView }),
          React.createElement('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 10 } },
            view === 'cards' && React.createElement(OrderDropdown, { value: sort, setValue: setSort }),
            React.createElement(ShareBox, { watches: sorted, totalValue: totalEstValue })
          )
        ),

        boxWatches.length === 0
          ? React.createElement(EmptyBox, { onAdd: () => flash('Add Watch flow opens') })
          : view === 'watchbox'
              ? React.createElement(WatchBoxGrid, { watches: sorted, slotCount: activeBox.slotCount, activeIdx, onSlotClick: handleBoxSlotClick })
              : React.createElement(WatchCardGrid, { watches: sorted, activeId: activeWatch?.id, onSelect: handleCardSelect })
      ),

      React.createElement(WatchSidebar, {
        watch: activeWatch, mode: 'playground',
        onClose: () => { setActiveWatch(null); setActiveIdx(null); },
        onDelete: handleRemoveFromBox,
      })
    ),

    // Stats
    React.createElement(CollectionStats, { watches: boxWatches }),

    // Modals
    newBoxOpen && React.createElement(NewBoxModal, {
      onClose: () => setNewBoxOpen(false),
      onCreate: handleCreate,
    }),

    // Toast
    toast && React.createElement('div', {
      style: {
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        background: '#1A1410', color: '#FAF8F4', padding: '10px 22px', borderRadius: 8,
        fontFamily: 'DM Sans,sans-serif', fontSize: 12, zIndex: 300,
      }
    }, toast)
  );
};

Object.assign(window, { PlaygroundRoot, NewBoxModal, BoxTabs, BoxMetaStrip, PlaygroundViewSwitcher });
