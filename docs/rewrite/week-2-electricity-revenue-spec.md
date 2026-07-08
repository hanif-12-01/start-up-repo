# WattWise AI: Week 2 Rewrite Specification
## Electricity Monthly Entries, Revenue Monthly Entries, & Dashboard Summary

This document details the specification and plan for implementing electricity monthly entries, revenue monthly entries, and the basic dashboard summary in the Laravel rewrite version of WattWise AI.

---

## 1. Objective
Add core monthly electricity and revenue data management to the application. This enables WattWise to calculate and display basic cost intelligence, including cost estimations, electricity-to-revenue ratio, and remaining revenue metrics.

---

## 2. Scope
The scope of Week 2 includes:
*   **Database Migrations & Models**: Set up database schemas for `electricity_entries` and `revenue_entries`.
*   **Data Entry Routing & Controllers**: Form requests, validation, and storage logic for monthly entries.
*   **Active-Business Scoped Isolation**: Ensure users can only view and manage data belonging to their currently selected active business.
*   **Simple Calculations**:
    *   **Electricity usage (kWh)** calculation if meter start/end values are provided.
    *   **Estimated bill (IDR)** calculation if kWh and tariff rate are available.
    *   **Electricity-to-revenue ratio** calculation.
    *   **Remaining revenue after electricity** calculation.
*   **UI Forms & Pages**: Dedicated entry logs and forms for electricity usage and revenue.
*   **Dashboard Summary Widgets**: Live cost intelligence cards on the main dashboard showing the latest month's metrics.
*   **Regulatory & Safety Disclaimers**: Render strict legal and informational disclaimers in all relevant estimation views.

---

## 3. Non-Goals
The following features are **explicitly excluded** from Week 2:
*   LSTM or any advanced machine learning forecasting/prediction.
*   Appliance templates, appliances catalog, or individual device power allocations.
*   Anomaly detection engines for high or unusual load patterns.
*   Energy savings recommendations and action plans.
*   PDF report exports (generation or email sharing).
*   Ads campaign system, clicks, or advertising integrations.
*   Payment gateway integration (Midtrans, virtual accounts, subscription upgrades).
*   WhatsApp notification alerts.
*   IoT integration, smart plug connectivity, or real-time sensor streams.
*   Live scraping of PLN Mobile bills.

---

## 4. Database Schema

We will create and run migrations for the following two tables:

### 1. `electricity_entries`
Represents monthly electricity recording.
*   `id` (BigIncrements / Unsigned Big Integer)
*   `business_id` (Foreign Key -> `businesses.id`, cascade on delete)
*   `period_month` (Date - stored as `YYYY-MM-01` for month representation)
*   `usage_kwh` (Decimal, 12, 2, Nullable)
*   `bill_amount_idr` (Decimal, 15, 2, Nullable)
*   `meter_start` (Decimal, 12, 2, Nullable)
*   `meter_end` (Decimal, 12, 2, Nullable)
*   `tariff_per_kwh` (Decimal, 10, 2, Nullable)
*   `payment_method` (String, Nullable, e.g., `'PRABAYAR'`, `'PASCABAYAR'`)
*   `notes` (Text, Nullable)
*   `timestamps`

**Indexes & Constraints**:
*   Unique composite index on `['business_id', 'period_month']` to ensure only one electricity entry is made per business per month.

### 2. `revenue_entries`
Represents monthly revenue recording.
*   `id` (BigIncrements / Unsigned Big Integer)
*   `business_id` (Foreign Key -> `businesses.id`, cascade on delete)
*   `period_month` (Date - stored as `YYYY-MM-01` for month representation)
*   `revenue_amount_idr` (Decimal, 15, 2, Nullable)
*   `revenue_input_mode` (String, default: `'EXACT'`, options: `'EXACT'`, `'ESTIMATE'`)
*   `notes` (Text, Nullable)
*   `timestamps`

