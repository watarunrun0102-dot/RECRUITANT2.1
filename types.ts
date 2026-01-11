export interface UserProfile {
  uid: string;
  email: string | null;
}

export enum ApplicationType {
  SELECTION = '本選考',
  INTERNSHIP = 'インターン',
  EVENT = 'イベント',
}

export enum SelectionPhase {
  ES = 'ES',
  TEST = 'テスト',
  GD = 'GD',
  INTERVIEW = '面接',
  FINAL_INTERVIEW = '最終面接',
  OTHER = 'その他選考',
  OFFER = '内定',
  REJECTED = 'お見送り',
  PARTICIPATION_CONFIRMED = '参加確定', // For events/interns
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  industry: string;
  priority: '第一志望群' | '第二志望群' | '第三志望群';
  mypageId: string;
  url: string;
  createdAt: number;
}

export interface Task {
  id: string;
  userId: string;
  companyId: string;
  companyName: string; // Denormalized for easier display
  type: ApplicationType;
  phase: SelectionPhase;
  
  // Date fields (stored as timestamps in milliseconds)
  deadline?: number; // For ES/Test
  eventDate?: number; // For GD/Interview/Event
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  eventEndDate?: number; // For multi-day events
  
  esQuestions: Array<{ question: string; answer: string }>;
  note: string;
  
  isHistory: boolean; // If true, this is a completed/past log
  completedAt?: number;
  
  createdAt: number;
}

export interface CommonText {
  id: string;
  userId: string;
  title: string;
  text300: string;
  text400: string;
  text500: string;
}
