# GPS Tracker Testing Checklist

## Setup
- [ ] Run `make seed` to populate test trackers
- [ ] Start backend: `make up`
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] Set `REACT_APP_MOCK_GEOLOCATION=true` in frontend `.env.local` for testing without real GPS

## Registration Flow
- [ ] Visit http://localhost:5173/register-tracker
- [ ] Enter test code (e.g., TEST-001)
- [ ] Submit registration
- [ ] See "Registration submitted" message
- [ ] Redirect happens after 3 seconds
- [ ] Admin can approve it in admin panel

## Map Display
- [ ] Visit main map http://localhost:5173/
- [ ] See live tracker markers for approved teams (red circles)
- [ ] Markers distinct from photo submission pins
- [ ] Markers update every 30 seconds

## Tracker Filter
- [ ] Right panel shows "📍 Live Tracking" section
- [ ] Search for team name → filter works
- [ ] Toggle team checkbox → marker shows/hides on map
- [ ] "All On" button → shows all trackers
- [ ] "All Off" button → hides all trackers
- [ ] Filter persists when switching between map views

## Tracking Page
- [ ] Click tracker marker → navigates to team tracking page
- [ ] OR visit http://localhost:5173/track/{team-id} directly
- [ ] See "Tracking Status" card (green when active)
- [ ] Mock mode shows test location buttons (if enabled)
- [ ] Click "Start Tracking" button → begins polling
- [ ] Location coordinates display and update
- [ ] "Stop Tracking" button stops updates

## Team Detail Page
- [ ] Click tracker marker → navigates to /team/{id}
- [ ] Team name and color in header
- [ ] Map centered on team's current location (if tracking active)
- [ ] Location updates every 30 seconds
- [ ] "Back to map" button returns to main map
- [ ] Photos section displays team submissions below map
- [ ] Photos grid shows 3 columns on desktop

## Location Updates (Live)
- [ ] Approve tracker in admin panel
- [ ] Visit tracking page for that team
- [ ] With mock mode: Click "Test Location" buttons
- [ ] Coordinates on tracking page should change
- [ ] Map markers for that team should move
- [ ] Team detail page should show updated location

## Error Cases
- [ ] Invalid team code in registration → error message
- [ ] Non-existent team ID in URL → 404 page
- [ ] Tracker not approved → "Awaiting Approval" message
- [ ] Geolocation denied in browser → error shown

## Performance
- [ ] Map remains responsive with 3+ trackers
- [ ] No console errors
- [ ] Location updates smooth every 30 seconds
- [ ] Filter panel searches quickly

## Known Limitations (MVP)
- Only one tracker per team (not multiple vehicles)
- Polling only (not WebSocket)
- Browser-based (must keep tab open during race)
- Mock mode requires env var (for testing only)
