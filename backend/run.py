#!/usr/bin/env python
"""
EmpathAI Backend - Main Entry Point
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app import create_app

# Get configuration from environment
config_name = os.getenv('FLASK_ENV', 'development')

# Create Flask app
app, socketio = create_app(config_name)

if __name__ == '__main__':
    # Run development server
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'True').lower() == 'true'
    
    print(f"Starting EmpathAI Backend on port {port}...")
    print(f"Environment: {config_name}")
    print(f"Debug mode: {debug}")
    
    # Run with SocketIO support
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        allow_unsafe_werkzeug=True
    )
