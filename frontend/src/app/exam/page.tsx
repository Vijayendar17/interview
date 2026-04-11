'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { examAPI, proctoringAPI, Question } from '@/lib/api';
import { useExamStore } from '@/store/examStore';
import CameraMonitor from '@/components/CameraMonitor';
import QuestionDisplay from '@/components/QuestionDisplay';
import IntegrityPanel from '@/components/IntegrityPanel';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function ExamPage() {
  const router = useRouter();
  const {
    examId,
    setExamId,
    currentQuestion,
    setCurrentQuestion,
    questionNumber,
    incrementQuestionNumber,
    totalQuestions,
    integrityScore,
    updateIntegrityScore,
    addWarning,
    startExam,
    currentRound,
    setCurrentRound,
  } = useExamStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answer, setAnswer] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showSetup, setShowSetup] = useState(true);

  // System Check States
  const [cameraAccess, setCameraAccess] = useState<boolean>(false);
  const [micAccess, setMicAccess] = useState<boolean>(false);
  const [checkingSystem, setCheckingSystem] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (showSetup) {
      checkSystem();
    }
    return () => {
      // Cleanup stream when component unmounts or setup finishes
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showSetup]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  // Tab switch and window blur detection
  useEffect(() => {
    // Only detect if exam is actively running (not in setup)
    if (showSetup || !examId) return;

    const terminateExam = async () => {
      console.warn('Tab switch or window focus change detected! Terminating exam.');
      try {
        await examAPI.completeExam(examId);
      } catch (error) {
        console.error('Failed to complete exam on tab switch:', error);
      }
      router.push(`/report/${examId}`);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        terminateExam();
      }
    };

    const handleWindowBlur = () => {
      terminateExam();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [showSetup, examId, router]);

  const checkSystem = async () => {
    setCheckingSystem(true);
    try {
      // First call to mount stream and gain permissions
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Attach stream immediately so the UI loader goes away and candidate sees video
      setStream(mediaStream);
      setCameraAccess(true);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');

      // Reject headsets, earphones, or bluetooth audio hardware
      const isExternalHeadset = audioDevices.some(device => 
        device.label.toLowerCase().includes('headset') || 
        device.label.toLowerCase().includes('earphone') ||
        device.label.toLowerCase().includes('bluetooth')
      );

      setSystemError(null);

      if (isExternalHeadset) {
         setSystemError("Earphones or Headsets detected. Please physically disconnect external audio devices. You must strictly use the standard system microphone.");
         setMicAccess(false);
         // Mute the audio stream while in the error state
         mediaStream.getAudioTracks().forEach(t => t.enabled = false);
         return;
      }

      setMicAccess(true);
      // Ensure audio is hot
      mediaStream.getAudioTracks().forEach(t => t.enabled = true);
    } catch (error) {
      console.error('System check failed:', error);
      setCameraAccess(false);
      setMicAccess(false);
    } finally {
      setCheckingSystem(false);
    }
  };

  const initializeExam = async () => {
    try {
      setIsLoading(true);

      // Capture the baseline picture for candidate identity validation
      let baselineBase64 = '';
      if (videoRef.current && videoRef.current.readyState === 4) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 320;
        canvas.height = videoRef.current.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          baselineBase64 = canvas.toDataURL('image/jpeg');
        }
      }

      // Stop the setup stream before starting the exam to release the camera for the proctoring component
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      const result = await examAPI.startExam({
        // Default comprehensive skill set since selection is removed
        skill_keywords: ['python', 'javascript', 'react', 'nextjs', 'sql', 'algorithms']
      });

      const newExamId = result.data.exam_id;
      setExamId(newExamId);

      // Save the baseline image immediately after exam ID is generated
      if (baselineBase64) {
        await proctoringAPI.saveBaselineFace(newExamId, baselineBase64).catch(err => console.error("Baseline save error:", err));
      }

      setCurrentQuestion(result.data.first_question);
      if (result.data.current_round) {
        setCurrentRound(result.data.current_round);
      }
      setStartTime(new Date());
      startExam();
      setShowSetup(false);
    } catch (error) {
      console.error('Failed to start exam:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!examId || !currentQuestion || !answer.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const timeTaken = startTime
        ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
        : 0;

      const result = await examAPI.submitAnswer(examId, {
        question_id: currentQuestion.question_id,
        answer: answer.trim(),
        time_taken: timeTaken,
      });

      // Feedback processed silenty (skip alert)
      if (result.data.ai_feedback) {
        console.log(`Score: ${result.data.score}/10`);
      }

      // Update round if provided
      if (result.data.current_round) {
        setCurrentRound(result.data.current_round);
      }

      // Move to next question
      if (result.data.next_question) {
        setCurrentQuestion(result.data.next_question);
        incrementQuestionNumber();
        setAnswer('');
        setStartTime(new Date());
      } else {
        // No more questions, complete exam
        await handleCompleteExam();
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteExam = async () => {
    if (!examId) return;

    try {
      await examAPI.completeExam(examId);
      router.push(`/report/${examId}`);
    } catch (error) {
      console.error('Failed to complete exam:', error);
    }
  };

  const handleViolation = (severity: number, newIntegrityScore?: number) => {
    console.log(`🚨 Violation detected! Severity: ${severity}, Backend Score: ${newIntegrityScore}`);

    if (severity >= 7) {
      addWarning('High severity violation detected!');
    } else if (severity >= 5) {
      addWarning('Please ensure your face is visible.');
    }

    // Update integrity score with value from backend if available
    if (newIntegrityScore !== undefined) {
      console.log(`📉 Updating integrity score from backend: ${integrityScore} → ${newIntegrityScore}`);
      updateIntegrityScore(newIntegrityScore);
    } else {
      // Fallback calculation (should happen rarely now)
      const calculatedScore = Math.max(0, integrityScore - severity * 2);
      console.log(`📉 Mock updating integrity score: ${integrityScore} → ${calculatedScore}`);
      updateIntegrityScore(calculatedScore);
    }
  };

  if (showSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">System Check & Setup</h1>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Camera & Microphone Check</h2>

            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video mb-4 relative flex items-center justify-center">
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <div className="animate-spin mb-2">
                    <Loader2 className="w-8 h-8" />
                  </div>
                  <p>Initializing camera...</p>
                </div>
              )}

              {!cameraAccess && !checkingSystem && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-red-500">
                  <AlertTriangle className="w-12 h-12 mb-2" />
                  <p className="font-semibold">Camera Access Denied</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-lg border flex items-center gap-3 ${cameraAccess ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <div className={`w-3 h-3 rounded-full ${cameraAccess ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium">{cameraAccess ? 'Camera Connected' : 'Camera Not Found'}</span>
              </div>
              <div className={`p-4 rounded-lg border flex items-center gap-3 ${micAccess ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <div className={`w-3 h-3 rounded-full ${micAccess ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium">{micAccess ? 'Microphone Connected' : 'Microphone Not Found'}</span>
              </div>
            </div>

            {systemError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-1">System Check Failed:</p>
                    <p>{systemError}</p>
                    <button 
                      onClick={() => checkSystem()}
                      className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md font-medium hover:bg-red-200 transition-colors"
                    >
                      Retry System Check
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Privacy & Monitoring Warning:</p>
                  <p className="mb-2">During the exam, your entire screen, camera, and microphone will be monitored. Our AI system tracks:</p>
                  <ul className="list-disc list-inside space-y-1 ml-1 text-yellow-900/80">
                    <li>Face visibility and presence</li>
                    <li>Suspicious audio or voices</li>
                    <li>Tab switching or window focus loss</li>
                    <li>Unauthorized objects (phones, tablets)</li>
                  </ul>
                  <p className="mt-2 font-medium">By proceeding, you consent to this monitoring for integrity purposes.</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={initializeExam}
            disabled={!cameraAccess || !micAccess || checkingSystem || isLoading}
            className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
              ${(!cameraAccess || !micAccess || checkingSystem || isLoading)
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
              }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting Exam...
              </>
            ) : (
              'I Understand - Begin Exam'
            )}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Preparing your exam environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">AI Interview Examination</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                  {currentRound} Round
                </span>
                <p className="text-sm text-gray-500">
                  Question {questionNumber + 1} of {totalQuestions}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <IntegrityPanel score={integrityScore} />
              <button
                onClick={handleCompleteExam}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
              >
                End Exam
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full px-6 py-6">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Question Area */}
          <div className="lg:col-span-4">
            <QuestionDisplay
              question={currentQuestion}
              answer={answer}
              onAnswerChange={setAnswer}
              onSubmit={handleSubmitAnswer}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Proctoring Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-4 sticky top-24">
              <h3 className="font-semibold text-gray-800 mb-4">Proctoring</h3>
              {examId && (
                <CameraMonitor examId={examId} onViolation={handleViolation} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
