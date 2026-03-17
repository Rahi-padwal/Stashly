# JWT Authentication Implementation Guide

## ✅ Implementation Complete

This document summarizes the JWT authentication implementation for your NestJS backend.

## What Was Implemented

### 1. **JWT Strategy and Guard**
- **File**: `src/auth/strategies/jwt.strategy.ts`
  - Extracts JWT from Authorization header (Bearer token)
  - Validates token signature using JWT_SECRET
  - Injects userId and email into request object
  
- **File**: `src/auth/guards/jwt-auth.guard.ts`
  - Reusable guard for protecting routes
  - Applied to all Links routes

### 2. **Authentication Module Updates**
- **File**: `src/auth/auth.module.ts`
  - Configured `JwtModule` with 15-minute token expiry
  - Registered `JwtStrategy` as provider
  - Added `PassportModule` for strategy support
  - Exports `AuthService` for use in other modules

### 3. **Authentication Service Updates**
- **File**: `src/auth/auth.service.ts`
  - `signup()` - Creates user and returns JWT access token
  - `login()` - Validates credentials and returns JWT access token
  - Password hashing with bcrypt (10 salt rounds)

### 4. **API Endpoints**
- **POST /auth/register** - Register new user
  ```json
  Request: { "email": "user@example.com", "password": "password123" }
  Response: { "accessToken": "eyJhbGciOiJ...", "userId": "...", "email": "..." }
  ```

- **POST /auth/login** - Login existing user
  ```json
  Request: { "email": "user@example.com", "password": "password123" }
  Response: { "accessToken": "eyJhbGciOiJ...", "userId": "...", "email": "..." }
  ```

### 5. **Protected Routes**
All Links routes now require JWT authentication:
- **POST /links** - Create a new link (automatically associates with logged-in user)
- **GET /links** - Get all links for logged-in user
- **GET /links/search** - Search links for logged-in user

**Authorization Header Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. **Database Changes**
- **Migration**: `prisma/migrations/20260303000000_add_password_to_user/migration.sql`
  - Adds `password` column to User table
  - Status: Created (needs to be applied when database is running)

### 7. **Dependencies Added**
```json
{
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "@types/passport-jwt": "^3.0.13"
}
```

### 8. **Environment Configuration**
Added to `.env`:
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Updated DTOs

### SignupDto & LoginDto
- `email`: Valid email (required)
- `password`: Minimum 8 characters (required)
- Located in: `src/auth/dto/`

### CreateLinkDto
- `originalUrl`: Valid URL (required)
- `title`: Optional string (max 200 chars)
- `summary`: Optional string
- `keywords`: Optional string array
- `rawExtractedText`: Optional string
- **userId is automatically extracted from JWT token** (not passed in request body)

### SearchLinksDto
- `q`: Search query string (required, min 1 char)
- **userId is automatically extracted from JWT token** (not passed as query param)

## How to Use

### 1. Start the Database
```bash
docker-compose up -d postgres
```

### 2. Apply Database Migration
```bash
cd apps/backend
npm run prisma:migrate:dev
```

### 3. Start Development Server
```bash
npm run start:dev
```

### 4. Test Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "uuid-here",
  "email": "test@example.com",
  "message": "User created successfully"
}
```

### 5. Test Protected Route
```bash
curl -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "originalUrl": "https://example.com",
    "title": "Example"
  }'
```

The userId will be automatically extracted from the JWT token.

## Token Details

- **Algorithm**: HS256 (HMAC SHA-256)
- **Expiry**: 15 minutes
- **Secret**: Retrieved from `JWT_SECRET` environment variable
- **Payload**: 
  ```json
  {
    "sub": "user-id",
    "email": "user@example.com",
    "iat": 1234567890,
    "exp": 1234568790
  }
  ```

## Security Notes

1. **JWT Secret**: Change `JWT_SECRET` in production to a strong, random value
2. **HTTPS**: Always use HTTPS in production
3. **Token Refresh**: Current implementation uses 15-minute tokens. Consider implementing refresh tokens for longer sessions
4. **Password Storage**: Passwords are hashed with bcrypt (10 rounds) before storage
5. **CORS**: Configure CORS appropriately for your frontend

## File Structure

```
src/auth/
├── strategies/
│   └── jwt.strategy.ts          # Passport JWT strategy
├── guards/
│   └── jwt-auth.guard.ts        # JWT authentication guard
├── dto/
│   ├── login.dto.ts             # Login validation
│   └── signup.dto.ts            # Signup validation
├── auth.controller.ts           # Register/Login endpoints
├── auth.service.ts              # Auth business logic
└── auth.module.ts               # Auth module configuration
```

## Error Handling

- **Invalid Token**: Returns 401 Unauthorized
- **Missing Token**: Returns 401 Unauthorized
- **Expired Token**: Returns 401 Unauthorized
- **Invalid Credentials**: Returns 401 Unauthorized
- **Email Already Exists**: Returns 401 Unauthorized
- **Validation Errors**: Returns 400 Bad Request with details

## Next Steps (Optional)

1. **Refresh Tokens**: Implement refresh token mechanism for better security
2. **Token Revocation**: Add token blacklist for logout functionality
3. **Role-Based Access Control (RBAC)**: Extend with user roles and permissions
4. **Two-Factor Authentication**: Add 2FA for additional security
5. **API Key Authentication**: Support for service-to-service authentication

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Dependencies installed without conflicts
- [ ] Registration endpoint creates users and returns tokens
- [ ] Login endpoint returns tokens for valid credentials
- [ ] Invalid credentials rejected with 401
- [ ] Protected routes accessible with valid token
- [ ] Protected routes return 401 without token
- [ ] Protected routes return 401 with expired token
- [ ] userId automatically extracted from JWT in protected routes
