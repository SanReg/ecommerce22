<!-- Ecommerce Credit Application - GitHub Copilot Instructions -->

## Project Overview
This is a complete full-stack ecommerce application with Node.js backend, MongoDB database, and vanilla JavaScript frontend including an admin panel.

## Quick Navigation
- **Main Docs:** See [README.md](../README.md) for overview
- **Getting Started:** See [GETTING_STARTED.md](../GETTING_STARTED.md) for setup instructions
- **API Docs:** See [API.md](../API.md) for endpoint documentation
- **Implementation:** See [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) for detailed feature list

## Key Features
1. ✅ User authentication (register/login, no OTP)
2. ✅ Virtual currency system ("Checks")
3. ✅ Code redemption for currency
4. ✅ Product ordering with file uploads
5. ✅ Admin panel for order management
6. ✅ User check balance tracking

## Project Structure
```
backend/      - Express server, routes, models, middleware
frontend/     - HTML pages, JavaScript, CSS, admin panel
package.json  - Dependencies configuration
.env         - Environment variables (MONGODB_URI, JWT_SECRET, PORT)
```

## Recent Work
- ✅ All backend routes implemented
- ✅ MongoDB models created
- ✅ Frontend pages built (login, register, dashboard)
- ✅ Admin dashboard implemented
- ✅ Database seed script created

## Next Steps (if needed)
1. Test all API endpoints
2. Deploy to production
3. Add email notifications
4. Implement payment gateway
5. Add advanced analytics

## Development Commands
```bash
npm install          # Install dependencies
npm run seed        # Seed database with demo data
npm start           # Start production server
npm run dev         # Start with auto-reload (needs nodemon)
```

## Architecture Notes
- **Auth:** JWT tokens, 7-day expiry
- **Roles:** Admin and User
- **Files:** Stored in `/backend/uploads/`, served at `/uploads/`
- **Database:** MongoDB with Mongoose ODM
- **Frontend:** No frameworks, vanilla JS for simplicity

## Important Files to Modify
- Backend logic: `/backend/routes/*.js`
- Frontend logic: `/frontend/js/app.js` and `/frontend/admin/admin.js`
- Styling: `/frontend/css/style.css`
- Database models: `/backend/models/*.js`
- Demo data: `/backend/seed.js`

## Testing Credentials
- Admin: admin@example.com / admin123
- User: john@example.com / john123
- Codes: WELCOME100, BONUS50, SUMMER25, SPECIAL200, NEW75

## Common Issues & Solutions
1. **MongoDB not found** → Start MongoDB or update MONGODB_URI in .env
2. **Port in use** → Change PORT in .env
3. **Dependencies missing** → Run npm install again
4. **File upload failing** → Check /backend/uploads/ exists and is writable

## Security Checklist
- [ ] Change JWT_SECRET in production
- [ ] Enable HTTPS
- [ ] Add input validation
- [ ] Add rate limiting
- [ ] Implement CORS restrictions
- [ ] Add email verification
- [ ] Setup database backups
- [ ] Add logging and monitoring

## Resources
- [Express.js Docs](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [JWT.io](https://jwt.io/)
- [Mongoose Docs](https://mongoosejs.com/)
