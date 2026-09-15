import { InitiateCallParams, CallResult, CallStatusResult } from './types';

export interface VoiceProvider {
  name: string;
  initiateCall(params: InitiateCallParams): Promise<CallResult>;
  getCallStatus(providerCallId: string): Promise<CallStatusResult>;
  endCall(providerCallId: string): Promise<boolean>;
  handleWebhook(payload: any): Promise<{ status: string; responseTwiML?: string }>;
}
