# Manual Test Checklist - Admin Notification Preferences

## Backend Tests

### 1. Admin Model - Notification Preferences Field
- [ ] **Test**: Create a new admin and verify `notificationPreferences` field exists
  - Expected: Field exists with default values matching frontend defaults
  - Check: `account.New login = true`, `account.Password change = true`, `customers.New reviews = true`, etc.

- [ ] **Test**: Query an existing admin without `notificationPreferences`
  - Expected: Field should be `undefined` or null (migration handles defaults in service layer)

### 2. Repository Methods
- [ ] **Test**: `adminRepository.getNotificationPreferences(adminId)`
  - With existing preferences: Returns the stored preferences
  - With no preferences: Returns empty object `{}`
  - With invalid adminId: Throws error

- [ ] **Test**: `adminRepository.updateNotificationPreferences(adminId, preferences)`
  - Updates preferences successfully
  - Returns updated admin document with new preferences
  - With invalid adminId: Returns null

### 3. API Endpoints
- [ ] **Test**: GET `/api/settings/notification-preferences`
  - With valid admin token: Returns `{preferences: {...}}`
  - Without authentication: Returns 401 Unauthorized
  - With non-admin token: Returns 403 Forbidden

- [ ] **Test**: PUT `/api/settings/notification-preferences`
  - Update preferences successfully: Returns `{preferences: {...}}` with updated values
  - Invalid preference structure: Should accept and store (flexible schema)
  - Without authentication: Returns 401 Unauthorized
  - With non-admin token: Returns 403 Forbidden

### 4. Notification Service - Preference Checking
- [ ] **Test**: `notificationService.createForAdmin()` with `preferenceKey` enabled
  - Preference set to `true`: Notification is created
  - Preference set to `false`: Notification is NOT created (returns null)
  - Preference missing: Notification is created (default behavior)
  - Without `preferenceKey` parameter: Notification is created (backward compatibility)

- [ ] **Test**: Error handling in preference checking
  - Admin not found: Logs error, defaults to creating notification
  - Database error: Logs error, defaults to creating notification

### 5. Integration - Stock Movement Service
- [ ] **Test**: Low stock notification with preference enabled
  - Set `inventory.Low stock alerts = true`
  - Reduce stock below threshold (10)
  - Expected: Admin receives low stock notification

- [ ] **Test**: Low stock notification with preference disabled
  - Set `inventory.Low stock alerts = false`
  - Reduce stock below threshold (10)
  - Expected: Admin does NOT receive low stock notification

### 6. Integration - Review Service
- [ ] **Test**: New review notification with preference enabled
  - Set `customers.New reviews = true`
  - Customer submits a review
  - Expected: Admin receives "New review awaiting approval" notification

- [ ] **Test**: New review notification with preference disabled
  - Set `customers.New reviews = false`
  - Customer submits a review
  - Expected: Admin does NOT receive notification

- [ ] **Test**: Customer reply notification with preference enabled
  - Set `customers.Customer replies = true`
  - Customer replies to a review
  - Expected: Admin receives "Customer replied to a review" notification

- [ ] **Test**: Customer reply notification with preference disabled
  - Set `customers.Customer replies = false`
  - Customer replies to a review
  - Expected: Admin does NOT receive notification

### 7. Integration - Support Service
- [ ] **Test**: New chat message notification with preference enabled
  - Set `customers.New chat messages = true`
  - Customer sends support message
  - Expected: Admin receives "New support message" notification

- [ ] **Test**: New chat message notification with preference disabled
  - Set `customers.New chat messages = false`
  - Customer sends support message
  - Expected: Admin does NOT receive notification

## Frontend Tests

### 8. API Integration
- [ ] **Test**: Load preferences on component mount
  - Component loads and calls `getNotificationPreferences()`
  - Toggles reflect backend state
  - Loading state shown during fetch

- [ ] **Test**: Fallback to localStorage on API error
  - Block API call (network error)
  - Component falls back to localStorage values
  - Console error logged

- [ ] **Test**: Update preferences on toggle
  - Toggle a switch ON
  - API call to `updateNotificationPreferences()` made
  - Backend state updated
  - Local state updated immediately for responsiveness

- [ ] **Test**: Handle API error on update
  - Toggle a switch while API is down
  - Local state updates (localStorage)
  - Console error logged
  - Backend not updated (retry works on next successful toggle)

