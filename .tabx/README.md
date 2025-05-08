# TabX Framework

TabX is a lightweight, modular framework for AI-assisted development that promotes principled and cultural collaboration between developers and AI assistants.

## Core Principles

The framework is built around the idea that successful AI-assisted development requires:

1. **Principle-Guided Development**: Every decision is governed by core principles
2. **Cultural Collaboration**: A shared understanding of values and goals
3. **Structural Consistency**: Standard patterns for common operations
4. **Context Preservation**: Maintaining continuity between sessions

## Directory Structure

- **meta/** - Framework guidance for humans and AI assistants
  - `ai-guide.md` - Instructions for AI assistants
  - `interaction-templates.md` - Templates for common interactions
  - `ai-workflows.md` - Workflow descriptions for AI

- **docs/** - Project documentation and knowledge
  - `principles.md` - Core project principles (the most important file)
  - `system.md` - System architecture and components
  - `domain.md` - Business domain knowledge
  - `api.md` - API documentation
  - `schema.md` - Data schema documentation

- **plans/** - Feature specifications and roadmap
  - `backlog.md` - Prioritized list of features
  - `features/` - Detailed feature specifications

- **sessions/** - Session tracking and handoffs
  - `current.md` - Current session state
  - `archive/` - Previous session history

- **scripts/** - Automation scripts
  - `sequences/` - Guided workflow sequences
  - `helpers/` - Helper scripts for AI assistants

## Getting Started

### Starting a Session

1. Run the session start script:
   ```
   ./.tabx/scripts/session.sh start
   ```

   This script:
   - Archives any previous session
   - Creates a new session for today
   - Intelligently initializes the session file if needed
   - Handles session interruptions and resumption

2. Edit the current session file to set your focus:
   ```
   .tabx/sessions/current.md
   ```

### Creating a Feature Plan

1. Use the feature planning sequence:
   ```
   ./.tabx/scripts/sequences/feature-planning.sh "Feature Name"
   ```

2. Fill in the feature plan details

### Implementing a Feature

1. Use the implementation preparation sequence:
   ```
   ./.tabx/scripts/sequences/implementation-prep.sh "Feature Name"
   ```

2. Follow the feature plan for implementation

### Ending a Session

1. Run the session end script:
   ```
   ./.tabx/scripts/session.sh end
   ```

2. Review and update the handoff details

### Handling Session Interruptions

If your development session is interrupted or you need to pause work:

1. When you resume, simply run:
   ```
   ./.tabx/scripts/session.sh start
   ```

2. The script will automatically detect if the session file needs initialization and will:
   - Archive the previous session state
   - Add contextual information about the resumption
   - Preserve development continuity

## Working with AI Assistants

When working with AI assistants:

1. Start by referencing the core principles:
   ```
   Please review .tabx/meta/ai-guide.md and .tabx/docs/principles.md
   ```

2. Set the current mode (Vision, Structure, or Build):
   ```
   I'd like to work in [Mode] mode for this session
   ```

3. Use interaction templates from .tabx/meta/interaction-templates.md

4. Allow the AI to run sequences when appropriate:
   ```
   You can run the feature-planning sequence for this if you think it would help.
   ```

## AI Helper Integration

The framework includes scripts designed to be invoked by AI assistants:

```
./.tabx/scripts/helpers/ai-sequence-runner.sh [sequence-name] [arguments]
```

This allows AI assistants to run standardized workflows consistently.

## Customizing the Framework

The TabX framework is designed to be customized to your needs:

1. Edit `.tabx/docs/principles.md` to define your core principles
2. Modify templates in `.tabx/meta/` to match your workflow
3. Create additional sequences in `.tabx/scripts/sequences/` for common operations
4. Add project-specific documentation to `.tabx/docs/`
