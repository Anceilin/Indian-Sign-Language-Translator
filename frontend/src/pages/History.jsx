import React, { useState, useEffect } from 'react';
import { History, Search, Trash2, Calendar, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function TranslationHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const { token, user } = useAuth();

  // Fetch translation history from backend API
  const fetchHistory = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setHistoryData(data.data || []);
      } else {
        setErrorMsg(data.message || 'Failed to load history');
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      setErrorMsg('Server connection error. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  // Delete single history item
  const handleDeleteItem = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        setHistoryData((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };

  // Clear all history items
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear your entire translation history?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        setHistoryData([]);
      }
    } catch (err) {
      console.error('Clear history error:', err);
    }
  };

  const filteredData = historyData.filter(
    (item) =>
      (item.sign && item.sign.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sentence && item.sentence.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <History className="w-7 h-7 text-cyan-400" />
            <span>Translation History Log</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review your saved ISL gesture translation logs, confidence scores, and timestamps.
          </p>
        </div>

        {/* Action bar: Search & Clear */}
        <div className="flex items-center space-x-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search translation..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {historyData.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {!token && (
        <div className="p-4 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Please log in to save and view your personal translation history.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* History Data Table */}
      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            <p className="text-xs">Loading saved translation history...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">No translation history items found</p>
            <p className="text-xs text-slate-500">
              {token
                ? 'Translate signs on the Live Translator page and click "Save History".'
                : 'Log in to start saving your translation history logs.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-6 py-4">Sign / Gesture</th>
                  <th className="px-6 py-4">Saved Translation Sentence</th>
                  <th className="px-6 py-4">Language</th>
                  <th className="px-6 py-4">Confidence</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredData.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-cyan-300">{row.sign}</td>
                    <td className="px-6 py-4 text-slate-100 font-medium">{row.sentence}</td>
                    <td className="px-6 py-4 uppercase font-mono text-[11px]">
                      {row.language === 'ta' ? 'தமிழ் (TA)' : 'English (EN)'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        {row.confidence}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteItem(row._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
