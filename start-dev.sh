#!/bin/bash

# Start SecureCart Development Environment
echo "Starting SecureCart Development Environment..."

# Check if backend is running
if ! curl -s http://localhost:5002/api/health > /dev/null; then
    echo "Starting backend server..."
    cd backend
    python app.py &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    cd ..
    
    # Wait for backend to start
    echo "Waiting for backend to start..."
    sleep 5
else
    echo "Backend is already running"
fi

# Start frontend
echo "Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "Development environment started!"
echo "Backend: http://localhost:5002"
echo "Frontend: http://localhost:3000"
echo ""
echo "To stop the servers, press Ctrl+C"

# Wait for user to stop
wait
