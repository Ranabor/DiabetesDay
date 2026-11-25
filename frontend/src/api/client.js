/**
 * Thin API Client for simglucose booth backend.
 * Uses local relative URLs so it works out-of-the-box both with Vite dev proxy
 * and with FastAPI static asset serving.
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchMetadata() {
  const res = await fetch(`${API_BASE}/metadata`);
  if (!res.ok) throw new Error(`Failed to load simulator metadata: ${res.statusText}`);
  return res.json();
}

export async function runSimulation(payload) {
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Simulation failed: ${res.statusText}`);
  }
  return res.json();
}

export async function runComparison(payload) {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Comparison failed: ${res.statusText}`);
  }
  return res.json();
}

export async function runDietComparison(payload) {
  const res = await fetch(`${API_BASE}/compare-diets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Diet comparison failed: ${res.statusText}`);
  }
  return res.json();
}

export async function runPatientComparison(payload) {
  const res = await fetch(`${API_BASE}/compare-patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Patient comparison failed: ${res.statusText}`);
  }
  return res.json();
}
