import { TelephonyProvider } from './TelephonyProvider';
import { SimGatewayProvider } from './SimGatewayProvider';
import { MockTelephonyProvider } from './MockTelephonyProvider';

let activeTelephonyInstance: TelephonyProvider | null = null;

export function getTelephonyProvider(): TelephonyProvider {
  if (activeTelephonyInstance) {
    return activeTelephonyInstance;
  }

  const voiceMode = (process.env.VOICE_MODE || 'personal_sim').toLowerCase();

  if (voiceMode === 'production' || voiceMode === 'personal_sim' || voiceMode === 'live') {
    activeTelephonyInstance = new SimGatewayProvider();
  } else {
    activeTelephonyInstance = new MockTelephonyProvider();
  }

  return activeTelephonyInstance;
}

export function resetTelephonyProvider() {
  activeTelephonyInstance = null;
}

export function isLiveCallingActive(): boolean {
  const voiceMode = (process.env.VOICE_MODE || 'personal_sim').toLowerCase();
  return voiceMode === 'production' || voiceMode === 'personal_sim' || voiceMode === 'live';
}

