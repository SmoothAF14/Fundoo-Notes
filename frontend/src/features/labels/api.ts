import { apiRequest } from '../../shared/api/http';
import type { Label } from '../../shared/types';

export async function listLabels(token: string): Promise<Label[]> {
  return apiRequest('/labels/api/labels/', { method: 'GET', token });
}

export async function createLabel(token: string, payload: { title: string }): Promise<Label> {
  return apiRequest('/labels/api/labels/', { method: 'POST', token, body: JSON.stringify(payload) });
}

export async function deleteLabel(token: string, labelId: number): Promise<void> {
  await apiRequest(`/labels/api/labels/${labelId}/`, { method: 'DELETE', token });
}
