/**
 * Insurance document storage service
 * Uses IndexedDB for client-side storage with larger capacity than localStorage
 * Ready to integrate with backend/AI model
 */

const DB_NAME = 'wids-recovery-db';
const DB_VERSION = 1;
const STORE_NAME = 'insuranceDocuments';

class InsuranceStorageService {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the IndexedDB database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Save an insurance document
   * @param {File} file - The file object from input
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} The stored document metadata
   */
  async saveDocument(file, userId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const document = {
          id: `${userId}_${Date.now()}`,
          userId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileContent: reader.result, // ArrayBuffer
          uploadedAt: new Date().toISOString(),
          status: 'pending_ai_analysis' // Status for future AI processing
        };

        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(document);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          // Return metadata without the large fileContent
          resolve({
            id: document.id,
            fileName: document.fileName,
            fileType: document.fileType,
            fileSize: document.fileSize,
            uploadedAt: document.uploadedAt,
            status: document.status
          });
        };
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Get a document by ID (full content for API calls)
   * @param {string} documentId - The document ID
   * @returns {Promise<Object>} The full document with content
   */
  async getDocument(documentId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(documentId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get all documents for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} Array of document metadata (without content)
   */
  async getUserDocuments(userId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const documents = request.result.map((doc) => ({
          id: doc.id,
          fileName: doc.fileName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt,
          status: doc.status
        }));
        resolve(documents);
      };
    });
  }

  /**
   * Delete a document
   * @param {string} documentId - The document ID
   */
  async deleteDocument(documentId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(documentId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * Get the latest document for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} The most recently uploaded document metadata
   */
  async getLatestDocument(userId) {
    const documents = await this.getUserDocuments(userId);
    if (documents.length === 0) return null;
    return documents.sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    )[0];
  }

  /**
   * Format document for API call (converts ArrayBuffer to Base64)
   * @param {string} documentId - The document ID
   * @returns {Promise<Object>} Document with fileContent as Base64 string
   */
  async formatForAPI(documentId) {
    const doc = await this.getDocument(documentId);
    if (!doc) return null;

    // Convert ArrayBuffer to Base64
    const binary = String.fromCharCode.apply(null, new Uint8Array(doc.fileContent));
    const base64Content = btoa(binary);

    return {
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
      fileContent: base64Content // Base64 string ready for API
    };
  }

  /**
   * Update document status (for tracking AI analysis progress)
   * @param {string} documentId - The document ID
   * @param {string} status - New status (e.g., 'analyzing', 'analyzed', 'error')
   */
  async updateDocumentStatus(documentId, status) {
    if (!this.db) await this.init();

    const doc = await this.getDocument(documentId);
    if (!doc) throw new Error('Document not found');

    return new Promise((resolve, reject) => {
      doc.status = status;
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(doc);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(doc);
    });
  }
}

// Export singleton instance
export default new InsuranceStorageService();