**Indexes & Constraints**:
*   Unique composite index on `['business_id', 'period_month']` to ensure only one revenue entry is made per business per month.

---

## 5. Business Rules & Logic

### 1. Active Business & Tenant Isolation
*   Every data read, update, or create operation must be explicitly scoped to the user's active business.
*   `business_id` must match a business owned by the authenticated `user_id`. Attempting to access or write entries for another user's business must throw an authorization exception (403 Forbidden).

### 2. Uniqueness Rule
*   Only **one** entry of each type (electricity and revenue) is allowed per business per month.
*   **Duplicate Month Handling**: If the user submits an entry for a month that already has data:
    *   The store route (`POST`) will reject the request with a validation error (`The entry for this month already exists.`).
    *   An explicit edit/update route (`PUT/PATCH`) will be used to modify existing entries.

### 3. Usage (kWh) Fallback Calculation
*   If `usage_kwh` is not filled in the request but `meter_start` and `meter_end` are both provided:
    $$\text{usage\_kwh} = \text{meter\_end} - \text{meter\_start}$$
*   Validation must ensure that if both `meter_start` and `meter_end` are provided, `meter_end` must be greater than or equal to `meter_start`.

### 4. Bill Amount Estimation Fallback
*   If `bill_amount_idr` is not filled in the request but `usage_kwh` (or calculated `usage_kwh`) and `tariff_per_kwh` exist:
    $$\text{Estimated Bill (IDR)} = \text{usage\_kwh} \times \text{tariff\_per\_kwh}$$
*   The system will flag this bill value as an **estimate** in the frontend, using the label **"Estimasi tagihan listrik"** instead of "Prediksi tagihan".

### 5. Ratio & Financial Metrics
*   If both `bill_amount_idr` (or estimated bill) and `revenue_amount_idr` exist for the same month:
    $$\text{Electricity-to-Revenue Ratio} = \left( \frac{\text{Electricity Cost}}{\text{Revenue}} \right) \times 100\%$$
*   **Remaining Revenue after Electricity**:
    $$\text{Remaining Revenue} = \text{Revenue} - \text{Electricity Cost}$$
*   *Safety boundary*: Remaining revenue must be presented clearly as operational cash leftover before other overheads. It is **not** net profit.

---

## 6. Required Wording & Disclaimers

To protect the platform legally and manage user expectations, the UI must strictly adhere to the following copy requirements:

1.  **Estimation Label**:
    *   Use the term: **"Estimasi tagihan listrik"**
    *   Do **NOT** use: "Prediksi tagihan" or "Prediksi tagihan listrik"

2.  **General Estimation Disclaimer**:
    > "Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN."

3.  **Remaining Revenue Disclaimer**:
    > "Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya."

4.  **PLN Affiliation Disclaimer**:
    > "WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi."

---

## 7. Routes & Controller Map

The following routes will be defined in `routes/web.php` inside the auth middleware group:

