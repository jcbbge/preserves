# AI Documentation

This directory contains guidelines and patterns for AI assistance with this project.

## Key Files

- `CLAUDE.md` - Core instructions for Claude
- `index.md` - Registry of all patterns
- `patterns/` - Specific patterns organized by category
- `cleanup.sh` - Maintenance script (run weekly)

## Usage

Reference specific patterns in your code using tags:

```javascript
// #responsive-design
function createLayout() {
  // Code here...
}
```

For more information, see the `index.md` file.

# Working with This Project

## DO NOT
- Spend time creating elaborate documentation
- Build complex scripts unless explicitly requested
- Try to implement your own file organization schemes
- Waste time on meta-discussions about AI assistant usage

## DO
- Focus on writing code that solves the immediate problem
- Follow existing patterns in the codebase
- Keep explanations brief and useful
- Make explicit trade-offs when suggesting solutions

## When I Ask For Help
- If I ask for a component, give me a component - not a dissertation
- If I ask for a function, write the function - not your philosophy on functions
- If I ask how to implement something, provide the implementation - not a roadmap
- If something is unclear, ask ONE clarifying question - don't list 5 possibilities
