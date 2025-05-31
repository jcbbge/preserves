# PRD: SolidStart Data Loading & Performance Optimization

**Project**: Peach Preserves  
**Target**: Route Components Optimization  
**Version**: 1.0  
**Date**: 2025-01-27  

## Executive Summary

Optimize `index.tsx` and `dashboard.tsx` to follow SolidStart best practices for data loading, performance, and code quality. This initiative will improve page load performance, implement proper data fetching patterns, and enhance maintainability while preserving existing functionality and architecture.

## Problem Statement

### Current Issues Analysis

**Data Loading Anti-Patterns:**
- Heavy `onMount` initialization blocking initial render
- Manual API calls instead of `createResource`/`createAsync`
- Missing route preloading causing request waterfalls
- No server functions for sensitive operations
- Complex `createEffect` with data transformation logic

**Performance Issues:**
- Console logs in hot paths degrading performance
- Object spreading in store updates causing unnecessary re-renders
- Missing batching for related state updates
- Event handlers with unnecessary function wrapping
- No Suspense boundaries for loading states

**Error Handling Gaps:**
- No ErrorBoundary components for graceful failures
- Manual error handling instead of SolidStart patterns
- Missing loading states for async operations

## Success Criteria

### Performance Metrics
- [ ] Initial page load time improved by 20%
- [ ] Time to interactive reduced by 15%
- [ ] Lighthouse performance score > 90
- [ ] Zero console logs in production builds
- [ ] Bundle size reduction of 10%

### Code Quality Metrics
- [ ] 100% TypeScript coverage with proper types
- [ ] All store updates use `produce` or proper batching
- [ ] All async operations have error boundaries
- [ ] All data loading uses SolidStart patterns

### User Experience
- [ ] Smooth loading states with proper skeletons
- [ ] Graceful error handling with recovery options
- [ ] Consistent performance across devices
- [ ] Accessibility compliance maintained

## Technical Requirements

### 1. Server Functions Implementation

#### 1.1 Static Data Server Function
```typescript
// File: src/lib/server/staticData.ts
const getStaticCanvasData = query(async () => {
  "use server";
  return {
    stockImages,
    predefinedPositions,
    defaultPositions: DEFAULT_POSITIONS
  };
}, "getStaticCanvasData");
```

#### 1.2 Peach API Server Function
```typescript
// File: src/lib/server/peachData.ts
const getPeachPosts = query(async (username: string, token: string) => {
  "use server";
  const formData = new FormData();
  formData.append("username", username);
  formData.append("token", token);
  
  const response = await fetchStream(formData);
  return response;
}, "getPeachPosts");
```

### 2. Route Preloading Configuration

#### 2.1 Index Route Preloading
```typescript
// File: app.config.ts or route configuration
{
  path: "/",
  component: lazy(() => import("./routes/index")),
  preload: () => getStaticCanvasData()
}
```

#### 2.2 Dashboard Route Preloading
```typescript
{
  path: "/dashboard",
  component: lazy(() => import("./routes/dashboard")),
  preload: ({ context }) => {
    const user = getCurrentUser(context);
    if (user?.username && user?.token) {
      return getPeachPosts(user.username, user.token);
    }
  }
}
```

### 3. Component Data Loading Refactoring

#### 3.1 Index.tsx Data Loading
```typescript
// Replace onMount with createAsync
export default function Home() {
  const staticData = createAsync(() => getStaticCanvasData());
  const { isAuthenticated } = usePeach();
  
  // Remove initializeLogin function
  // Move logic to route preload and reactive computations
}
```

#### 3.2 Dashboard.tsx Data Loading
```typescript
// Replace manual loadPosts with createAsync
export default function Dashboard() {
  const { user, token } = usePeach();
  const postsData = createAsync(() => {
    if (user.data?.username && token()) {
      return getPeachPosts(user.data.username, token());
    }
  });
}
```

### 4. Store Optimization

#### 4.1 Replace Object Spreading with Produce
```typescript
// Current (inefficient):
setItems(index, (item) => ({ ...item, position: newPos }));

// Optimized:
setItems(index, produce((item) => {
  item.position = newPos;
  item.rotation = newRot;
}));
```

#### 4.2 Batch Related Updates
```typescript
// Group related state updates
batch(() => {
  setState("canvasWidth", window.innerWidth);
  setState("canvasHeight", window.innerHeight);
  setState("clientOnly", true);
});
```

### 5. Error Handling & Loading States

