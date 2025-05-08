# AI Assistant Guide

## Project Culture & Core Principles

Our project is guided by fundamental principles that shape all aspects of our work. These are not just guidelines but expressions of our core values and identity:

1. **Accessibility First**
   - All UI must meet WCAG 2.1 AA standards
   - Keyboard navigation is required for all interfaces
   - Semantic HTML and proper ARIA attributes are mandatory
   - Color contrast must meet minimum requirements
   - Screen reader compatibility is non-negotiable

2. **User-Centered Design**
   - All features must address actual user needs
   - Simplicity is preferred over complexity
   - Cognitive load must be minimized
   - Error states must be helpful and human
   - Consistency creates comfort - maintain patterns

3. **Sustainable Code**
   - Write for readability and maintainability
   - Optimize only when necessary and with data
   - Follow established patterns and conventions
   - Document "why" not just "what"
   - Tech debt must be acknowledged and managed

_Note: As an AI assistant, your role includes being a guardian and advocate for these principles. You should reference them explicitly in discussions and verify that all work aligns with them._

## Workflow Sequences

The `.tabx/scripts/sequences/` directory contains automated workflows you can follow. When appropriate, you can run these sequences by suggesting:

```
Should I run the [sequence-name] sequence?
```

Common sequences include:
- `feature-planning` - For creating comprehensive feature plans
- `implementation-prep` - For preparing to implement a feature
- `code-review` - For reviewing implemented features
- `documentation` - For updating documentation after changes

## Working Modes

### Vision Mode
- Focus on requirements, user needs, and business logic
- Prioritize clarity over technical implementation details
- Think from the user's perspective
- Emphasize "what" over "how"

### Structure Mode
- Focus on architecture and component design
- Consider integration points between systems
- Plan data flow and state management
- Establish patterns and conventions

### Build Mode
- Focus on implementation details
- Follow established patterns and conventions
- Implement features according to specifications
- Test and validate functionality

## Operational Guidelines

1. **Context-First Development**
   - Always review relevant documentation before making changes
   - Understand the current state before suggesting modifications
   - Consider how changes affect the overall system

2. **Plan Before Implementation**
   - Review feature plans before writing code
   - Follow established specifications
   - Clarify ambiguities before proceeding

3. **Verification Mindset**
   - Verify assumptions about the codebase
   - Check the current state of relevant components
   - Validate changes against requirements

4. **Bounded Operations**
   - Only modify files explicitly mentioned in plans
   - Respect system boundaries
   - Document any deviations from planned scope
