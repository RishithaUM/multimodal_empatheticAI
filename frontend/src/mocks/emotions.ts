export const recentDetections = [
  { id: '1', time: '2:34 PM', emotion: 'Happy', confidence: 92, inputs: ['face', 'voice'] },
  { id: '2', time: '2:28 PM', emotion: 'Neutral', confidence: 78, inputs: ['text'] },
  { id: '3', time: '2:15 PM', emotion: 'Anxious', confidence: 85, inputs: ['face', 'voice', 'text'] },
  { id: '4', time: '1:52 PM', emotion: 'Sad', confidence: 71, inputs: ['face'] },
  { id: '5', time: '1:40 PM', emotion: 'Excited', confidence: 88, inputs: ['voice', 'text'] },
  { id: '6', time: '1:22 PM', emotion: 'Calm', confidence: 94, inputs: ['face', 'text'] },
];

export const emotionColors: Record<string, string> = {
  Happy: '#00D4AA',
  Sad: '#6C63FF',
  Anxious: '#F59E0B',
  Angry: '#EF4444',
  Neutral: '#94A3B8',
  Excited: '#EC4899',
  Calm: '#3B82F6',
  Fearful: '#8B5CF6',
  Disgusted: '#10B981',
  Surprised: '#F97316',
};

export const summaryStats = [
  { label: 'Total Sessions', value: '247', icon: 'ri-bar-chart-line', color: '#6C63FF' },
  { label: 'Avg Confidence', value: '84%', icon: 'ri-percent-line', color: '#00D4AA' },
  { label: 'Alerts Sent', value: '3', icon: 'ri-alarm-warning-line', color: '#F59E0B' },
];

export const modalityScores = [
  { label: 'Face', score: 89, icon: 'ri-camera-line', color: '#6C63FF' },
  { label: 'Voice', score: 76, icon: 'ri-mic-line', color: '#00D4AA' },
  { label: 'Text', score: 91, icon: 'ri-chat-3-line', color: '#EC4899' },
];

export const historyData = [
  { id: '1', date: 'Apr 17, 2026', time: '2:34 PM', inputs: ['Face', 'Voice'], emotion: 'Happy', confidence: 92, intensity: 'High' },
  { id: '2', date: 'Apr 17, 2026', time: '2:28 PM', inputs: ['Text'], emotion: 'Neutral', confidence: 78, intensity: 'Low' },
  { id: '3', date: 'Apr 16, 2026', time: '11:15 AM', inputs: ['Face', 'Voice', 'Text'], emotion: 'Anxious', confidence: 85, intensity: 'Medium' },
  { id: '4', date: 'Apr 16, 2026', time: '9:52 AM', inputs: ['Face'], emotion: 'Sad', confidence: 71, intensity: 'Medium' },
  { id: '5', date: 'Apr 15, 2026', time: '3:40 PM', inputs: ['Voice', 'Text'], emotion: 'Excited', confidence: 88, intensity: 'High' },
  { id: '6', date: 'Apr 15, 2026', time: '1:22 PM', inputs: ['Face', 'Text'], emotion: 'Calm', confidence: 94, intensity: 'Low' },
  { id: '7', date: 'Apr 14, 2026', time: '4:10 PM', inputs: ['Face', 'Voice'], emotion: 'Angry', confidence: 67, intensity: 'High' },
  { id: '8', date: 'Apr 14, 2026', time: '10:05 AM', inputs: ['Text'], emotion: 'Happy', confidence: 83, intensity: 'Medium' },
];

export const alertsData = [
  { id: '1', type: 'distress', emotion: 'Anxious', timestamp: 'Apr 16, 2026 11:15 AM', status: 'sent', guardian: 'guardian@example.com', intensity: 'High' },
  { id: '2', type: 'warning', emotion: 'Sad', timestamp: 'Apr 14, 2026 4:10 PM', status: 'sent', guardian: 'guardian@example.com', intensity: 'Medium' },
  { id: '3', type: 'distress', emotion: 'Angry', timestamp: 'Apr 12, 2026 2:30 PM', status: 'failed', guardian: 'guardian@example.com', intensity: 'High' },
  { id: '4', type: 'warning', emotion: 'Fearful', timestamp: 'Apr 10, 2026 9:00 AM', status: 'pending', guardian: 'guardian@example.com', intensity: 'Medium' },
];

export const chatMessages = [
  { id: '1', role: 'ai', text: 'Hello! I\'m EmpathAI. I can sense your emotional state and respond accordingly. How are you feeling today?', time: '2:30 PM' },
  { id: '2', role: 'user', text: 'I\'ve been feeling a bit overwhelmed lately with work.', time: '2:31 PM' },
  { id: '3', role: 'ai', text: 'I understand — feeling overwhelmed is really tough. Based on your recent sessions, I\'ve noticed elevated anxiety patterns. Would you like to try a quick breathing exercise, or would you prefer to talk through what\'s on your mind?', time: '2:31 PM', emotion: 'Anxious' },
  { id: '4', role: 'user', text: 'Maybe talking would help. I have a big presentation tomorrow.', time: '2:32 PM' },
  { id: '5', role: 'ai', text: 'That makes complete sense. Pre-presentation nerves are very common. Let\'s work through this together — what aspect of the presentation feels most daunting right now?', time: '2:32 PM', emotion: 'Anxious' },
];

export const analyticsTimeline = [
  { time: '9 AM', happy: 30, sad: 10, anxious: 20, calm: 40 },
  { time: '10 AM', happy: 45, sad: 15, anxious: 30, calm: 10 },
  { time: '11 AM', happy: 20, sad: 40, anxious: 50, calm: 5 },
  { time: '12 PM', happy: 60, sad: 10, anxious: 15, calm: 30 },
  { time: '1 PM', happy: 70, sad: 5, anxious: 10, calm: 50 },
  { time: '2 PM', happy: 55, sad: 20, anxious: 25, calm: 35 },
  { time: '3 PM', happy: 80, sad: 5, anxious: 5, calm: 60 },
];

export const emotionDistribution = [
  { emotion: 'Happy', percentage: 35, color: '#00D4AA' },
  { emotion: 'Calm', percentage: 22, color: '#3B82F6' },
  { emotion: 'Anxious', percentage: 18, color: '#F59E0B' },
  { emotion: 'Sad', percentage: 12, color: '#6C63FF' },
  { emotion: 'Excited', percentage: 8, color: '#EC4899' },
  { emotion: 'Angry', percentage: 5, color: '#EF4444' },
];
