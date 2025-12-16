# Ecommerce Site with Virtual Currency System

A complete full-stack ecommerce application built with Node.js, MongoDB, and vanilla JavaScript. Features user authentication, virtual currency ("Checks"), product ordering, and file uploads with a comprehensive admin panel.

## Key Features

✅ **User Authentication** - Simple register/login without OTP
✅ **Virtual Currency** - Redeem codes to get "Checks" for purchasing
✅ **Product Ordering** - Buy "Books" using checks
✅ **File Uploads** - Users upload files with orders, admins respond with files
✅ **Admin Dashboard** - Full order management and user analytics
✅ **Responsive Design** - Works on desktop and mobile

## Quick Start

```bash
# Install dependencies
npm install

# Seed database with demo data
npm run seed

# Start server
npm start
```

Server runs on **http://localhost:5000**

### Demo Accounts
- Admin: `admin@example.com` / `admin123`
- User: `john@example.com` / `john123`

## Project Structure

```
eCommerceCredit/
├── backend/
│   ├── models/              # MongoDB schemas (User, Book, Order, RedemptionCode)
│   ├── routes/              # API endpoints
│   │   ├── auth.js          # Register/Login
│   │   ├── products.js      # Browse books
│   │   ├── orders.js        # Create orders
│   │   ├── checks.js        # Redeem codes
│   │   └── admin.js         # Admin management
│   ├── middleware/          # JWT authentication
│   ├── uploads/             # File storage
│   └── server.js            # Express app
├── frontend/
│   ├── index.html           # User dashboard
│   ├── login.html           # Login page
│   ├── register.html        # Registration page
│   ├── admin/dashboard.html # Admin panel
│   ├── css/style.css        # Styling
│   └── js/                  # Client-side scripts
└── package.json
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Checks
- `GET /api/checks/balance` - Get check balance
- `POST /api/checks/redeem` - Redeem code for checks

### Products
- `GET /api/products` - List all books

### Orders
- `POST /api/orders/create` - Create order with file upload
- `GET /api/orders/my-orders` - Get user's orders

### Admin
- `GET /api/admin/orders` - All orders
- `PUT /api/admin/orders/:id/complete` - Complete order
- `POST /api/admin/orders/:id/upload` - Upload response file
- `GET /api/admin/users` - All users with checks

## User Workflow

1. **Register** → Create account
2. **Redeem Code** → Get virtual currency (Checks)
3. **Browse Books** → View available products
4. **Purchase** → Upload file with order
5. **Track** → Monitor order status and admin response

## Admin Workflow

1. **Login** as admin
2. **View Orders** → See all pending orders
3. **Manage Orders** → Mark as complete, upload response files
4. **Monitor Users** → Check user balances and order history

## Technology Stack

- **Backend:** Node.js, Express.js, Mongoose
- **Database:** MongoDB
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Authentication:** JWT
- **File Upload:** Cloudinary (SDK) with Express-fileupload
- **Password Security:** bcryptjs

## Configuration

Update `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_secure_secret_key
NODE_ENV=development
PORT=5000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Database Models

### User
- username, email, password (hashed)
- checks (virtual currency balance)
- isAdmin (boolean)

### Book
- title, author, description
- price (in checks)

### Order
- user reference
- book reference
- checksUsed
- userFile (Cloudinary: filename, url, public_id, uploadedAt)
- adminFile (Cloudinary: filename, url, public_id, uploadedAt)
- status (pending/completed)

### RedemptionCode
- code (unique)
- checks value
- isUsed, usedBy, usedAt

## Security Notes

For production deployment:
- Update JWT_SECRET to strong random value
- Implement email verification
- Add rate limiting
- Use HTTPS
- Add input validation/sanitization
- Implement proper error handling
- Add database backups
- Use environment-specific configs

## Features in Detail

### Registration & Login
- No email verification required
- Password hashing with bcryptjs
- JWT token-based authentication
- 7-day token expiry

### Redemption System
- Enter codes to earn checks
- Demo codes: WELCOME100, BONUS50, SUMMER25, SPECIAL200, NEW75
- Each code can only be used once per user
- Real-time balance updates

### Shopping System
- Browse all available books
- Upload any file type with order
- Deduct checks from balance on purchase
- Track order completion status

### Order Management (Admin)
- View all orders with user and book details
- Mark orders as complete
- Upload response files for each order
- Download both user and admin files

### User Analytics (Admin)
- View all users and their check balances
- See each user's order count
- Track completed vs pending orders
- Quick access to user order history

## Customization

### Add More Books
Modify `backend/seed.js` to add books, then run:
```bash
npm run seed
```

### Add Redemption Codes
Add new codes in `backend/seed.js` redemption codes section

### Customize Styling
Edit `frontend/css/style.css` for colors, fonts, layout

## Troubleshooting

**MongoDB Connection Error**
- Ensure MongoDB is running on localhost:27017
- Update `MONGODB_URI` in `.env`

**Port Already in Use**
- Change `PORT` in `.env` or kill process using that port

**File Upload Not Working**
- Ensure Cloudinary env vars are set and valid
- Verify network access to Cloudinary API

## See Also

- [Getting Started Guide](GETTING_STARTED.md) - Detailed setup instructions
- [API Documentation](API.md) - Complete API reference

## License

MIT

## Author

Created as a full-stack ecommerce demonstration project.

