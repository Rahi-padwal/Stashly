# JWT Authentication - Quick Start Guide

## 🚀 What's Been Implemented

Your NestJS backend now has complete JWT authentication with the following features:

✅ User registration with email uniqueness validation  
✅ User login with password verification  
✅ JWT token issuance (15-minute expiry)  
✅ Protected routes with `@UseGuards(JwtAuthGuard)`  
✅ Automatic userId extraction from JWT  
✅ Password hashing with bcrypt (10 salt rounds)  
✅ Full TypeScript type safety  
✅ Comprehensive error handling  

---

## 📋 Files Created/Modified

### Created Files:
```
src/auth/strategies/jwt.strategy.ts          # JWT validation strategy
src/auth/guards/jwt-auth.guard.ts            # Protection guard
prisma/migrations/20260303.../migration.sql  # Password column migration
JWT_IMPLEMENTATION.md                        # Full documentation
test-jwt-auth.sh                            # Unix/Linux test script
test-jwt-auth.bat                           # Windows batch test script
test-jwt-auth.ps1                           # PowerShell test script
```

### Modified Files:
```
src/auth/auth.service.ts                    # Added JWT token generation
src/auth/auth.module.ts                     # Added JWT configuration
src/auth/auth.controller.ts                 # Renamed signup → register
src/links/links.controller.ts               # Added JwtAuthGuard & userId extraction
src/links/dto/create-link.dto.ts            # Removed userId validation
src/links/dto/search-links.dto.ts           # Removed userId parameter
package.json                                # Added JWT dependencies
.env                                        # Added JWT_SECRET variable
```

---

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
cd apps/backend
npm install
```
✅ Already completed in this implementation

### 2. Start PostgreSQL Database
```bash
# From project root
docker-compose up -d postgres

# Wait 10-15 seconds for database to initialize
```

### 3. Apply Database Migration
```bash
cd apps/backend
npm run prisma:migrate:dev
```

This will:
- Add `password` column to `User` table
- Generate Prisma client
- Create any other pending migrations

### 4. Update Environment Variables (Optional)
Edit `apps/backend/.env`:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

For **production**, use a strong random string:
```bash
# Generate a secure secret on Mac/Linux:
openssl rand -base64 32
```

### 5. Start Development Server
```bash
npm run start:dev
```

Server will start on `http://localhost:3000`

---

## 🧪 Testing the Implementation

### Option 1: PowerShell (Recommended for Windows)
```powershell
PowerShell -ExecutionPolicy Bypass -File test-jwt-auth.ps1
```

### Option 2: Manual cURL Commands

**Register a new user:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "message": "User created successfully"
}
```

**Login (get a new token):**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Create a link (protected route - replace TOKEN):**
```bash
curl -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "originalUrl": "https://www.example.com",
    "title": "My First Link"
  }'
```

**Get all links (protected route):**
```bash
curl -X GET http://localhost:3000/links \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Search links (protected route):**
```bash
curl -X GET "http://localhost:3000/links/search?q=example" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔑 API Reference

### Authentication Endpoints

#### POST /auth/register
Create a new user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation:**
- email: valid email format (required)
- password: minimum 8 characters (required)

**Response (201 Created):**
```json
{
  "accessToken": "string",
  "userId": "string",
  "email": "string",
  "message": "User created successfully"
}
```

**Errors:**
- `400`: Invalid email or password format
- `401`: User with this email already exists

---

#### POST /auth/login
Authenticate user and get access token

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "string",
  "userId": "string",
  "email": "string",
  "message": "Login successful"
}
```

**Errors:**
- `400`: Invalid email or password format
- `401`: Invalid credentials

---

### Protected Endpoints (require Authorization header)

#### POST /links
Create a new link (userId extracted from JWT)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "originalUrl": "https://example.com",
  "title": "Optional title",
  "keywords": ["optional", "keywords"],
  "summary": "optional summary"
}
```

---

#### GET /links
Retrieve all links for authenticated user

**Headers:**
```
Authorization: Bearer <access_token>
```

---

#### GET /links/search?q=query
Search links for authenticated user

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `q`: Search query (required)

---

## 🛡️ Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Algorithm**: HS256 (HMAC SHA-256)
- **Token Expiry**: 15 minutes
- **Token Location**: Authorization header (Bearer token)
- **Protected Routes**: All link operations require authentication
- **User Isolation**: Users can only access their own links

---

## 🔐 Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong, random value (minimum 32 characters)
- [ ] Enable HTTPS only
- [ ] Set `NODE_ENV=production`
- [ ] Use a proper database with strong credentials
- [ ] Consider implementing refresh tokens for longer sessions
- [ ] Add rate limiting to auth endpoints
- [ ] Enable CORS with specific allowed origins
- [ ] Use environment variables for all secrets
- [ ] Enable request logging and monitoring
- [ ] Set up automated backups for database

---

## 📚 Additional Resources

- [Full Implementation Documentation](./JWT_IMPLEMENTATION.md)
- [NestJS JWT Documentation](https://docs.nestjs.com/security/authentication)
- [Passport.js Documentation](http://www.passportjs.org/)
- [JWT.io - JWT Debugger](https://jwt.io/)

---

## ❓ Troubleshooting

### Issue: Database connection refused
**Solution**: Make sure PostgreSQL is running
```bash
docker-compose ps postgres
```

### Issue: Migration fails with "password column already exists"
**Solution**: The migration has already been applied
```bash
npx prisma migrate status
```

### Issue: "Unsupported engine" warning
**Solution**: This is a warning only and doesn't affect functionality. Your Node version is compatible.

### Issue: 401 Unauthorized on protected routes
**Solution**: Ensure you're sending the Authorization header:
```
Authorization: Bearer <your-access-token>
```

### Issue: Token expired error
**Solution**: Request a new token by logging in again

---

## 📞 Support

For detailed implementation information, see [JWT_IMPLEMENTATION.md](./JWT_IMPLEMENTATION.md)

