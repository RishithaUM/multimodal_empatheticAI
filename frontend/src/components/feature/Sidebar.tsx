import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', icon: 'ri-dashboard-3-line', path: '/dashboard' },
  { label: 'Analyze', icon: 'ri-scan-line', path: '/analyze' },
  { label: 'Results', icon: 'ri-bar-chart-grouped-line', path: '/results' },
  { label: 'History', icon: 'ri-history-line', path: '/history' },
  { label: 'Chat', icon: 'ri-chat-ai-line', path: '/chat' },
  { label: 'Analytics', icon: 'ri-line-chart-line', path: '/analytics' },
  { label: 'Alerts', icon: 'ri-alarm-warning-line', path: '/alerts' },
  { label: 'Settings', icon: 'ri-settings-3-line', path: '/settings' },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{ background: '#0D0D14', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
        <img
          src="https://public.readdy.ai/ai/img_res/acc080fe-c99e-490b-9cf5-29b25915a85e.png"
          alt="EmpathAI Logo"
          className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
        />
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            EmpathAI
          </span>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer z-50"
        style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <i className={collapsed ? 'ri-arrow-right-s-line text-gray-400 text-xs' : 'ri-arrow-left-s-line text-gray-400 text-xs'}></i>
      </button>

      {/* Nav Items */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'sidebar-item-active text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <i className={`${item.icon} text-lg`}></i>
              </div>
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {!collapsed && item.label === 'Alerts' && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">3</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div
        className={`flex items-center gap-3 px-4 py-4 border-t border-white/5 ${collapsed ? 'justify-center' : ''}`}
      >
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
          A
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">Alex Morgan</p>
            <p className="text-gray-500 text-xs truncate">alex@empathai.app</p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => navigate('/login')}
            className="w-5 h-5 flex items-center justify-center cursor-pointer"
          >
            <i className="ri-logout-box-r-line text-gray-500 hover:text-white transition-colors"></i>
          </button>
        )}
      </div>
    </aside>
  );
}