#### 5.1 Add Suspense Boundaries
```typescript
return (
  <div class={styles["peach-preserve"]}>
    <Suspense fallback={<CanvasLoadingSkeleton />}>
      <InfiniteCanvas>
        {/* Canvas content */}
      </InfiniteCanvas>
    </Suspense>
  </div>
);
```

#### 5.2 Add Error Boundaries
```typescript
<ErrorBoundary fallback={(error) => <ErrorFallback error={error} />}>
  <Suspense fallback={<LoadingSkeleton />}>
    {/* Component content */}
  </Suspense>
</ErrorBoundary>
```

## Detailed Task List

### Phase 1: Server Functions & Data Loading (Week 1)

#### Task 1.1: Create Static Data Server Function
**Scope**: Extract static data loading into server function  
**Files**: `src/lib/server/staticData.ts`  
**Specifications**:
- Create `getStaticCanvasData` query function with "use server" directive
- Return stockImages, predefinedPositions, and DEFAULT_POSITIONS
- Add proper TypeScript return type interface
- Include error handling for missing data
- Add JSDoc documentation with usage examples

**Acceptance Criteria**:
- [ ] Function marked with "use server" directive
- [ ] Returns consistent data structure
- [ ] Handles missing data gracefully
- [ ] TypeScript types are complete and accurate
- [ ] No side effects or mutations

#### Task 1.2: Create Peach API Server Function  
**Scope**: Move Peach API calls to server-side  
**Files**: `src/lib/server/peachData.ts`  
**Specifications**:
- Create `getPeachPosts` query function with username/token parameters
- Use existing `fetchStream` function server-side
- Add proper error handling and validation
- Return structured response matching current dashboard expectations
- Add rate limiting considerations

**Acceptance Criteria**:
- [ ] Server function receives username and token parameters
- [ ] Uses existing fetchStream API correctly
- [ ] Returns data in expected format for dashboard
- [ ] Handles authentication errors properly
- [ ] Includes proper error types for client handling

#### Task 1.3: Configure Route Preloading
**Scope**: Set up route-level data preloading  
**Files**: Route configuration file  
**Specifications**:
- Configure preload for index route with static data
- Configure preload for dashboard route with user context
- Add conditional loading based on authentication state
- Ensure preload functions don't block navigation
- Add proper error boundaries for preload failures

**Acceptance Criteria**:
- [ ] Index route preloads static data successfully
- [ ] Dashboard route preloads user data when authenticated
- [ ] Preload failures don't crash the application
- [ ] Navigation remains responsive during preload
- [ ] Data is available when component mounts

### Phase 2: Component Refactoring (Week 2)

#### Task 2.1: Refactor index.tsx Data Loading
**Scope**: Replace onMount logic with createAsync patterns  
**Files**: `src/routes/index.tsx`  
**Specifications**:
- Replace `initializeLogin` onMount with createAsync
- Use `getStaticCanvasData` server function
- Move window sizing logic to createEffect with proper cleanup
- Preserve all existing functionality and UI behavior
- Maintain localStorage integration for photo states

**Acceptance Criteria**:
- [ ] No onMount initialization logic remains
- [ ] Uses createAsync for data loading
- [ ] Window resize handling preserved
- [ ] Photo positioning logic unchanged
- [ ] localStorage functionality maintained
- [ ] All existing interactions work identically

#### Task 2.2: Refactor dashboard.tsx Data Loading
**Scope**: Replace manual API calls with createAsync  
**Files**: `src/routes/dashboard.tsx`  
**Specifications**:
- Replace `loadPosts` function with createAsync pattern
- Use `getPeachPosts` server function
- Move photo transformation logic to createMemo
- Preserve error handling and loading states
- Maintain existing export functionality

**Acceptance Criteria**:
- [ ] No manual API calls in component
- [ ] Uses createAsync for posts data
- [ ] Photo transformation is memoized
- [ ] Error handling behavior unchanged
- [ ] Export functionality preserved
- [ ] All existing UI interactions maintained

#### Task 2.3: Add Error Boundaries and Suspense
**Scope**: Implement proper loading and error states  
**Files**: `src/components/ErrorBoundary.tsx`, `src/components/LoadingSkeleton.tsx`  
**Specifications**:
- Create reusable ErrorBoundary component with recovery options
- Design loading skeleton matching canvas layout
- Add fallback states for different error types
- Implement retry mechanisms for transient failures
- Ensure accessibility compliance for loading states

**Acceptance Criteria**:
- [ ] ErrorBoundary catches and displays errors gracefully
- [ ] Loading skeleton matches expected layout
- [ ] Retry functionality works for recoverable errors
- [ ] Error states are accessible
- [ ] Loading states don't cause layout shift

