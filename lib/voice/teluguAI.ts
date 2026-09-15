import { ConversationStep } from './types';

export const TELUGU_AI_SYSTEM_PROMPT = `You are a polite Telugu-speaking college attendance assistant. You call the parent or guardian of a student who has been marked absent by their teacher. Your purpose is only to inform the parent about the absence and politely ask the reason for the absence. Never invent student information. Always use the exact student name supplied by the backend. Speak natural, respectful everyday Telugu. Listen carefully to the parent's response, confirm the reason briefly, and end the call politely.`;

export interface AIContext {
  studentName: string;
  parentName: string;
  attendanceDate: string;
  collegeName: string;
  teacherName: string;
}

export function generateInitialGreeting(ctx: AIContext): string {
  return `నమస్కారం. నేను ${ctx.collegeName} నుంచి మాట్లాడుతున్నాను. ఇది ${ctx.studentName} గారి తల్లిదండ్రులతో మాట్లాడుతున్న కాల్ కదా?`;
}

export function generateAbsenceInquiry(ctx: AIContext): string {
  return `ధన్యవాదాలు. ${ctx.studentName} గారు ఈ రోజు (${ctx.attendanceDate}) కాలేజీకి హాజరు కాలేదు. అందుకు కారణం ఏమిటో తెలుసుకోవడానికి కాల్ చేశాము. ఈ రోజు ఎందుకు కాలేజీకి రాలేదో చెప్పగలరా?`;
}

export function generateAcknowledgement(ctx: AIContext, reasonCategory: string): string {
  if (reasonCategory.toLowerCase().includes('fever') || reasonCategory.includes('జ్వరం')) {
    return `సరే, అర్థమైంది. ${ctx.studentName} గారికి జ్వరం వచ్చిందని నమోదు చేస్తున్నాము. త్వరగా కోలుకోవాలని ఆశిస్తున్నాము. సమాచారం ఇచ్చినందుకు ధన్యవాదాలు.`;
  }
  return `సరే, అర్థమైంది. ${ctx.studentName} గారి గైర్హాజరు కారణం నమోదు చేసుకున్నాము. సమాచారం ఇచ్చినందుకు ధన్యవాదాలు.`;
}

export function generateClarificationRequest(ctx: AIContext): string {
  return `క్షమించండి. సులభంగా చెబుతాను. ${ctx.studentName} గారు ఈ రోజు కాలేజీకి రాలేదు. ఎందుకు రాలేదో కారణం చెప్పగలరా?`;
}

export function generateSpeechErrorRetry(): string {
  return `క్షమించండి, మీ మాట సరిగ్గా వినిపించలేదు. మరోసారి చెప్పగలరా?`;
}

export function generateWrongPersonClosing(): string {
  return `సరే. క్షమించండి. ధన్యవాదాలు.`;
}

// Preset realistic parent response scenarios for demo/simulation
export const SAMPLE_SIMULATED_RESPONSES = [
  {
    parentTelugu: "ఆయనకు జ్వరం వచ్చింది, డాక్టర్ దగ్గరకు తీసుకువెళ్లాము.",
    parentEnglish: "He had a fever, we took him to the doctor.",
    extractedReason: "Student has fever (జ్వరం వచ్చింది)",
  },
  {
    parentTelugu: "ఇంట్లో అత్యవసర పని ఉండటంతో ఈ రోజు కాలేజీకి పంపలేదు.",
    parentEnglish: "Couldn't send to college today due to urgent personal work at home.",
    extractedReason: "Urgent family emergency (ఇంట్లో అత్యవసర పని)",
  },
  {
    parentTelugu: "ఈ రోజు ఊరికి వెళ్లాము, రేపు కాలేజీకి వస్తారు.",
    parentEnglish: "We went out of town today, student will attend tomorrow.",
    extractedReason: "Traveling out of town (ఊరికి వెళ్లారు)",
  },
  {
    parentTelugu: "ఉదయం నుండి తలనొప్పిగా ఉంది అని ఇంట్లోనే పడుకున్నాడు.",
    parentEnglish: "Had severe headache since morning and was resting.",
    extractedReason: "Not feeling well / Headache (తలనొప్పి)",
  },
];

export function buildFullMockTranscript(ctx: AIContext, scenarioIndex: number = 0): { transcript: string; parentResponse: string; steps: ConversationStep[] } {
  const scenario = SAMPLE_SIMULATED_RESPONSES[scenarioIndex % SAMPLE_SIMULATED_RESPONSES.length];
  const greeting = generateInitialGreeting(ctx);
  const inquiry = generateAbsenceInquiry(ctx);
  const acknowledgement = generateAcknowledgement(ctx, scenario.extractedReason);

  const steps: ConversationStep[] = [
    {
      speaker: 'AI',
      teluguText: greeting,
      englishTranslation: `Hello. Calling from ${ctx.collegeName}. Is this ${ctx.studentName}'s parent?`,
      timestamp: '00:02',
    },
    {
      speaker: 'PARENT',
      teluguText: `అవునండి, నేను ${ctx.studentName} గారి ${ctx.parentName} ని మాట్లాడుతున్నాను.`,
      englishTranslation: `Yes, speaking as ${ctx.studentName}'s parent ${ctx.parentName}.`,
      timestamp: '00:05',
    },
    {
      speaker: 'AI',
      teluguText: inquiry,
      englishTranslation: `Thank you. ${ctx.studentName} is absent today (${ctx.attendanceDate}). Could you please tell us the reason for absence?`,
      timestamp: '00:08',
    },
    {
      speaker: 'PARENT',
      teluguText: scenario.parentTelugu,
      englishTranslation: scenario.parentEnglish,
      timestamp: '00:14',
    },
    {
      speaker: 'AI',
      teluguText: acknowledgement,
      englishTranslation: `Understood. We have recorded the reason for ${ctx.studentName}. Thank you for informing us.`,
      timestamp: '00:18',
    },
  ];

  const fullTranscriptText = steps.map((s) => `[${s.speaker}]: ${s.teluguText} (${s.englishTranslation})`).join('\n');

  return {
    transcript: fullTranscriptText,
    parentResponse: scenario.extractedReason,
    steps,
  };
}
