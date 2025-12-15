# Overview

This is a full-stack market intelligence and research platform built as a monorepo. The application provides real-time market data, AI-powered insights, policy analysis, and comprehensive analytics. It's designed as an informational tool for market research without offering brokerage services or investment advice.

## Recent Changes (December 15, 2025)

**Daily Market Brief** - New AI-generated daily overview page:
1. **Route & Navigation**: `/daily-brief` page accessible as first item in sidebar navigation (FileText icon).
2. **Today at a Glance**: Compact cards showing Market Regime, Policy Risk Level, Fed Tone, and Volatility State with live timestamps.
3. **What Moved Markets Today**: 3-5 bullet points derived from headlines showing driver, direction (bullish/bearish/neutral), and confidence level (high/medium/low).
4. **Asset Impact Snapshot**: Table showing directional bias, primary driver, and risk level for SPY, QQQ, IWM, BTC, Gold (GLD), Oil (USO), USD (UUP), and 10Y Treasury (TNX).
5. **AI Daily Summary**: OpenAI GPT-4o generates strict 5-sentence summary with hard constraints (no advice, no predictions, professional tone). Includes generate/refresh functionality with caching.
6. **What to Watch Next**: Three cards showing upcoming economic events, earnings, and policy risks.
7. **Guardrails**: Prominent "informational only" disclaimer banner, comprehensive error handling with fallback text, data-testid attributes on all major sections.
8. **API Endpoints**: `GET /api/daily-brief/summary` (cached retrieval) and `POST /api/daily-brief/generate` (AI generation with fallback).

---

**Scenario Studio** - New "what-if" macro scenario analysis page:
1. **Scenario Inputs**: Four slider controls for hypothetical macro changes:
   - USD Index (DXY): -2% to +2%
   - 10Y Treasury Yield: -50bps to +50bps
   - VIX (Volatility): -20% to +20%
   - Oil (WTI): -10% to +10%
2. **Scenario Engine**: Lightweight impact calculator using asset sensitivity data and known macro relationships. Returns direction (up/down/neutral), impact strength (Low/Medium/High), confidence score (0-100%), and contextual explanations for 10 major assets.
3. **Results Table**: Clean UI showing asset impacts with color-coded badges, trend icons, and confidence indicators.
4. **AI Summary**: "Summarize Scenario" button sends scenario to OpenAI GPT-4o for narrative analysis including historical regime resemblance, exposed assets, and key risks.
5. **Guardrails**: Prominent disclaimer banner, hypothetical labeling, and proper error/loading states.
6. **Route**: `/scenario` page accessible via "Scenario Studio" in sidebar navigation (FlaskConical icon).

---

**Quality & Consistency Pass** - Code consolidation and reliability improvements:
1. **GaugeMeter Component**: Created unified circular gauge component (`client/src/components/ui/gauge-meter.tsx`) replacing 3 duplicate implementations (CircularRate in dashboard/sentiment, CircularGauge in today). Features: configurable colorScale (sentiment/policy/neutral), size variants (sm/md/lg or custom), loading/error states, division-by-zero guard.
2. **News Utilities**: Consolidated shared date helpers and impact styling into `client/src/lib/news-utils.tsx` (toDate, safeFormat, formatTimelineDate, getImpactColor, getImpactIcon, TimeAgo component). Used by headlines.tsx and news.tsx.
3. **Mock Data Labels**: Added "Demo" badges to Dashboard cards with hardcoded data (S&P 500, VIX, S&P Performance chart, Recent Activity).
4. **Error Handling**: Added error states with retry buttons to Earnings and Economic Calendar pages following the established pattern.
5. **Test Coverage**: Added data-testid attributes to critical elements across Dashboard (card-sp500, card-vix, card-watchlist, card-sentiment, text-* values), Earnings (error-earnings, button-retry-earnings, button-refresh-earnings), and Economic Calendar (error-economic, button-retry-economic, button-refresh-economic).

---

## Previous Changes (November 18, 2025)

**Module E: Policy & Political Indexes** - Added policy-driven market analysis featuring:
- Trump Policy Index tracking policy topic intensity (tariffs, trade, immigration, defense) with z-score calculations
- Sensitive asset correlation analysis showing how different assets respond to policy changes
- Fedspeak tone analysis classifying Federal Reserve communications as hawkish/dovish/neutral
- Policy news feed with AI-powered topic tagging and intensity scoring
- New `/policy` page with interactive charts, asset tables, and Fed quote displays

**Policy Enhancement Update (November 18, 2025)**:
1. **Policy News Clustering**: Policy news is now clustered by topic themes (tariffs, trade, immigration, defense) with AI-generated summaries. The `/policy` page displays "Policy Themes" cards showing topic intensity, article counts, and concise summaries above the detailed news feed.
2. **Policy Sensitivity Labels**: Assets in the policy-sensitive table now display color-coded sensitivity badges (Low/Moderate/High) based on correlation thresholds (>0.7 = High, 0.5-0.7 = Moderate, <0.5 = Low) and rolling impact calculations.
3. **Policy Context in AI Insights**: The `/insights` page now fetches Trump Index and Fedspeak data to enrich AI analysis prompts. Template buttons for policy-related questions ("Policy risk impact", "Policy-sensitive assets") provide quick access to contextual analysis. AI responses incorporate current policy risk levels, sensitive asset exposure, and Fed tone when answering user queries.

