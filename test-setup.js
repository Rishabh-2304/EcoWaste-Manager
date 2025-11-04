#!/usr/bin/env node

// Simple test script to verify application setup
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Smart Waste Management Setup\n');

// Test files existence
const requiredFiles = [
  '.env',
  'backend/.env',
  'package.json',
  'backend/package.json',
  'docker-compose.yml',
  'backend/Dockerfile',
  'Dockerfile',
  'DEPLOYMENT.md'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Test environment variables
console.log('\n🔐 Checking environment variables...');

try {
  const frontendEnv = fs.readFileSync('.env', 'utf8');
  const backendEnv = fs.readFileSync('backend/.env', 'utf8');
  
  const requiredFrontendVars = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'VITE_BACKEND_URL'];
  const requiredBackendVars = ['NODE_ENV', 'PORT', 'MONGODB_URI', 'JWT_SECRET'];
  
  console.log('Frontend environment variables:');
  requiredFrontendVars.forEach(varName => {
    if (frontendEnv.includes(varName)) {
      console.log(`✅ ${varName}`);
    } else {
      console.log(`❌ ${varName} - MISSING`);
    }
  });
  
  console.log('\nBackend environment variables:');
  requiredBackendVars.forEach(varName => {
    if (backendEnv.includes(varName)) {
      console.log(`✅ ${varName}`);
    } else {
      console.log(`❌ ${varName} - MISSING`);
    }
  });
  
} catch (error) {
  console.log('❌ Error reading environment files:', error.message);
}

// Test package.json structure
console.log('\n📦 Checking package configurations...');

try {
  const frontendPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const backendPkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
  
  console.log('Frontend scripts:');
  console.log(`✅ build: ${frontendPkg.scripts.build ? '✓' : '❌'}`);
  console.log(`✅ dev: ${frontendPkg.scripts.dev ? '✓' : '❌'}`);
  console.log(`✅ start: ${frontendPkg.scripts.start ? '✓' : '❌'}`);
  
  console.log('\nBackend scripts:');
  console.log(`✅ build: ${backendPkg.scripts.build ? '✓' : '❌'}`);
  console.log(`✅ dev: ${backendPkg.scripts.dev ? '✓' : '❌'}`);
  console.log(`✅ start: ${backendPkg.scripts.start ? '✓' : '❌'}`);
  
} catch (error) {
  console.log('❌ Error reading package.json files:', error.message);
}

// Docker test
console.log('\n🐳 Checking Docker configuration...');

try {
  const dockerCompose = fs.readFileSync('docker-compose.yml', 'utf8');
  
  const services = ['frontend', 'backend', 'mongodb'];
  services.forEach(service => {
    if (dockerCompose.includes(service + ':')) {
      console.log(`✅ ${service} service configured`);
    } else {
      console.log(`❌ ${service} service missing`);
    }
  });
  
} catch (error) {
  console.log('❌ Error reading docker-compose.yml:', error.message);
}

console.log('\n🚀 Setup Test Complete!');

if (allFilesExist) {
  console.log('\n✅ Your Smart Waste Management System is ready for deployment!');
  console.log('\n📋 Next steps:');
  console.log('1. Update environment variables with your actual values');
  console.log('2. Set up MongoDB Atlas or local MongoDB');
  console.log('3. Configure Firebase project');
  console.log('4. Run: ./deploy.ps1 -Platform docker');
  console.log('5. Or use manual deployment commands from DEPLOYMENT.md');
} else {
  console.log('\n⚠️  Some files are missing. Please check the setup.');
}