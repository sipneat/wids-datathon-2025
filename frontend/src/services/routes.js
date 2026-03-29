const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = `${API_BASE_URL}/api`;
const USER_ID_HEADER = 'X-User-Id';

async function requestJson(path, { method = 'GET', userId, headers = {}, body } = {}) {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (userId) {
    mergedHeaders[USER_ID_HEADER] = userId;
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    method,
    credentials: 'include',
    headers: mergedHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function getRootRoutes() {
  const response = await fetch(`${API_BASE_URL}/`, { method: 'GET', credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getApiHealth() {
  return requestJson('');
}

export async function submitIntake({ userId, payload }) {
  return requestJson('/intake/submit', {
    method: 'POST',
    userId,
    body: payload
  });
}

export async function getUserProfile(userId) {
  try {
    return await requestJson('/user/profile', { userId });
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getUserIntake(userId) {
  return requestJson('/user/intake', { userId });
}

export async function updateUserAction({ userId, actionId, status }) {
  return requestJson('/user/actions', {
    method: 'POST',
    userId,
    body: {
      userId,
      actionId,
      status
    }
  });
}

export async function getUserActions(userId) {
  return requestJson(`/user/actions/${userId}`, { userId });
}

export async function sendChatMessage({ userId, message, context = {}, conversationId = null }) {
  return requestJson('/chat', {
    method: 'POST',
    userId,
    body: {
      message,
      context,
      conversationId
    }
  });
}

export async function getChatHistory({ userId, conversationId }) {
  return requestJson(`/chat/history/${conversationId}`, { userId });
}

export async function getLatestChat({ userId }) {
  return requestJson('/chat/latest', { userId });
}
