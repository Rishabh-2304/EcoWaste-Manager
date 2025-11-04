# 🚀 Smart Waste Management - Deployment Guide

This guide provides comprehensive instructions for deploying your Smart Waste Management application to various platforms.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Node.js 18+** installed
2. **Docker** (for container deployment)
3. **MongoDB Atlas** account (for production database)
4. **Firebase project** set up (for authentication and storage)
5. **Git** repository (for platform deployments)

## 🔧 Environment Configuration

### Frontend Environment Variables
Update your `.env` file in the root directory:

```env
# Frontend Production Environment Variables
NODE_ENV=production

# Firebase Configuration (Replace with your actual Firebase config)
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id

# Backend API URL (Update this when you deploy your backend)
VITE_BACKEND_URL=https://your-backend-url.com
```

### Backend Environment Variables
Update your `backend/.env` file:

```env
# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-url.com

# Database (MongoDB Atlas recommended for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ecowaste

# JWT Configuration (IMPORTANT: Use a strong secret in production)
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Hugging Face API for AI Features
HF_API_TOKEN=your_huggingface_token_here
HF_MODEL_ID=google/vit-base-patch16-224

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

## 🐳 Docker Deployment (Recommended)

### 1. Local Docker Deployment

1. **Install Docker Desktop**
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Ensure Docker is running

2. **Deploy using the script**
   ```powershell
   ./deploy.ps1 -Platform docker
   ```

3. **Or deploy manually**
   ```bash
   # Build and start all services
   docker-compose up --build -d
   
   # View logs
   docker-compose logs -f
   
   # Stop services
   docker-compose down
   ```

4. **Access your application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - MongoDB: localhost:27017

### 2. Production Docker Deployment

For production servers:

```bash
# Set production environment
export NODE_ENV=production

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up --build -d
```

## ☁️ Cloud Platform Deployments

### 1. Vercel (Frontend Only)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy Frontend**
   ```bash
   # Login to Vercel
   vercel login
   
   # Deploy (development)
   vercel
   
   # Deploy (production)
   vercel --prod
   ```

3. **Set Environment Variables**
   - Go to your Vercel project dashboard
   - Add all frontend environment variables
   - Update `VITE_BACKEND_URL` to point to your backend

### 2. Railway (Full-Stack)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   railway login
   railway init
   railway up
   ```

3. **Deploy Frontend**
   ```bash
   cd ..
   railway init
   railway up
   ```

4. **Configure Environment Variables**
   - Use Railway dashboard to set all environment variables
   - Update URLs to point to your Railway services

### 3. Heroku (Full-Stack)

1. **Install Heroku CLI**
   - Download from [devcenter.heroku.com](https://devcenter.heroku.com/articles/heroku-cli)

2. **Deploy Backend**
   ```bash
   cd backend
   heroku login
   heroku create your-app-name-backend
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   
   git push heroku main
   ```

3. **Deploy Frontend**
   ```bash
   cd ..
   heroku create your-app-name-frontend
   heroku config:set VITE_BACKEND_URL=https://your-backend-app.herokuapp.com
   git push heroku main
   ```

### 4. DigitalOcean App Platform

1. **Create App**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Connect your GitHub repository

2. **Configure Services**
   - **Backend Service**: Node.js app from `/backend` directory
   - **Frontend Service**: Static site from root directory
   - **Database**: Managed MongoDB

3. **Set Environment Variables**
   - Configure all required environment variables in the dashboard

## 🗄️ Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create Account**
   - Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)

2. **Create Cluster**
   - Choose M0 Sandbox for free tier
   - Select your preferred region

3. **Configure Access**
   - Add IP addresses to whitelist (0.0.0.0/0 for all)
   - Create database user

4. **Get Connection String**
   - Replace `<password>` with your actual password
   - Update `MONGODB_URI` in your environment variables

### Local MongoDB (Development)

```bash
# Using Docker
docker run --name mongodb -p 27017:27017 -d mongo:latest

# Using MongoDB Community Edition
# Download and install from mongodb.com
```

## 🔐 Security Checklist

- [ ] **Environment Variables**: All secrets are stored in environment variables
- [ ] **JWT Secret**: Use a strong, random JWT secret (minimum 32 characters)
- [ ] **Database**: Use MongoDB Atlas with authentication
- [ ] **CORS**: Configure CORS to only allow your frontend domain
- [ ] **HTTPS**: Enable HTTPS in production
- [ ] **Rate Limiting**: Implement rate limiting for API endpoints
- [ ] **Input Validation**: All inputs are validated and sanitized

## 🚀 Quick Start Commands

### Docker (Fastest Setup)
```bash
# Clone the repository
git clone <your-repo-url>
cd smart-waste-frontend

# Configure environment variables
cp .env.example .env
cp backend/.env.example backend/.env
# Edit the .env files with your configuration

# Deploy with Docker
./deploy.ps1 -Platform docker
```

### Manual Setup
```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Build backend
cd backend && npm run build && cd ..

# Start services
npm run dev          # Frontend (localhost:5173)
cd backend && npm run dev  # Backend (localhost:3001)
```

## 📊 Monitoring and Logs

### Docker Logs
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f mongodb
```

### Health Checks
- **Frontend**: Access your app URL
- **Backend**: `GET /health` endpoint
- **Database**: Check connection in backend logs

## 🐛 Troubleshooting

### Common Issues

1. **Docker Port Conflicts**
   - Stop other services using ports 3000, 3001, 27017
   - Or change ports in `docker-compose.yml`

2. **MongoDB Connection Issues**
   - Ensure MongoDB is running
   - Check connection string format
   - Verify network connectivity

3. **Environment Variables Not Loading**
   - Check file paths and names
   - Restart services after changes
   - Verify syntax (no spaces around =)

4. **CORS Errors**
   - Update `FRONTEND_URL` in backend environment
   - Check CORS configuration in `backend/src/app.ts`

### Useful Commands
```bash
# Check Docker status
docker ps
docker-compose ps

# Restart specific service
docker-compose restart backend

# View container resource usage
docker stats

# Clean up Docker resources
docker system prune
```

## 📞 Support

If you encounter issues:

1. Check the logs first
2. Verify environment variables
3. Ensure all services are running
4. Check network connectivity
5. Review the troubleshooting section

For additional help, check the project documentation or create an issue in the repository.

---

## 🎉 Congratulations!

Your Smart Waste Management System should now be deployed and running! 

- **Frontend**: Your app interface
- **Backend**: API for data management
- **Database**: Storing all your application data
- **AI Features**: Waste classification and analytics

Enjoy your modern, deployed waste management system! 🌱