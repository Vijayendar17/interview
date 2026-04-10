'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Brain, Camera, Shield, LogOut } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      setIsLoggedIn(true);
      try {
        setUserName(JSON.parse(userStr).name);
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserName('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16 animate-slide-in">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl">
              <Brain className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            AI Interview Examination System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the future of technical interviews with AI-powered question generation,
            adaptive difficulty, and integrated proctoring.
          </p>
          {isLoggedIn && (
            <div className="mt-6 inline-flex items-center gap-4 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-100">
              <span className="text-gray-700 font-medium">Welcome back, {userName}</span>
              <div className="w-px h-4 bg-gray-200"></div>
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors text-sm font-medium">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <FeatureCard
            icon={<Brain className="w-8 h-8" />}
            title="AI-Powered"
            description="Dynamic question generation using Gemini AI"
            color="blue"
          />
          <FeatureCard
            icon={<BookOpen className="w-8 h-8" />}
            title="Adaptive Difficulty"
            description="Questions adjust based on your performance"
            color="purple"
          />
          <FeatureCard
            icon={<Camera className="w-8 h-8" />}
            title="Smart Proctoring"
            description="Camera and audio monitoring with integrity scoring"
            color="green"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Fair & Secure"
            description="Privacy-aware with minimal data retention"
            color="orange"
          />
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Start Your Exam?</h2>
          <p className="text-gray-600 mb-6">
            Before you begin, please ensure:
          </p>
          <ul className="space-y-2 mb-8 text-gray-700">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              You have a stable internet connection
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Your camera and microphone are working
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              You are in a quiet, well-lit environment
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              You have at least 60 minutes available
            </li>
          </ul>
          
          {isLoggedIn ? (
            <button
              onClick={() => router.push('/exam')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Start Examination
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Login to Start
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="w-full bg-white text-blue-600 border-2 border-blue-100 py-3 rounded-xl font-semibold hover:border-blue-200 transition-all duration-200"
              >
                Create an Account
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by Google Gemini AI • Built with Next.js & FastAPI</p>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
  }[color];

  return (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border border-gray-100">
      <div className={`bg-gradient-to-r ${colorClasses} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
