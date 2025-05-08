# Dashboard Design Specification

## Overview

The dashboard is the main interface after authentication where users can view a confirmation of their connected account and initiate the export process. This design focuses on simplicity, emotional connection, and accessibility.

## Visual Design

### Color Palette
- Primary: var(--peach-primary) #FF9A8B - Main actions and highlights
- Secondary: var(--peach-secondary) #FF6B6B - Accents and secondary elements
- Background: var(--peach-background) #FFF4F2 - Page background
- Content Background: #FFFFFF - Card backgrounds
- Text: var(--text-dark) #4A3F3A - Primary text
- Light Text: var(--text-light) #FFFFFF - Text on dark backgrounds

### Typography
- Primary Font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif
- Heading Sizes: 
  - Main Heading: 24px
  - Section Headings: 18px
  - Card Titles: 16px
- Body Text: 16px
- Small Text/Captions: 14px

### Layout
- Full-width responsive design with centered content
- Card-based layout with generous white space
- Maximum content width of 800px for readability

## Component Design

### Header
- Username/account display with small avatar
- Simple welcome message: "Welcome back, [username]"
- Subtle logout option in the top right

### Content Preview
- Card displaying the most recent post with text and media
- Caption: "Your most recent post on Peach"
- Visual style matching Peach's post display
- Alt text for all images

### Export Action
- Prominent, centered card with clear call to action
- Large, accessible button: "Save Your Peach Memories"
- Supporting text explaining what will be included in the export
- Visual icon representing preservation/saving

### Progress States

#### Idle State
- Export button is prominent
- Brief explanation of the export process
- Small indicator of estimated size/time based on account activity

#### In Progress State
- Animated progress indicator with clear percentage
- Current activity description (e.g., "Gathering posts from 2022...")
- Estimated time remaining
- Pause button with clear action text
- Visual elements that make waiting more enjoyable

#### Paused State
- Visual indication that process is paused
- Clear "Resume" button
- Information about what happens while paused
- Option to cancel if needed

#### Complete State
- Celebration animation/visual
- Clear download button for the archive
- Information about what's included and how to access it
- Option to start a new export if needed

### Error States
- Friendly error messages with clear explanations
- Recovery options for each error type
- Contact/support information if needed
- Visual design that doesn't feel alarming or technical

## Accessibility Considerations

- All interactive elements must have appropriate ARIA roles
- Focus states clearly visible for keyboard navigation
- Progress indicators must be accessible to screen readers
- Color is never the only means of conveying information
- All text must meet contrast requirements (4.5:1 minimum)
- All images require meaningful alt text
- Notifications must be announced to screen readers

## Interactions

### Export Button
- Hover: Gentle scale increase and color shift
- Focus: Clear focus ring in the primary color
- Active/Press: Slight depression effect
- After Press: Smooth transition to progress state

### Progress Indicator
- Animation should respect reduced motion preferences
- Updates should be announced to screen readers
- Visual progression should be continuous and smooth
- Percentage text should update in sync with visual

### Pause/Resume
- Clear state change with both visual and text indicators
- Confirmation for pause action to prevent accidental clicks
- Clear feedback when resuming

## Content Guidelines

### Tone and Voice
- Warm, friendly, and supportive
- Focus on the emotional value of preserving memories
- Avoid technical jargon and complex explanations
- Use familiar Peach terminology where appropriate

### Key Messages
- "Your Peach memories, preserved for you to keep"
- "Take your time - we'll keep your place if you need to pause"
- "Your complete Peach history, ready for you to revisit"

### Error Messages
- Network Issues: "We're having trouble connecting to Peach. Let's try again in a moment."
- Authentication: "We need to reconnect to your Peach account. Please sign in again."
- Export Failure: "Something went wrong while gathering your memories. Let's try again."

## Implementation Notes

- All state transitions should be smooth and animated
- Progress tracking requires server-client communication via websockets or polling
- Pause/resume functionality needs server-side state persistence
- Export size estimation may require initial API sampling
- Consider using skeleton loading states during API calls