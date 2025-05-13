---
name: responsive-design
category: ui
created: 2025-05-12
last_used: 2025-05-12
references: 1
components:
  - Layout
  - MediaQueries
---

# Responsive Design Pattern

This pattern documents our approach to responsive design across the application.

## Core Principles

1. Mobile-first approach for all components
2. Use relative units (rem, em, %) instead of fixed pixels 
3. Implement progressive enhancement
4. Test on multiple viewport sizes

## Breakpoints

We use the following standard breakpoints:

```css
/* Mobile (default) */
/* No media query needed */

/* Tablet */
@media (min-width: 768px) {
  /* Tablet styles */
}

/* Desktop */
@media (min-width: 1024px) {
  /* Desktop styles */
}

/* Large Desktop */
@media (min-width: 1440px) {
  /* Large desktop styles */
}
```

## Implementation Examples

### Container Component

```jsx
const Container = ({ children, fluid }) => {
  // Implementation follows responsive design pattern
  return (
    <div className={`container ${fluid ? 'container-fluid' : ''}`}>
      {children}
    </div>
  );
};
```

## Accessibility Considerations

- Ensure touch targets are at least 44×44px on mobile
- Test zoom functionality up to 400%
- Verify that layout doesn't break when font size is increased
- Implement proper focus states for all viewport sizes

## Common Mistakes to Avoid

- Don't use fixed heights that prevent content from expanding
- Avoid horizontal scrolling except for dedicated components (like carousels)
- Don't hide critical functionality on mobile devices
