import { create } from 'zustand';
import { Question } from '@/lib/api';

interface ExamState {
  examId: string | null;
  currentQuestion: Question | null;
  questionNumber: number;
  totalQuestions: number;
  integrityScore: number;
  warnings: string[];
  isProctoring: boolean;
  startTime: Date | null;

  currentRound: string;
  setExamId: (id: string) => void;
  setCurrentQuestion: (question: Question) => void;
  setCurrentRound: (round: string) => void;
  incrementQuestionNumber: () => void;
  updateIntegrityScore: (score: number) => void;
  addWarning: (warning: string) => void;
  setProctoring: (active: boolean) => void;
  startExam: () => void;
  resetExam: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
  examId: null,
  currentQuestion: null,
  questionNumber: 0,
  totalQuestions: 10,
  integrityScore: 100,
  warnings: [],
  isProctoring: false,
  startTime: null,
  currentRound: 'aptitude',

  setExamId: (id) => set({ examId: id }),

  setCurrentQuestion: (question) => set({ currentQuestion: question }),

  setCurrentRound: (round) => set({ currentRound: round }),

  incrementQuestionNumber: () => set((state) => ({
    questionNumber: state.questionNumber + 1
  })),

  updateIntegrityScore: (score) => set({ integrityScore: score }),

  addWarning: (warning) => set((state) => ({
    warnings: [...state.warnings, warning]
  })),

  setProctoring: (active) => set({ isProctoring: active }),

  startExam: () => set({ startTime: new Date() }),

  resetExam: () => set({
    examId: null,
    currentQuestion: null,
    questionNumber: 0,
    integrityScore: 100,
    warnings: [],
    isProctoring: false,
    startTime: null,
    currentRound: 'aptitude',
  }),
}));
