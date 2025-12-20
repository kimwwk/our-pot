## create the SAD first before going into implementation, also break down the SAD into several files and update it on the go of the implementation

It is actually a common practice. Breaking down your SAD into multiple files offers several benefits:

**Advantages:**
- Easier to update specific sections without scrolling through a massive document
- Multiple team members can work on different parts simultaneously
- Version control becomes cleaner with smaller, focused files
- You can organize by concerns (e.g., `SAD-v1-1-architecture-overview.md`, `SAD-v1-2-data-model.md`, `SAD-v1-3-api-design.md`)

**Practical approach:**
- Create a main index file that links to all sections
- Update sections as you discover new requirements during implementation
- Mark sections as "draft" vs "implemented" to track progress

This iterative approach keeps your SAD as a living document rather than something that becomes outdated immediately after starting implementation.

