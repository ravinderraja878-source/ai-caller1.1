import { VoiceProvider } from './VoiceProviderInterface';
import { InitiateCallParams, CallResult, CallStatusResult, CallStatus } from './types';
import { buildFullMockTranscript } from './teluguAI';

// In-memory mock call registry for active simulated calls
const activeMockCalls = new Map<
  string,
  {
    callId: string;
    params: InitiateCallParams;
    status: CallStatus;
    startTime: number;
    transcript?: string;
    parentResponse?: string;
  }
>();

export class MockVoiceProvider implements VoiceProvider {
  name = 'MockVoiceProvider';

  async initiateCall(params: InitiateCallParams): Promise<CallResult> {
    const providerCallId = `MOCK-CALL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const { transcript, parentResponse } = buildFullMockTranscript(
      {
        studentName: params.studentName,
        parentName: params.parentName,
        attendanceDate: params.attendanceDate,
        collegeName: params.collegeName,
        teacherName: params.teacherName,
      },
      Math.floor(Math.random() * 4)
    );

    activeMockCalls.set(providerCallId, {
      callId: params.callId,
      params,
      status: 'Initiating',
      startTime: Date.now(),
      transcript,
      parentResponse,
    });

    return {
      providerCallId,
      status: 'Initiating',
      message: `Mock AI Telugu call initiated to parent ${params.parentName} (${params.parentPhone}) for student ${params.studentName}.`,
    };
  }

  async getCallStatus(providerCallId: string): Promise<CallStatusResult> {
    const callData = activeMockCalls.get(providerCallId);
    if (!callData) {
      return {
        providerCallId,
        status: 'Completed',
        duration: 25,
        parentResponse: 'Student had fever (జ్వరం వచ్చింది)',
        transcript: '[AI]: నమస్కారం. నేను కాలేజీ నుంచి మాట్లాడుతున్నాను.\n[PARENT]: అవునండి.\n[AI]: విద్యార్థి ఈ రోజు కాలేజీకి హాజరు కాలేదు.\n[PARENT]: ఆయనకు జ్వరం వచ్చింది.',
      };
    }

    const elapsedMs = Date.now() - callData.startTime;

    if (elapsedMs < 3000) {
      callData.status = 'Initiating';
    } else if (elapsedMs < 6000) {
      callData.status = 'Ringing';
    } else if (elapsedMs < 10000) {
      callData.status = 'Connected';
    } else if (elapsedMs < 15000) {
      callData.status = 'AI Speaking';
    } else if (elapsedMs < 20000) {
      callData.status = 'Listening';
    } else {
      callData.status = 'Completed';
    }

    const durationSeconds = Math.floor(elapsedMs / 1000);

    return {
      providerCallId,
      status: callData.status,
      duration: durationSeconds,
      transcript: callData.status === 'Completed' ? callData.transcript : undefined,
      parentResponse: callData.status === 'Completed' ? callData.parentResponse : undefined,
    };
  }

  async endCall(providerCallId: string): Promise<boolean> {
    const callData = activeMockCalls.get(providerCallId);
    if (callData) {
      callData.status = 'Completed';
      return true;
    }
    return false;
  }

  async handleWebhook(payload: any): Promise<{ status: string }> {
    return { status: 'mock_webhook_processed' };
  }
}
