// NavBar.jsx — Virtual Watchbox UI Kit

const NavBar = ({ page, setPage }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const links = [
    { label: 'My Collection', id: 'collection' },
    { label: 'Playground', id: 'playground' },
    { label: 'Discover', id: null },
    { label: 'News', id: null },
  ];

  return React.createElement(React.Fragment, null,
    React.createElement('nav', {
      style: {
        borderBottom: '1px solid #EAE5DC',
        background: '#FAF8F4',
        position: 'sticky', top: 0, zIndex: 100,
      }
    },
      React.createElement('div', {
        style: {
          maxWidth: 1280, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 56px',
        }
      },
        // Logo
        React.createElement('span', {
          onClick: () => setPage('home'),
          style: {
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: 20, fontWeight: 500, letterSpacing: '0.03em',
            color: '#1A1410', cursor: 'pointer',
          }
        }, 'Virtual Watchbox'),

        // Desktop links
        React.createElement('div', {
          style: { display: 'flex', gap: 32, alignItems: 'center' }
        },
          links.map(link =>
            React.createElement('a', {
              key: link.label,
              onClick: link.id ? () => setPage(link.id) : undefined,
              style: {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 12, fontWeight: page === link.id ? 500 : 400,
                letterSpacing: '0.04em',
                color: page === link.id ? '#1A1410' : '#A89880',
                cursor: link.id ? 'pointer' : 'default',
                textDecoration: 'none',
                borderBottom: page === link.id ? '1px solid #1A1410' : 'none',
                paddingBottom: page === link.id ? 1 : 0,
              }
            }, link.label)
          )
        ),

        // Sign In
        React.createElement('button', {
          style: {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
            padding: '9px 22px', background: '#1A1410', color: '#FAF8F4',
            border: 'none', borderRadius: 4, cursor: 'pointer',
          }
        }, 'Sign In')
      )
    )
  );
};

Object.assign(window, { NavBar });
