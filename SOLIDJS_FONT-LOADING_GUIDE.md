
# SolidStart Font Loading Guide

## Table of Contents
1. [Overview](#overview)
2. [The Problem: FOUT](#the-problem-fout)
3. [Font Loading Strategies](#font-loading-strategies)
4. [Implementation in SolidStart](#implementation-in-solidstart)
5. [Best Practices](#best-practices)
6. [Common Pitfalls](#common-pitfalls)
7. [Performance Considerations](#performance-considerations)
8. [Testing Font Loading](#testing-font-loading)

## Overview

Font loading in SolidStart requires careful consideration due to its server-side rendering (SSR) capabilities and the need to prevent Flash of Unstyled Text (FOUT). This guide covers the optimal approach for loading web fonts in a SolidStart application.

## The Problem: FOUT

Flash of Unstyled Text (FOUT) occurs when:
1. The browser renders text with fallback fonts first
2. Web fonts load asynchronously
3. Text re-renders with the loaded font, causing a visual "flash"

This creates a poor user experience, especially noticeable with distinctive fonts like handwriting or display fonts.

## Font Loading Strategies

### Strategy 1: Render-Blocking (Recommended for Critical Fonts)

**When to use:** For fonts that significantly affect layout or brand identity

```tsx
// src/entry-server.tsx
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;700"
  media="all"
/>
```

**Pros:**
- No FOUT
- Consistent initial render
- Simple implementation

**Cons:**
- Blocks rendering until font loads
- Can increase First Contentful Paint (FCP)

### Strategy 2: Preload with Async Loading

**When to use:** For non-critical fonts where some FOUT is acceptable

```tsx
// src/entry-server.tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=YourFont&display=swap"
  onload="this.onload=null;this.rel='stylesheet'"
/>
<noscript>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=YourFont&display=swap" />
</noscript>
```

**Note:** The `onload` attribute may not work reliably with SolidStart's SSR.

### Strategy 3: Font Display Options

Google Fonts supports different `font-display` values:

- `display=block` - Blocks text rendering (up to 3s)
- `display=swap` - Shows fallback immediately, swaps when loaded
- `display=fallback` - Short block period (100ms), then fallback
- `display=optional` - Very short block, font is optional

## Implementation in SolidStart

### Step 1: Centralize Font Loading

Always load fonts in `entry-server.tsx` to ensure they're available across your entire application:

```tsx
// src/entry-server.tsx
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          {/* Font Preloading */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Nunito:wght@400;600;700"
            media="all"
          />

          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
```

### Step 2: Remove CSS @import Statements

Never use `@import` for fonts in CSS files:

```css
/* ❌ Don't do this */
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');

/* ✅ Load fonts in entry-server.tsx instead */
.my-class {
  font-family: 'Caveat', cursive;
}
```

### Step 3: Use Proper HTML Attributes

SolidStart uses JSX but stays close to HTML specifications:

```tsx
// ✅ Correct: lowercase 'crossorigin'
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

// ❌ Wrong: camelCase 'crossOrigin'
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin />
```

## Best Practices

### 1. Preconnect to Font Domains

Always include preconnect hints:

```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

### 2. Load Fonts Before Assets

Place font links before the `{assets}` placeholder:

```tsx
{/* Fonts first */}
<link rel="stylesheet" href="..." />

{/* Then assets */}
{assets}
```

### 3. Combine Font Families

Load multiple fonts in a single request:

```tsx
// ✅ Single request
href="https://fonts.googleapis.com/css2?family=Font1:wght@400;700&family=Font2:wght@400;600"

// ❌ Multiple requests
href="https://fonts.googleapis.com/css2?family=Font1:wght@400;700"
href="https://fonts.googleapis.com/css2?family=Font2:wght@400;600"
```

### 4. Specify Only Needed Weights

Don't load weights you won't use:

```tsx
// ✅ Only needed weights
family=Nunito:wght@400;600;700

// ❌ All weights
family=Nunito:wght@100;200;300;400;500;600;700;800;900
```

## Common Pitfalls

### 1. Client-Side Only Loading

Don't load fonts only on the client side:

```tsx
// ❌ Wrong: Client-side only
onMount(() => {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/...';
  document.head.appendChild(link);
});
```

### 2. Duplicate Font Loading

Avoid loading fonts in multiple places:

```css
/* Component1.css */
@import url('...');  /* ❌ */

/* Component2.css */
@import url('...');  /* ❌ Duplicate */
```

### 3. Missing CORS Attribute

The `crossorigin` attribute is required for font preloading:

```tsx
// ❌ Missing crossorigin
<link rel="preconnect" href="https://fonts.gstatic.com" />

// ✅ With crossorigin
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

## Performance Considerations

### 1. Self-Hosting Fonts

For ultimate control and performance:

```tsx
// Download fonts and serve from /public/fonts/
<link
  rel="preload"
  href="/fonts/caveat-v12-latin-regular.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

### 2. Variable Fonts

Use variable fonts to reduce file size:

```tsx
// Single variable font file instead of multiple weights
href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900"
```

### 3. Subset Fonts

For non-Latin fonts, use subsets:

```tsx
// Load only Latin characters
href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400&subset=latin"
```

## Testing Font Loading

### 1. Network Tab Verification

Check in DevTools Network tab:
- Fonts load early in the waterfall
- Preconnect reduces connection time
- No duplicate font requests

### 2. Performance Testing

Use Lighthouse to verify:
- No increase in FCP
- CLS (Cumulative Layout Shift) remains low
- No font-related warnings

### 3. Visual Testing

Test with network throttling:
- 3G slow connection
- Verify no FOUT
- Check fallback behavior

### 4. Cross-Browser Testing

Test on:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers

## Troubleshooting

### FOUT Still Occurring

1. Verify fonts load before content:
   - Check Network tab timing
   - Ensure font link is before `{assets}`

2. Remove display parameter:
   ```tsx
   // Change from
   href="...&display=swap"
   // To
   href="..." // No display parameter
   ```

3. Add media attribute:
   ```tsx
   <link rel="stylesheet" href="..." media="all" />
   ```

### Fonts Not Loading

1. Check console for CORS errors
2. Verify `crossorigin` attribute on preconnect
3. Ensure correct font family names in CSS

### Performance Issues

1. Reduce number of font weights
2. Consider self-hosting critical fonts
3. Use `font-display: optional` for non-critical fonts

## Conclusion

Proper font loading in SolidStart requires:
- Centralized loading in `entry-server.tsx`
- Appropriate use of preconnect hints
- Careful consideration of render-blocking vs async loading
- Regular testing across devices and network conditions

By following these guidelines, you can achieve optimal font loading performance while maintaining a great user experience.
