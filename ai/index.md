# AI Documentation Index

This file serves as the central registry of all AI documentation in this project.

## Active Patterns

These patterns are actively used in the project and referenced regularly:

| Pattern | Last Used | References | Description |
|---------|-----------|------------|-------------|
| [Core Guidelines](./CLAUDE.md) | ACTIVE | - | Primary instructions for Claude |

## How to Use This System

### Adding a New Pattern
1. Create a file in the appropriate directory under `/ai/patterns/`
2. Add metadata header to your file
3. Update this index with the new pattern

### Referencing Patterns
Reference specific patterns in your code or comments using:
```
// #pattern-name
function myFunction() {
  // Claude will apply the specific pattern guidance here
}
```

### Retiring Patterns
1. Move the file to `/ai/archive/`
2. Update this index to remove the pattern

## Pattern Metadata

All pattern files should include this metadata header:
```
---
name: pattern-name
category: ui|data|architecture|testing
created: YYYY-MM-DD
last_used: YYYY-MM-DD
references: 0
components:
  - ComponentName
---
```

Last Updated: 2025-05-12
