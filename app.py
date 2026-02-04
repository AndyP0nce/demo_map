"""
Campus Apartments - Flask Backend API
Main application file
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os

# Import routes
from backend.routes import apartments_bp, universities_bp, users_bp

# Initialize Flask app
app = Flask(__name__, 
            static_folder='../frontend',
            static_url_path='')

# Enable CORS for frontend-backend communication
CORS(app)

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'
app.config['JSON_SORT_KEYS'] = False

# Register blueprints (route modules)
app.register_blueprint(apartments_bp, url_prefix='/api/apartments')
app.register_blueprint(universities_bp, url_prefix='/api/universities')
app.register_blueprint(users_bp, url_prefix='/api/users')

# Serve frontend files
@app.route('/')
def serve_frontend():
    """Serve the main HTML file"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, etc.)"""
    return send_from_directory(app.static_folder, path)

# Health check endpoint
@app.route('/api/health')
def health_check():
    """Check if API is running"""
    return jsonify({
        'status': 'healthy',
        'message': 'Campus Apartments API is running'
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Not found',
        'message': 'The requested resource was not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500

if __name__ == '__main__':
    # Run the Flask development server
    print("🏠 Starting Campus Apartments API...")
    print("📍 Frontend: http://localhost:5000")
    print("🔌 API: http://localhost:5000/api")
    print("💚 Health Check: http://localhost:5000/api/health")
    
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000
    )
