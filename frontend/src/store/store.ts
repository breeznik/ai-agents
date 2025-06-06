// src/app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import ChatReducer from './slices/chat.slice';

export const store = configureStore({
  reducer: {
    chat: ChatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
