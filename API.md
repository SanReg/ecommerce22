# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication Endpoints

### Register User
```
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword"
}

Response: 201 Created
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "checks": 0,
    "isAdmin": false
  }
}
```

### Login User
```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}

Response: 200 OK
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "checks": 100,
    "isAdmin": false
  }
}
```

## Checks & Redemption Endpoints

### Get Checks Balance
```
GET /checks/balance
Authorization: Bearer <token>

Response: 200 OK
{
  "checks": 150
}
```

### Redeem Code
```
POST /checks/redeem
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "WELCOME100"
}

Response: 200 OK
{
  "message": "Code redeemed successfully",
  "checksAdded": 100,
  "totalChecks": 250
}
```

## Product Endpoints

### Get All Books
```
GET /products

Response: 200 OK
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "JavaScript for Beginners",
    "author": "John Doe",
    "description": "Learn JavaScript from scratch",
    "price": 50,
    "quantity": -1
  },
  ...
]
```

### Get Single Book
```
GET /products/:id

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "JavaScript for Beginners",
  "author": "John Doe",
  "description": "Learn JavaScript from scratch",
  "price": 50,
  "quantity": -1
}
```

## Order Endpoints

### Create Order (with File Upload)
```
POST /orders/create
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- bookId: "507f1f77bcf86cd799439011"
- file: <file_object> (optional)

Response: 201 Created
{
  "message": "Order created successfully",
  "order": {
    "id": "507f1f77bcf86cd799439012",
    "bookTitle": "JavaScript for Beginners",
    "checksUsed": 50,
    "status": "pending",
    "userFileUploaded": true
  }
}
```

### Get User's Orders
```
GET /orders/my-orders
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "user": "507f1f77bcf86cd799439011",
    "book": {
      "_id": "507f1f77bcf86cd799439010",
      "title": "JavaScript for Beginners",
      "author": "John Doe",
      "price": 50
    },
    "checksUsed": 50,
    "userFile": {
      "filename": "assignment.pdf",
      "url": "https://res.cloudinary.com/<cloud>/.../assignment.pdf",
      "public_id": "ecommerce-orders/abc123",
      "uploadedAt": "2024-12-15T10:00:00.000Z"
    },
    "adminFile": {
      "filename": "feedback.pdf",
      "url": "https://res.cloudinary.com/<cloud>/.../feedback.pdf",
      "public_id": "ecommerce-orders/def456",
      "uploadedAt": "2024-12-15T10:05:00.000Z"
    },
    "status": "completed",
    "completedAt": "2024-12-15T10:05:00.000Z",
    "createdAt": "2024-12-15T10:00:00.000Z"
  },
  ...
]
```

### Get Order Details
```
GET /orders/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439012",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com"
  },
  "book": {
    "_id": "507f1f77bcf86cd799439010",
    "title": "JavaScript for Beginners",
    "author": "John Doe",
    "price": 50
  },
  "checksUsed": 50,
  "userFile": { ... },
  "adminFile": { ... },
  "status": "completed",
  "completedAt": "2024-12-15T10:05:00.000Z",
  "createdAt": "2024-12-15T10:00:00.000Z"
}
```

## Admin Endpoints

### Get All Orders (Admin Only)
```
GET /admin/orders
Authorization: Bearer <admin_token>

Response: 200 OK
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "john@example.com",
      "checks": 100
    },
    "book": {
      "_id": "507f1f77bcf86cd799439010",
      "title": "JavaScript for Beginners",
      "author": "John Doe",
      "price": 50
    },
    "checksUsed": 50,
    "userFile": { ... },
    "adminFile": null,
    "status": "pending",
    "createdAt": "2024-12-15T10:00:00.000Z"
  },
  ...
]
```

### Mark Order as Complete
```
PUT /admin/orders/:id/complete
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "message": "Order marked as completed",
  "order": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "completed",
    "completedAt": "2024-12-15T10:05:00.000Z",
    ...
  }
}
```

### Upload File for Order (Admin Only)
```
POST /admin/orders/:id/upload
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- file: <file_object>

Response: 200 OK
{
  "message": "File uploaded successfully",
  "adminFile": {
    "filename": "feedback.pdf",
    "url": "https://res.cloudinary.com/<cloud>/.../feedback.pdf",
    "public_id": "ecommerce-orders/def456",
    "uploadedAt": "2024-12-15T10:05:00.000Z"
  }
}
```

### Get All Users (Admin Only)
```
GET /admin/users
Authorization: Bearer <admin_token>

Response: 200 OK
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "checks": 100,
    "isAdmin": false,
    "createdAt": "2024-12-15T09:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "username": "jane_doe",
    "email": "jane@example.com",
    "checks": 50,
    "isAdmin": false,
    "createdAt": "2024-12-15T09:30:00.000Z"
  },
  ...
]
```

### Get User Details with Orders (Admin Only)
```
GET /admin/users/:id
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "checks": 100,
    "isAdmin": false,
    "createdAt": "2024-12-15T09:00:00.000Z"
  },
  "orders": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "book": {
        "_id": "507f1f77bcf86cd799439010",
        "title": "JavaScript for Beginners",
        "author": "John Doe",
        "price": 50
      },
      "checksUsed": 50,
      "status": "completed"
    }
  ],
  "totalOrdersCount": 1,
  "completedOrdersCount": 1
}
```

## Error Responses

### 400 Bad Request
```json
{
  "message": "Error description"
}
```

### 401 Unauthorized
```json
{
  "message": "No token provided"
}
```

### 403 Forbidden
```json
{
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Server Error
```json
{
  "message": "Server error",
  "error": "Error description"
}
```

## Authentication

All protected endpoints require the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

The token is received upon login or registration and is valid for 7 days.

## Common Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## File Upload Limits

- Max file size: Typically 10MB (configurable in multer)
- Allowed types: Any file type accepted by default
- Storage location: Cloudinary (folder `ecommerce-orders`)
- Access URL: Cloudinary `secure_url`

## Rate Limiting

Currently no rate limiting implemented. For production, add:
- express-rate-limit
- Limit login attempts
- Limit API requests per user

## CORS

Currently accepts requests from all origins. For production:
- Configure specific domains in CORS middleware
- Use environment-specific settings
