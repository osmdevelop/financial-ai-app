# Overview

This is a full-stack market intelligence and portfolio tracker application built as a monorepo. The application provides portfolio management capabilities with real-time price tracking, AI-powered market insights, policy analysis, and comprehensive analytics. It's designed as an informational tool for investment tracking without offering brokerage services or investment advice.

## Recent Changes (November 18, 2025)

**Module E: Policy & Political Indexes** - Added policy-driven market analysis featuring:
- Trump Policy Index tracking policy topic intensity (tariffs, trade, immigration, defense) with z-score calculations
- Sensitive asset correlation analysis showing how different assets respond to policy changes
- Fedspeak tone analysis classifying Federal Reserve communications as hawkish/dovish/neutral
- Policy news feed with AI-powered topic tagging and intensity scoring
- New `/policy` page with interactive charts, asset tables, and Fed quote displays

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
- **Portfolios**: User portfolio containers with base currency settings
- **Positions**: Individual holdings with quantity, average cost, and asset type
- **Prices**: Historical and current price data with source attribution

**Data Models**:
- Portfolio entities with one-to-many relationships to positions
- Position tracking with asset type categorization (equity, ETF, crypto)
- Price history with timestamp and source tracking
- Computed portfolio summaries with P&L calculations

## External Data Sources

**Price Data Sources**:
- **yfinance**: Primary source for equity and ETF price data (no API key required)
- **CoinGecko**: Cryptocurrency price data via public API
- **Python Integration**: Separate Python process for data fetching with error handling

**Data Flow**:
1. Frontend requests price refresh via REST API
2. Backend spawns Python process with portfolio symbols
3. Python scripts fetch latest prices from external sources
4. Results are parsed and stored in the data layer
5. Frontend receives updated data through React Query cache invalidation

## AI Integration

**OpenAI Integration**:
- Uses GPT-5 model for advanced text analysis and classification
- Provides market insights, portfolio analysis, and policy sentiment analysis
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