# Summer Internship Review System

## Setup Instructions

### Prerequisites
- Node.js installed
- MongoDB installed and running

### Installation
1. Install dependencies:
```bash
npm install
```

2. Start MongoDB service:
```bash
mongod
```

3. Start the application:
```bash
npm run server
```

Or for development with auto-restart:
```bash
npm run server:dev
```

4. Open browser and go to: `http://localhost:3000`

### Features
- Head can add/remove teams and columns
- Reviewer can update team and individual member scores
- MongoDB data persistence
- Hierarchical table display (team rows + member rows)

### API Endpoints
- GET /api/teams - Get all teams
- POST /api/teams - Create new team
- PUT /api/teams/:id - Update team
- DELETE /api/teams/:id - Delete team
- GET /api/columns - Get all columns
- POST /api/columns - Create new column
- DELETE /api/columns/:name - Delete column