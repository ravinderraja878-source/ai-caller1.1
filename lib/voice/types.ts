export type CallStatus =
  | 'Initiating'
  | 'Ringing'
  | 'Connected'
  | 'AI Speaking'
  | 'Listening'
  | 'Completed'
  | 'Failed'
  | 'No Answer'
  | 'Busy';

export interface InitiateCallParams {
  callId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  attendanceDate: string;
  collegeName: string;
  teacherName: string;
}

export interface CallResult {
  providerCallId: string;
  status: CallStatus;
  message: string;
}

export interface CallStatusResult {
  providerCallId: string;
  status: CallStatus;
  duration: number;
  transcript?: string;
  parentResponse?: string;
}

export interface ConversationStep {
  speaker: 'AI' | 'PARENT';
  teluguText: string;
  englishTranslation?: string;
  timestamp: string;
}
