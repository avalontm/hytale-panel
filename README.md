# Hytale Panel

A professional, modern web administration panel for Hytale servers. This project provides a centralized interface to manage your Hytale server instances, files, plugins, and universes with ease.

## Features

### Dashboard
- Real-time server statistics (CPU, Memory, Uptime, TPS, Players).
- Complete server controls (Start, Stop, Restart).
- Integrated Playit.gg tunnel management for public access.

### Console
- Real-time server log streaming via WebSockets.
- Interactive command execution terminal.
- Command history support.

### File Management
- Integrated file explorer for the server directory.
- Read and edit text-based configuration files.
- Upload, download, and delete files.
- Directory creation and navigation.

### Plugin Manager
- List currently installed plugins.
- Search for new mods and plugins from external providers.
- Direct installation and removal functionality.

### Universes
- Overview of all server worlds/universes.
- Detailed configuration view for each universe.

### Authentication
- Secure user login system.
- Global server authentication dialog for Hytale account linking.
- Encrypted credential persistence.

## Tech Stack

### Frontend
- React 18
- Vite
- Socket.io Client
- Lucide React (Icons)
- Axios (API Requests)
- Vanilla CSS (Custom Design System)

### Backend
- Node.js
- Express.js
- Socket.io
- Pidusage (Resource monitoring)
- Child Process (Server orchestration)

## Prerequisites

- Node.js (Version 18 or higher recommended)
- NPM or Yarn
- Java (Required to run the Hytale server)
- A Hytale server installation

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/avalontm/hytale-panel.git
cd hytale-panel
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
Configure your `.env` file with the correct `SERVER_PATH` and `START_COMMAND`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
```

## Running the Application

### Development Mode
Run both servers simultaneously:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The panel will be accessible at `http://localhost:5173`.

### Production Mode
1. Build the frontend:
```bash
cd frontend
npm run build
```
2. Start the backend:
```bash
cd backend
npm start
```

## Project Structure

- `backend/`: Express server, socket handlers, and server management services.
- `frontend/`: React application, components, hooks, and design system.
- `data/`: Local storage for panel settings, logs, and user data.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

Hytale Panel is an independent project and is not affiliated with Hypixel Studios or the Hytale brand.
