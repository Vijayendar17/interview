'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { reportAPI, proctoringAPI } from '@/lib/api';
import { Loader2, CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

export default function ReportPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [proctorLogs, setProctorLogs] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [params.examId]);

  const loadReport = async () => {
    try {
      const result = await reportAPI.getReport(params.examId);
      setReport(result.data);
      
      const logsResult = await proctoringAPI.getLogs(params.examId).catch(() => null);
      if (logsResult) {
         setProctorLogs(logsResult.data);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      alert('Failed to load report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Generating your report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Report not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Exam Report</h1>
          <p className="text-gray-600">Candidate: {report.candidate.name}</p>
          <p className="text-sm text-gray-500">{report.candidate.email}</p>
        </div>

        {/* Identity Verification Alert */}
        {proctorLogs?.events?.some((e: any) => e.event_type === 'identity_mismatch') && (
          <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 mb-6">
             <div className="flex items-center text-red-700 font-bold text-lg mb-2">
                <AlertCircle className="w-6 h-6 mr-2" />
                Critical Integrity Violation: Verification Failed
             </div>
             <p className="text-red-900 font-medium">
                The face detected during the exam drastically mismatched the baseline identity photo captured at the beginning of the assessment. This is a severe integrity violation strongly indicating candidate impersonation.
             </p>
          </div>
        )}

        {/* Scores */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Overall Score</h2>
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {report.scores.total_score}
              </div>
              <p className="text-gray-500">out of 100</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Integrity Score</h2>
            <div className="text-center">
              <div className={`text-5xl font-bold mb-2 ${report.proctoring.integrity_score >= 75 ? 'text-green-600' :
                  report.proctoring.integrity_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                {Math.round(report.proctoring.integrity_score)}
              </div>
              <p className="text-gray-500">out of 100</p>
            </div>
          </div>
        </div>

        {/* Skill Breakdown */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Skill Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(report.scores.skill_breakdown || {}).map(([skill, score]: [string, any]) => (
              <div key={skill}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">{skill}</span>
                  <span className="text-sm font-semibold text-gray-800">{score}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(score / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Analysis</h2>

          {/* Strengths */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="font-semibold text-gray-700">Strengths</h3>
            </div>
            <ul className="space-y-1">
              {report.ai_analysis.strengths.map((strength: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div>
            <div className="flex items-center mb-2">
              <TrendingDown className="w-5 h-5 text-orange-600 mr-2" />
              <h3 className="font-semibold text-gray-700">Areas for Improvement</h3>
            </div>
            <ul className="space-y-1">
              {report.ai_analysis.weaknesses.map((weakness: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start">
                  <span className="text-orange-500 mr-2">→</span>
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
          >
            Back to Home
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}
