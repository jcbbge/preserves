# Phase 1: Font Preloading Specification

## Overview
Implement optimized font loading for the Caveat handwritten font used in polaroid captions. This phase focuses on eliminating Flash of Unstyled Text (FOUT) and ensuring the font is available before polaroids render.

## Background Research

### SolidStart Font Loading Best Practices
Based on SolidStart documentation and community patterns:

1. **Document Head Approach**: SolidStart's `entry-server.tsx` provides direct access to the document head, making it the ideal location for font preloading
2. **Preconnect Strategy**: Establishing early connections to font providers reduces latency
3. **Synchronous Loading**: For critical fonts like Caveat, synchronous loading prevents layout shifts

### Current Implementation Issues
- Font loaded via CSS `@import` in `Polaroid.module.css`
- No preconnect hints to Google Fonts
- Potential FOUT during initial render
- Font loading blocks CSS parsing

## Technical Specification

### Files to Modify

#### 1. `src/entry-server.tsx`
**Current State:**
```tsx
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  {assets}
</head>
```

**Target State:**
```tsx
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  
  {/* Font Preloading */}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
  <link 
    rel="stylesheet" 
    href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" 
  />
  
  {assets}
</head>
```

#### 2. `src/components/Polaroid.module.css`
**Current State:**
```css
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
```

**Target State:**
Remove the `@import` line entirely.

### Implementation Details

#### Preconnect Links
- **Purpose**: Establish early connection to Google Fonts domains
- **`fonts.googleapis.com`**: CSS delivery
- **`fonts.gstatic.com`**: Font file delivery
- **`crossOrigin=""`**: Required for CORS-enabled resources

#### Font Link Attributes
- **`rel="stylesheet"`**: Synchronous loading for critical font
- **`display=swap`**: Fallback behavior if font fails to load
- **Weights**: 400 (regular) and 700 (bold) for caption variations

### Font Loading Detection (Optional Enhancement)

If needed for animation coordination:

```typescript
// src/utils/fontLoader.ts
export function isFontLoaded(fontFamily: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  
  return document.fonts.ready.then(() => {
    const fontLoaded = document.fonts.check(`12px "${fontFamily}"`);
    if (!fontLoaded) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (document.fonts.check(`12px "${fontFamily}"`)) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        
        // Timeout after 3 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 3000);
      });
    }
  });
}
```

## Testing Plan

### Automated Tests
```typescript
// src/entry-server.test.tsx
import { describe, it, expect } from 'vitest';
import { renderToString } from 'solid-js/web';
import { StartServer } from '@solidjs/start/server';

describe('Font Preloading', () => {
  it('should include font preconnect links', () => {
    const html = renderToString(() => <StartServer />);
    expect(html).toContain('rel="preconnect"');
    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('fonts.gstatic.com');
  });
  
  it('should include Caveat font stylesheet', () => {
    const html = renderToString(() => <StartServer />);
    expect(html).toContain('family=Caveat:wght@400;700');
  });
});
```

### Manual Testing
1. **Network Tab Verification**
   - Fonts load before polaroid images
   - Preconnect reduces connection time
   - No duplicate font requests

2. **Visual Testing**
   - No FOUT on initial load
   - No FOUT on route navigation
   - Correct font weights applied

3. **Performance Testing**
   - Lighthouse score maintained or improved
   - First Contentful Paint not negatively impacted
   - Cumulative Layout Shift remains at 0

## Success Metrics

### Quantitative
- **Font Load Time**: < 200ms on 3G connection
- **FOUT Occurrences**: 0
- **Lighthouse Performance**: No regression
- **Time to Interactive**: No increase

### Qualitative
- Smooth initial render
- No visual glitches
- Consistent experience across routes

## Rollback Plan

If issues arise:
1. Revert `entry-server.tsx` changes
2. Restore `@import` in `Polaroid.module.css`
3. Document specific issues for future attempts

## Migration Guide

### For Developers
1. Pull latest changes
2. Clear browser cache
3. Test locally with network throttling
4. Verify no console errors

### For Users
No action required - transparent upgrade

## Future Considerations

### Potential Optimizations
1. **Self-hosting fonts**: Eliminate external dependency
2. **Variable font**: Reduce file size with single font file
3. **Subset fonts**: Include only needed characters
4. **Service Worker**: Cache fonts for offline use

### Integration Points
- Consider font loading state in animation triggers
- Coordinate with Phase 2 drop animations
- Ensure font availability for SSR

## Appendix

### Resources
- [Web Font Optimization - web.dev](https://web.dev/optimize-webfont-loading/)
- [Font Display - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display)
- [Resource Hints - W3C](https://www.w3.org/TR/resource-hints/)

### Browser Support
- `preconnect`: All modern browsers
- `font-display`: All modern browsers
- Font Loading API: Chrome 35+, Firefox 41+, Safari 10+