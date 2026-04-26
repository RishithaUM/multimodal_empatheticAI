from flask import Blueprint, request, jsonify, current_app, make_response
from app.services import token_required
from datetime import datetime
import requests as http_requests
import logging

logger = logging.getLogger(__name__)

chat_bp = Blueprint('chat', __name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.1:8b"


@chat_bp.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response


@chat_bp.route('/ollama-message', methods=['POST', 'OPTIONS'])
def ollama_message():
    """Send chat message and get Ollama-powered empathetic response (no auth required)"""
    if request.method == 'OPTIONS':
        return make_response('', 204)

    try:
        data = request.get_json(force=True) or {}
        message = (data.get('message') or '').strip()
        emotion = (data.get('emotion') or 'neutral').strip()
        history = data.get('history') or []  # list of {role, content}

        if not message:
            return jsonify({'error': 'Message is required'}), 400

        # Build conversation context for Ollama
        system_prompt = (
            f"You are EmpathAI, a compassionate emotional support AI assistant. "
            f"The user is currently feeling {emotion} (detected by emotion sensors). "
            f"Respond with empathy and warmth. Be concise — keep responses under 3 sentences "
            f"unless the user explicitly asks for more detail. Do not mention being an AI unnecessarily."
        )

        # Build prompt with history
        conversation = ""
        for turn in history[-10:]:  # cap at last 10 exchanges
            role = turn.get('role', 'user')
            content = turn.get('content', '')
            label = "User" if role == "user" else "EmpathAI"
            conversation += f"{label}: {content}\n"
        conversation += f"User: {message}\nEmpathAI:"

        full_prompt = f"{system_prompt}\n\n{conversation}"

        response = http_requests.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": full_prompt, "stream": False},
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        reply = (result.get('response') or '').strip()

        return jsonify({
            'success': True,
            'reply': reply,
            'emotion_context': emotion,
            'timestamp': datetime.utcnow().isoformat(),
        }), 200

    except http_requests.exceptions.ConnectionError:
        return jsonify({'error': 'Ollama is not running. Please start Ollama first.'}), 503
    except http_requests.exceptions.Timeout:
        return jsonify({'error': 'Ollama took too long to respond.'}), 504
    except Exception as e:
        logger.error(f"Ollama chat error: {e}")
        return jsonify({'error': str(e)}), 500

from typing import cast
from app import AppFlask

def _app() -> AppFlask:
    return cast(AppFlask, current_app._get_current_object())  # type: ignore[attr-defined]


# Emotion-aware response templates
EMOTION_RESPONSES = {
    'happy': [
        "That's wonderful! I'm so glad you're feeling happy!",
        "Your happiness is contagious! Keep spreading that joy!",
        "Amazing! Let's keep this positive energy going!"
    ],
    'sad': [
        "I'm here for you. Would you like to talk about what's making you sad?",
        "It's okay to feel sad sometimes. Remember, this feeling will pass.",
        "I care about you. Let me know if there's anything I can do to help."
    ],
    'angry': [
        "I can sense your frustration. Let's take a moment to breathe together.",
        "It's normal to feel angry. What's bothering you the most right now?",
        "I'm listening. Your feelings are valid, and I'm here to support you."
    ],
    'anxious': [
        "Anxiety can be overwhelming. Let's work through this together.",
        "You're safe here. Would mindfulness exercises help you right now?",
        "It's okay to feel anxious. Let's break down what's worrying you."
    ],
    'calm': [
        "You seem peaceful right now. That's beautiful!",
        "I love your calm energy. How can I support you further?",
        "This is a great state of mind. Let's maintain this tranquility."
    ],
    'excited': [
        "Your excitement is amazing! Tell me more about what's got you so pumped up!",
        "I can feel your energy! This is fantastic!",
        "Let's channel this excitement into something productive!"
    ],
    'neutral': [
        "How are you feeling right now?",
        "I'm here to listen. What's on your mind?",
        "Tell me more about what you're experiencing."
    ]
}


@chat_bp.route('/send-message', methods=['POST'])
@token_required
def send_message():
    """Send chat message and get emotion-aware response"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        data = request.get_json()
        
        message = data.get('message', '').strip()
        current_emotion = data.get('emotion', 'neutral')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Generate emotion-aware response
        response = _generate_response(message, current_emotion)
        
        return jsonify({
            'success': True,
            'user_message': message,
            'ai_response': response,
            'emotion_context': current_emotion,
            'timestamp': datetime.utcnow().isoformat()
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/get-recommendations', methods=['POST'])
@token_required
def get_recommendations():
    """Get content recommendations based on emotion"""
    try:
        data = request.get_json()
        emotion = data.get('emotion', 'neutral').lower()
        
        recommendations = _get_emotion_recommendations(emotion)
        
        return jsonify({
            'success': True,
            'emotion': emotion,
            'recommendations': recommendations
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/quick-replies', methods=['GET'])
@token_required
def get_quick_replies():
    """Get emotion-specific quick replies"""
    try:
        emotion = request.args.get('emotion', 'neutral').lower()
        
        replies = _get_quick_replies(emotion)
        
        return jsonify({
            'success': True,
            'emotion': emotion,
            'quick_replies': replies
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/affirmations', methods=['GET'])
@token_required
def get_affirmations():
    """Get motivational affirmations based on emotion"""
    try:
        emotion = request.args.get('emotion', 'neutral').lower()
        
        affirmations = _get_affirmations(emotion)
        
        return jsonify({
            'success': True,
            'emotion': emotion,
            'affirmations': affirmations
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _generate_response(message, emotion):
    """Generate emotion-aware response"""
    emotion_lower = emotion.lower()
    
    # Get base response from templates
    if emotion_lower in EMOTION_RESPONSES:
        import random
        base_response = random.choice(EMOTION_RESPONSES[emotion_lower])
    else:
        base_response = "Thank you for sharing. I'm here to listen."
    
    # Add contextual response based on message keywords
    context_response = _get_context_response(message)
    
    return f"{base_response} {context_response}".strip()


def _get_context_response(message):
    """Get context-specific response"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ['help', 'need', 'stuck']):
        return "I'm here to help. What do you need assistance with?"
    elif any(word in message_lower for word in ['thank', 'thanks', 'grateful']):
        return "You're welcome! I'm always happy to help."
    elif any(word in message_lower for word in ['music', 'movie', 'show', 'watch']):
        return "Great! I can recommend some content based on your mood."
    else:
        return ""


def _get_emotion_recommendations(emotion):
    """Get recommendations based on emotion"""
    recommendations = {
        'sad': {
            'music': ['Calming instrumentals', 'Uplifting pop', 'Feel-good classics'],
            'activities': ['Take a walk', 'Talk to a friend', 'Watch a comedy'],
            'resources': ['Meditation app', 'Journaling prompts', 'Support hotline']
        },
        'anxious': {
            'music': ['Ambient music', 'Nature sounds', 'Relaxing piano'],
            'activities': ['Deep breathing', 'Yoga', 'Grounding exercises'],
            'resources': ['Anxiety app', 'Breathing guide', 'Therapy resources']
        },
        'angry': {
            'music': ['Rock music', 'High-energy beats', 'Cathartic songs'],
            'activities': ['Exercise', 'Sports', 'Creative outlet'],
            'resources': ['Anger management', 'Conflict resolution', 'Meditation']
        },
        'happy': {
            'music': ['Upbeat pop', 'Dance music', 'Feel-good songs'],
            'activities': ['Share with friends', 'Create something', 'Dance'],
            'resources': ['Social events', 'Hobby ideas', 'Community groups']
        },
        'calm': {
            'music': ['Classical', 'Lo-fi beats', 'Nature sounds'],
            'activities': ['Read', 'Meditate', 'Nature walk'],
            'resources': ['Mindfulness', 'Journaling', 'Art therapy']
        }
    }
    
    return recommendations.get(emotion, recommendations['calm'])


def _get_quick_replies(emotion):
    """Get quick replies for emotion"""
    quick_replies = {
        'sad': ["I need help", "Talk to someone", "Get resources", "Play music"],
        'anxious': ["Breathe", "Meditate", "Exercise", "Talk about it"],
        'angry': ["Cool down", "Exercise", "Creative outlet", "Reflect"],
        'happy': ["Keep it up!", "Share joy", "Create", "Celebrate"],
        'calm': ["Maintain peace", "Meditate", "Journal", "Relax"],
        'excited': ["Channel energy", "Take action", "Share enthusiasm", "Plan"]
    }
    
    return quick_replies.get(emotion, ["Tell me more", "I'm listening", "Help me understand"])


def _get_affirmations(emotion):
    """Get affirmations based on emotion"""
    affirmations = {
        'sad': [
            "This feeling will pass.",
            "You are stronger than you think.",
            "It's okay to not be okay.",
            "Your feelings matter."
        ],
        'anxious': [
            "You are safe and in control.",
            "I am breathing through this.",
            "Anxiety doesn't define me.",
            "I can handle this."
        ],
        'angry': [
            "I can choose my response.",
            "This too shall pass.",
            "I am in control of my emotions.",
            "I can turn this into something positive."
        ],
        'happy': [
            "I deserve this joy.",
            "I'm grateful for this moment.",
            "My happiness is valid.",
            "I will cherish this feeling."
        ],
        'calm': [
            "I am peaceful and grounded.",
            "Everything is going to be okay.",
            "I trust myself and the process.",
            "I am exactly where I need to be."
        ]
    }
    
    return affirmations.get(emotion, [
        "You are doing great.",
        "I believe in you.",
        "Every moment is a new beginning."
    ])