### 9. UI/UX
- [ ] **Test**: Toggle states match backend
  - Toggle "Low stock alerts" to OFF in backend
  - Refresh page
  - Expected: Toggle shows OFF state

- [ ] **Test**: Toggle all sections
  - Test each section: Account, Reports, Customers, Inventory, Pre-orders
  - Toggle each item ON and OFF
  - Verify state persists after page refresh

- [ ] **Test**: Default values
  - New admin with no preferences
  - Expected: All items show default values (some ON, some OFF per frontend config)

### 10. TypeScript Types
- [ ] **Test**: Type safety
  - `NotificationPreferences` type matches backend structure
  - No TypeScript errors in API calls
  - IntelliSense works for preference keys

## End-to-End Scenarios

### 11. Complete Flow - Disable Low Stock Alerts
1. Login as admin
2. Navigate to Settings → Notifications → Inventory
3. Toggle "Low stock alerts" to OFF
4. Reduce product stock below 10
5. Check admin notifications
6. Expected: No low stock notification received

### 12. Complete Flow - Enable New Reviews
1. Login as admin
2. Navigate to Settings → Notifications → Customers
3. Toggle "New reviews" to ON
4. Login as customer and submit a review
5. Check admin notifications
6. Expected: "New review awaiting approval" notification received

### 13. Complete Flow - Toggle Customer Replies
1. Login as admin
2. Navigate to Settings → Notifications → Customers
3. Toggle "Customer replies" to OFF
4. Customer replies to a review
5. Check admin notifications
6. Expected: No notification received
7. Toggle "Customer replies" to ON
8. Customer replies again
9. Expected: Notification received

### 14. Complete Flow - Support Messages
1. Login as admin
2. Navigate to Settings → Notifications → Customers
3. Toggle "New chat messages" to OFF
4. Customer sends support message
5. Check admin notifications
6. Expected: No notification received
7. Toggle "New chat messages" to ON
8. Customer sends another message
9. Expected: Notification received

### 15. Data Migration
- [ ] **Test**: Existing admin without preferences
  - Query existing admin created before this feature
  - Call `getNotificationPreferences()`
  - Expected: Returns empty object `{}`
  - Frontend should show default values

### 16. Cross-Device Sync
- [ ] **Test**: Preferences sync across devices
  - Update preferences on Device A
  - Login on Device B
  - Expected: Preferences match Device A

### 17. Multiple Admins
- [ ] **Test**: Each admin has independent preferences
  - Admin A disables "Low stock alerts"
  - Admin B keeps "Low stock alerts" enabled
  - Reduce stock below threshold
  - Expected: Only Admin B receives notification

## Edge Cases

### 18. Error Scenarios
- [ ] **Test**: Database connection failure during preference check
  - Simulate DB down
  - Trigger notification
  - Expected: Notification created (fallback to enabled)

- [ ] **Test**: Invalid preference key format
  - Pass malformed preferenceKey (e.g., "invalid.format")
  - Expected: Notification created (preference check fails gracefully)

- [ ] **Test**: Preference object with missing sections
  - Backend returns partial preferences (only some sections)
  - Expected: Frontend shows defaults for missing sections

### 19. Performance
- [ ] **Test**: Preference check overhead
  - Create 100 notifications with preference checking
  - Measure response time
  - Expected: Minimal overhead (<50ms per notification)

### 20. Backward Compatibility
- [ ] **Test**: Existing notification calls without preferenceKey
  - Verify all existing `createForAdmin()` calls still work
  - Notifications created even without preference checking
  - No breaking changes to existing functionality

## Browser/Environment Tests

### 21. Different Browsers
- [ ] **Test**: Chrome
- [ ] **Test**: Firefox
- [ ] **Test**: Safari
- [ ] **Test**: Edge

### 22. Mobile Responsiveness
- [ ] **Test**: iOS Safari
- [ ] **Test**: Android Chrome
- [ ] **Test**: Toggle switches work on touch devices

### 23. Private/Incognito Mode
- [ ] **Test**: localStorage fallback works in private mode
- [ ] **Test**: API calls still work in private mode

## Success Criteria

All tests passing means:
- ✅ Notification preferences stored in database
- ✅ API endpoints working correctly
- ✅ Frontend toggles control backend notification creation
- ✅ Low stock, new reviews, customer replies, and chat messages respect preferences
- ✅ Fallback mechanisms work on errors
- ✅ Backward compatibility maintained
- ✅ UI/UX smooth and responsive
