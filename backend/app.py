import subprocess
import sys
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow all origins for simplicity

# Determine the base directory of the project
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def run_script(script_name: str):
    """Run a Python script located in the base project directory.
    Returns stdout, stderr, and exit code.
    """
    script_path = os.path.join(BASE_DIR, script_name)
    if not os.path.isfile(script_path):
        return "", f"Script {script_name} not found.", 1
    # Use the same Python interpreter that runs this Flask app
    result = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
    return result.stdout, result.stderr, result.returncode

@app.route('/encrypt', methods=['POST'])
def encrypt():
    out, err, code = run_script('encrypt_dataset.py')
    return jsonify({
        'script': 'encrypt_dataset.py',
        'stdout': out,
        'stderr': err,
        'returncode': code
    })

@app.route('/train', methods=['POST'])
def train():
    out, err, code = run_script('train_recognizer.py')
    return jsonify({
        'script': 'train_recognizer.py',
        'stdout': out,
        'stderr': err,
        'returncode': code
    })

@app.route('/detect', methods=['POST'])
def detect():
    out, err, code = run_script('detect.py')
    return jsonify({
        'script': 'detect.py',
        'stdout': out,
        'stderr': err,
        'returncode': code
    })

@app.route('/report', methods=['POST'])
def report():
    out, err, code = run_script('generate_report.py')
    return jsonify({
        'script': 'generate_report.py',
        'stdout': out,
        'stderr': err,
        'returncode': code
    })

if __name__ == '__main__':
    # Run on localhost:5000, accessible from the frontend
    app.run(host='0.0.0.0', port=5000, debug=True)
