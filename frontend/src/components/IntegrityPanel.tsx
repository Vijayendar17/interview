'use client';

import { Shield, AlertTriangle } from 'lucide-react';

interface IntegrityPanelProps {
  score: number;
}

export default function IntegrityPanel({ score }: IntegrityPanelProps) {
  const getScoreColor = () => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = () => {
    if (score >= 75) return 'bg-green-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getScoreLabel = () => {
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Warning';
    return 'Critical';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {score >= 75 ? (
          <Shield className="w-5 h-5 text-green-600" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
        )}
        <div>
          <p className="text-xs text-gray-500">Integrity Score</p>
          <p className={`text-lg font-bold ${getScoreColor()}`}>
            {Math.round(score)}%
          </p>
        </div>
      </div>
      <div className={`px-3 py-1 rounded-full ${getScoreBgColor()} ${getScoreColor()} text-xs font-semibold`}>
        {getScoreLabel()}
      </div>
    </div>
  );
}
