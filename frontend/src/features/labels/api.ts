import { apiRequest } from '@/shared/api/http';
import type { Label } from '@/shared/types';

export async function listLabels(): Promise<Label[]> {
  return apiRequest('/labels/api/labels/', { method: 'GET' });
}

export async function createLabel(title: string): Promise<Label> {
  return apiRequest('/labels/api/labels/', { method: 'POST', body: JSON.stringify({ title }) });
}

export async function renameLabel(labelId: number, title: string): Promise<Label> {
  return apiRequest(`/labels/api/labels/${labelId}/`, { method: 'PATCH', body: JSON.stringify({ title }) });
}

export async function deleteLabel(labelId: number): Promise<void> {
  await apiRequest(`/labels/api/labels/${labelId}/`, { method: 'DELETE' });
}
