# Quick Deploy Script for Smart Waste Management System
Write-Host "🚀 Quick Deploy - Smart Waste Management System" -ForegroundColor Green

# Check if Docker is running
Write-Host "⏳ Checking Docker status..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    $dockerRunning = $true
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    $dockerRunning = $false
    Write-Host "❌ Docker is not running" -ForegroundColor Red
}

# Option 1: Full Docker deployment (if Docker is ready)
if ($dockerRunning) {
    Write-Host "🐳 Option 1: Full Docker Deployment" -ForegroundColor Cyan
    Write-Host "This will start MongoDB, Backend, and Frontend in containers"
    $choice = Read-Host "Deploy with Docker? (y/n)"
    
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        Write-Host "🛑 Stopping any existing containers..." -ForegroundColor Yellow
        docker-compose down 2>$null
        
        Write-Host "🔨 Building and starting all services..." -ForegroundColor Yellow
        docker-compose up --build -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "🎉 Deployment successful!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🌐 Your application is now running:" -ForegroundColor Cyan
            Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
            Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
            Write-Host "   API Docs: http://localhost:3001/api" -ForegroundColor White
            Write-Host ""
            Write-Host "📊 To view logs: docker-compose logs -f" -ForegroundColor Yellow
            Write-Host "🛑 To stop: docker-compose down" -ForegroundColor Yellow
            exit 0
        } else {
            Write-Host "❌ Docker deployment failed. Trying alternative..." -ForegroundColor Red
        }
    }
}

# Option 2: Manual deployment with local MongoDB
Write-Host ""
Write-Host "🔧 Option 2: Manual Deployment" -ForegroundColor Cyan
Write-Host "This will guide you through manual setup"

# Start MongoDB if Docker is available
if ($dockerRunning) {
    Write-Host "📦 Starting MongoDB container..." -ForegroundColor Yellow
    docker run --name ecowaste-mongodb -p 27017:27017 -d mongo:latest 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB started on localhost:27017" -ForegroundColor Green
        $mongoReady = $true
    } else {
        Write-Host "⚠️  MongoDB container may already exist. Trying to start existing..." -ForegroundColor Yellow
        docker start ecowaste-mongodb 2>$null
        $mongoReady = $true
    }
} else {
    Write-Host "⚠️  Docker not available. You'll need MongoDB Atlas or install MongoDB locally." -ForegroundColor Yellow
    Write-Host "   📋 See MONGODB_SETUP.md for MongoDB Atlas setup" -ForegroundColor White
    $mongoReady = $false
}

# Build backend
Write-Host "🔨 Building backend..." -ForegroundColor Yellow
Set-Location backend
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
    exit 1
}

# Instructions for manual start
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Update your MongoDB connection (if needed):" -ForegroundColor Cyan
Write-Host "   - Edit backend/.env" -ForegroundColor White
Write-Host "   - Set MONGODB_URI to your MongoDB connection string" -ForegroundColor White
Write-Host ""
Write-Host "2. Start the backend:" -ForegroundColor Cyan
Write-Host "   cd backend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "3. In a new terminal, start the frontend:" -ForegroundColor Cyan
Write-Host "   cd .. && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Access your application:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""

if (-not $mongoReady) {
    Write-Host "💡 Database Options:" -ForegroundColor Yellow
    Write-Host "   Option A: MongoDB Atlas (Free cloud database)" -ForegroundColor White
    Write-Host "            See MONGODB_SETUP.md for setup instructions" -ForegroundColor White
    Write-Host "   Option B: Install MongoDB locally" -ForegroundColor White
    Write-Host "            Download from: https://www.mongodb.com/try/download/community" -ForegroundColor White
}

Write-Host ""
Write-Host "📚 For detailed instructions, see DEPLOYMENT.md" -ForegroundColor Cyan