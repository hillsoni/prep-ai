#!/bin/bash

# PrepAI Backend Deployment Script
# This script handles the deployment of the PrepAI backend to various platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="prepai-backend"
DOCKER_IMAGE="prepai-backend"
DOCKER_TAG="latest"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    log_success "All dependencies are installed."
}

# Build the application
build_app() {
    log_info "Building the application..."
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --only=production
    
    # Run tests
    log_info "Running tests..."
    npm run test
    
    # Build TypeScript
    log_info "Building TypeScript..."
    npm run build
    
    log_success "Application built successfully."
}

# Build Docker image
build_docker() {
    log_info "Building Docker image..."
    
    docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
    
    log_success "Docker image built successfully."
}

# Deploy to Railway
deploy_railway() {
    log_info "Deploying to Railway..."
    
    if [ -z "$RAILWAY_TOKEN" ]; then
        log_error "RAILWAY_TOKEN environment variable is not set."
        exit 1
    fi
    
    # Install Railway CLI if not present
    if ! command -v railway &> /dev/null; then
        log_info "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Login to Railway
    railway login --token $RAILWAY_TOKEN
    
    # Deploy
    railway up
    
    log_success "Deployed to Railway successfully."
}

# Deploy to Docker Hub
deploy_dockerhub() {
    log_info "Deploying to Docker Hub..."
    
    if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
        log_error "DOCKER_USERNAME and DOCKER_PASSWORD environment variables are not set."
        exit 1
    fi
    
    # Login to Docker Hub
    echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
    
    # Tag and push image
    docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_USERNAME}/${DOCKER_IMAGE}:${DOCKER_TAG}
    docker push ${DOCKER_USERNAME}/${DOCKER_IMAGE}:${DOCKER_TAG}
    
    log_success "Deployed to Docker Hub successfully."
}

# Deploy to AWS ECS
deploy_aws_ecs() {
    log_info "Deploying to AWS ECS..."
    
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        log_error "AWS credentials are not set."
        exit 1
    fi
    
    # Configure AWS CLI
    aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
    aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
    aws configure set default.region ${AWS_REGION:-us-east-1}
    
    # Build and push to ECR
    aws ecr get-login-password --region ${AWS_REGION:-us-east-1} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION:-us-east-1}.amazonaws.com
    
    docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION:-us-east-1}.amazonaws.com/${DOCKER_IMAGE}:${DOCKER_TAG}
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION:-us-east-1}.amazonaws.com/${DOCKER_IMAGE}:${DOCKER_TAG}
    
    # Update ECS service
    aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --force-new-deployment
    
    log_success "Deployed to AWS ECS successfully."
}

# Deploy to Google Cloud Run
deploy_gcp() {
    log_info "Deploying to Google Cloud Run..."
    
    if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
        log_error "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set."
        exit 1
    fi
    
    # Build and push to Google Container Registry
    docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} gcr.io/${GCP_PROJECT_ID}/${DOCKER_IMAGE}:${DOCKER_TAG}
    docker push gcr.io/${GCP_PROJECT_ID}/${DOCKER_IMAGE}:${DOCKER_TAG}
    
    # Deploy to Cloud Run
    gcloud run deploy ${DOCKER_IMAGE} \
        --image gcr.io/${GCP_PROJECT_ID}/${DOCKER_IMAGE}:${DOCKER_TAG} \
        --platform managed \
        --region ${GCP_REGION:-us-central1} \
        --allow-unauthenticated
    
    log_success "Deployed to Google Cloud Run successfully."
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Wait for service to be ready
    sleep 30
    
    # Check if service is responding
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        log_success "Health check passed."
    else
        log_error "Health check failed."
        exit 1
    fi
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    log_success "Cleanup completed."
}

# Main deployment function
deploy() {
    local platform=$1
    
    log_info "Starting deployment to $platform..."
    
    check_dependencies
    build_app
    build_docker
    
    case $platform in
        "railway")
            deploy_railway
            ;;
        "dockerhub")
            deploy_dockerhub
            ;;
        "aws")
            deploy_aws_ecs
            ;;
        "gcp")
            deploy_gcp
            ;;
        *)
            log_error "Unknown platform: $platform"
            log_info "Available platforms: railway, dockerhub, aws, gcp"
            exit 1
            ;;
    esac
    
    health_check
    cleanup
    
    log_success "Deployment to $platform completed successfully!"
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS] PLATFORM"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --version  Show version information"
    echo ""
    echo "Platforms:"
    echo "  railway        Deploy to Railway"
    echo "  dockerhub      Deploy to Docker Hub"
    echo "  aws            Deploy to AWS ECS"
    echo "  gcp            Deploy to Google Cloud Run"
    echo ""
    echo "Environment Variables:"
    echo "  RAILWAY_TOKEN           Railway deployment token"
    echo "  DOCKER_USERNAME         Docker Hub username"
    echo "  DOCKER_PASSWORD         Docker Hub password"
    echo "  AWS_ACCESS_KEY_ID       AWS access key"
    echo "  AWS_SECRET_ACCESS_KEY   AWS secret key"
    echo "  AWS_ACCOUNT_ID          AWS account ID"
    echo "  ECS_CLUSTER             ECS cluster name"
    echo "  ECS_SERVICE             ECS service name"
    echo "  GOOGLE_APPLICATION_CREDENTIALS  GCP service account key"
    echo "  GCP_PROJECT_ID          GCP project ID"
    echo ""
    echo "Examples:"
    echo "  $0 railway"
    echo "  $0 dockerhub"
    echo "  $0 aws"
    echo "  $0 gcp"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -v|--version)
            echo "PrepAI Backend Deployment Script v1.0.0"
            exit 0
            ;;
        *)
            PLATFORM=$1
            shift
            ;;
    esac
done

# Check if platform is provided
if [ -z "$PLATFORM" ]; then
    log_error "Platform is required."
    usage
    exit 1
fi

# Run deployment
deploy $PLATFORM
