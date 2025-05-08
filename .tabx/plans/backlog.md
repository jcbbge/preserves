# Feature Backlog

This document maintains the prioritized list of features, improvements, and bug fixes for the project. Items are organized by priority and status.

## Priority Levels

- **P0**: Critical - Must be addressed immediately (blocking issues, security vulnerabilities)
- **P1**: High - Required for next release
- **P2**: Medium - Important but not blocking
- **P3**: Low - Nice to have, can be deferred

## Status Values

- **Planned**: Identified but not yet started
- **In Progress**: Currently being worked on
- **Blocked**: Work stopped due to dependencies
- **Completed**: Work finished and deployed
- **Deferred**: Postponed to a later date

## Current Sprint

| ID   | Title                        | Type        | Priority | Status     | Description                                                                 | Owner   | Estimate | Principles |
|------|------------------------------|-------------|----------|------------|-----------------------------------------------------------------------------|---------|----------|------------|
| F001 | Basic Login Form             | Feature     | P1       | Completed  | Allow user to enter username and submit form.                               | [You]   | S        | A, U, S    |
| F002 | Connect to Peach API         | Feature     | P1       | Planned    | Integrate with Peach API to authenticate and fetch user data.               | [You]   | M        | U, S       |
| F003 | Paginated Post Fetch         | Feature     | P1       | Planned    | Iterate through all user posts, handling pagination.                        | [You]   | M        | U, S       |
| F004 | Download Associated Media    | Feature     | P1       | Planned    | Download all media files linked to user posts, including AWS-hosted assets. | [You]   | M        | U, S       |
| F005 | Gzip and Package Export      | Feature     | P2       | Planned    | Compress all exported data into a single downloadable archive.              | [You]   | M        | U, S       |
| F006 | Download Button UI           | Feature     | P1       | Planned    | Provide a button for users to download their archive.                       | [You]   | S        | A, U       |
| F007 | Error Handling & Feedback    | Improvement | P1       | Planned    | Show clear error messages and status updates to users.                      | [You]   | S        | A, U       |
| F008 | Accessibility Improvements   | Improvement | P2       | Planned    | Ensure form and buttons are accessible (labels, keyboard nav, etc.).        | [You]   | S        | A, U       |
| F009 | Data Viewer HTML Page        | Feature     | P1       | Planned    | Embed a single HTML page in the archive that loads posts from JSON and assets from the archive, styled to resemble the Peach iOS stream UI. | [You] | M | A, U, S |

*Principles: A=Accessibility, U=User-Centered, S=Sustainable Code*
