#!/usr/bin/env python
"""
EmpathAI Backend - Main Entry Point
"""
import os
import sys
import logging
from dotenv import load_dotenv

# Suppress TensorFlow oneDNN warnings
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Load environment variables
load_dotenv()

from app import create_app

# Configure logging
logger = logging.getLogger(__name__)

# Get configuration from environment
config_name = os.getenv('FLASK_ENV', 'development')

# Create Flask app
app, socketio = create_app(config_name)

if __name__ == '__main__':
    # Run development server
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'True').lower() == 'true'
    
    logger.info("=" * 70)
    logger.info("STARTING EMPATHAI BACKEND")
    logger.info("=" * 70)
    logger.info(f"Environment: {config_name.upper()}")
    logger.info(f"Port: {port}")
    logger.info(f"Debug Mode: {debug}")
    logger.info(f"Server URL: http://0.0.0.0:{port}")
    logger.info("=" * 70)
    
    # Run with SocketIO support
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        allow_unsafe_werkzeug=True,
        use_reloader=False
    )
