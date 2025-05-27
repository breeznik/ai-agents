// src/app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import ChatReducer from './slices/ChatReducer';

export const store = configureStore({
  reducer: {
    chat: ChatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
