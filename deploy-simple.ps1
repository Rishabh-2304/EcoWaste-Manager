# Quick Deploy Script for Smart Waste Management System
Write-Host "🚀 Quick Deploy - Smart Waste Management System" -ForegroundColor Green

# Check if Docker is running
Write-Host "⏳ Checking Docker status..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
    $dockerRunning = $true
} catch {
    Write-Host "❌ Docker is not running yet" -ForegroundColor Red
    $dockerRunning = $false
}

if ($dockerRunning) {
    Write-Host ""
    Write-Host "🐳 Starting MongoDB container..." -ForegroundColor Yellow
    
    # Try to start MongoDB container
    $result = docker run --name ecowaste-mongodb -p 27017:27017 -d mongo:latest 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB started successfully" -ForegroundColor Green
        Start-Sleep -Seconds 5
        
        # Build backend
        Write-Host "🔨 Building backend..." -ForegroundColor Yellow
        Set-Location backend
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backend built successfully" -ForegroundColor Green
            
            Write-Host "🚀 Starting backend server..." -ForegroundColor Yellow
            Write-Host "📋 Open another terminal and run: npm run dev" -ForegroundColor Cyan
            Write-Host "📋 Then open another terminal in root directory and run: npm run dev" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "🌐 Your application will be available at:" -ForegroundColor Green
            Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
            Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "❌ Backend build failed" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  MongoDB container might already exist. Trying to start existing..." -ForegroundColor Yellow
        docker start ecowaste-mongodb
        Write-Host "✅ MongoDB should now be running on port 27017" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "⚠️  Docker is not running. Please:" -ForegroundColor Yellow
    Write-Host "1. Wait for Docker Desktop to finish starting" -ForegroundColor White
    Write-Host "2. Run this script again" -ForegroundColor White
    Write-Host "3. Or set up MongoDB Atlas (see MONGODB_SETUP.md)" -ForegroundColor White
}

Write-Host ""
Write-Host "📚 For more deployment options, see DEPLOYMENT.md" -ForegroundColor Cyan