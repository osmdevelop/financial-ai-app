# Overview

This full-stack monorepo project is a market intelligence and research platform. It provides real-time market data, AI-powered insights, policy analysis, and comprehensive analytics. The platform serves as an informational tool for market research, explicitly not offering brokerage services or investment advice. Key capabilities include real-time market regime classification, AI-generated daily market briefs, and a "what-if" scenario studio for macro analysis. The project aims to empower users with data-driven insights into financial markets.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built with React 18, utilizing Vite for development and bundling. It follows a component-based architecture:
-   **UI/UX**: Radix UI components styled with shadcn/ui and TailwindCSS, using CSS variables for theming.
-   **State Management**: TanStack Query (React Query) handles server state and caching.
-   **Routing**: Wouter provides lightweight client-side routing.
-   **Forms**: React Hook Form with Zod for validation.
-   **Charts**: Recharts for data visualization.
-   **Type Safety**: Full TypeScript implementation.
-   **Structure**: Organized into pages, reusable UI components, custom hooks, and a centralized API client.

## Backend Architecture

The backend uses Express.js with TypeScript in an ESM format, implementing a REST API design:
-   **Framework**: Express with middleware for JSON parsing and request logging.
-   **Data Layer**: Currently uses in-memory storage, designed with an interface for future PostgreSQL integration via Drizzle ORM.
-   **AI Integration**: Utilizes OpenAI GPT-4o-mini for market insights and analysis.
-   **External Data Integration**: Spawns Python scripts for fetching price data.
-   **Development**: Vite integration for HMR support.

## Data Architecture

-   **Database**: Configured for PostgreSQL with Drizzle ORM, currently using in-memory for demo.
-   **Data Models**: Includes asset prices, user watchlists, news/headlines (with sentiment and AI analysis), and economic events.

## System Design Choices

-   **Market Regime Engine**: Hierarchical decision logic for classifying market states (Risk-On, Risk-Off, Neutral, Policy Shock) based on aggregated data from sentiment, policy, Fed tone, volatility, and risk appetite services, with confidence scoring and caching.
-   **Daily Market Brief (Default Entry Point)**: Redesigned as a "ritual" page traders open daily. Features a strict 6-section structure: (1) Hero market call with Green/Yellow/Red badge, (2) What Changed section with regime diff, (3) Lens Impact for focus assets, (4) Max 3 relevant headlines, (5) Single upcoming catalyst, (6) Collapsible AI summary. Designed for 60-second reading. Route "/" now defaults to Daily Brief.
-   **Scenario Studio**: "What-if" analysis tool with sliders for macro inputs (USD Index, 10Y Treasury Yield, VIX, Oil) to calculate asset impacts, with an AI summary feature.
-   **Policy & Political Indexes**: Features Trump Policy Index, sensitive asset correlation analysis, Fedspeak tone analysis, and AI-powered policy news feed. Includes policy-themed clustering, sensitivity labels, and integration into AI insights and portfolio views.
-   **Trader Lens**: Personalization feature allowing users to select up to 5 focus assets (stocks, ETFs, crypto) to receive tailored market intelligence across Dashboard, Daily Brief, Headlines, AI Insights, and Policy pages. Includes a "Should I Trade Today?" badge synthesizing regime, volatility, and policy risk signals with Green/Yellow/Red status levels.
-   **Watchlist + In-App Alerts Lite**: LocalStorage-based watchlist (max 50 assets) with star button integration across Asset Overview and Asset Picker Modal. In-app alert system with 4 preset alert types (market regime change, policy shock, Trump Z-score threshold, fedspeak tone change). Alert evaluator polls every 5 minutes with 6-hour debounce per alert type. Notifications feed with read/unread management and bell icon dropdown in header. Alerts chip displayed on Daily Brief when unread notifications exist.
-   **Error Handling**: Comprehensive client-side error boundaries with retry mechanisms and server-side middleware.
-   **Quality & Consistency**: Consolidated UI components (e.g., GaugeMeter), shared utilities, and added `data-testid` attributes for E2E testing.
-   **Security**: Environment-based configuration for API keys and secure credential handling.

# External Dependencies

## Core Framework Dependencies
-   **React 18**: Frontend framework.
-   **Express**: Node.js web framework.
-   **TypeScript**: For type safety.
-   **Vite**: Build tool and development server.

## UI and Styling
-   **Radix UI**: Unstyled, accessible UI primitives.
-   **TailwindCSS**: Utility-first CSS framework.
-   **shadcn/ui**: Pre-built component system.
-   **Lucide React**: Icon library.

## Data Management
-   **Drizzle ORM**: Type-safe database toolkit.
-   **@neondatabase/serverless**: PostgreSQL serverless driver (for Drizzle).
-   **TanStack Query**: Server state management and caching.
-   **Zod**: Schema validation.

## External APIs
-   **OpenAI**: AI-powered text analysis and insights (GPT-4o, GPT-4o-mini).
-   **yfinance** (via Python): Financial data from Yahoo Finance.
-   **CoinGecko API**: Cryptocurrency market data.

## Development Tools
-   **Wouter**: Lightweight routing.
-   **React Hook Form**: Form state management.
-   **date-fns**: Date manipulation utilities.
-   **Recharts**: Data visualization.