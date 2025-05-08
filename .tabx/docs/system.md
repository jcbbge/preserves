# Project System Overview

## Project Information

- **Name**: peach_preserves
- **Description**: A smol app to download your peach history
- **Repository**: [Add your repository URL here]

## Technology Stack

### Frontend
- **Framework**: Solid.js
- **State Management**: Solid.js signals and stores (default)
- **UI Components**: Custom components (no external UI library)
- **Styling**: CSS Modules (e.g., `App.module.css`)

### Backend
- **Framework**: _TBD (currently frontend-only, backend planned for future)_
- **API Style**: _TBD_
- **Authentication**: Basic username form (future backend may handle real auth)

### Database
- **Type**: _TBD (no database yet)_
- **Schema Management**: _TBD_
- **ORM/Query Builder**: _TBD_

## Architecture Overview

This is a single-page application (SPA) built with Solid.js. The app currently consists of a login form and basic routing. The main user flow is:
- User enters a username and submits the form.
- If the username is "admin", the app redirects to an admin page.
- Otherwise, an error is returned.

Planned features include connecting to a backend server that will:
- Authenticate users
- Iterate through a user's paginated posts
- Download associated media
- Package everything into a compressed archive for download

```
[Optional: Add a diagram showing the planned flow between frontend, backend, and data storage.]
```

## Key Components

### Component 1: App (Main UI)
- **Purpose**: Renders the login form and handles user authentication logic.
- **Key Files**: `src/routes/App.jsx`, `src/routes/App.module.css`
- **Dependencies**: Solid.js, Solid Router
- **Principles Applied**:
  - Accessibility: Simple form with labels for inputs.
  - User-Centered: Focused on a minimal, clear user flow.
  - Sustainability: Modular code, easy to extend for backend integration.

### Component 2: Routing
- **Purpose**: Handles navigation between the main app and the admin page.
- **Key Files**: `src/index.jsx`
- **Dependencies**: Solid Router
- **Principles Applied**:
  - Accessibility: Uses semantic routes.
  - User-Centered: Directs users based on their input.
  - Sustainability: Easily extendable for more routes/pages.