### Phase 3: Store Optimization (Week 3)

#### Task 3.1: Optimize Store Updates with Produce
**Scope**: Replace object spreading with produce for complex updates  
**Files**: `src/routes/index.tsx`, `src/routes/dashboard.tsx`  
**Specifications**:
- Identify all store updates using object spreading
- Replace with produce for nested object modifications
- Maintain exact same update semantics
- Add TypeScript types for produce callbacks
- Preserve all existing state reactivity

**Acceptance Criteria**:
- [ ] All object spreading replaced with produce
- [ ] Store update behavior identical to current
- [ ] TypeScript errors resolved
- [ ] No reactivity regressions
- [ ] Performance improvement measurable

#### Task 3.2: Add Batching for Related Updates
**Scope**: Group synchronous state updates to prevent multiple re-renders  
**Files**: `src/routes/index.tsx`, `src/routes/dashboard.tsx`  
**Specifications**:
- Identify sequential state updates that should be batched
- Wrap related updates in batch() calls
- Focus on initialization and resize handling
- Preserve update timing and effects
- Add comments explaining batching rationale

**Acceptance Criteria**:
- [ ] Related updates are properly batched
- [ ] No timing-dependent functionality broken
- [ ] Reduced re-render count measurable
- [ ] All effects still trigger correctly
- [ ] Code readability maintained

#### Task 3.3: Optimize Event Handlers
**Scope**: Remove unnecessary function wrapping in event handlers  
**Files**: `src/routes/index.tsx`, `src/routes/dashboard.tsx`  
**Specifications**:
- Replace inline arrow functions with direct function references
- Remove unnecessary event parameter destructuring
- Eliminate console.log statements in event handlers
- Maintain all existing event behavior
- Add proper TypeScript event types

**Acceptance Criteria**:
- [ ] Event handlers use direct function references
- [ ] No performance-degrading inline functions
- [ ] Event behavior unchanged
- [ ] TypeScript event types correct
- [ ] No console logs in event handlers

### Phase 4: Performance & Quality (Week 4)

#### Task 4.1: Remove Console Logs and Add Structured Logging
**Scope**: Replace console.log with proper logging utility  
**Files**: All route files, create `src/lib/logging/logger.ts`  
**Specifications**:
- Create development-only logging utility
- Replace all console.log statements
- Add proper log levels (debug, info, warn, error)
- Ensure zero logs in production builds
- Add structured logging for error tracking

**Acceptance Criteria**:
- [ ] No console.log statements remain
- [ ] Logging utility supports multiple levels
- [ ] Production builds contain no logging output
- [ ] Development logging is helpful for debugging
- [ ] Error tracking includes proper context

#### Task 4.2: Add Memoization for Expensive Operations
**Scope**: Optimize expensive calculations with createMemo  
**Files**: `src/routes/dashboard.tsx`  
**Specifications**:
- Identify expensive operations in dashboard photo transformation
- Wrap expensive calculations in createMemo
- Add proper dependency tracking
- Measure performance improvement
- Maintain exact same output behavior

**Acceptance Criteria**:
- [ ] Expensive operations are memoized
- [ ] Dependencies tracked correctly
- [ ] Performance improvement measurable
- [ ] Output behavior unchanged
- [ ] No over-memoization causing memory issues

#### Task 4.3: TypeScript Strict Mode and Type Coverage
**Scope**: Ensure complete TypeScript coverage with strict typing  
**Files**: All modified files  
**Specifications**:
- Enable TypeScript strict mode
- Add proper types for all props and state interfaces
- Remove any 'any' types with proper alternatives
- Add JSDoc comments for complex type definitions
- Ensure IntelliSense works properly

**Acceptance Criteria**:
- [ ] TypeScript strict mode enabled
- [ ] No 'any' types in modified code
- [ ] All interfaces properly documented
- [ ] IntelliSense provides accurate suggestions
- [ ] No TypeScript compilation errors

## Testing Requirements

### Unit Tests
- [ ] Server functions return correct data structures
- [ ] createAsync properly handles loading and error states
- [ ] Store updates with produce work correctly
- [ ] Error boundaries catch and display errors appropriately
- [ ] Memoized calculations return consistent results

### Integration Tests
- [ ] Route preloading loads data before component render
- [ ] Data flows correctly from server functions to components
- [ ] Error recovery mechanisms work end-to-end
- [ ] Performance optimizations don't break functionality

