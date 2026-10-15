import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, BookOpen, ArrowRight, Sparkles, CheckCircle2, Languages, Volume2, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-cyan-500/10 to-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10 px-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-medium backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Real-Time Sign Language Translation</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Bridging Communication with <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
              Indian Sign Language AI
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Translate Indian Sign Language (ISL) hand gestures into text in real-time. Designed to make sign language translation instant, accurate, and accessible to everyone.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/translator"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all duration-200"
            >
              <Camera className="w-5 h-5" />
              <span>Start Translating</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              to="/learning"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-semibold bg-slate-800/80 border border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white transition-all duration-200"
            >
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span>Learn ISL</span>
            </Link>
          </div>

          {/* Feature Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Real-time Webcam Translation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> English & Tamil Output
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Privacy Protected
            </span>
          </div>
        </div>
      </section>

      {/* User Feature Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Core Features</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Empowering communication through accessible sign language translation tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Live Gesture Recognition</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Detects and translates hand gestures directly from your device's webcam into clear text.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Languages className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Bilingual Translation</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Supports real-time output in both English sentences and native Tamil script for wider accessibility.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Volume2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Speech Synthesis</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Listen to translated text with voice audio playback to facilitate verbal conversation.
            </p>
          </div>
        </div>
      </section>

      {/* Live Translator CTA Banner */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-8 sm:p-10 text-center space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold text-white">Ready to Start Translating?</h2>
            <p className="text-slate-400 text-sm">
              Experience real-time Indian Sign Language recognition directly from your browser.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/translator"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition-colors"
            >
              <span>Open Live Translator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
