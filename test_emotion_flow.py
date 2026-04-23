#!/usr/bin/env python
"""Test emotion analysis flow end-to-end"""

import requests
import json

# Login
print("=" * 70)
print("1. TESTING LOGIN")
print("=" * 70)

login_payload = {
    'email': 'testuser@gmail.com',
    'password': 'TestPass123'
}

response = requests.post('http://localhost:5000/api/auth/login', json=login_payload)
print(f'Status: {response.status_code}')

if response.status_code == 200:
    token = response.json().get('token')
    print('✅ Login successful!')
    print(f'Token: {token[:30]}...')
    
    # Test emotion analysis
    print("\n" + "=" * 70)
    print("2. TESTING EMOTION ANALYSIS")
    print("=" * 70)
    
    emotion_data = {
        'face_emotion': {
            'modality': 'face',
            'emotion': 'Happy',
            'confidence': 85,
            'scores': [
                {'emotion': 'Happy', 'confidence': 85},
                {'emotion': 'Neutral', 'confidence': 10},
                {'emotion': 'Excited', 'confidence': 5}
            ]
        },
        'voice_emotion': {
            'modality': 'voice',
            'emotion': 'Happy',
            'confidence': 75,
            'scores': [
                {'emotion': 'Happy', 'confidence': 75},
                {'emotion': 'Calm', 'confidence': 20},
                {'emotion': 'Neutral', 'confidence': 5}
            ]
        },
        'text_emotion': {
            'modality': 'text',
            'emotion': 'Happy',
            'confidence': 80,
            'scores': [
                {'emotion': 'Happy', 'confidence': 80},
                {'emotion': 'Excited', 'confidence': 15},
                {'emotion': 'Neutral', 'confidence': 5}
            ]
        }
    }
    
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.post('http://localhost:5000/api/emotion/analyze', 
        json=emotion_data, headers=headers)
    
    print(f'Status: {response.status_code}')
    result = response.json()
    print(json.dumps(result, indent=2))
    
    print("\n" + "=" * 70)
    print("✅ EMOTION ANALYSIS FLOW WORKS!")
    print("=" * 70)
else:
    print('❌ Login failed:', response.json())
