// @ts-nocheck
import { createSlice } from "@reduxjs/toolkit";
import { act } from "react";

interface ChatState {
  messages: any;
  isTyping: boolean;
  trigger?: boolean;
  loading: boolean;
}

const initialState: ChatState = {
  messages: [],
  isTyping: false,
  loading: false,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage(state, action: any) {
      state.messages.push(action.payload);
    },
    setTyping(state, action: any) {
      state.isTyping = action.payload;
    },
    clearMessages(state) {
      state.messages = [];
    },
    setTrigger(state, action: any) {
      state.trigger = !state.trigger;
    },
    setLoading(state, action: any) {
      state.loading = action.payload;
      state.isTyping = action.payload;
    },
    updateLastAssistantMessage: (state, action) => {
      const lastIndex = state.messages.length - 1;
      if (state.messages[lastIndex]?.role === "assistant") {
        state.messages[lastIndex].content = action.payload;
      }
    },
  },
});

export const { addMessage, setTyping, clearMessages, setTrigger, updateLastAssistantMessage, setLoading } =
  chatSlice.actions;

export default chatSlice.reducer;
