import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

import authReducer from './authSlice';
import notesReducer from './notesSlice';
import labelsReducer from './labelsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  notes: notesReducer,
  labels: labelsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

// Factory so tests can start from a fresh, optionally preloaded store.
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export const store = makeStore();

export type AppDispatch = typeof store.dispatch;

// Typed hooks — use these throughout the app instead of the plain hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
