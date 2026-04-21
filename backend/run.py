#!/usr/bin/env python3
"""
Run script for the SecureCart Flask API
"""

import os
from dotenv import load_dotenv
from app import app

# Load environment variables
load_dotenv()

if __name__ == '__main__':
    host = os.getenv('HOST', '0.0.0.0')
    # Use an app-specific port variable so unrelated machine-level PORT values
    # do not break frontend/backend connectivity in local development.
    port = int(os.getenv('SECURECART_PORT', 5002))
    debug = os.getenv('FLASK_DEBUG', '1') == '1'
    use_https = os.getenv('SECURECART_USE_HTTPS', '0') == '1'
    
    print(f"Starting SecureCart API server on {host}:{port}")
    print(f"Debug mode: {debug}")
    print(f"HTTPS enabled: {use_https}")
    print("Press Ctrl+C to stop the server")
    
    app.run(host=host, port=port, debug=debug, ssl_context='adhoc' if use_https else None)
