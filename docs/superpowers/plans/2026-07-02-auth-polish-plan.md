# Auth Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user dropdown menu with logout, and a registration page.

**Architecture:** UserMenu component reads from AuthContext and renders avatar + dropdown. Register page is a new route with validated form that calls AuthContext.register. Board header reorganized to accommodate both "Add Application" button and UserMenu.

**Tech Stack:** React 19, React Router 7, Tailwind CSS 4, existing AuthContext.

---

## Global Constraints

- API: `POST /api/register` expects `{ username, password, password_confirmation }` (min 6 char password)
- API: `POST /api/logout` clears token server-side
- API: `GET /api/me` returns current user
- Token stored in `localStorage` key `'token'`
- AuthContext provides: `user`, `loading`, `login`, `register`, `logout`
- All new components follow existing patterns (dark theme, consistent styling)

---

## File Map

| File | Action |
|------|--------|
| `web/src/components/UserMenu.jsx` | Create |
| `web/src/pages/Register.jsx` | Create |
| `web/src/App.jsx` | Modify — add `/register` route |
| `web/src/pages/Board.jsx` | Modify — add `<UserMenu>`, reorganize header |

---

## Task 1: Create UserMenu Component

**Files:**
- Create: `web/src/components/UserMenu.jsx`
- Consumes: `useAuth()` hook (returns `{ user, logout }`)

**Interfaces:**
- Consumes: `useAuth()` from `../context/AuthContext`
- Produces: `<UserMenu />` component with no props

- [ ] **Step 1: Write the component**

```jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserMenu() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    const getInitial = (username) => {
        if (!username || typeof username !== 'string' || username.trim() === '') {
            return '?';
        }
        return username.charAt(0).toUpperCase();
    };

    return (
        <div className="relative" ref={menuRef}>
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-800 transition-colors"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-white font-semibold text-sm ring-1 ring-white/10">
                    {getInitial(user?.username)}
                </div>
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#141414] border border-zinc-800 rounded-xl shadow-xl py-1 z-50 animate-fade-in">
                    {/* User Info - non-interactive display */}
                    <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="text-sm text-zinc-400">Signed in as</p>
                        <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify component compiles** (no build step needed yet — will test in Task 4)

---

## Task 2: Create Register Page

**Files:**
- Create: `web/src/pages/Register.jsx`
- Consumes: `useAuth().register`, `<Link>` from react-router-dom, `api`

**Interfaces:**
- Consumes: `useAuth()` with `register` function
- Produces: `<Register />` default export

- [ ] **Step 1: Write the page**

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: '',
        password: '',
        password_confirmation: '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!form.username.trim()) {
            newErrors.username = 'Username is required';
        }

        if (form.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (form.password !== form.password_confirmation) {
            newErrors.password_confirmation = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');

        if (!validate()) return;

        setSubmitting(true);
        try {
            await register(form.username, form.password);
            navigate('/');
        } catch (err) {
            if (err.response?.status === 422) {
                // Laravel validation errors
                const serverErrors = err.response.data.errors;
                if (serverErrors) {
                    setErrors({
                        username: serverErrors.username?.[0] || '',
                        password: serverErrors.password?.[0] || '',
                    });
                } else {
                    setApiError(err.response.data.message || 'Registration failed');
                }
            } else {
                setApiError('Registration failed. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/30 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-zinc-500">Start tracking your job applications</p>
                </div>

                {/* Form Card */}
                <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* API Error */}
                        {apiError && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {apiError}
                            </div>
                        )}

                        {/* Username */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                className={`w-full bg-[#0a0a0a] border ${errors.username ? 'border-red-500' : 'border-zinc-800'} text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 placeholder:text-zinc-600 transition-all`}
                                placeholder="Choose a username"
                            />
                            {errors.username && (
                                <p className="text-sm text-red-400">{errors.username}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                className={`w-full bg-[#0a0a0a] border ${errors.password ? 'border-red-500' : 'border-zinc-800'} text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 placeholder:text-zinc-600 transition-all`}
                                placeholder="Create a password"
                            />
                            {errors.password && (
                                <p className="text-sm text-red-400">{errors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Confirm Password</label>
                            <input
                                type="password"
                                name="password_confirmation"
                                value={form.password_confirmation}
                                onChange={handleChange}
                                className={`w-full bg-[#0a0a0a] border ${errors.password_confirmation ? 'border-red-500' : 'border-zinc-800'} text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 placeholder:text-zinc-600 transition-all`}
                                placeholder="Confirm your password"
                            />
                            {errors.password_confirmation && (
                                <p className="text-sm text-red-400">{errors.password_confirmation}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="text-center text-sm text-zinc-500 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-red-400 hover:text-red-300 font-medium">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify the file is created** (will compile in next task)

---

## Task 3: Update App.jsx with Register Route

**Files:**
- Modify: `web/src/App.jsx`

**Interfaces:**
- Consumes: `<Register />` component
- Produces: Updated routing with `/register` path

- [ ] **Step 1: Update App.jsx**

Replace file content with:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Board from './pages/Board';

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute><Board /></PrivateRoute>} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
```

- [ ] **Step 2: Verify routing works** (compile check)

---

## Task 4: Update Board Header with UserMenu

**Files:**
- Modify: `web/src/pages/Board.jsx`

**Interfaces:**
- Consumes: `<UserMenu />` component
- Produces: Updated header layout

- [ ] **Step 1: Add import**

Find the import section (around line 1-7) and add:

```jsx
import UserMenu from '../components/UserMenu';
```

- [ ] **Step 2: Update header layout**

Find the header section (around line 186-239) and modify the right section to include UserMenu:

Replace the button area:
```jsx
{/* Right: Add Button + User Menu */}
<div className="flex items-center gap-3">
    <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-900/30 transition-all duration-200"
    >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span className="hidden sm:inline">Add Application</span>
    </button>
    <UserMenu />
</div>
```

- [ ] **Step 3: Verify Board.jsx compiles**

---

## Task 5: Test

**Verify all flows:**

1. **Register new user:**
   - Navigate to `/register`
   - Fill form and submit
   - Should redirect to `/` with new user logged in

2. **Login with new user:**
   - Log out via UserMenu
   - Navigate to `/login`
   - Login with registered credentials
   - Should redirect to `/`

3. **Logout:**
   - Click avatar to open dropdown
   - Click "Logout"
   - Should clear session, redirect to `/login`

4. **Header layout:**
   - "Add Application" button on left, UserMenu avatar on right
   - No visual overlap or collision

---

## Summary

| Task | Deliverable |
|------|-------------|
| 1 | `UserMenu.jsx` — avatar dropdown with logout |
| 2 | `Register.jsx` — registration form page |
| 3 | `App.jsx` — `/register` route |
| 4 | `Board.jsx` — UserMenu in header |
| 5 | Manual testing of all flows |