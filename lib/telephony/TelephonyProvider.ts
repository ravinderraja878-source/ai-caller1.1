export interface OutboundCallRequest {
  callId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  teacherPhone?: string | null;
  attendanceDate: string;
  collegeName: string;
  teacherName: string;
}

export interface TelephonyCallResult {
  provider: string;
  providerCallId: string;
  status: string;
  message: string;
}

export interface TelephonyStatusResult {
  providerCallId: string;
  status: string;
  duration: number;
  transcript?: string;
  parentResponse?: string;
}

export interface TelephonyProvider {
  name: string;
  makeCall(params: OutboundCallRequest): Promise<TelephonyCallResult>;
  getCallStatus(providerCallId: string): Promise<TelephonyStatusResult>;
  endCall(providerCallId: string): Promise<boolean>;
  validateWebhook(request: Request): Promise<boolean>;
}
