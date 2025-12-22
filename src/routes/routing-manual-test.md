# Manual Routing Test Guide

This document provides manual testing steps to verify the routing implementation works correctly.

## Prerequisites
- Start the development server: `npm run dev`
- Open browser to `http://localhost:5173`

## Test Cases

### 1. Unauthenticated User Routing (Requirements 8.3)
**Expected Behavior**: Unauthenticated users should be redirected to login page when accessing protected routes.

**Steps**:
1. Clear localStorage: `localStorage.clear()` in browser console
2. Navigate to `/dashboard` - should redirect to `/login`
3. Navigate to `/customers` - should redirect to `/login`
4. Navigate to `/invoices` - should redirect to `/login`
5. Navigate to `/company` - should redirect to `/login`
6. Navigate to `/settings` - should redirect to `/login`

### 2. Authenticated User Routing (Requirements 8.4)
**Expected Behavior**: Authenticated users should be redirected away from login/signup pages.

**Steps**:
1. Set mock user in localStorage:
   ```javascript
   localStorage.setItem('user', JSON.stringify({
     id: '1',
     email: 'test@example.com',
     displayName: 'Test User'
   }))
   ```
2. Navigate to `/login` - should redirect to `/dashboard`
3. Navigate to `/signup` - should redirect to `/dashboard`
4. Navigate to `/dashboard` - should show dashboard page
5. Navigate to `/customers` - should show customers page
6. Navigate to `/invoices` - should show invoices page

### 3. Navigation Components (Requirements 8.2)
**Expected Behavior**: Navigation should be available and functional for authenticated users.

**Steps**:
1. Ensure user is authenticated (step 2.1 above)
2. Verify sidebar shows navigation items:
   - Dashboard
   - Customers
   - Invoices
   - Company Profile
   - Settings
3. Click each navigation item and verify correct page loads
4. Verify breadcrumbs appear on non-dashboard pages
5. Verify header shows user information and logout button

### 4. Mobile Navigation
**Expected Behavior**: Mobile menu should work correctly on smaller screens.

**Steps**:
1. Resize browser to mobile width (< 1024px)
2. Verify hamburger menu button appears in header
3. Click hamburger menu - sidebar should slide in
4. Click outside sidebar or close button - sidebar should close
5. Click navigation item - sidebar should close and navigate

### 5. Route Metadata
**Expected Behavior**: Each route should have proper metadata for breadcrumbs and titles.

**Steps**:
1. Navigate to each protected route
2. Verify page title in browser tab matches route metadata
3. Verify breadcrumb text matches route metadata
4. Verify breadcrumb navigation works (click home icon goes to dashboard)

## Expected Results

All test cases should pass without errors. The routing system should:
- ✅ Protect routes based on authentication status
- ✅ Redirect appropriately based on user state
- ✅ Provide working navigation for authenticated users
- ✅ Show proper breadcrumbs and page titles
- ✅ Handle mobile navigation correctly

## Troubleshooting

If tests fail:
1. Check browser console for JavaScript errors
2. Verify localStorage contains expected user data
3. Check network tab for any failed requests
4. Verify all page components are properly imported and exported