### Performance Tests
- [ ] Lighthouse performance scores meet targets
- [ ] Bundle size reduction achieved
- [ ] Runtime performance improved in profiling
- [ ] Memory usage optimized

## Risk Assessment

### Technical Risks
- **Timing Dependencies**: Existing code may rely on specific timing of onMount vs effects
- **LocalStorage Integration**: Server-side data loading may affect client-side storage patterns
- **Error Handling Changes**: New error boundaries may change error propagation

### Mitigation Strategies
- Incremental implementation with feature flags
- Comprehensive testing of edge cases
- Performance monitoring throughout implementation
- Rollback plan for each task

## Acceptance Criteria

### For index.tsx
- [ ] Uses route preloading instead of onMount initialization
- [ ] createAsync pattern for static data loading
- [ ] Proper Suspense and ErrorBoundary usage
- [ ] Store updates optimized with produce/batch
- [ ] No console logs in production
- [ ] All existing functionality preserved

### For dashboard.tsx
- [ ] Server function for Peach API calls
- [ ] createAsync for posts data loading
- [ ] Memoized photo transformation
- [ ] Optimized store updates
- [ ] Error boundaries for API failures
- [ ] All existing functionality preserved

### General Requirements
- [ ] TypeScript strict mode compliance
- [ ] Performance metrics achieved
- [ ] Accessibility maintained
- [ ] Code review approved
- [ ] QA testing passed

## Timeline

**Total Duration**: 4 weeks  
**Start Date**: 2025-01-27  
**End Date**: 2025-02-24  

**Weekly Milestones**:
- Week 1: Server functions and route preloading complete
- Week 2: Component refactoring and error handling complete
- Week 3: Store optimization complete
- Week 4: Performance and quality improvements complete

## Success Metrics

### Quantitative Targets
- Page load time: < 2 seconds
- Time to interactive: < 3 seconds
- Lighthouse performance: > 90
- Bundle size reduction: 10%
- TypeScript coverage: 100%

### Qualitative Outcomes
- Improved developer experience with better error messages
- Enhanced maintainability through proper patterns
- More predictable performance characteristics
- Better debugging capabilities with structured logging

## AI Assistant Guidelines

### Pattern Recognition Rules

#### Anti-Pattern Detection
When reviewing code, identify these patterns and suggest replacements:

1. **Heavy onMount Pattern**
   ```typescript
   // ANTI-PATTERN: Heavy initialization in onMount
   onMount(async () => {
     const data = await fetchData();
     setState(data);
     calculateDerivedState();
     setupEventListeners();
   });
   
   // SOLUTION: Use createAsync with route preloading
   const data = createAsync(() => getServerData());
   ```

2. **Manual API Calls Pattern**
   ```typescript
   // ANTI-PATTERN: Direct fetch in component
   const loadData = async () => {
     const response = await fetch('/api/data');
     const data = await response.json();
     setData(data);
   };
   
   // SOLUTION: Use server function with query
   const getData = query(async () => {
     "use server";
     return await db.getData();
   }, "getData");
   ```

3. **Object Spreading in Stores**
   ```typescript
   // ANTI-PATTERN: Spreading for updates
   setItems(index, (item) => ({ ...item, position: newPos }));
   
   // SOLUTION: Use produce
   setItems(index, produce((item) => {
     item.position = newPos;
   }));
   ```

4. **Missing Error Boundaries**
   ```typescript
   // ANTI-PATTERN: No error handling for async components
   <Suspense fallback={<Loading />}>
     <AsyncComponent />
   </Suspense>
   
   // SOLUTION: Wrap with ErrorBoundary
   <ErrorBoundary fallback={(err) => <ErrorFallback error={err} />}>
     <Suspense fallback={<Loading />}>
       <AsyncComponent />
     </Suspense>
   </ErrorBoundary>
   ```

### Code Generation Templates

#### Server Function Template
```typescript
// Template: Server function for data fetching
import { query } from "@solidjs/router";

export const get[ResourceName] = query(async ([parameters]) => {
  "use server";
  
  // Validation
  if (![validationCondition]) {
    throw new Error("[ErrorMessage]");
  }
  
  // Data fetching
  try {
    const data = await [dataSource].[method]([parameters]);
    return data;
  } catch (error) {
    console.error(`[SERVER] Error fetching [resourceName]:`, error);
    throw new Error("Failed to fetch [resourceName]");
  }
}, "get[ResourceName]");
```

