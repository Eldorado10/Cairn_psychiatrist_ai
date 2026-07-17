# Cairn

> A thoughtful first step toward the right mental-health support.

Cairn is a mental-health support and care-coordination web application. Its AI guide, **Wren**, gives people a calm place to describe what they are experiencing, asks careful follow-up questions, and helps them consider an appropriate category of human support.

Cairn is built around a simple path:

1. **Talk** - Share what is happening in your own words.
2. **Understand** - Wren reflects what it hears and asks one gentle question at a time.
3. **Meet** - Cairn can identify relevant support specialties and surface matching clinicians.

Wren does not diagnose, prescribe, provide treatment plans, or promise solutions. It is designed to support reflection and connection to qualified care, not replace it.

## Why Cairn Matters

Finding mental-health support can be hardest when someone is already overwhelmed. People may not know how to describe what they feel, which type of professional could help, or where to begin searching.

Cairn reduces that first-step burden by providing:

- A private space to put unfinished thoughts into words.
- A conversational experience that listens before suggesting next steps.
- Gentle, optional guidance instead of authoritative answers.
- Conservative summaries that keep uncertainty visible.
- Specialty-based clinician matching grounded in stored provider data.
- A personal dashboard for conversations, assessments, and care activity.
- A dedicated safety path when a message may indicate immediate danger.

The product's value is not that AI has the answer. Its value is helping a person move from uncertainty toward a more informed human conversation.

## Features

### Wren, the AI conversation guide

- Streams conversational replies in real time.
- Reflects the user's main concern before moving the conversation forward.
- Asks one clear question at a time.
- Offers a small number of optional next steps when appropriate.
- Uses explicit boundaries against diagnosis, medication advice, treatment plans, certainty, and dependency.
- Suggests categories of qualified support rather than inventing or recommending named clinicians.
- Supports a mock mode for development without external model calls.

### Conversation persistence

- Requires an authenticated account before chat messages are accepted.
- Stores conversations and user/assistant messages in Supabase.
- Restores the persisted transcript as model context.
- Limits message size and validates API request data with Zod.
- Finishes a conversation either from the user action or the idle flow.
- Prevents duplicate assessments when the finish endpoint is called more than once.

### AI-assisted assessment

When a conversation ends, Cairn creates a structured care-coordination summary containing:

- Risk level and a plain-language rationale.
- Primary and secondary concerns.
- A wellbeing score.
- A concise summary.
- One tentative, non-medical suggestion.
- Relevant support specialties.
- An urgent-review flag when supported by the conversation.

Assessment output is schema-validated. If extraction fails twice, Cairn still creates a manual-review record instead of silently losing the outcome.

### Clinician matching

- Supports anxiety, depression, trauma, adolescent care, addiction, relationships, grief, and psychiatry.
- Uses the assessment only to suggest allowed specialty categories.
- Matches clinicians through deterministic database queries.
- Ranks matches by specialty overlap and upcoming availability.
- Keeps clinician names out of the model's decision process.
- Includes clearly marked fictional seed clinicians for development and demonstration.

### Crisis-aware safety flow

- Runs a local keyword safety check and a separate AI classifier concurrently.
- Gives the classifier a short timeout so model failure does not block the conversation indefinitely.
- Pauses the normal Wren response when either safety layer detects possible immediate danger.
- Shows crisis-focused guidance that directs the person toward local emergency or crisis services and a trusted person nearby.
- Records crisis events for accountable follow-up.
- Allows an authenticated user to record an urgent callback request.
- Marks an existing assessment for urgent review when applicable.

This feature is a support pathway, not an emergency service. Recording a callback request does not itself dispatch emergency responders or guarantee a live callback.

### Authentication and private dashboard

- Email/password registration and sign-in through Supabase Auth.
- Email confirmation callback support.
- Optional Google OAuth support.
- Automatic profile creation after registration.
- Navigation that changes from **Sign in** to **Sign out** for authenticated users.
- A dashboard link shown only to signed-in users.
- Server-protected dashboard routes that redirect unauthenticated visitors.
- Recent conversations, assessments, appointments, and account information.
- Per-user database access enforced with Supabase Row Level Security (RLS).

### Responsive experience

- Responsive desktop and mobile navigation.
- Accessible focus states and semantic labels.
- Reduced-motion and non-WebGL fallbacks.
- Animated storytelling with GSAP.
- A Three.js hero experience that pauses rendering when off-screen.
- Responsive clinician gallery and conversation interface.

## How It Works

```text
Registered user
      |
      v
Authenticated conversation with Wren
      |
      +--> Local keyword check + AI crisis classifier
      |          |
      |          +--> Possible crisis: pause normal reply and show support path
      |
      v
Messages saved to the user's conversation
      |
      v
Conversation finished
      |
      v
Schema-validated assessment
      |
      +--> Suggested specialty categories
      |
      v
Deterministic clinician matching + private dashboard history
```

## Safety Principles

Cairn's AI behavior is intentionally constrained:

