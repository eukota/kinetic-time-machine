export const About = () => (
  <div className="h-full overflow-y-auto bg-kinetic-navy text-white bg-kinetic-dots bg-dots">
    <div className="h-1 bg-kinetic-stripes flex-shrink-0" aria-hidden />
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">

      <div>
        <h1 className="font-display text-4xl text-kinetic-gold tracking-wide mb-2" style={{ textShadow: '3px 3px 0 #D62828' }}>
          Kinetic Time Machine
        </h1>
        <p className="text-kinetic-gold/60 text-sm font-bold">A race-day photo tracker · For the Glory!</p>
      </div>

      <p className="text-white/85 leading-relaxed">
        The{' '}
        <a href="https://kineticgrandchampionship.com" target="_blank" rel="noreferrer"
          className="text-kinetic-gold hover:text-kinetic-orange underline font-bold">
          Kinetic Grand Championship
        </a>{' '}
        is a three-day, human-powered sculpture race through Humboldt County, California —
        42 miles of road, sand dunes, mud, and open water. It's been running since 1969
        and is one of the most joyfully absurd events in the state.
      </p>

      <p className="text-white/85 leading-relaxed">
        This app lets spectators and crew submit geotagged photos from the course.
        Each photo is plotted on an interactive map showing the race route across all three days
        (Arcata → Eureka → Crab Park → Ferndale). The gallery view shows all submissions
        in real time, filterable by team.
      </p>

      <div className="kinetic-panel !bg-kinetic-teal/10 !border-kinetic-teal/40 text-white/90 text-sm leading-relaxed px-4 py-3 space-y-1">
        <p className="font-display text-lg text-kinetic-gold flex items-center gap-1.5">
          <span aria-hidden>🛡️</span> A note on safety
        </p>
        <p className="text-white/70">
          Submitted photos go through a brief manual review before appearing publicly.
          This keeps the map family-friendly and protects against accidental or malicious uploads.
          Most submissions are approved within minutes during the race.
        </p>
      </div>

      <div className="border-t-2 border-dashed border-kinetic-gold/30 pt-8">
        <h2 className="font-display text-xl text-kinetic-gold mb-3">About the builder</h2>
        <p className="text-white/70 leading-relaxed">
          I lived in Arcata from 2004–2009 and have been fascinated by the kinetic race ever since.
          Participating in it in some fashion has been a dream for a long time.
          I moved back to the area in September 2025 — this app is part of making that happen.
          This year I'm playing trombone in the Royal Kinetic Madness Band.
        </p>
      </div>

      <div className="border-t-2 border-dashed border-kinetic-gold/30 pt-8">
        <h2 className="font-display text-xl text-kinetic-gold mb-3">A note on the map</h2>
        <p className="text-white/70 leading-relaxed">
          The race route shown here was drawn by hand from the KGC Full Map Package PDFs,
          waypoint by waypoint, as best I could read them. Beach and dune sections in
          particular are approximations. If you spot a stretch that's wrong, let me know.
        </p>
      </div>

      <div className="border-t-2 border-dashed border-kinetic-gold/30 pt-8">
        <h2 className="font-display text-xl text-kinetic-gold mb-3">A note on the code</h2>
        <p className="text-white/70 leading-relaxed">
          This app was written in a feverish sprint with AI just 48 hours before the 2026 race.
          Pardon the mess. If it turns out to be useful, I'll keep building on it after the race.
        </p>
      </div>

      <div className="border-t-2 border-dashed border-kinetic-gold/30 pt-8">
        <h2 className="font-display text-xl text-kinetic-gold mb-3">Ideas floating around</h2>
        <p className="text-white/70 leading-relaxed mb-3">
          Half-baked thoughts that might or might not happen — partly because the name "time machine"
          deserves to live up to itself:
        </p>
        <ul className="list-none space-y-2 text-white/60">
          {[
            'Some kind of timeline scrubber to watch the race unfold hour by hour after it\'s over',
            'Letting viewers help identify photos that didn\'t get tagged with a team',
            'Heatmaps showing where photos clustered along the course',
            'A way to follow one team\'s whole journey across all three days',
            'Pulling in archives from past years if the data is out there somewhere',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-kinetic-gold flex-shrink-0">★</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-white/40 text-xs italic leading-relaxed mt-3">
          No promises. Whether any of this happens depends on whether the app turns out to be useful
          to anyone besides me.
        </p>
      </div>

      <div className="border-t-2 border-dashed border-kinetic-gold/30 pt-8 flex flex-wrap gap-3">
        <a
          href="https://github.com/eukota/kinetic-time-machine"
          target="_blank"
          rel="noreferrer"
          className="kinetic-btn-secondary inline-flex items-center gap-2 !py-2 !px-4 text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub
        </a>
        <a
          href="mailto:eukota@gmail.com?subject=Kinetic%20Time%20Machine"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-kinetic-gold/40 text-kinetic-gold hover:bg-kinetic-gold/10 transition-colors text-sm font-bold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 6-10 7L2 6"/>
          </svg>
          Email me
        </a>
      </div>

      <p className="text-center text-[10px] font-bold text-white/25 uppercase tracking-widest pt-4">
        Unofficial fan tracker · Not affiliated with Kinetic Universe
      </p>

    </div>
  </div>
)
