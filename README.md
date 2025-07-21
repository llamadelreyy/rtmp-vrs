# RTSP Stream Management System

A comprehensive Node.js frontend project that connects to a Python FastAPI backend for managing RTSP streams.

## Features

### 1. RTSP Stream Management
- Add/remove/edit multiple RTSP stream sources
- Stream preview functionality
- Support for various stream layouts (2x2, 3x3, 4x4 grids, custom layouts)
- Ability to send stream data to backend for processing

### 2. HLS Recording & Storage Management
- Automatic HLS recording of RTSP streams
- **Intelligent disk space management** - automatically removes oldest recordings when storage exceeds 1TB
- Configurable retention policies (default: 30 days minimum retention)
- Manual and emergency cleanup options via API
- Real-time storage monitoring and statistics
- Detailed recording metadata and logging

### 3. User Authentication & Authorization
- Login/logout functionality
- Role-based access control (admin, operator, viewer)
- User management interface for admins
- Session management

### 4. Dashboard Interface
- CCTV-like monitoring interface
- Grid-based layout with resizable/draggable stream containers
- Stream controls (pause, resume, fullscreen)
- Low-latency streaming optimization

## Technical Stack

### Frontend:
- Node.js with Express (for server-side rendering)
- React.js for UI components
- Redux or Context API for state management
- WebSocket integration for real-time updates
- Video.js or HLS.js for RTSP stream handling
- Material UI for responsive design

### Backend Integration:
- RESTful API calls to FastAPI backend
- Authentication via JWT tokens
- WebSocket communication for stream status updates

## Setup Instructions

### Option 1: Docker Setup (Recommended)

#### Prerequisites
- Docker and Docker Compose installed on your system

#### Quick Start with Docker
1. Clone the repository:
```bash
git clone https://github.com/cyysky/CameraGenAI.git
cd rtsp-management-system
```

2. Start the required services (MongoDB and Redis):
```bash
sudo docker compose up -d
```

This will start:
- **MongoDB** on port 27018 (mapped from container port 27017)
- **Redis** on port 6379 with persistence enabled

3. Verify services are running:
```bash
sudo docker compose ps
```

4. Update your server `.env` file to use the Docker services:
```
MONGO_URI=mongodb://localhost:27018/rtsp_management
REDIS_URL=redis://localhost:6379
```

5. Continue with the application setup (install dependencies and start the servers as described in Option 2).

To stop the Docker services:
```bash
sudo docker compose down
```

To stop and remove volumes (this will delete all data):
```bash
sudo docker compose down -v
```

### Option 2: Manual Installation

#### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB (v4 or higher)
- Redis server
- Python 3.8+ for the FastAPI backend

#### Installation


1. Clone the repository:
```bash
git clone https://github.com/cyysky/CameraGenAI.git
cd rtsp-management-system
```

2. Install dependencies:
```bash
npm install --global windows-build-tools
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Environment Setup:

#### Server Configuration
Create a `.env` file in the `server` directory with the following variables:
```
NODE_ENV=development 
PORT=5000 
MONGO_URI=mongodb://localhost:27017/rtsp_management 
JWT_SECRET=your_jwt_secret_key 
JWT_EXPIRE=1d 
COOKIE_EXPIRE=1 
SERVER_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

# HLS Cleanup Configuration (Optional)
HLS_MAX_SIZE_GB=1000
HLS_CLEANUP_INTERVAL_MS=3600000
HLS_RETENTION_DAYS=30
HLS_AUTO_CLEANUP_ENABLED=true
```
#### Client Configuration
Create a `.env` file in the `client` directory with the following variables:
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```
4. Initialize the database:
```bash
# Make sure MongoDB is running
mongod --dbpath /path/to/data/db

#install redis server

sudo apt-get install lsb-release curl gpg
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
sudo chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update
sudo apt-get install redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
#sudo service redis-server start

install ffmpeg

install ollama

ollama pull nomic-embed-text:v1.5

# You can seed the database with initial data if needed
# cd server
# npm run seed
```
5. Start the development servers:

