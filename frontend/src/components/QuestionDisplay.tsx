'use client';

import { Question } from '@/lib/api';
import { Editor } from '@monaco-editor/react';
import { CheckCircle, Code, FileText } from 'lucide-react';

interface QuestionDisplayProps {
  question: Question | null;
  answer: string;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function QuestionDisplay({
  question,
  answer,
  onAnswerChange,
  onSubmit,
  isSubmitting,
}: QuestionDisplayProps) {
  if (!question) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500">Loading question...</p>
      </div>
    );
  }

  const renderAnswerInput = () => {
    switch (question.question_type) {
      case 'mcq':
        return (
          <div className="space-y-3">
            {question.options && Object.entries(question.options).map(([key, value]) => (
              <button
                key={key}
                onClick={() => onAnswerChange(key)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answer === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <span className="font-semibold text-blue-600 mr-3">{key}.</span>
                <span className="text-gray-700">{value as string}</span>
              </button>
            ))}
          </div>
        );

      case 'coding':
        return (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-800 px-4 py-2 flex items-center">
              <Code className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-300">Code Editor</span>
            </div>
            <Editor
              height="400px"
              defaultLanguage="python"
              value={answer}
              onChange={(value) => onAnswerChange(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        );

      case 'descriptive':
        return (
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        );

      default:
        return null;
    }
  };

  const getQuestionIcon = () => {
    switch (question.question_type) {
      case 'mcq':
        return <CheckCircle className="w-6 h-6 text-blue-600" />;
      case 'coding':
        return <Code className="w-6 h-6 text-purple-600" />;
      case 'descriptive':
        return <FileText className="w-6 h-6 text-green-600" />;
    }
  };

  const getQuestionTypeLabel = () => {
    switch (question.question_type) {
      case 'mcq':
        return 'Multiple Choice';
      case 'coding':
        return 'Coding Challenge';
      case 'descriptive':
        return 'Descriptive Answer';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getQuestionIcon()}
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {getQuestionTypeLabel()}
            </h2>
            <p className="text-sm text-gray-500 capitalize">
              Difficulty: {question.difficulty_level}
            </p>
          </div>
        </div>
      </div>

      {/* Question Text */}
      <div className="mb-8">
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {question.question_text}
          </p>

          {/* Additional info for coding questions */}
          {question.question_type === 'coding' && question.options && (
            <div className="mt-4 space-y-3">
              {question.options.input_format && (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Input Format:</p>
                  <p className="text-sm text-gray-600">{question.options.input_format}</p>
                </div>
              )}
              {question.options.output_format && (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Output Format:</p>
                  <p className="text-sm text-gray-600">{question.options.output_format}</p>
                </div>
              )}
              {question.options.example_input && (
                <div className="bg-white rounded p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Example:</p>
                  <p className="text-sm font-mono text-gray-700">
                    Input: {question.options.example_input}
                  </p>
                  <p className="text-sm font-mono text-gray-700">
                    Output: {question.options.example_output}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Answer Input */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Answer:</h3>
        {renderAnswerInput()}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={isSubmitting || !answer.trim()}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${isSubmitting || !answer.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
            }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}