| Route Path | Method | Controller & Action | Route Name | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/electricity` | GET | `ElectricityController@index` | `electricity.index` | View list/logs of electricity entries |
| `/electricity` | POST | `ElectricityController@store` | `electricity.store` | Store new monthly electricity entry |
| `/electricity/{entry}` | PUT | `ElectricityController@update` | `electricity.update` | Update existing electricity entry |
| `/electricity/{entry}` | DELETE | `ElectricityController@destroy` | `electricity.destroy` | Delete electricity entry |
| `/revenue` | GET | `RevenueController@index` | `revenue.index` | View list/logs of revenue entries |
| `/revenue` | POST | `RevenueController@store` | `revenue.store` | Store new monthly revenue entry |
| `/revenue/{entry}` | PUT | `RevenueController@update` | `revenue.update` | Update existing revenue entry |
| `/revenue/{entry}` | DELETE | `RevenueController@destroy` | `revenue.destroy` | Delete revenue entry |
| `/dashboard` | GET | `DashboardController@index` | `dashboard` | View dashboard summary (updated for Week 2) |

---

## 8. UI Pages & Components

We will create and update the following pages under `resources/js/pages/`:

### 1. `Electricity/Index.vue`
*   Features:
    *   Monthly log table showing: Month, Meter Start, Meter End, Usage (kWh), Tariff, Bill (IDR) with clear "Estimasi" badge if calculated, Payment Method, and Notes.
    *   Form modal or inline drawer to add a new monthly entry.
    *   Validation checks on client side (e.g. `meter_end >= meter_start`).
    *   Displays **PLN Affiliation Disclaimer** and **General Estimation Disclaimer** in the form and log view.

### 2. `Revenue/Index.vue`
*   Features:
    *   Monthly log table showing: Month, Revenue (IDR), Mode (Exact/Estimate), and Notes.
    *   Form modal or inline drawer to add a new monthly entry.
    *   Displays **Remaining Revenue Disclaimer** prominently in the page layout.

### 3. Updates to `Dashboard.vue`
*   Replace placeholders with active metrics from the latest month:
    *   **Cost Card**: Displays the latest electricity cost, using the label **"Estimasi tagihan listrik"** if estimated.
    *   **Electricity-to-Revenue Ratio Card**: Displays the percentage value of electricity vs revenue.
    *   **Remaining Revenue Card**: Displays calculated value with the required **Remaining Revenue Disclaimer**.
*   Render the three required disclaimers clearly at the bottom of the dashboard layout.

---

## 9. Testing Strategy

We will write comprehensive feature tests under `tests/Feature/`:

### 1. `tests/Feature/ElectricityTest.php`
*   `test_guest_cannot_access_electricity_page`: Guests are redirected to the login page.
*   `test_authenticated_user_can_view_own_electricity_entries`: Users only see electricity records belonging to their active business.
*   `test_authenticated_user_can_create_electricity_entry`: Saving a valid entry works.
*   `test_electricity_entry_calculates_kwh_from_meters`: Leaving `usage_kwh` blank but filling `meter_start` and `meter_end` correctly calculates the difference.
*   `test_electricity_entry_estimates_bill_from_usage_and_tariff`: Leaving `bill_amount_idr` blank but filling `usage_kwh` and `tariff_per_kwh` correctly calculates the product.
*   `test_duplicate_electricity_month_throws_validation_error`: Attempting to insert a duplicate month for the same business fails.
*   `test_user_cannot_create_or_view_electricity_entry_for_other_users_business`: Direct cross-tenant boundary validation.

### 2. `tests/Feature/RevenueTest.php`
*   `test_guest_cannot_access_revenue_page`: Guests are redirected to login.
*   `test_authenticated_user_can_create_revenue_entry`: Saving a valid revenue entry works.
*   `test_duplicate_revenue_month_throws_validation_error`: Duplicate checks fail.
*   `test_user_cannot_create_or_view_revenue_entry_for_other_users_business`: Tenant isolation validation.

### 3. `tests/Feature/DashboardSummaryTest.php`
*   `test_dashboard_summary_calculates_correct_values`: Checks that the dashboard endpoint returns the correct latest month stats, including ratio and remaining revenue.

---

## 10. Acceptance Criteria

A task is considered complete when:
1.  **Database Migrations**: `php artisan migrate` runs successfully, creating the indexes and constraints.
2.  **Access Security**: Authorization rules successfully isolate records per business.
3.  **Business Formulas**: Usage and estimated bills are correctly calculated when inputs are partial.
4.  **UI Forms & Table Logs**: Users can input both electricity and revenue entries, and view past data in reactive tables.
5.  **Dashboard Calculations**: The dashboard summary shows exact figures for the latest available month.
6.  **Disclaimers Visibility**: All three required disclaimers and specific wordings are fully visible.
7.  **Tests Pass**: `php artisan test` completes with 100% success rate.
8.  **Production Compile**: `npm run build` compiles with zero TypeScript or bundler errors.
