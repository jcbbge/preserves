# AI Assistant Permissions

This file defines what operations the AI assistant is permitted to execute automatically.

## Approved Sequences

The AI assistant is permitted to run the following sequences without explicit permission:

- `feature-planning`: Create new feature plans
- `implementation-prep`: Prepare for feature implementation

## Semi-Autonomous Operations

The AI assistant should ask for confirmation before:

- Making significant changes to existing files
- Creating new directories outside the .tabx structure
- Running commands that might affect system state

## Restricted Operations

The AI assistant is not permitted to:

- Modify the .tabx framework structure without explicit permission
- Delete files without explicit confirmation
- Run commands outside the project directory
- Execute any potentially destructive operations

## Permission Workflow

1. When the AI assistant wants to run a sequence, it should:
   - Explain why the sequence would be helpful
   - Describe what the sequence will do
   - Ask for permission if required by this policy

2. The user can grant permission by:
   - Explicitly approving the specific operation
   - Asking the AI to proceed with the recommended action

3. Permission logging:
   - All sequence executions are logged in .tabx/scripts/helpers/ai-activity.log
   - This provides an audit trail of autonomous actions
