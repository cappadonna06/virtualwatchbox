// Variation A — bottom sheet — focused exploration

const { DesignCanvas, DCSection, DCArtboard, DCPostIt } = window;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="v1" title="Filter sheet — refined" subtitle="Photos toggle is now part of the filter system. Default ON. Removable like any other filter; warns when turned off.">
        <DCArtboard id="v1-mobile" label="Mobile · default (photos on)" width={360} height={720}>
          <V1Mobile/>
        </DCArtboard>
        <DCArtboard id="v1-mobile-open" label="Mobile · sheet open" width={360} height={720}>
          <V1MobileOpen/>
        </DCArtboard>
        <DCArtboard id="v1-mobile-off" label="Mobile · photos off (warning)" width={360} height={720}>
          <V1MobilePhotosOff/>
        </DCArtboard>
        <DCArtboard id="v1-desktop" label="Desktop · popover open" width={880} height={620}>
          <V1Desktop/>
        </DCArtboard>
        <DCPostIt id="v1-note" x={20} y={20}>
          Photos toggle is folded in as a 4th facet — boolean switch at the top of the sheet, prominent because it filters out half the catalog. In the closed-state pill row: a quiet "Photos only ×" reminder when ON; an amber "Showing all watches" warning when OFF, so users always know which mode they're in.
        </DCPostIt>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
