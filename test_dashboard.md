# Dashboard Page Tests & Critical Issues

## Canvas Functionality - FAILING
- [ ] Canvas renders on the page
- [ ] Zoom in works
- [ ] Zoom out works
- [ ] Canvas panning is BROKEN - doesn't pan on mouse click down or space + mouse down
- [ ] Canvas zooms in/out on scroll but behavior is inconsistent
- [ ] Reset button doesn't work

## Item Interaction - COMPLETELY BROKEN
- [ ] Items CANNOT be dragged and dropped - MAJOR ISSUE
- [ ] Item positions don't maintain after interaction
- [ ] Items don't come to front when interacted with

## Persistence - INCONSISTENT
- [ ] Item positions don't persist correctly
- [ ] Canvas viewport position inconsistently persists

## Critical Required Fixes:
1. **Remove UI Elements:**
   - Remove the header (already explicitly requested to be removed)
   - Remove the logo (already explicitly requested to be removed)
   - Remove the logout button (already explicitly requested to be removed)

2. **Menu Item Addition:**
   - The dashboard needs a 'menu' data item similar to index page
   - Instead of 'login' menu, it should be 'download' menu

3. **Storage Consolidation:**
   - Multiple redundant storage keys are being used:
     - 'peach_user'
     - 'peach_token'
     - 'peach_preserves_unknown_dashboard'
     - 'peach_preserves_auth_user'
     - 'peach_preserves_auth_token'
   - Consolidate auth to a single storage mechanism

4. **CRITICAL DRAGGABLE FUNCTIONALITY:**
   - CanvasItems cannot be dragged and dropped
   - This is the PRIMARY purpose of the InfiniteCanvas component
   - Documentation is clear on implementation needs
   - May need to replace Polaroid components with simpler shapes if needed
   - Must fix drag and drop behavior according to documentation

## Next Steps:
- Completely rework the dashboard implementation
- Ensure InfiniteCanvas is properly implemented with ALL required functionality
- Fix storage inconsistencies
- Add proper menu items
- Remove unwanted UI elements
- Fix draggable functionality as HIGHEST priority