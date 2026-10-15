import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Activity, Award, History, TrendingUp, Clock, Camera, BookOpen, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Dashboard() {
  const [statsData, setStatsData] = useState({
    totalTranslations: 0,
    totalPracticeAttempts: 0,
    successfulPractices: 0,
    avgConfidence: 94,
    practiceScoreXP: 880,
    recentTranslations: []
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const { token, user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();

        if (response.ok && data.status === 'success') {
          setStatsData(data.data);
        } else {
          setErrorMsg(data.message || 'Failed to load stats');
        }
      } catch (err) {
        console.error('Fetch stats error:', err);
        setErrorMsg('Server connection error while fetching stats.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const stats = [
    { title: 'Total Gestures Saved', value: statsData.totalTranslations.toString(), change: 'Saved to profile', icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: 'Average Confidence', value: `${statsData.avgConfidence}%`, change: 'Recognition accuracy', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Practice Score', value: `${statsData.practiceScoreXP} XP`, change: `${statsData.successfulPractices} Signs Mastered`, icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Practice Attempts', value: statsData.totalPracticeAttempts.toString(), change: 'Practice activity', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <LayoutDashboard className="w-7 h-7 text-cyan-400" />
            <span>Translation & Activity Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Overview of translation metrics, practice achievements, and recent activity{user?.name ? ` for ${user.name}` : ''}.
          </p>
        </div>
      </div>

      {!token && (
        <div className="p-4 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Log in to sync your personal ISL translator metrics, history, and practice score in real-time.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.title}</span>
                <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">{stat.value}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <span className="text-emerald-400 font-semibold">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Translation Feed */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              <span>Recent Activity Feed</span>
            </h3>
            <span className="text-xs text-slate-400">Recent Translations</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
              <p className="text-xs">Fetching activity...</p>
            </div>
          ) : statsData.recentTranslations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-1">
              <p className="text-sm font-semibold text-slate-400">No saved translations yet</p>
              <p className="text-xs text-slate-500">Translations saved on the Live Translator page will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {statsData.recentTranslations.map((item, index) => (
                <div key={item._id || index} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-cyan-300 flex items-center gap-2">
                      <span>{item.sign || 'Sign Gesture'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-200 text-xs">
                      {item.sentence}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                      {item.confidence}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions & Translation Tips */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>Quick Actions</span>
          </h3>

          <div className="space-y-3">
            <Link
              to="/translator"
              className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">Start Translator</h4>
                  <p className="text-xs text-slate-400">Real-time webcam translation</p>
                </div>
              </div>
            </Link>

            <Link
              to="/learning"
              className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Practice ISL</h4>
                  <p className="text-xs text-slate-400">Master gestures and earn XP</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs space-y-2">
            <div className="font-semibold text-cyan-300">Tips for Best Accuracy:</div>
            <ul className="space-y-1.5 text-slate-300">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Position hands inside the camera frame
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Ensure good front lighting
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Hold gestures steady for continuous sentences
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
