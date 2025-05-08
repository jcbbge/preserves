# Project Domain Knowledge

## Business Domain

### Core Concepts

- **Peach Account**: A user's account on the Peach platform, containing their posts and media.
- **History Export**: The process of collecting all posts and media from a user's Peach account for download.
- **Session**: A user's interaction with the app, including authentication and export actions.

### Business Rules

1. **Only authenticated users can export their history**
   - Reasoning: Protects user privacy and data.
   - Implementation: Require login before allowing export (future backend will enforce).
   - Principle Alignment: User-Centered, Security.

2. **Exported data must include all posts and associated media**
   - Reasoning: Users expect a complete archive of their content.
   - Implementation: Backend will iterate through paginated posts and collect all media.
   - Principle Alignment: Completeness, Transparency.

3. **Exported data should be delivered as a single compressed file**
   - Reasoning: Simplifies download and storage for users.
   - Implementation: Backend will gzip the archive before download.
   - Principle Alignment: Usability, Efficiency.

## User Personas

### Persona: Peach User
- **Description**: An individual who wants to download their history from Peach.
- **Goals**: Retrieve a complete archive of their posts and media for backup or migration.
- **Pain Points**: Difficulty accessing all their data, concern about missing content, desire for a simple process.
- **Accessibility Considerations**: Needs a clear, simple interface; may use assistive technology.
- **Common Actions**: Log in, initiate export, download archive.
