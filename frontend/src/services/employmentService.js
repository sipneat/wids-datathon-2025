import { defaultEmploymentPageConfig, defaultEmploymentInputs, defaultEmploymentResources, defaultReopeningInference } from '../data/employmentData';
import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class EmploymentService {
  async getAuthToken() {
    const user = auth?.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  }

  async fetchEmploymentData(userProfile, options = {}) {
    try {
      const token = await this.getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams();
      if (userProfile?.zipCode) params.append('zipCode', userProfile.zipCode);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/employment${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) throw new Error(`API returned status ${response.status}`);

      const data = await response.json();
      return {
        pageConfig: data.pageConfig || defaultEmploymentPageConfig,
        inputsConfig: data.inputsConfig || defaultEmploymentInputs,
        resources: data.resources || defaultEmploymentResources,
        reopeningInference: data.reopeningInference || defaultReopeningInference,
      };
    } catch (error) {
      console.error('Error fetching employment data from API:', error);
      return this.getDefaultEmploymentData();
    }
  }

  async fetchRecommendations(userProfile, options = {}) {
    try {
      const token = await this.getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/employment/recommendations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userProfile: userProfile || null,
          intakeResponses: options.intakeResponses || null,
          jobStatus: options.jobStatus || 'uncertain',
          healthConstraint: options.healthConstraint || 'none',
          caregivingLoad: options.caregivingLoad || 'none',
          businessNearFire: options.businessNearFire ?? false,
          fireSeverity: options.fireSeverity || 'unknown',
        }),
      });

      if (!response.ok) throw new Error(`API returned status ${response.status}`);

      const data = await response.json();
      return {
        pageConfig: data.pageConfig || defaultEmploymentPageConfig,
        inputsConfig: data.inputsConfig || defaultEmploymentInputs,
        resources: data.resources || defaultEmploymentResources,
        reopeningInference: data.reopeningInference || defaultReopeningInference,
        recommendation: data.recommendation || null,
      };
    } catch (error) {
      console.error('Error fetching employment recommendations:', error);
      return this.getDefaultEmploymentData();
    }
  }

  getDefaultEmploymentData() {
    return {
      pageConfig: defaultEmploymentPageConfig,
      inputsConfig: defaultEmploymentInputs,
      resources: defaultEmploymentResources,
      reopeningInference: defaultReopeningInference,
    };
  }

  async getEmploymentData(userProfile, options = {}) {
    const hasInputs =
      options.jobStatus ||
      options.healthConstraint ||
      options.caregivingLoad ||
      options.businessNearFire ||
      options.fireSeverity;

    if (hasInputs) {
      return this.fetchRecommendations(userProfile, options);
    }
    return this.fetchEmploymentData(userProfile, options);
  }
}

export default new EmploymentService();

