import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from './providers/RequireAuth';
import { AppLayout } from '../shared/layout/AppLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { LoginOtpVerifyPage } from '../features/auth/pages/LoginOtpVerifyPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { RegisterOtpVerifyPage } from '../features/auth/pages/RegisterOtpVerifyPage';
import { NotesPage } from '../features/notes/pages/NotesPage';
import { NoteCreatePage } from '../features/notes/pages/NoteCreatePage';
import { NoteEditPage } from '../features/notes/pages/NoteEditPage';
import { LabelsPage } from '../features/labels/pages/LabelsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app/notes" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/auth/login/verify" element={<LoginOtpVerifyPage />} />
        <Route path="/auth/register/verify" element={<RegisterOtpVerifyPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/app" element={<AppLayout />}>
            <Route path="notes" element={<NotesPage />} />
            <Route path="shared" element={<NotesPage mode="shared" />} />
            <Route path="notes/new" element={<NoteCreatePage />} />
            <Route path="notes/:id/edit" element={<NoteEditPage />} />
            <Route path="labels" element={<LabelsPage />} />
            <Route index element={<Navigate to="notes" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
