# WattWise AI: Laravel Migration Specification

This document details the specification and plan for rewriting the WattWise AI SaaS application from Next.js to a Laravel, Inertia, Vue, and Supabase PostgreSQL stack.

## 1. Objective
The goal is to rewrite **WattWise AI** into a **Laravel + Inertia + Vue + Tailwind + Supabase PostgreSQL** stack to achieve:
- **Better Stability**: Leverage Laravel's robust framework features, standard session management, and mature Eloquent ORM.
- **Improved Maintainability**: Create a clean separation of concerns using controllers, requests, service classes, and Vue 3 frontend components connected smoothly via Inertia.js.
- **Enterprise-Grade Routing and Auth**: Benefit from Laravel's built-in Authentication, Authorization, Request Validation, and Route Model Binding.

---

## 2. Stack Decision
The new application will be located in the [wattwise-laravel](file:///D:/LOMBA/Startup%20Proto/wattwise-laravel) subfolder, using the following stack:
- **Laravel Backend**: Version 11.x, serving as the API and application controller layer.
- **Inertia.js Bridge**: Integrates the Laravel backend and Vue 3 frontend without the complexity of a client-side router or custom SPA auth.
- **Vue 3 Frontend**: Composition API with `<script setup>`, TypeScript, and reactive state management.
- **TypeScript**: Strict type check integration on the frontend components and Inertia page props.
- **Tailwind CSS**: Utility-first styling aligned with the existing Next.js aesthetic.
- **Supabase PostgreSQL**: Managed PostgreSQL database instance on Supabase as the persistent storage layer.
- **Eloquent ORM**: Database queries, relations, and scopes mapped cleanly to Eloquent models.
- **Laravel Architecture**: Use Form Requests for validation, resource controllers for logic routing, Eloquent migrations for schema, and PHPUnit / Pest for testing.

---

## 3. Why Parallel Rewrite
A **parallel rewrite** approach is chosen because:
- **Zero Downtime / Disruptions**: The existing Next.js application at [Startup Proto](file:///D:/LOMBA/Startup%20Proto) is currently working and must remain completely intact.
- **Feature Parity Goal**: The Next.js app will remain the source of truth for the production environment until the Laravel version reaches complete feature parity, is fully tested, and is ready for production migration.
- **Isolate and Protect**: Changes to the Laravel codebase will be contained inside the [wattwise-laravel](file:///D:/LOMBA/Startup%20Proto/wattwise-laravel) directory, preventing any accidental impact on Next.js services.

---

## 4. Week 1 Scope
The focus of Week 1 is setting up the boilerplate, configuring database connectivity, establishing authentication, and implementing the onboarding and business setup shell.

- **Create Laravel App**: Bootstrap a new Laravel project in the [wattwise-laravel](file:///D:/LOMBA/Startup%20Proto/wattwise-laravel) folder with Inertia, Vue 3, TypeScript, and Tailwind CSS.
- **Configure Supabase PostgreSQL**: Establish PostgreSQL database connection in Laravel's `.env` pointing to the Supabase database instance.
- **Authentication**: Implementation of standard registration, login, logout, and password management using Laravel Breeze (Inertia/Vue variant).
- **Dashboard Shell**: Navigation header/sidebar, user profile dropdown, and standard responsive layout for authenticated users.
- **Initial Database Schema**: DB Migrations for initial tables (`users`, `businesses`, `business_profiles`, `electricity_profiles`, `subscriptions`).
- **Basic Onboarding**: A step-by-step wizard for new users to fill in their initial profile info.
- **First Business/Property Creation**: Create a form for the user to register their first business or rental property (defining the business name, type, and power capacity).
- **Validation and Smoke Tests**: Unit/feature tests for authentication, onboarding, and database connections.

---

## 5. Week 1 Non-Goals
The following features are **explicitly excluded** from Week 1 and will not be implemented:
- **Electricity Monthly Input**: Entering Monthly Usage (kWh) and Electricity Cost (IDR).
- **Revenue Input**: Recording business revenue or operational cash flows.
- **Predictions**: ML/statistical projections for electricity costs.
- **LSTM Inference**: Running or porting local LSTM networks for time series predictions.
- **Appliance Templates & Catalog**: Managing appliances, templates, or device power lists.
- **Recommendations Engine**: Suggesting efficiency tips and savings calculations.
- **Anomaly Detection**: Flags for high/unusual power usage.
- **PDF Reports**: Generating or exporting monthly PDF energy reports.
- **Payment Gateway**: Integration of Midtrans or virtual accounts.
- **Ads Integration**: Advertisements campaigns, impressions, and clicks.
- **WhatsApp Integration**: Sending notification alerts via WhatsApp API.
- **IoT & Live Readings**: Connecting smart plugs, main sensors, or live simulation readings.
- **Live Scraping**: Automatic billing data retrieval.

---

## 6. Initial Route Map
Below is the map of routes to be established in Week 1:

| Route Path | Method | Controller/Action | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/` | GET | Static/Welcome | No | Landing page overview |
| `/login` | GET/POST | `AuthenticatedSessionController` | No | Login form and submission |
| `/register` | GET/POST | `RegisteredUserController` | No | Registration form and submission |
| `/dashboard` | GET | `DashboardController@index` | Yes | Main user dashboard overview |
| `/onboarding` | GET/POST | `OnboardingController` | Yes | Onboarding wizard and save handler |
| `/businesses` | GET/POST | `BusinessController` | Yes | List, create, and view businesses/properties |
| `/settings` | GET/PATCH | `ProfileController@edit` | Yes | Update user profile, password, and account options |

---

## 7. Initial Database Tables
We will create and run migrations for the following core tables:

### 1. `users`
Represents the account holders.
- `id` (BigIncrements / UUID)
- `name` (String)
- `email` (String, Unique)
- `phone` (String, Nullable)
- `password` (String)
- `role` (String, default: `'USER'`)
- `email_verified_at` (Timestamp, Nullable)
- `remember_token` (String, Nullable)
- `timestamps`

### 2. `businesses`
Represents the business entities or rental properties owned/managed by users.
- `id` (UUID / BigIncrements)
- `user_id` (Foreign Key -> `users.id`, cascade on delete)
- `name` (String)
- `type` (Enum/String: `LAUNDRY`, `FNB`, `RETAIL`, `MANUFACTURE`, `COLD_STORAGE`, `OTHER`)
- `mode` (String, default: `'UMKM'`, options: `'UMKM'`, `'KOS_PROPERTY'`)
- `timestamps`

### 3. `business_profiles`
Stores supplemental metadata and operating context for the business.
- `id` (UUID / BigIncrements)
- `business_id` (Foreign Key -> `businesses.id`, cascade on delete)
- `address` (Text, Nullable)
- `revenue_range` (String, Nullable)
- `number_of_rooms` (Integer, Nullable)
- `number_of_units` (Integer, Nullable)
- `timestamps`

### 4. `electricity_profiles`
Houses technical electrical parameters and operating characteristics.
- `id` (UUID / BigIncrements)
- `business_id` (Foreign Key -> `businesses.id`, cascade on delete)
- `power_va` (Integer, Nullable)
- `operating_hours` (String, Nullable)
- `operating_days` (Integer, default: 30)
- `timestamps`

### 5. `subscriptions`
Holds subscription and pricing tier data per user/business.
- `id` (UUID / BigIncrements)
- `user_id` (Foreign Key -> `users.id`)
- `business_id` (Foreign Key -> `businesses.id`, Nullable)
- `status` (String, e.g., `'active'`, `'trialing'`, `'cancelled'`)
- `trial_ends_at` (Timestamp, Nullable)
- `ends_at` (Timestamp, Nullable)
- `timestamps`

---

## 8. Safety Boundaries & Guardrails

### Always:
1. **Secrets Security**: Never commit `.env` or hardcode API keys, database passwords, or session secrets in the repository.
2. **Laravel Configuration**: Put all Supabase PostgreSQL credentials into the local environment setup (`.env`) rather than committing them.
3. **Database Usage**: Treat Supabase strictly as a PostgreSQL relational database connection.
4. **Preservation**: Keep the original Next.js codebase completely untouched and operational.

### Ask First:
- Deleting or modifying existing files in the Next.js directories.
- Replacing the root project configuration.
- Modifying paths outside of the [wattwise-laravel](file:///D:/LOMBA/Startup%20Proto/wattwise-laravel) directory.
- Introducing paid or third-party premium dependencies.
- Modifying the remote database provider or switching from Supabase PostgreSQL.

### Never:
- Commit any `.env` files.
- Print or log Supabase database passwords.
- Use any client-side JavaScript Supabase SDKs for primary operations; all database actions must route through Eloquent or Laravel backend handlers.
- Port ML models or LSTM predictions in Week 1.
- Introduce Payment gateway (Midtrans), WhatsApp notifications, or IoT integrations during the Week 1 sprint.

---

## 9. Week 1 Acceptance Criteria
A migration task is considered complete when:
1. **Local Execution**: The Laravel app successfully boots up locally via `php artisan serve` and Vite server runs on `npm run dev`.
2. **Database Connectivity**: Laravel successfully connects to the Supabase PostgreSQL database.
3. **Migrations**: `php artisan migrate` runs and populates the database schema cleanly.
4. **Authentication Flow**: Users can sign up, log in, and log out securely.
5. **Session Routing**: Unauthorized users are blocked from dashboard paths; authenticated users are directed correctly.
6. **Onboarding Integration**: Users can complete the onboarding wizard and successfully create their first business/property profile.
7. **Production Assets Compile**: `npm run build` runs successfully with zero TypeScript or bundler errors.
8. **Test Parity**: `php artisan test` runs and passes with all initial smoke and unit tests.
