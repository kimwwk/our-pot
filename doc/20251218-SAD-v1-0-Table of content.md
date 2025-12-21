# Software Architecture Document (SAD)

---

## Document Relationship & Reading Guide

This SAD assumes familiarity with the following prerequisite documents:

- **[Product Vision](./20251218-Product-Vision.md)** - Read FIRST: Defines the "Propose & Approve" model, target audience, and core product principles
- **[Product Intention](./20251217-Product-Intention.md)** - Original user intent and constraints
- **[TDD-1: PWA Strategy](./20251217-TDD-1-PWA%20strategy.md)** - Decisions incorporated into SAD Sections 1-2; keep for reference
- **[TDD-2: Hybrid Architecture](./20251218-TDD-2-Hybrid%20Mobile%20Architecture.md)** - Decisions incorporated into SAD Sections 1-2; keep for reference
- **[TDD-2 Alignment Analysis](./20251218-TDD-2-current%20alignment%20analysis.md)** - Current implementation status (tracks Phase 1/2/3 progress)
- **[SAD v1.1: Backend Gateway](./20251218-SAD-v1-1-Backend-Gateway.md)** - Backend service addition for centralized API management (Dec 2025)
- **[Backlog](./20251218-backlog1.md)** - Features and improvements deferred from v1

**Reading Order:**
1. Product Vision → Product Intention → TDD-1 → TDD-2 (understand "why" and "what")
2. This SAD (understand "how" - system architecture and design patterns)
3. Backlog (understand "later" - deferred features)

**Scope of this SAD:**
- High-level architecture decisions and design patterns for v1
- System structure, component boundaries, and integration patterns
- Does NOT include step-by-step implementation code or tutorials
- Does NOT duplicate product vision, user journey, or feature prioritization

---

## Table of content

1. [Introduction & Architectural Goals](./20251218-SAD-v1-1-Introduction.md)

    1.1 Purpose & Scope (v1 Local-Only)
    1.2 Architectural Constraints (Mobile-First, Offline, No Cloud)
    1.3 Key Quality Attributes (Durability, Privacy, Responsiveness)

2. [System Overview](./20251218-SAD-v1-2-System-Overview.md)

    2.1 Conceptual Diagram (The "Hybrid" Container Model)
    2.2 Technology Stack Selection & Justification
    2.3 The Environment Boundary (Web Dev vs. Native Capacitor Shell)

3. [Data Layer & Persistence Strategy](./20251218-SAD-v1-3-Data-Layer.md)

    3.1 Storage Engine (SQLite Native vs. WASM Fallback)
    3.2 Platform Detection & Initialization
    3.3 Database Schema Design (ER Diagram)
      *   Transactions & Categories Tables
      *   ChangeSets & Operations Tables (The "Proposals")
    3.4 Data Access Layer (Repository Pattern / DAL)
    3.5 Migrations & Versioning Strategy
    3.6 Backup & Export (Manual CSV + Full-Fidelity Path)

4. [The "ChangeSet" Domain Logic](./20251218-SAD-v1-4-ChangeSet-Domain-Logic.md)

    4.1 The Proposal State Machine (Proposed → Reviewed → Approved/Rejected)
    4.2 ChangeSet Payload Structure (JSON/Operation Definition)
    4.3 Draft Validation (Business Rules & State Consistency)
    4.4 Changeset Review Workflow (Iterative Refinement vs Complete Rejection)
    4.5 The AI-Human Interaction Flow
    4.6 Atomic Execution and Error Recovery
    
5. [AI & Agent Integration](./20251218-SAD-v1-5-AI-Agent-Integration.md)

    5.1 Vercel AI SDK Implementation (Client-Side Usage)
    5.2 Prompt Engineering Strategy (System Prompts & Context Windows)
    5.3 Tool Schema Design & Validation (Read Operations + Changeset Proposals)
    5.4 Privacy & Security

6. [Frontend Architecture (Next.js + Layered Design)](./20251218-SAD-v1-6-Frontend-Architecture.md)

    6.1 Technology Stack & Build Configuration
    6.2 Layered Architecture Pattern (Four Layers: Presentation, Feature, Data, Infrastructure)
    6.3 Directory Structure (Proposed Reorganization)
    6.4 State Management Strategy (Context + Hooks, No Global Store)
    6.5 Component Patterns & Best Practices
    6.6 Navigation & Routing (Single-Page Tab Navigation)
    6.7 Mobile-First Design Principles
    6.8 Dark Mode Implementation

7. [Development & Build Workflow](./20251218-SAD-v1-7-Development-Build-Workflow.md)

    7.1 Web-First Development Strategy (npm run dev with WASM SQLite)
    7.2 Build Pipeline (npm run build → npx cap sync)
    7.3 Android Deployment (USB debugging, APK distribution)
    7.4 iOS Deployment Strategy (GitHub Actions CI/CD)

8. [Packaging & Distribution](./20251218-SAD-v1-8-Packaging-Distribution.md)

    8.1 Capacitor Configuration (Android specifics, iOS deferred)
    8.2 Asset Management (Images, Icons, WASM files)
    8.3 Security & Permissions (File System Access)

9. [Design Decisions for Future Evolution](./20251218-SAD-v1-9-Future-Evolution.md)

    9.1 Why UUIDs/ULIDs (enabling future sync)
    9.2 Why ChangeSet-based writes (enabling operation replication)