**Policy Integration Features (November 18, 2025)**:
1. **Portfolio Policy Exposure Card**: Added to `/today` page showing portfolio-level breakdown of policy-sensitive holdings. Displays High/Moderate/Low sensitivity counts, total exposure percentage, and top 3 sensitive holdings with their values and correlation strength.
2. **Asset Overview Policy Impact Panel**: Added to `/asset-overview` page detecting policy-sensitive assets and displaying correlation scores, relevant policy topics, AI-generated mini-summary, and recent policy headlines. Shows "No significant policy sensitivity" message for non-sensitive assets.
3. **AI Insights Policy Templates**: Added 3 preset policy-aware template buttons to `/insights` page: "How did policy affect my portfolio today?", "Explain my policy-sensitive holdings", and "Is Fed tone influencing markets today?". Templates pre-fill the insights textarea with detailed prompts that incorporate current Trump Index, Fedspeak tone, and sensitive asset data.

**Error Handling & Bug Fixes (November 18, 2025)**:
1. **Insights Page Critical Fix**: Removed non-existent portfolio API calls (getPortfolios, getPortfolioDetails) that caused runtime crashes. Page now works with market sentiment and policy data only.
2. **Asset Overview Null Safety**: Added null checks for stats, supportResistance, and catalysts objects to prevent "Cannot read properties of undefined" crashes.
3. **Comprehensive Error Handling Pattern**:
   - **Dashboard**: Market Sentiment card shows "Error" in header and dedicated error UI with retry button when query fails
   - **Market Recap**: Error state card displayed before loading, retry uses proper useQueryClient() hook for context-aware invalidation
   - **Insights**: Inline warning banner shows which context data failed (market sentiment, policy data, Fed analysis) while allowing AI analysis to continue
   - **Today**: Already had robust error handling with full-page error state and retry
4. **Data-testid Attributes**: Added test identifiers to error states and retry buttons (text-sentiment-score, error-sentiment, button-retry-sentiment, button-retry-recap, card-context-error) for e2e testing.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built using React 18 with Vite as the build tool and development server. The application follows a component-based architecture with:

- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: TailwindCSS with CSS variables for theming and custom color schemes
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Type Safety**: Full TypeScript implementation with strict configuration

The frontend is organized into:
- Pages for main application views (Dashboard, Today, Insights, Policy, News Stream, etc.)
- Reusable UI components following shadcn/ui patterns
- Custom hooks for mobile responsiveness and toast notifications
- API client with centralized request handling

## Backend Architecture

The backend uses Express.js with TypeScript in ESM format, following a REST API design:

- **Server Framework**: Express with middleware for JSON parsing and request logging
- **Data Layer**: In-memory storage implementation with interface abstraction for future database integration
- **External Data Integration**: Python scripts for price fetching using yfinance and CoinGecko APIs
- **AI Integration**: OpenAI GPT-4o-mini for market insights and analysis
- **File Upload**: CSV parsing for bulk position imports
- **Development**: Vite integration for development mode with HMR support

## Data Architecture

**Database**: Configured for PostgreSQL with Drizzle ORM but currently using in-memory storage for demo purposes. The schema includes:
- **Prices**: Historical and current price data with source attribution
- **Watchlist**: User-tracked assets for monitoring
- **News & Headlines**: Market news and headline data
- **Economic Events**: Calendar of economic indicators and events

**Data Models**:
- Asset price tracking with timestamp and source attribution
- Watchlist items with asset type categorization (equity, ETF, crypto)
- News articles with sentiment and AI analysis
- Economic calendar events with impact levels

## External Data Sources

**Price Data Sources**:
- **yfinance**: Primary source for equity and ETF price data (no API key required)
- **CoinGecko**: Cryptocurrency price data via public API
- **Python Integration**: Separate Python process for data fetching with error handling

**Data Flow**:
1. Frontend requests price data via REST API
2. Backend spawns Python process with requested symbols
3. Python scripts fetch latest prices from external sources
4. Results are parsed and stored in the data layer
5. Frontend receives updated data through React Query cache invalidation

## AI Integration

**OpenAI Integration**:
- Uses GPT-5 model for advanced text analysis and classification
- Provides market insights and policy sentiment analysis
- Powers Fedspeak tone classification (hawkish/dovish/neutral)
- Analyzes policy news topics and intensity scoring
- Graceful fallback to mock responses when API key is unavailable
- Structured prompts for consistent financial analysis output

## Security and Configuration

**Environment Management**:
- Environment-based configuration for API keys
- Secure handling of external API credentials
- Development vs production environment separation

**Error Handling**:
- Centralized error handling in Express middleware
- Client-side error boundaries and toast notifications
- Graceful degradation for external service failures

## Build and Deployment

**Development Workflow**:
- Vite for fast frontend development with HMR
- TSX for TypeScript execution in development
- Replit integration with development banners and debugging tools

**Production Build**:
- Vite build for optimized frontend bundle
- ESBuild for backend bundling with external dependencies
- Static asset serving with proper routing fallbacks

# External Dependencies

## Core Framework Dependencies
- **React 18**: Frontend framework with modern hooks and concurrent features
- **Express**: Node.js web framework for REST API
- **TypeScript**: Type safety across the entire application
- **Vite**: Build tool and development server

## UI and Styling
- **Radix UI**: Unstyled, accessible UI primitives
- **TailwindCSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component system
- **Lucide React**: Icon library

## Data Management
- **Drizzle ORM**: Type-safe database toolkit
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **TanStack Query**: Server state management and caching
- **Zod**: Schema validation

## External APIs
- **OpenAI**: AI-powered text analysis and insights
- **yfinance** (Python): Financial data from Yahoo Finance
- **CoinGecko API**: Cryptocurrency market data
- **Python subprocess**: Price fetching integration

## Development Tools
- **Wouter**: Lightweight routing
- **React Hook Form**: Form state management
- **date-fns**: Date manipulation utilities
- **Recharts**: Data visualization
- **@replit/vite-plugin-runtime-error-modal**: Development error handling