# Homecooked Software Manifesto: Essentials for Purpose-Built Software

## Core Philosophy

Homecooked software represents a fundamental shift in how we think about creating digital tools - moving away from centralized, scale-obsessed products toward personal, contextual solutions built by and for the communities they serve. This manifesto captures the essential elements that make homecooked software powerful, accessible, and transformative.

## The Barefoot Developer Movement

The "Barefoot Developer" concept draws inspiration from China's barefoot doctors program, which distributed medical knowledge from urban centers to rural villages by training local individuals in basic healthcare. Similarly, barefoot developers are community members with enough programming knowledge to build software that solves local problems - not replacing professional developers, but democratizing the ability to create contextual solutions where massive tech companies would never focus.

## Core Non-Negotiable Principles

### 1. Accessibility First

**What**: All aspects of our application must meet WCAG 2.1 AA standards at minimum.

**Why**: We believe technology should be accessible to everyone regardless of ability. Accessibility is not an add-on or nice-to-have; it's a fundamental requirement.

**How**:
- Every component must be keyboard navigable
- All content must meet contrast requirements (minimum 4.5:1 for normal text)
- All interactive elements must have appropriate ARIA attributes
- All images must have meaningful alt text
- Screen reader compatibility is required for all features

**Verification**:
- Automated accessibility testing in CI pipeline
- Manual screen reader testing for key user flows
- Contrast checker tool usage required during development

### 2. User-Centered Design

**What**: All features must solve actual user problems based on research, not assumptions.

**Why**: We build for real people, not for technology's sake.

**How**:
- User stories must reference actual user needs
- Design decisions require evidence of user benefit
- Regular user testing before release
- Success measured by user outcomes, not feature completion
- Error states must be helpful and human

**Verification**:
- User research documentation required for feature plans
- User testing prior to major releases
- User metrics tracking post-release

### 3. Sustainable Code

**What**: Code must be written for maintainability, readability, and longevity.

**Why**: Software is a long-term investment, and maintenance costs far exceed initial development costs.

**How**:
- Write for readability, not cleverness
- Follow established patterns and conventions
- Document "why" not just "what"
- Test coverage for all business logic
- Tech debt must be acknowledged and managed

**Verification**:
- Code review must include maintainability check
- Documentation quality as release criterion
- Regular tech debt assessment

### 4. AI-Augmented Development

**What**: AI tools should enhance the development process and expand access to software creation.

**Why**: AI can lower barriers to entry and amplify human creativity in software development.

**How**:
- AI as accessibility layer - language models bridge the gap between intent and implementation
- Visual-to-code pathways - sketch interfaces that generate functional code
- Context-aware assistance - models understand user needs through appropriate context
- Iterative refinement - AI helps debug and improve solutions based on feedback
- Empowerment, not replacement - AI augments human creativity rather than substituting for it

**Verification**:
- Evaluate AI outputs for accessibility compliance
- Ensure AI-generated code follows sustainable code principles
- Regular assessment of AI integration value to users

## Implementation Guidelines

### For Product Designers
- Focus on solving specific problems for identifiable communities
- Build flexible interfaces that can be adapted by users
- Embrace constraints as drivers of creativity, not limitations
- Design for inclusion across abilities, devices, and contexts
- Prioritize measurable user outcomes over feature checklists

### For AI Engineers
- Create tools that generate code from natural language descriptions
- Build AI assistants that help debug and improve applications
- Design systems that respect privacy while providing contextual assistance
- Focus on making complex development tasks accessible to non-specialists
- Ensure AI systems enhance rather than replace human judgment

### For Web Developers
- Create extensible architectures that users can modify
- Develop tools that empower other barefoot developers
- Simplify technology stacks to reduce barriers to entry
- Build with accessibility as a foundation, not an afterthought
- Document thoroughly to enable community participation

## Principle Application

### Decision Making
When facing a technical or product decision, we ask:
1. Does this align with our core principles?
2. If there's a conflict between principles, which takes priority in this specific context?
3. Are we making exceptions that undermine our principles?

### Feature Development
All feature plans must include specific sections addressing each relevant principle, explaining:
1. How the feature upholds these principles
2. What specific measures ensure compliance
3. How compliance will be verified

### Code Reviews
Reviews explicitly check for adherence to these principles, with the authority to block merges that violate them.

## The Vision Forward

Homecooked software represents a return to computing's original promise - giving individuals agency over their digital tools. By combining accessibility-first design, user-centered approaches, sustainable code practices, and AI-augmented development, we can create a world where software is as diverse as the communities it serves.

The future belongs not to massive platforms but to constellations of purpose-built tools created by those who understand the problems best. This is the essence of homecooked software - accessible, contextual, and empowering.
