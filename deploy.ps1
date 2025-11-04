# Smart Waste Management Deployment Script
# This script helps deploy the application to various platforms

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("docker", "vercel", "railway", "heroku")]
    [string]$Platform,
    
    [Parameter(Mandatory=$false)]
    [switch]$Production = $false
)

Write-Host "🚀 Starting deployment for Smart Waste Management System" -ForegroundColor Green
Write-Host "Platform: $Platform" -ForegroundColor Cyan
Write-Host "Mode: $(if($Production) {'Production'} else {'Development'})" -ForegroundColor Cyan

switch ($Platform) {
    "docker" {
        Write-Host "🐳 Deploying with Docker..." -ForegroundColor Blue
        
        # Check if Docker is running
        try {
            docker version | Out-Null
            Write-Host "✅ Docker is running" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
            exit 1
        }
        
        # Stop existing containers
        Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
        docker-compose down
        
        # Build and start containers
        Write-Host "🔨 Building and starting containers..." -ForegroundColor Yellow
        docker-compose up --build -d
        
        Write-Host "✅ Deployment complete!" -ForegroundColor Green
        Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "🔌 Backend API: http://localhost:3001" -ForegroundColor Cyan
        Write-Host "🗄️  MongoDB: localhost:27017" -ForegroundColor Cyan
        Write-Host "📊 Nginx (if enabled): http://localhost" -ForegroundColor Cyan
    }
    
    "vercel" {
        Write-Host "▲ Deploying to Vercel..." -ForegroundColor Blue
        
        # Check if Vercel CLI is installed
        try {
            vercel --version | Out-Null
            Write-Host "✅ Vercel CLI found" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Yellow
            npm install -g vercel
        }
        
        # Deploy frontend
        if ($Production) {
            vercel --prod
        } else {
            vercel
        }
        
        Write-Host "✅ Frontend deployed to Vercel!" -ForegroundColor Green
        Write-Host "⚠️  Note: You'll need to deploy the backend separately to a service like Railway or Heroku" -ForegroundColor Yellow
    }
    
    "railway" {
        Write-Host "🚂 Preparing for Railway deployment..." -ForegroundColor Blue
        
        Write-Host "📋 Railway deployment steps:" -ForegroundColor Cyan
        Write-Host "1. Install Railway CLI: npm install -g @railway/cli" -ForegroundColor White
        Write-Host "2. Login: railway login" -ForegroundColor White
        Write-Host "3. Initialize project: railway init" -ForegroundColor White
        Write-Host "4. Deploy backend: railway up (from backend directory)" -ForegroundColor White
        Write-Host "5. Deploy frontend: railway up (from root directory)" -ForegroundColor White
        Write-Host "6. Set environment variables in Railway dashboard" -ForegroundColor White
        
        # Create railway.json for better deployment
        $railwayConfig = @{
            "deploy" = @{
                "startCommand" = "npm start"
                "healthcheckPath" = "/health"
            }
        } | ConvertTo-Json
        
        Set-Content -Path "railway.json" -Value $railwayConfig
        Write-Host "✅ Created railway.json configuration file" -ForegroundColor Green
    }
    
    "heroku" {
        Write-Host "🟣 Preparing for Heroku deployment..." -ForegroundColor Blue
        
        Write-Host "📋 Heroku deployment steps:" -ForegroundColor Cyan
        Write-Host "1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor White
        Write-Host "2. Login: heroku login" -ForegroundColor White
        Write-Host "3. Create apps: heroku create your-app-name-backend" -ForegroundColor White
        Write-Host "4. Set environment variables: heroku config:set VARIABLE=value" -ForegroundColor White
        Write-Host "5. Deploy: git push heroku main" -ForegroundColor White
        
        # Create Procfile for Heroku
        Set-Content -Path "Procfile" -Value "web: npm start"
        Set-Content -Path "backend/Procfile" -Value "web: npm start"
        Write-Host "✅ Created Procfile for Heroku" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🎉 Deployment process completed!" -ForegroundColor Green
Write-Host "📚 Check the DEPLOYMENT.md file for detailed instructions" -ForegroundColor Cyan