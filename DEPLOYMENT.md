# PrepAI Backend Deployment Guide

This guide covers deploying the PrepAI backend to various platforms with production-ready configurations.

## 🚀 Quick Deploy Options

### 1. Railway (Recommended for Startups)

Railway provides the easiest deployment with automatic scaling and built-in databases.

#### Prerequisites
- Railway account
- GitHub repository connected

#### Steps
1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Initialize project
   railway init
   ```

2. **Set Environment Variables**
   ```bash
   # Set required environment variables
   railway variables set NODE_ENV=production
   railway variables set MONGODB_URI=your-mongodb-uri
   railway variables set REDIS_URL=your-redis-url
   railway variables set JWT_SECRET=your-jwt-secret
   railway variables set JWT_REFRESH_SECRET=your-refresh-secret
   ```

3. **Deploy**
   ```bash
   railway up
   ```

#### Railway Configuration
- **Automatic Deployments**: Deploys on every push to main branch
- **Custom Domain**: Add your domain in Railway dashboard
- **SSL**: Automatic HTTPS with Let's Encrypt
- **Scaling**: Automatic scaling based on traffic

### 2. Docker Deployment

Deploy using Docker containers for maximum flexibility.

#### Build and Run Locally
```bash
# Build the Docker image
docker build -t prepai-backend .

# Run with environment variables
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://localhost:27017/prepai \
  -e REDIS_URL=redis://localhost:6379 \
  -e JWT_SECRET=your-jwt-secret \
  prepai-backend
```

#### Docker Compose (Full Stack)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f prepai-backend

# Stop services
docker-compose down
```

### 3. AWS ECS Deployment

Deploy to AWS Elastic Container Service for enterprise-grade hosting.

#### Prerequisites
- AWS CLI configured
- ECR repository created
- ECS cluster and service configured

#### Steps
1. **Build and Push to ECR**
   ```bash
   # Get login token
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
   
   # Build and tag
   docker build -t prepai-backend .
   docker tag prepai-backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/prepai-backend:latest
   
   # Push to ECR
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/prepai-backend:latest
   ```

2. **Update ECS Service**
   ```bash
   aws ecs update-service --cluster prepai-cluster --service prepai-service --force-new-deployment
   ```

### 4. Google Cloud Run

Deploy to Google Cloud Run for serverless container hosting.

#### Prerequisites
- Google Cloud SDK installed
- Project with Cloud Run API enabled

#### Steps
1. **Build and Push to GCR**
   ```bash
   # Configure Docker for GCR
   gcloud auth configure-docker
   
   # Build and tag
   docker build -t gcr.io/your-project-id/prepai-backend .
   docker push gcr.io/your-project-id/prepai-backend
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy prepai-backend \
     --image gcr.io/your-project-id/prepai-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production,MONGODB_URI=your-mongodb-uri
   ```

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Application
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prepai?retryWrites=true&w=majority
REDIS_URL=redis://username:password@host:port

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AWS (Optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=prepai-assets

# Email (Optional)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@prepai.com

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
```

### Database Setup

#### MongoDB Atlas (Recommended)
1. Create MongoDB Atlas account
2. Create cluster (M0 for development, M10+ for production)
3. Create database user
4. Whitelist IP addresses
5. Get connection string

#### Redis Setup
1. **Redis Cloud** (Recommended)
   - Sign up at Redis Cloud
   - Create database
   - Get connection string

2. **Self-hosted Redis**
   ```bash
   # Using Docker
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

## 📊 Monitoring & Logging

### Health Checks
```bash
# Check application health
curl https://your-domain.com/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### Logging
- **Application Logs**: Available in platform-specific logging systems
- **Error Tracking**: Configure Sentry for error monitoring
- **Performance**: Monitor response times and database queries

### Metrics to Monitor
- Response time (target: <200ms)
- Error rate (target: <1%)
- Database connection pool
- Memory usage
- CPU usage

## 🔒 Security Checklist

### Pre-deployment Security
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] JWT secrets are strong (32+ characters)
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Security headers configured

### Post-deployment Security
- [ ] SSL certificate valid
- [ ] Database access restricted
- [ ] API endpoints protected
- [ ] Logs monitored for suspicious activity
- [ ] Regular security updates
- [ ] Backup strategy implemented

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check MongoDB connection
mongosh "mongodb+srv://username:password@cluster.mongodb.net/prepai"

# Check Redis connection
redis-cli -u redis://username:password@host:port ping
```

#### 2. Environment Variable Issues
```bash
# Verify environment variables are set
echo $MONGODB_URI
echo $JWT_SECRET
```

#### 3. Port Issues
```bash
# Check if port is available
netstat -tulpn | grep :5000

# Use different port if needed
PORT=3000 npm start
```

#### 4. Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 dist/server.js
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=prepai:* npm start

# Enable verbose logging
LOG_LEVEL=debug npm start
```

## 📈 Performance Optimization

### Production Optimizations
1. **Enable Compression**
   - Gzip compression enabled by default
   - Static assets served from CDN

2. **Database Optimization**
   - Proper indexing on frequently queried fields
   - Connection pooling configured
   - Query optimization

3. **Caching Strategy**
   - Redis for session storage
   - API response caching
   - Static asset caching

4. **Load Balancing**
   - Multiple instances behind load balancer
   - Health checks configured
   - Auto-scaling enabled

### Scaling Considerations
- **Horizontal Scaling**: Multiple instances
- **Database Scaling**: Read replicas, sharding
- **Cache Scaling**: Redis cluster
- **CDN**: Static assets delivery

## 🔄 CI/CD Pipeline

### GitHub Actions
The project includes automated CI/CD pipeline:

1. **On Push to Main**:
   - Run tests
   - Build Docker image
   - Deploy to production

2. **On Pull Request**:
   - Run tests
   - Security scan
   - Code quality checks

### Manual Deployment
```bash
# Using deployment script
./scripts/deploy.sh railway
./scripts/deploy.sh dockerhub
./scripts/deploy.sh aws
./scripts/deploy.sh gcp
```

## 📞 Support

### Getting Help
- **Documentation**: Check README.md and inline comments
- **Issues**: Create GitHub issue for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact development team

### Emergency Procedures
1. **Service Down**: Check health endpoint
2. **Database Issues**: Check connection strings
3. **High Load**: Scale horizontally
4. **Security Breach**: Rotate secrets immediately

---

**Happy Deploying! 🚀**
