
// @ts-nocheck
import { createSlice } from '@reduxjs/toolkit';


interface ChatState {
  messages: any;
  isTyping: boolean;
  trigger: boolean
}

const initialState: ChatState = {
  messages: [],
  isTyping: false,
};

const chatSlice = createSlice({
  name: 'chat',
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
    setTrigger(state , action:any){
      state.trigger = !state.trigger;
    }
  },
});

export const { addMessage, setTyping, clearMessages  , setTrigger} = chatSlice.actions;

export default chatSlice.reducer;
