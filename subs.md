# ADVANCED SUBSCRIPTION PLAN MANAGEMENT (ADMIN)
Implement a complete Authentication, Subscription, User Dashboard, and Admin Management System in the existing FlashSuite.pro application without breaking, modifying, or impacting any existing functionality, UI flow, routing, SEO, APIs, tools, or user experience. All existing tools (PDF Tools, QR Generator, URL Shortener, and other utilities) must continue to work exactly as they do today for guest users and logged-in users.

Use the existing project architecture, coding standards, folder structure, state management, routing system, and Material 3 design language. Ensure all new code is production-ready, modular, scalable, type-safe, and follows clean architecture principles.

Implement:

* User Sign Up
* User Sign In
* Forgot Password
* Email Verification
* User Profile Management
* User Dashboard
* Subscription Management
* Admin Dashboard
* Tool Management
* Plan Management

Create two plans by default:

1. Free Tier ($0)
2. Premium Pro ($9/month)

Premium Pro users can access the AI-powered "Humanize AI" tool and all future premium tools.

Guest users and Free Tier users must not access premium-designated tools.

Do not hardcode Humanize AI or subscription plans. Build a dynamic architecture where Admin can manage everything from the backend dashboard.

Admin Dashboard must support:

* User Management
* Subscription Management
* Tool Management
* Feature Management
* Analytics
* System Settings

Admin should be able to:

* Add/Edit/Delete Tools
* Mark tools as Free or Premium
* Enable/Disable tools
* Control tool visibility
* Reorder tools
* Feature tools on homepage
* Add/Edit/Delete Subscription Plans
* Change plan pricing
* Add/Edit/Delete plan features
* Assign tools to plans
* Configure future plans without code changes

Protect premium routes, APIs, and UI using subscription-based access control.

Integrate Stripe subscription billing architecture with proper webhook handling, subscription lifecycle management, payment status synchronization, cancellation, reactivation, and invoice tracking.

Add middleware/guards so premium tools automatically check active subscription status before granting access.

Implement secure authentication using industry best practices:

* JWT/Auth Session Management
* Refresh Tokens
* Secure HTTP-only Cookies
* Password Hashing
* CSRF Protection
* Rate Limiting
* Role-Based Access Control
* Admin Authorization
* Secure API Validation

All admin, subscription, and tool management functionality must be database-driven and configurable from the backend dashboard.

Maintain full backward compatibility. Existing features, screens, APIs, navigation, tool workflows, storage, analytics, and user interactions must remain unchanged unless explicitly required for authentication or subscription integration.

Before creating or modifying files:

1. Analyze the entire existing codebase.
2. Reuse existing components, hooks, services, utilities, and patterns wherever possible.
3. Avoid duplicate logic.
4. Avoid introducing breaking changes.
5. Avoid unnecessary dependencies.
6. Resolve all lint, type, import, compilation, runtime, and build errors.
7. Validate all routes, APIs, and UI flows after implementation.
8. Ensure successful production build with zero syntax errors, import errors, TypeScript errors, dependency conflicts, or compilation issues.

The final implementation should feel like a natural extension of the existing FlashSuite application rather than a newly attached module.

IMPORTANT:

Do NOT hardcode subscription plans.

Although the platform currently launches with:

* Free Tier ($0)
* Premium Pro ($9/month)

The system architecture must support unlimited future subscription plans that can be created and managed directly from the Admin Dashboard.

---

## PLAN MANAGEMENT MODULE

Create a dedicated Subscription Plans Management section within the Admin Dashboard.

Admin should be able to:

### Create New Plan

Fields:

* Plan Name
* Plan Slug
* Description
* Monthly Price
* Yearly Price (optional)
* Currency
* Trial Period (optional)
* Sort Order
* Plan Badge Label
* Popular Plan Toggle
* Status

Status Options:

* Active
* Draft
* Archived

---

### Edit Existing Plans

Admin can modify:

* Plan Name
* Pricing
* Description
* Features
* Visibility
* Status

Changes should automatically reflect across:

* Pricing Page
* Checkout Page
* User Dashboard
* Subscription Upgrade Flow

Without requiring code deployment.

---

### Plan Features Management

Admin should be able to dynamically create and assign plan features.

Examples:

* Humanize AI Access
* Unlimited Humanize AI Usage
* AI Resume Builder Access
* AI Cover Letter Generator Access
* Premium PDF Tools
* Priority Processing
* Team Workspace
* Advanced Analytics
* API Access

Features should not be hardcoded.

Admin can:

* Add Feature
* Edit Feature
* Remove Feature
* Reorder Features

---

### Feature Assignment

Admin can assign features to any plan.

Example:

Free Plan:

✓ Basic PDF Tools
✓ QR Generator
✓ URL Shortener

Premium Pro:

✓ Everything in Free
✓ Humanize AI
✓ Future Premium Tools

Future Business Plan:

✓ Everything in Premium Pro
✓ Team Management
✓ API Access
✓ Advanced Analytics

Feature inheritance should be supported.

---

### Tool Access Mapping

Admin should be able to connect tools directly to plans.

Example:

Tool:
Humanize AI

Access:
Premium Pro

---

Tool:
AI Resume Builder

Access:
Premium Pro + Business

---

Tool:
Advanced PDF Analyzer

Access:
Business Only

The system should automatically enforce access control based on the user's active subscription.

No code changes should be required when assigning tools to plans.

---

### Pricing Management

Admin can:

* Change monthly pricing
* Change yearly pricing
* Run promotional pricing
* Enable trial periods
* Enable introductory offers

Without developer involvement.

---

### Upgrade & Downgrade Rules

Admin can configure:

* Allowed upgrades
* Allowed downgrades
* Trial eligibility
* Plan migration rules

---

### Plan Analytics

Display:

* Total Subscribers
* Active Subscribers
* Churn Rate
* Monthly Revenue
* Lifetime Revenue
* Conversion Rate
* Most Popular Plan

---

### Subscription Feature Architecture

Design the database so plans and features are fully dynamic.

Recommended Entities:

Plans

PlanFeatures

FeatureDefinitions

UserSubscriptions

SubscriptionHistory

PlanToolMappings

FeatureFlags

This architecture must allow FlashSuite to grow from:

Free + Premium Pro

to

Free + Starter + Premium + Business + Enterprise

without requiring database redesign or application restructuring.