# Start both client and server in development mode
npm start

# Or start them separately
# Start server
cd server
npm run dev

# Start client
cd client
npm start

# create new user
node server/scripts/createAdminUser.js

# db migration
node server/scripts/createVectorIndex.js
node server/scripts/recreateEmbeddings.js
node server/scripts/searchResults.js "keywords"

# login
admin
secureAdminPassword

# list project directory
tree -I 'node_modules|log|.git|public'

# embeding Usage:


Basic semantic search:

// Client-side code
const results = await visionResults.searchResults("person wearing red shirt", {
  useEmbedding: true,
  similarity: 0.6
});

API Endpoint for semantic search:

GET /api/vision/search?query=person+wearing+red+shirt&useEmbedding=true&similarity=0.6
To test embedding generation:

POST /api/vision/embedding
{
  "text": "This is a test text for embedding generation"
}

## HLS Storage Management

The system includes an intelligent HLS cleanup service that automatically manages disk space:

### Key Features:
- **Automatic cleanup** when storage exceeds 1TB (configurable)
- **Retention protection** - recordings newer than 30 days are protected
- **Manual cleanup** via admin API endpoints
- **Emergency cleanup** for critical disk space situations
- **Real-time monitoring** of storage usage and cleanup statistics

### Configuration:
Add these environment variables to your `server/.env` file:

```bash
# HLS Cleanup Configuration
HLS_MAX_SIZE_GB=1000                    # Maximum storage size (1TB default)
HLS_CLEANUP_INTERVAL_MS=3600000         # Check interval (1 hour default)
HLS_RETENTION_DAYS=30                   # Minimum retention period
HLS_AUTO_CLEANUP_ENABLED=true           # Enable automatic cleanup
```

### API Endpoints:
- `GET /api/cleanup/stats` - Get storage statistics
- `POST /api/cleanup/trigger` - Manual cleanup trigger
- `POST /api/cleanup/force` - Emergency cleanup to target size
- `GET /api/cleanup/status` - Service status

For detailed documentation, see: [HLS Cleanup Documentation](server/docs/HLS_CLEANUP.md)

### Example Usage:

**Step 1: Get Bearer Token (Login as Admin)**
```bash
# Login to get the bearer token
curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin",
       "password": "secureAdminPassword"
     }'
```

This will return a response like:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Step 2: Use the Token for Cleanup Operations**

**Check current storage usage:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NzlmY2VjNzM4Njc1ZjAxYTYwMzhlNiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MzEwNjExOCwiZXhwIjoxNzUzMTkyNTE4fQ.HY_jwjl1vp--iYQC_eSo-i94PgllvH_6UpahmNzmT3A" \
     http://localhost:5000/api/cleanup/stats
```

**Manual cleanup trigger:**
```bash
curl -X POST \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     http://localhost:5000/api/cleanup/trigger
```

**Emergency cleanup to 500GB:**
```bash
curl -X POST \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NzlmY2VjNzM4Njc1ZjAxYTYwMzhlNiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MzEwNjExOCwiZXhwIjoxNzUzMTkyNTE4fQ.HY_jwjl1vp--iYQC_eSo-i94PgllvH_6UpahmNzmT3A" \
     -H "Content-Type: application/json" \
     -d '{"targetSizeGB": 500}' \
     http://localhost:5000/api/cleanup/force
```

**Get cleanup service status:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     http://localhost:5000/api/cleanup/status
```

**Start/Stop cleanup service:**
```bash
# Start the cleanup service
curl -X POST \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     http://localhost:5000/api/cleanup/start

# Stop the cleanup service
curl -X POST \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     http://localhost:5000/api/cleanup/stop
```

**Note:** Replace the token `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` with the actual token you received from the login response.