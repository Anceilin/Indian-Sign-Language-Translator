import React from 'react';
import { Camera, Shield, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto bg-slate-950 border-t border-slate-800/80 text-slate-400 text-sm py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-white">ISL AI Translator</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Real-time Indian Sign Language gesture recognition and translation platform empowering accessible communication.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 tracking-wider uppercase mb-3">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-cyan-400 transition-colors">Home</Link></li>
              <li><Link to="/translator" className="hover:text-cyan-400 transition-colors">Live Translator</Link></li>
              <li><Link to="/learning" className="hover:text-cyan-400 transition-colors">ISL Learning & Practice</Link></li>
              <li><Link to="/dashboard" className="hover:text-cyan-400 transition-colors">Analytics Dashboard</Link></li>
            </ul>
          </div>

          {/* Supported Languages */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 tracking-wider uppercase mb-3">Languages & Output</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-2">
              Translates gestures into real-time English and Tamil text output with instant speech synthesis.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>English & தமிழ் (Tamil) Ready</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center space-x-1">
            <span>© {new Date().getFullYear()} ISL AI Translator. All rights reserved.</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-cyan-400" /> Webcam Privacy Protected
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
