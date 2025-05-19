
// @ts-nocheck
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  toolInvocations?: any[];
  attachments?: any[];
}

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
}

const initialState: ChatState = {
  messages: [],
  isTyping: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    setTyping(state, action: PayloadAction<boolean>) {
      state.isTyping = action.payload;
    },
    clearMessages(state) {
      state.messages = [];
    },
  },
});

export const { addMessage, setTyping, clearMessages } = chatSlice.actions;

export default chatSlice.reducer;