#### Component Data Loading Template
```typescript
// Template: Component with proper data loading
import { createAsync } from "@solidjs/router";
import { Suspense, ErrorBoundary } from "solid-js";
import { get[ResourceName] } from "~/lib/server/[resourceName]";

export default function [ComponentName]() {
  const data = createAsync(() => get[ResourceName]([parameters]));
  
  return (
    <ErrorBoundary fallback={(err) => <ErrorFallback error={err} />}>
      <Suspense fallback={<[ComponentName]Skeleton />}>
        <div>
          {/* Component content using data() */}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
```

#### Store Update Template
```typescript
// Template: Optimized store updates
import { batch, produce } from "solid-js";

// For multiple related updates
batch(() => {
  setStore("field1", value1);
  setStore("field2", value2);
  setItems(index, produce((item) => {
    item.property1 = newValue1;
    item.property2 = newValue2;
  }));
});
```

### Decision Matrix

#### Data Loading Method Selection
| Scenario | Use This Pattern | Why |
|----------|------------------|-----|
| Static data that rarely changes | `query` + route preload | Cached across navigation |
| User-specific data | `createAsync` with dependencies | Reactive to auth changes |
| Real-time updates | `createResource` with WebSocket | Fine-grained refetch control |
| Form submissions | `action` with server function | Built-in optimistic updates |
| One-time initialization | Route preload only | No reactivity needed |

#### State Management Selection
| Data Type | Use This | Not This |
|-----------|----------|----------|
| Simple primitives | `createSignal` | `createStore` |
| Nested objects | `createStore` + `produce` | `createSignal` with spreading |
| Arrays of objects | `createStore` + index access | Map of signals |
| Derived values | `createMemo` | `createEffect` + `setSignal` |
| Cross-component state | Context + store | Prop drilling |

### Error Message Mapping

#### Common SolidJS/SolidStart Errors
1. **"Cannot access X before initialization"**
   - **Cause**: Accessing context outside provider
   - **Solution**: Wrap component tree with appropriate provider
   - **Code Fix**: Move component inside provider or check context existence

2. **"Hydration mismatch"**
   - **Cause**: Client/server render differences
   - **Solution**: Use `createAsync` for consistent data loading
   - **Code Fix**: Remove `onMount` data loading, use server functions

3. **"computations created outside a `createRoot`"**
   - **Cause**: Reactive code outside component lifecycle
   - **Solution**: Move code inside component or use `createRoot`
   - **Code Fix**: Wrap in component or async boundary

4. **"Cannot read properties of undefined"**
   - **Cause**: Accessing async data before load
   - **Solution**: Use Suspense boundary or optional chaining
   - **Code Fix**: Add `data()?.property` or proper Suspense

5. **"Maximum update depth exceeded"**
   - **Cause**: Effect triggering its own dependencies
   - **Solution**: Review effect dependencies
   - **Code Fix**: Use `untrack` or restructure logic

### Performance Analysis Prompts

When reviewing code, ask these questions:

1. **Data Loading Analysis**
   - "Is this data fetched on every render or cached?"
   - "Could this API call be moved to a server function?"
   - "Are there sequential fetches that could be parallelized?"
   - "Is this data available at route preload time?"

2. **Reactivity Analysis**
   - "Are all signal accesses inside tracking scopes?"
   - "Could this effect be a memo instead?"
   - "Is this creating new objects/functions on each render?"
   - "Are related updates batched together?"

3. **Component Structure Analysis**
   - "Does this component have proper error boundaries?"
   - "Are Suspense boundaries at the right granularity?"
   - "Could heavy components be lazy loaded?"
   - "Is conditional rendering using Show/Switch?"

4. **Store Usage Analysis**
   - "Are store updates using produce for nested changes?"
   - "Is unwrap being used outside reactive contexts?"
   - "Could reconcile optimize this array update?"
   - "Are there unnecessary store subscriptions?"

5. **Bundle Size Analysis**
   - "Is this import used only server-side?"
   - "Could this large dependency be dynamically imported?"
   - "Are there duplicate polyfills or utilities?"
   - "Is tree-shaking working for this import?"

### AI Code Review Checklist

When implementing changes from this PRD, verify:

- [ ] All `onMount` with data fetching replaced with `createAsync`
- [ ] All API calls moved to server functions with "use server"
- [ ] All store updates use `produce` for nested modifications
- [ ] All related updates wrapped in `batch()`
- [ ] All async components wrapped in ErrorBoundary + Suspense
- [ ] All route components have preload functions
- [ ] No console.log statements in event handlers or hot paths
- [ ] All event handlers use direct function references
- [ ] TypeScript types added for all data structures
- [ ] Loading states don't cause layout shift