- **Suggest, do not solve.** Wren presents possibilities, not guaranteed answers.
- **Listen before advising.** Reflection and clarification come first.
- **No diagnosis.** Wren cannot determine a condition or its cause.
- **No prescribing.** Wren cannot recommend medications, dosages, or medication changes.
- **No treatment claims.** Wren cannot create treatment plans or promise that an action will cure a problem.
- **Human care remains central.** The goal is to help users identify suitable people and services.
- **Urgent risk changes the flow.** Ordinary conversation pauses so immediate human support can be prioritized.

The safety prompt is versioned in `src/lib/ai/prompts/wren.ts`. Crisis detection is implemented separately from the main conversational model so safety does not depend only on Wren following its prompt.

## Technology

| Area | Technology |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4, Radix UI, Lucide icons |
| Motion and 3D | GSAP, Motion, React Three Fiber, Three.js |
| AI | Vercel AI SDK, OpenRouter |
| Authentication and data | Supabase Auth, PostgreSQL, Row Level Security |
| Validation | Zod |
| Testing | Vitest, ESLint, TypeScript/Next.js production build |

## Project Structure

```text
src/
  app/
    api/                 Chat, assessment completion, and crisis APIs
    auth/                Sign-in, sign-up, callback, and server actions
    chat/                Authenticated Wren conversation experience
    dashboard/           Registered-user dashboard
  components/
    chat/                Chat safety and crisis UI
    hero/                Three.js hero and static fallbacks
    sections/            Home-page product sections
    site/                Shared navigation
  lib/
    ai/                  Providers, prompts, assessment, mocks, and schemas
    matching/            Specialty definitions and clinician matching
    safety/              Keyword checks, classifier orchestration, crisis response
    supabase/             Browser/server clients, middleware, and generated types
supabase/
  migrations/            Database schema, persistence, RLS, and grants
  seed.sql               Fictional demo clinicians and availability
```

## Data Model

The main database entities are:

- `profiles` - user details linked to Supabase Auth.
- `conversations` - an authenticated user's Wren sessions.
- `messages` - persisted user and assistant messages.
- `assessments` - structured outcomes created when conversations finish.
- `doctors` - clinician profiles and supported specialties.
- `availability_slots` - bookable clinician times.
- `appointments` - appointment records and status.
- `crisis_events` - safety triggers and urgent callback requests.

RLS policies restrict personal rows to their owning user. Public clinician reads are limited to active provider records, while privileged mutations remain server-controlled.

## Local Development

### Prerequisites

- Node.js 20 or later.
- npm.
- A Supabase project, or the Supabase CLI and Docker for local Supabase.
- An OpenRouter API key for live AI responses.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the required values.

```powershell
Copy-Item .env.example .env.local
```

Important settings:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key protected by RLS |
| `NEXT_PUBLIC_APP_URL` | Public application URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only administrative Supabase key |
| `OPENROUTER_API_KEY` | Server-only key for live AI requests |
| `OPENROUTER_CHAT_MODEL` | Wren and assessment model |
| `OPENROUTER_CLASSIFIER_MODEL` | Crisis classification model |
| `OPENROUTER_SITE_URL` | Application URL sent to OpenRouter |
| `OPENROUTER_SITE_NAME` | Application name sent to OpenRouter |
| `AI_MOCK_MODE` | `true` for fixtures; `false` for live model calls |

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENROUTER_API_KEY` through a `NEXT_PUBLIC_` variable.

### 3. Prepare Supabase

For a local Supabase environment:

```bash
npx supabase start
npx supabase db reset
```

For a hosted project, link the CLI and apply the migrations:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The seed data is for development only. Every seeded clinician is fictional and marked with `[DEMO]` in the database.

### 4. Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev      # Start the development server
npm run build    # Create a production build and run TypeScript checks
npm run start    # Serve the production build
npm run lint     # Run ESLint
npm test         # Run the Vitest suite
```

## Authentication Setup

Email/password authentication works through Supabase Auth. For a hosted deployment, add the production application URL and `/auth/callback` URL to the allowed redirect URLs in Supabase.

Google sign-in is implemented in the application but disabled by default in `supabase/config.toml`. To enable it, configure the Google provider in Supabase and provide the optional Google OAuth environment values shown in `.env.example`.

## Current Scope

Cairn currently provides the core journey from account creation through conversation, safety screening, structured assessment, clinician matching, and private history.

The following areas need production integration before a public healthcare launch:

- Replace all fictional clinician fixtures with verified provider data.
- Complete the appointment booking, rescheduling, cancellation, and notification experience.
- Connect urgent callback requests to a staffed and monitored operational workflow.
- Add region-aware crisis resources instead of relying only on general local-service guidance.
- Establish clinical governance, model evaluation, incident response, consent, retention, and deletion policies.
- Complete privacy, security, accessibility, and healthcare regulatory reviews for the launch regions.
- Add monitoring and human review for safety-sensitive model behavior.

## Important Disclaimer

Cairn is not a doctor, therapist, crisis line, or emergency service. Wren cannot diagnose conditions, prescribe medication, or replace professional care. If someone may be in immediate danger or unable to stay safe, they should contact local emergency services or a local crisis service and involve a trusted person nearby when possible.

## License

This repository is currently private and does not declare an open-source license. All rights are reserved unless a license is added by the project owner.
