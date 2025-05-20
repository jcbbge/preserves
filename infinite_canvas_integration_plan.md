# Infinite Canvas Integration Plan

# Handoff Guide Documention

## 1. Project Overview

Peach Preserves is a SolidJS application that allows users to view and preserve their Peach social media account data. We've completely refactored the Infinite Canvas system into a stable, reusable component architecture.

**IMPORTANT**: This project requires a COMPLETE REPLACEMENT of the old canvas implementations. The existing `PeachPhotoCanvas` component and any prior canvas code must be REMOVED entirely, not updated. This should be considered as a versioning upgrade. The latest InfiniteCanvas component is now available.

## 2. Key Documentation

Reference documentation during implementation:
- **Architecture Document**: [preserves/infinite_canvas.md](preserves/infinite_canvas.md) - Contains detailed API documentation

## 3. System Components

The new Infinite Canvas system consists of three primary components:

1. **InfiniteCanvas**: The main container component
2. **CanvasItem**: Individual items positioned within the canvas
3. **createDraggable**: A primitive that handles drag-and-drop interactions

## 4. Implementation Tasks

### Phase 1: Index Page Integration

1. **Remove Existing Implementation**:
   - Completely remove the old InfiniteCanvas usage in `src/routes/index.tsx`
   - Keep only the data loading/preparation code

2. **Install New Canvas Component**:
   - Import the new components:
     ```typescript
     import { InfiniteCanvas } from "~/primitives/infiniteCanvas/InfiniteCanvas";
     import { CanvasItem } from "~/primitives/infiniteCanvas/CanvasItem";
     import { useTransform } from "~/primitives/infiniteCanvas/TransformContext";
     import { createDraggable } from "~/primitives/createDraggable";
     ```
   - Implement using the new component structure
   - Map existing data to the new component props

3. **Configure Draggable Functionality**:
   - Implement createDraggable using the new API
   - Connect event handlers to CanvasItem props
   - Set up localStorage integration for position persistence

### Phase 2: Dashboard Page Integration

1. **Complete Removal of PeachPhotoCanvas**:
   - **CRITICAL**: Delete all references to PeachPhotoCanvas
   - Do NOT attempt to update or modify the old component

2. **Direct Implementation in Dashboard**:
   - Directly implement InfiniteCanvas in dashboard.tsx
   - Use the same pattern as in index.tsx
   - Map the existing data structure to the new components

3. **Implement Draggable in Dashboard**:
   - Use createDraggable directly in dashboard.tsx
   - Connect to existing data structure
   - Ensure proper storage persistence

### Phase 3: Testing and Validation

Test the core canvas functionality:
- Canvas rendering
- Zoom in/out
- Panning/repositioning
- Reset functionality
- Drag and drop of items
- Position persistence across page refreshes

## 5. Implementation Guidelines

### General Principles

1. **Complete Replacement**: Do NOT update old components. Completely remove and replace with new components.

2. **Treat as Package**: The InfiniteCanvas component is a finished package. Do not modify its internal implementation.

3. **Data Mapping**: Map existing data to the requirements of the new components.

### Code Patterns

1. **InfiniteCanvas Implementation**:
   ```tsx
   <InfiniteCanvas
     showGrid={false}
     storageKey={`peach_preserves_${username}_${route}_canvas`}
     initialViewport={getCanvasViewport(route, username) || { position: { x: 0, y: 0 }, scale: 1 }}
     className={styles["canvas-container"]}
     onViewportChange={handleViewportChange}
     panMode="always"
     minScale={0.1}
     maxScale={5}
     backgroundColor="#f5f2e8"
   >
     <For each={polaroidPhotos}>
       {(photo) => (
         <CanvasItem
           id={photo.id}
           position={photo.position}
           rotation={photo.rotation}
           zIndex={photo.zIndex}
           isDraggable={true}
           isSelected={isDragging(photo.id)}
           isDragging={isDragging(photo.id)}
           onSelect={(id, e) => handleDragStart(e, id)}
           onDrag={handleDragMove}
           onDragEnd={handleDragEnd}
         >
           {/* Content components (like Polaroid) */}
         </CanvasItem>
       )}
     </For>
   </InfiniteCanvas>
   ```

2. **createDraggable Implementation**:
   ```typescript
   const {
     draggedId,
     handleDragStart,
     handleDragMove,
     handleDragEnd,
     isDragging
   } = createDraggable(polaroidPhotos, setPolaroidPhotos, {
     route,
     username,
     zIndexRange: { min: 0, max: 9 },
     cssModuleStyles: styles
   });
   ```

## 6. Detailed Task List

### Index Page Tasks

1. Remove all existing InfiniteCanvas related code
2. Import new components
3. Implement InfiniteCanvas with proper props
4. Set up createDraggable with required options
5. Implement CanvasItems for each data item
6. Connect localStorage for persistence
7. Test all functionality

### Dashboard Page Tasks

1. **REMOVE** all references to PeachPhotoCanvas
2. Import new InfiniteCanvas components directly
3. Implement InfiniteCanvas with proper props
4. Set up createDraggable with required options
5. Implement CanvasItems for each post
6. Connect localStorage for persistence
7. Test all functionality

## 7. Test Checklist

**Canvas Functionality**:
- [ ] Canvas renders on both pages
- [ ] Zoom in works
- [ ] Zoom out works
- [ ] Canvas can be repositioned by dragging
- [ ] Canvas can be reset

**Item Interaction**:
- [ ] Items can be dragged and dropped
- [ ] Items maintain position after interaction
- [ ] Items are brought to front when interacted with

**Persistence**:
- [ ] Item positions persist across page refreshes
- [ ] Canvas viewport position persists across refreshes

## 8. Summary

This integration requires a complete replacement of the old canvas implementation with the new InfiniteCanvas system. Do not attempt to update or modify the existing PeachPhotoCanvas (v1) component in dashboard.tsx - it must be completely removed and replaced with direct implementation of the new components.
This integration requires a complete replacement of the old canvas implementation with the new InfiniteCanvas system. Do not attempt to update or modify the existing InfiniteCanvas (v2) component in dashboard.tsx - it must be completely removed and replaced with direct implementation of the new components.
These were previous iterations and outdated and deprecated. This is an installation of the latest version of InfiniteCanvas package.

Focus on treating the InfiniteCanvas as a black-box component, mapping the existing data structure to its required props, and ensuring all functionality works as expected.
