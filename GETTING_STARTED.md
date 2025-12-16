# Getting Started

## Prerequisites
- Node.js and npm installed
- MongoDB running locally (or update the connection string in `.env`)

## Installation & Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Setup MongoDB:**
Make sure MongoDB is running. Default connection: `mongodb://localhost:27017/ecommerce`

3. **Seed the database with demo data:**
```bash
npm run seed
```

This creates:
- Admin user (admin@example.com / admin123)
- 2 demo users
- 4 sample books
- 5 redemption codes (WELCOME100, BONUS50, SUMMER25, SPECIAL200, NEW75)

4. **Start the server:**
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Access the Application

- **User Dashboard:** http://localhost:5000
- **Login Page:** http://localhost:5000/login.html
- **Registration:** http://localhost:5000/register.html
- **Admin Dashboard:** http://localhost:5000/admin/dashboard.html

## Demo Accounts

### Admin Account
- Email: `admin@example.com`
- Password: `admin123`

### Regular Users
- Email: `john@example.com` / Password: `john123`
- Email: `jane@example.com` / Password: `jane123`

## Feature Guide

### User Features

1. **Register/Login**
   - Create new account or login with existing credentials
   - No OTP or email verification required

2. **Browse Books**
   - View all available books with prices in "Checks"
   - Each book shows title, author, and description

3. **Redeem Codes**
   - Enter a valid redemption code to get virtual currency
   - Available codes: WELCOME100, BONUS50, SUMMER25, SPECIAL200, NEW75

4. **Buy Books**
   - Use your checks to purchase books
   - Upload a file with your order
   - Track order status (pending/completed)

5. **View Orders**
   - See all your orders
   - View uploaded files
   - Check admin responses

### Admin Features

1. **Manage Orders**
   - View all user orders with complete details
   - Mark orders as completed
   - Upload response files for users
   - View both user-uploaded and admin-uploaded files

2. **View Users**
   - See all registered users
   - Check each user's check balance
   - View user's order history
   - See completed vs pending orders

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Checks & Redemption
- `GET /api/checks/balance` - Get user's check balance
- `POST /api/checks/redeem` - Redeem a code for checks

### Products
- `GET /api/products` - Get all books
- `GET /api/products/:id` - Get single book

### Orders
- `POST /api/orders/create` - Create a new order (with file upload)
- `GET /api/orders/my-orders` - Get user's orders
- `GET /api/orders/:id` - Get single order details

### Admin
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/complete` - Mark order as completed
- `POST /api/admin/orders/:id/upload` - Upload file for order
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user details with orders

## File Uploads

- User files are uploaded to Cloudinary when creating an order
- Admin files are uploaded to Cloudinary after order completion
- Files are stored in Cloudinary under folder `ecommerce-orders`
- File URLs are returned as Cloudinary `secure_url`

## Technology Stack

- **Backend:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Authentication:** JWT tokens
- **File Upload:** Express-fileupload
- **Password Hashing:** bcryptjs

## Project Structure

```
eCommerceCredit/
├── backend/
│   ├── models/              # MongoDB schemas
│   │   ├── User.js
│   │   ├── Book.js
│   │   ├── Order.js
│   │   └── RedemptionCode.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── checks.js
│   │   └── admin.js
│   ├── middleware/          # Authentication middleware
│   │   └── auth.js
│   ├── uploads/             # File storage
│   ├── server.js            # Main server
│   └── seed.js              # Database seeding script
├── frontend/
│   ├── css/
│   │   └── style.css        # Main stylesheet
│   ├── js/
│   │   └── app.js           # User dashboard script
│   ├── admin/
│   │   ├── dashboard.html   # Admin dashboard
│   │   └── admin.js         # Admin panel script
│   ├── index.html           # User dashboard
│   ├── login.html           # Login page
│   └── register.html        # Registration page
├── package.json
├── .env                     # Environment configuration
└── README.md
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env`
- Default: `mongodb://localhost:27017/ecommerce`

### Port Already in Use
- Change `PORT` in `.env` (default: 5000)
- Or kill the process using the port

### Modules Not Found
- Run `npm install` again
- Delete `node_modules` and run `npm install` fresh

### File Upload Issues
- Ensure `/backend/uploads` directory exists
- Check file permissions
- Verify disk space

## Security Notes

⚠️ **This is a demo application. For production:**
- Change JWT_SECRET in `.env` to a strong, random value
- Use environment-specific configs
- Add rate limiting to prevent brute force
- Implement email verification
- Use HTTPS
- Add CORS restrictions
- Implement input validation and sanitization
- Add comprehensive logging
- Setup proper error handling

## Support

For issues or questions, check the code comments and error messages in the browser console and server logs.
