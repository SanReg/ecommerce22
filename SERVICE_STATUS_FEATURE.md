# Service Status Toggle Feature

## Overview
This feature allows admins to toggle service status (online/offline) which displays a prominent notice to all logged-in users.

## Components Created

### Backend
1. **Model**: `backend/models/ServiceStatus.js`
   - Stores service status (isOnline: boolean)
   - Tracks updatedAt timestamp
   - Records updatedBy (admin user ID)

2. **Routes**: `backend/routes/serviceStatus.js`
   - `GET /api/service/status` - Get current status (authenticated users)
   - `PUT /api/service/status` - Update status (admin only)

3. **Server**: Added route to `backend/server.js`
   - `app.use('/api/service', require('./routes/serviceStatus'))`

### Frontend - Admin Panel

**File**: `frontend/admin/dashboard.html`
- Added new "Service Status" tab
- Toggle switch with visual states:
  - ✅ Green when online
  - ❌ Red when offline
- Live preview of user-visible notice

**File**: `frontend/admin/admin.js`
- `loadServiceStatus()` - Fetches current status
- `updateStatusToggle(isOnline)` - Updates UI based on status
- `toggleServiceStatus(isOnline)` - Sends status update to backend
- Event listener for toggle switch changes

### Frontend - User Dashboard

**File**: `frontend/index.html`
- Added `#serviceStatusNotice` div at top of container
- Styled with gradient backgrounds and borders

**File**: `frontend/js/app.js`
- `checkServiceStatus()` - Fetches status on page load
- `displayServiceStatusNotice(isOnline)` - Shows/updates notice

## Status Messages

### Online (Green 🟢)
```
🟢 All services are online.
```

### Offline (Red 🔴)
```
🔴 We are currently offline. Please wait until we are back in a few hours.
```

## User Experience

1. **Admin**: 
   - Goes to Admin Dashboard → Service Status tab
   - Sees current status and toggle switch
   - Flips toggle to change status
   - Sees confirmation message
   - Preview shows what users will see

2. **User**:
   - Logs into dashboard
   - Immediately sees status notice at top
   - Notice is prominent with color-coded styling
   - Green = services available
   - Red = services temporarily unavailable

## Technical Details

### Default State
- Service status defaults to **online** (true)
- If no status exists in database, creates one on first GET request

### Security
- Only admins can update status (PUT endpoint)
- All authenticated users can view status (GET endpoint)
- Uses JWT authentication middleware

### Styling
- Toggle switch: Custom CSS with smooth transitions
- Notice: Gradient backgrounds with backdrop blur
- Mobile responsive
- Color-coded for quick recognition

## API Examples

### Get Status (User)
```javascript
GET /api/service/status
Headers: { Authorization: "Bearer <token>" }

Response:
{
  "isOnline": true,
  "updatedAt": "2024-12-20T10:30:00.000Z"
}
```

### Update Status (Admin)
```javascript
PUT /api/service/status
Headers: { 
  Authorization: "Bearer <admin_token>",
  Content-Type: "application/json"
}
Body: { "isOnline": false }

Response:
{
  "message": "Service status updated successfully",
  "isOnline": false,
  "updatedAt": "2024-12-20T10:35:00.000Z"
}
```

## Files Modified

✅ Backend:
- `backend/server.js` - Added service status route
- `backend/models/ServiceStatus.js` - New model
- `backend/routes/serviceStatus.js` - New routes

✅ Admin Frontend:
- `frontend/admin/dashboard.html` - Added tab and toggle UI
- `frontend/admin/admin.js` - Added status functions

✅ User Frontend:
- `frontend/index.html` - Added notice container
- `frontend/js/app.js` - Added status check functions

## Testing Steps

1. **Start Server**: `npm start`
2. **Login as Admin**: admin@example.com / admin123
3. **Go to Service Status Tab**
4. **Toggle Status**: Switch between on/off
5. **Login as User**: john@example.com / john123
6. **Verify Notice**: Check if notice appears at top
7. **Change Status**: Toggle in admin panel
8. **Refresh User Page**: Notice should update

## Future Enhancements

- [ ] Add scheduled status changes
- [ ] Custom offline message
- [ ] Maintenance mode with countdown timer
- [ ] Email notifications when status changes
- [ ] Status change history/logs
- [ ] Multiple status types (maintenance, partial outage, etc.)
