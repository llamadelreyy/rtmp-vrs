# RTSP Stream Management System

A comprehensive Node.js frontend project that connects to a Python FastAPI backend for managing RTSP streams.

## Features

### 1. RTSP Stream Management
- Add/remove/edit multiple RTSP stream sources
- Stream preview functionality
- Support for various stream layouts (2x2, 3x3, 4x4 grids, custom layouts)
- Ability to send stream data to backend for processing

### 2. User Authentication & Authorization
- Login/logout functionality
- Role-based access control (admin, operator, viewer)
- User management interface for admins
- Session management

### 3. Dashboard Interface
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