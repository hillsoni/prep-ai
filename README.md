<<<<<<< HEAD
# prep-ai
=======
# PrepAI Backend API

A comprehensive Node.js backend API for the PrepAI interview preparation platform, built with TypeScript, Express, MongoDB, and Redis.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens, OAuth2 (Google), 2FA support
- **User Management**: Complete user profiles, preferences, academic & professional info
- **Interview System**: AI-powered mock interviews with real-time feedback
- **Practice Tests**: Comprehensive testing platform with analytics
- **Resource Management**: Learning resources with search and bookmarking
- **Analytics Dashboard**: Performance insights and progress tracking
- **Real-time Features**: WebSocket support for live interviews
- **Security**: Rate limiting, input validation, security headers, audit logging
- **Scalability**: Redis caching, background jobs, horizontal scaling ready

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for sessions and performance
- **Authentication**: JWT + Refresh Tokens + OAuth2
- **Validation**: Zod for runtime type safety
- **Logging**: Winston with structured logging
- **Testing**: Jest with comprehensive coverage
- **Deployment**: Docker + Railway/Vercel
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 7.0+
- Redis 7.0+
- npm or yarn

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Environment Setup

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/prepai
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate strong secrets)
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# OAuth2 (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AWS (optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=prepai-assets

# Email (optional)
SENDGRID_API_KEY=your-sendgrid-api-key
```

### 3. Start Development

```bash
# Start with Docker (recommended)
docker-compose up -d

# Or start manually
npm run dev
```

The API will be available at `http://localhost:5000`

## 🐳 Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f prepai-backend

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

### Services included:
- **PrepAI Backend**: `http://localhost:5000`
- **MongoDB**: `mongodb://localhost:27017`
- **Redis**: `redis://localhost:6379`
- **Mongo Express**: `http://localhost:8081` (admin/admin123)
- **Redis Commander**: `http://localhost:8082`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout user |
| GET | `/auth/profile` | Get user profile |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |
| POST | `/auth/verify-email` | Verify email address |

### Example Requests

#### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

#### Get Profile (with auth)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.ts
```

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npx tsc --noEmit
```

### Database

```bash
# Seed database with sample data
npm run seed

# Run database migrations
npm run migrate
```

## 📊 Monitoring & Logs

### Health Check
```bash
curl http://localhost:5000/health
```

### Log Files
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Log Levels
- `error` - Error conditions
- `warn` - Warning conditions  
- `info` - Informational messages
- `debug` - Debug-level messages

## 🚀 Deployment

### Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Docker Production

```bash
# Build production image
docker build -t prepai-backend .

# Run production container
docker run -p 5000:5000 \
  -e MONGODB_URI=your-mongodb-uri \
  -e REDIS_URL=your-redis-url \
  -e JWT_SECRET=your-jwt-secret \
  prepai-backend
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Environment (development/production/test) |
| `PORT` | Yes | Server port (default: 5000) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | JWT refresh token secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `AWS_ACCESS_KEY_ID` | No | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret key for S3 |
| `SENDGRID_API_KEY` | No | SendGrid API key for emails |

## 🔒 Security

### Implemented Security Features

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control
- **Rate Limiting**: Configurable rate limits
- **Input Validation**: Zod schema validation
- **Security Headers**: Helmet.js protection
- **CORS**: Configurable cross-origin policies
- **Password Security**: bcrypt hashing
- **Session Management**: Redis-based sessions
- **Audit Logging**: Comprehensive security logging

### Security Best Practices

1. **Environment Variables**: Never commit secrets
2. **HTTPS Only**: Use HTTPS in production
3. **Regular Updates**: Keep dependencies updated
4. **Monitoring**: Monitor for suspicious activity
5. **Backup**: Regular database backups

## 📈 Performance

### Optimization Features

- **Redis Caching**: Session and data caching
- **Database Indexing**: Optimized MongoDB queries
- **Compression**: Gzip response compression
- **Connection Pooling**: MongoDB connection pooling
- **Background Jobs**: Async task processing
- **CDN Ready**: Static asset optimization

### Performance Monitoring

- Response time logging
- Database query performance
- Memory usage tracking
- Error rate monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commits
- Ensure code passes all linting rules

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release
- Complete authentication system
- User management APIs
- Interview system foundation
- Security middleware
- Docker support
- CI/CD pipeline

---

**Built with ❤️ by the PrepAI Team**
>>>>>>> 0e954cc (Initial commit)
