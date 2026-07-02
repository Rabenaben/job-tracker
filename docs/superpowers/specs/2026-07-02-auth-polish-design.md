# Auth Polish: Logout + Register

Date: 2026-07-02

## Overview

Add user dropdown menu with logout, and a registration page. Keeps header clean with room for future profile/settings.

---

## Feature 1: User Dropdown Menu

### Location
Header right section — replaces the floating "Add Application" button position or integrates beside it.

### Design
```
┌─────────────────────────┐
│  [Avatar] username  ▾   │  ← toggle dropdown
│                         │
│  ┌───────────────────┐  │  (after click)
│  │ 👤 username       │  │  ← display only
│  │───────────────────│  │
│  │ 🚪 Logout         │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

### Avatar
- 40×40 circle with gradient background (match existing header brand icon)
- Shows first letter of username, uppercase
- Falls back to "?" if username empty/invalid

### Dropdown Behavior
- Click avatar → toggle open/close
- Click outside → close
- Escape key → close (accessibility)
- Logout calls `POST /api/logout` (existing endpoint), clears token, redirects to `/login`
- Use CSS absolute positioning, no portal

### Header Layout
```
┌──────────────────────────────────────────────────────────────┐
│  [Brand Icon] Job Tracker         [Stats...]  [Add] [Avatar]│
└──────────────────────────────────────────────────────────────┘
```
- "Add Application" button stays
- "Add Application" button should move to the left of the avatar to avoid collision

---

## Feature 2: Register Page

### Route
`/register`

### Fields
| Field | Validation | Error Message |
|-------|------------|---------------|
| Username | Required, unique | "Username is required" / "Username already taken" |
| Password | Required, min 6 chars | "Password must be at least 6 characters" |
| Confirm Password | Required, must match | "Passwords do not match" |

### Submit Flow
1. Validate all fields client-side
2. POST `/api/register` with `{ username, password, password_confirmation }`
3. On success → store token, redirect to `/`
4. On error → display field-specific errors from API

### API Contract
```
POST /api/register
Body: { username, password, password_confirmation }
201: { user: {...}, token: "..." }
422: { message: "...", errors: { field: [...] } }
```

### Error Display
- Inline errors below each field (red text)
- Shake animation on form on submit error

### Link to Login
- "Already have an account? Log in" link below submit button
- Links to `/login`

### Style
Match Login page: dark background, card layout, red gradient submit button.

---

## Components to Create/Modify

| File | Action |
|------|--------|
| `src/components/UserMenu.jsx` | New — avatar + dropdown |
| `src/App.jsx` | Add `/register` route |
| `src/pages/Register.jsx` | New — registration form |
| `src/pages/Board.jsx` | Add `<UserMenu>` to header |
| `src/api/axios.js` | Ensure logout endpoint is callable |

---

## Files to Create

### `src/components/UserMenu.jsx`
- Props: none (reads user from AuthContext)
- Internal state: isOpen (boolean)
- Renders: avatar button + dropdown div
- Calls `useAuth()` for user data and logout function

### `src/pages/Register.jsx`
- Form state for username, password, password_confirmation
- Validation on blur + submit
- API call via `api.post('/register', formData)`
- On success: call `login()` from AuthContext or set token + redirect

---

## Open Questions
None — all resolved in brainstorming.

## Dependencies
- AuthContext already exists (`src/context/AuthContext.jsx`)
- API logout endpoint already exists
- API register endpoint already exists