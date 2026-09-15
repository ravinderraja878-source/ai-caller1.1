import { TelephonyProvider, OutboundCallRequest, TelephonyCallResult, TelephonyStatusResult } from './TelephonyProvider';
import { buildFullMockTranscript } from '../voice/teluguAI';

export class MockTelephonyProvider implements TelephonyProvider {
  name = 'mock';

  async makeCall(params: OutboundCallRequest): Promise<TelephonyCallResult> {
    const providerCallId = `MOCK-CALL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      provider: 'mock',
      providerCallId,
      status: 'Initiating',
      message: `[MOCK MODE] Simulated call to parent mobile ${params.parentPhone} for student ${params.studentName}.`,
    };
  }

  async getCallStatus(providerCallId: string): Promise<TelephonyStatusResult> {
    return {
      providerCallId,
      status: 'Completed',
      duration: 24,
      transcript: '[AI]: నమస్కారం. నేను మాల్లా రెడ్డి యూనివర్సిటీ నుంచి మాట్లాడుతున్నాను.\n[PARENT]: అవునండి.\n[AI]: విద్యార్థి ఈ రోజు కాలేజీకి హాజరు కాలేదు.\n[PARENT]: ఆయనకు జ్వరం వచ్చింది.',
      parentResponse: 'Student had fever (జ్వరం వచ్చింది)',
    };
  }

  async endCall(providerCallId: string): Promise<boolean> {
    return true;
  }

  async validateWebhook(request: Request): Promise<boolean> {
    return true;
  }
}
