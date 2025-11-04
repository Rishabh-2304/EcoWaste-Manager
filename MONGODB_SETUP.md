# 🗄️ MongoDB Atlas Setup Guide

## Quick Setup (5 minutes)

1. **Create MongoDB Atlas Account**
   - Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
   - Sign up for free account

2. **Create Cluster**
   - Choose "M0 Sandbox" (FREE)
   - Select your preferred region
   - Cluster Name: `smart-waste-cluster`

3. **Setup Database Access**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Username: `ecowaste-admin`
   - Password: Generate secure password (save it!)
   - Database User Privileges: `Read and write to any database`

4. **Setup Network Access**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Or add your current IP address

5. **Get Connection String**
   - Go to "Clusters" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Driver: Node.js, Version: 4.1 or later
   - Copy the connection string

6. **Update Backend .env**
   ```env
   MONGODB_URI=mongodb+srv://ecowaste-admin:<password>@smart-waste-cluster.xxxxx.mongodb.net/ecowaste?retryWrites=true&w=majority
   ```
   Replace `<password>` with your actual password

## Alternative: Local MongoDB with Docker

If you prefer local database:

```bash
# Run MongoDB in Docker container
docker run --name mongodb -p 27017:27017 -d mongo:latest

# Your connection string will be:
MONGODB_URI=mongodb://localhost:27017/ecowaste
```