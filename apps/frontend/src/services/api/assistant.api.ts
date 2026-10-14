import { API_CONFIG } from './config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AssistantChatResponse {
  reply: string;
  toolUsed?: string;
  uiPayload?: {
    cardType: 'journey' | 'live_station' | 'digital_twin' | 'error';
    data: any;
  };
}

export async function sendAssistantMessage(
  message: string,
  city?: string,
  history: ChatMessage[] = [],
): Promise<AssistantChatResponse> {
  const response = await fetch(`${API_CONFIG.baseUrl}/assistant/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, city, history }),
  });

  if (!response.ok) {
    throw new Error(`Assistant API failed: ${response.statusText}`);
  }

  return response.json();
}
