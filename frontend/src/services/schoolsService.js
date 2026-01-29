/**
 * Schools data service
 * Fetches schools data from API or uses default data
 * Ready to integrate with backend API
 */

import { defaultSchools, defaultEnrollmentSteps, defaultResources, defaultOnlineOptions, defaultRecoveryPlans } from '../data/schoolsData';
import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class SchoolsService {
  /**
   * Get auth token for API requests
   */
  async getAuthToken() {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    return await user.getIdToken();
  }

  /**
   * Fetch schools data from API
   * @param {Object} userProfile - User profile with location, children info, etc.
   * @returns {Promise<Object>} Schools data object
   */
  async fetchSchoolsData(userProfile, options = {}) {
    try {
      const token = await this.getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Build query params based on user profile + options
      const params = new URLSearchParams();
      if (userProfile?.location) {
        params.append('location', userProfile.location);
      }
      if (userProfile?.zipCode) {
        params.append('zipCode', userProfile.zipCode);
      }
      if (userProfile?.childrenAges) {
        params.append('childrenAges', JSON.stringify(userProfile.childrenAges));
      }
      if (options?.homeZip) {
        params.append('homeZip', options.homeZip);
      }

      const queryString = params.toString();
      const url = `${API_BASE_URL}/schools${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          schools: data.schools || [],
          enrollmentSteps: data.enrollmentSteps || [],
          resources: data.resources || [],
          onlineOptions: data.onlineOptions || [],
          recoveryPlans: data.recoveryPlans || [],
          pageConfig: data.pageConfig || null,
          filterOptions: data.filterOptions || null,
          statsConfig: data.statsConfig || null,
        };
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching schools data from API:', error);
      // Fall back to default data
      return this.getDefaultSchoolsData(userProfile);
    }
  }

  /**
   * Get default schools data (fallback)
   * Can be personalized based on userProfile
   * @param {Object} userProfile - User profile for personalization
   * @returns {Object} Default schools data
   */
  getDefaultSchoolsData(userProfile) {
    // Filter schools based on user profile if available
    let schools = [...defaultSchools];

    // If user has children ages, filter schools by grade level
    if (userProfile?.childrenAges && Array.isArray(userProfile.childrenAges)) {
      // This is a simple example - you could make it more sophisticated
      const hasElementaryAge = userProfile.childrenAges.some(age => age >= 5 && age <= 11);
      const hasMiddleAge = userProfile.childrenAges.some(age => age >= 11 && age <= 14);
      const hasHighAge = userProfile.childrenAges.some(age => age >= 14 && age <= 18);

      if (!hasElementaryAge && !hasMiddleAge && !hasHighAge) {
        // If no matching ages, return all schools
        schools = defaultSchools;
      } else {
        // Filter schools that match the children's ages
        schools = defaultSchools.filter(school => {
          if (hasElementaryAge && school.type.includes('Elementary')) return true;
          if (hasMiddleAge && school.type.includes('Middle')) return true;
          if (hasHighAge && school.type.includes('High')) return true;
          return false;
        });

        // If filtering results in empty array, return all schools
        if (schools.length === 0) {
          schools = defaultSchools;
        }
      }
    }

    return {
      schools,
      enrollmentSteps: defaultEnrollmentSteps,
      resources: defaultResources,
      onlineOptions: defaultOnlineOptions,
      recoveryPlans: defaultRecoveryPlans,
      pageConfig: null, // Use component defaults
      filterOptions: null, // Use component defaults
      statsConfig: null, // Use component defaults
    };
  }

  /**
   * DB-backed recommendation call:
   * - schools outside fire radius (if available in DB)
   * - near parent job locations
   * - with enrollment timeline
   *
   * Backend contract (suggested):
   * POST /api/schools/recommendations
   * body: { userProfile, intakeResponses, homeZip, workZips, maxCommuteMinutes, preferOutsideFireRadius }
   */
  async fetchRecommendedSchools(userProfile, options = {}) {
    try {
      const token = await this.getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/schools/recommendations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userProfile: userProfile || null,
          intakeResponses: options.intakeResponses || null,
          homeZip: options.homeZip || userProfile?.zipCode || null,
          workZips: options.workZips || [],
          maxCommuteMinutes: options.maxCommuteMinutes ?? 30,
          preferOutsideFireRadius: options.preferOutsideFireRadius ?? true
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      return {
        schools: data.schools || [],
        enrollmentSteps: data.enrollmentSteps || [],
        resources: data.resources || [],
        onlineOptions: data.onlineOptions || [],
        recoveryPlans: data.recoveryPlans || [],
        pageConfig: data.pageConfig || null,
        filterOptions: data.filterOptions || null,
        statsConfig: data.statsConfig || null,
      };
    } catch (error) {
      console.error('Error fetching recommended schools from API:', error);
      return this.getDefaultSchoolsData(userProfile);
    }
  }

  /**
   * Get schools data (tries API first, falls back to defaults)
   * @param {Object} userProfile - User profile
   * @param {Object} options - Query options (intakeResponses, workZips, etc.)
   * @returns {Promise<Object>} Schools data object
   */
  async getSchoolsData(userProfile, options = {}) {
    // Try to fetch from API first
    try {
      // If the user provided recommendation inputs, prefer the recommendations endpoint
      const hasRecommendationInputs =
        (options.workZips && options.workZips.length > 0) ||
        options.preferOutsideFireRadius === true;

      const data = hasRecommendationInputs
        ? await this.fetchRecommendedSchools(userProfile, options)
        : await this.fetchSchoolsData(userProfile, options);
      return data;
    } catch (error) {
      console.error('Failed to fetch schools data, using defaults:', error);
      return this.getDefaultSchoolsData(userProfile);
    }
  }

  /**
   * Search schools by location/zip code
   * @param {string} zipCode - ZIP code to search
   * @param {Object} userProfile - User profile
   * @returns {Promise<Array>} Filtered schools array
   */
  async searchSchoolsByLocation(zipCode, userProfile) {
    try {
      const token = await this.getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/schools/search?zipCode=${zipCode}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        return data.schools || [];
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (error) {
      console.error('Error searching schools by location:', error);
      // Fall back to filtering default schools
      return defaultSchools.filter(school => 
        school.address?.includes(zipCode) || 
        school.zipCode === zipCode
      );
    }
  }

  /**
   * Get enrollment steps (can be customized per user)
   * @param {Object} userProfile - User profile
   * @returns {Array} Enrollment steps
   */
  getEnrollmentSteps(userProfile) {
    // Could customize steps based on userProfile
    return defaultEnrollmentSteps;
  }

  /**
   * Get resources (can be customized per user)
   * @param {Object} userProfile - User profile
   * @returns {Array} Resources
   */
  getResources(userProfile) {
    // Could customize resources based on userProfile
    return defaultResources;
  }
}

// Export singleton instance
export default new SchoolsService();
