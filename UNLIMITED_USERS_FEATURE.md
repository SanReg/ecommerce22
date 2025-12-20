# Unlimited User Subscription System

## Overview
Complete subscription system for unlimited users with daily credits, expiring subscriptions, and admin management.

## Key Features

### User Level
- **Unlimited Status**: Users can be marked as unlimited by admin
- **Daily Credits**: Fixed number of credits allocated each day (resets at GMT 0:00)
- **Daily Tracking**: Shows available daily credits vs used
- **Subscription Days**: Countdown of remaining subscription days
- **Auto Revert**: Automatically becomes normal user when subscription ends
- **Status Display**: Banner on dashboard showing unlimited status and details

### Admin Level
- **Dedicated Tab**: "Unlimited Users" tab in admin panel
- **User Management**: Convert regular users to unlimited with custom settings
- **Settings Editor**: Modify daily credits and subscription days anytime
- **Private Notes**: Add long admin-only notes for each unlimited user
- **Daily Orders View**: See all orders placed by unlimited user today (GMT-based)
- **Usage Tracking**: Monitor daily credits used vs available
- **Bulk Reset**: Manual daily reset trigger endpoint

## Database Schema

### User Model Updates
```javascript
isUnlimited: Boolean (default: false)
unlimitedSettings: {
  dailyCredits: Number,
  subscriptionDaysRemaining: Number,
  subscriptionStartDate: Date,
  creditsResetAt: Date,
  dailyCreditsUsedToday: Number
}
adminPrivateNotes: String
```

## API Endpoints

### Unlimited User Management

#### Get All Unlimited Users
```
GET /api/unlimited/users
Authorization: Bearer <admin_token>

Response:
[
  {
    _id: "...",
    username: "user",
    email: "user@example.com",
    checks: 0,
    isUnlimited: true,
    unlimitedSettings: {...},
    adminPrivateNotes: "..."
  }
]
```

#### Get Specific Unlimited User Details
```
GET /api/unlimited/users/:id
Authorization: Bearer <admin_token>

Response:
{
  user: { _id, username, email, checks, createdAt, adminPrivateNotes },
  unlimited: {
    dailyCredits: 5,
    subscriptionDaysRemaining: 30,
    subscriptionStartDate: "...",
    creditsResetAt: "...",
    dailyCreditsUsedToday: 2,
    dailyCreditsAvailable: 3
  },
  todayOrders: [{ _id, book, checksUsed, status, createdAt }]
}
```

#### Convert User to Unlimited
```
POST /api/unlimited/users/:id/make-unlimited
Authorization: Bearer <admin_token>
Content-Type: application/json

Body:
{
  dailyCredits: 5,
  subscriptionDays: 30
}

Response:
{
  message: "User converted to unlimited successfully",
  user: { username, email, isUnlimited, unlimitedSettings }
}
```

#### Update Unlimited Settings
```
PUT /api/unlimited/users/:id/unlimited
Authorization: Bearer <admin_token>
Content-Type: application/json

Body:
{
  dailyCredits: 10,      // Optional
  subscriptionDays: 60   // Optional
}
```

#### Update Admin Notes
```
PUT /api/unlimited/users/:id/notes
Authorization: Bearer <admin_token>
Content-Type: application/json

Body:
{
  notes: "Long admin-only note..."
}
```

#### Revert to Normal User
```
POST /api/unlimited/users/:id/revert-unlimited
Authorization: Bearer <admin_token>
```

#### Daily Reset (Maintenance)
```
POST /api/unlimited/daily-reset
Authorization: Bearer <admin_token>

Response:
{
  message: "Daily reset completed",
  processed: 45,
  convertedToNormal: 3
}
```

## How It Works

### Daily Credit System
1. **Reset Time**: GMT 0:00 every day
2. **Reset Process**:
   - `dailyCreditsUsedToday` resets to 0
   - `creditsResetAt` updates to next day's GMT 0:00
   - `subscriptionDaysRemaining` decrements by 1
   - If days ≤ 0: User reverted to normal status

3. **Usage Tracking**:
   - When unlimited user creates order, credits deducted from both:
     - Regular `checks` balance (if any)
     - `dailyCreditsUsedToday` counter
   - `dailyCreditsAvailable` = `dailyCredits` - `dailyCreditsUsedToday`

### Automatic Resets
Resets happen automatically when user calls:
- `GET /api/checks/balance` (at login or page load)
- Any API request requiring checks

Manual reset available at `/api/unlimited/daily-reset` (admin only)

