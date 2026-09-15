import { VoiceProvider } from './VoiceProviderInterface';
import { MockVoiceProvider } from './MockVoiceProvider';

let activeProviderInstance: VoiceProvider | null = null;

export function getVoiceProvider(): VoiceProvider {
  if (activeProviderInstance) {
    return activeProviderInstance;
  }

  // Uses MockVoiceProvider for audio synthesis / demo simulations
  activeProviderInstance = new MockVoiceProvider();
  return activeProviderInstance;
}

export function getActiveVoiceMode(): 'mock' | 'production' {
  const voiceMode = (process.env.VOICE_MODE || 'personal_sim').toLowerCase();
  return voiceMode === 'production' || voiceMode === 'personal_sim' ? 'production' : 'mock';
}