## User Dashboard Display

### Unlimited Status Banner
When unlimited user logs in, they see:
```
⭐ Unlimited User | Daily Credits: 3/5 | 30 days remaining | Resets at [DATE/TIME]
```

Shows:
- Current day's available/total credits
- Days remaining in subscription
- Next reset time (GMT)

## Admin Dashboard Features

### Unlimited Users Tab

**User List Table**:
- Username, Email
- Daily Credits Allocated
- Days Remaining (red highlight if ≤ 5 days)
- Next Reset Time
- View Button → Opens detailed modal

**Convert User Form**:
- Select regular user from dropdown
- Enter daily credits
- Enter subscription days
- "Make Unlimited" button

**Detailed User Modal**:

1. **User Info Section**:
   - Email, Regular Checks Balance, Member Since

2. **Unlimited Status Section**:
   - Daily Credits: 5
   - Days Remaining: 30 days
   - Today's Usage: 2 / 5
   - Available Today: 3
   - Next Reset: [GMT TIME]

3. **Admin Notes Section**:
   - Large textarea for long notes
   - Only visible to admins
   - Auto-save button

4. **Update Subscription Section**:
   - Input fields for daily credits
   - Input field for days remaining
   - Update button to apply changes

5. **Today's Orders (GMT-based)**:
   - Table showing all orders from today
   - Service name, credits used, status, timestamp
   - Empty state if no orders

6. **Revert Button**:
   - Confirmation dialog
   - Removes unlimited status
   - Resets all unlimited settings

## Scheduling Daily Reset

For production, set up a cron job to call the reset endpoint daily at GMT 0:00:

### Using Node-Cron (Recommended)
```javascript
const cron = require('node-cron');

// At GMT 0:00 every day
cron.schedule('0 0 * * *', async () => {
  try {
    const response = await fetch('http://localhost:5000/api/unlimited/daily-reset', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Daily reset completed:', await response.json());
  } catch (error) {
    console.error('Daily reset failed:', error);
  }
});
```

### Using External Service
- Use services like EasyCron, AWS Lambda, or similar
- Call `/api/unlimited/daily-reset` endpoint daily at GMT 0:00

## Time Considerations

- **GMT 0:00 Reset**: Fixed time, accounts for timezone differences
- **User View**: All times shown in user's local timezone
- **Admin View**: Times shown in both local and GMT
- **Order Tracking**: Based on GMT day boundaries

## Security

- Only admins can access `/api/unlimited` endpoints
- Admin notes never sent to frontend user code
- Daily credits cannot exceed configured amount
- Subscription days only managed by admin

## Testing Workflow

1. **Create Unlimited User** (Admin):
   - Go to Unlimited Users tab
   - Select user from dropdown
   - Set dailyCredits = 5, subscriptionDays = 30
   - Click "Make Unlimited"

2. **View Details** (Admin):
   - Click "View" button next to user
   - See all unlimited settings
   - Add admin notes
   - View today's orders

3. **Update Settings** (Admin):
   - In detail modal, change daily credits or days
   - Click "Update" to apply

4. **Test Daily Usage** (Admin):
   - See dashboard shows: Available: 5/5
   - User creates order (uses 2 credits)
   - Dashboard updates: Available: 3/5

5. **Add Notes** (Admin):
   - Type long note in textarea
   - Click "Save Notes"
   - Note persists and is only admin-visible

6. **Manual Reset** (Admin):
   - Call `/api/unlimited/daily-reset` endpoint
   - Processes all unlimited users
   - Returns count of processed users

7. **Revert User** (Admin):
   - Click "Revert to Normal User" button
   - Confirmation dialog
   - User becomes normal, unlimited status removed

## Files Modified

✅ Backend:
- `backend/models/User.js` - Added unlimited fields
- `backend/routes/unlimited.js` - New routes file
- `backend/routes/checks.js` - Added unlimited handling
- `backend/routes/orders.js` - Track daily usage
- `backend/server.js` - Added unlimited route

✅ Admin Frontend:
- `frontend/admin/dashboard.html` - Added unlimited tab
- `frontend/admin/admin.js` - Complete management system

✅ User Frontend:
- `frontend/index.html` - Added unlimited status notice
- `frontend/js/app.js` - Display unlimited status

## Future Enhancements

- Rollover unused daily credits to next day
- Partial day refunds
- Unlimited plan tiers
- Family/team subscriptions
- Credit usage analytics
- Email alerts when subscription ending soon
