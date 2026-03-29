import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  uploadInsuranceDocument,
  getInsuranceDocuments,
  updateInsuranceDocument,
  deleteInsuranceDocument,
} from '../services/routes';

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (m) => m.toUpperCase())
    .trim();
}

export default function Insurance({ userProfile }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [editableText, setEditableText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const userId = userProfile?.uid || userProfile?.email || userProfile?.name || 'anonymous';

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      try {
        const response = await getInsuranceDocuments({ userId });
        const docs = Array.isArray(response?.documents) ? response.documents : [];
        if (cancelled) return;

        setDocuments(docs);
        if (docs.length) {
          setSelectedDocumentId(docs[0].id);
          setEditableText(docs[0].editedText || docs[0].extractedText || '');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load insurance documents.');
        }
      }
    };

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedDocumentId) || null,
    [documents, selectedDocumentId]
  );

  const selectedSavedText = useMemo(
    () => (selectedDocument ? (selectedDocument.editedText || selectedDocument.extractedText || '') : ''),
    [selectedDocument]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedDocument) return false;
    return editableText !== selectedSavedText;
  }, [editableText, selectedSavedText, selectedDocument]);

  const insights = useMemo(() => {
    if (!selectedDocument?.structuredFields || typeof selectedDocument.structuredFields !== 'object') {
      return [];
    }
    return Object.entries(selectedDocument.structuredFields)
      .filter(([, value]) => String(value || '').trim().length > 0)
      .slice(0, 8);
  }, [selectedDocument]);

  const onUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum 10MB allowed.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const response = await uploadInsuranceDocument({ userId, file });
      const doc = response?.document;
      if (!doc) throw new Error('No document returned');

      setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
      setSelectedDocumentId(doc.id);
      setEditableText(doc.editedText || doc.extractedText || '');
    } catch (err) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const onSaveText = async () => {
    if (!selectedDocumentId || !editableText.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const response = await updateInsuranceDocument({
        userId,
        documentId: selectedDocumentId,
        editedText: editableText,
      });
      const updated = response?.document;
      if (!updated) throw new Error('No updated document returned');

      setDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
    } catch (err) {
      setError(err?.message || 'Could not save updates.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (documentId) => {
    try {
      await deleteInsuranceDocument({ userId, documentId });
      const remaining = documents.filter((doc) => doc.id !== documentId);
      setDocuments(remaining);

      if (selectedDocumentId === documentId) {
        const next = remaining[0] || null;
        setSelectedDocumentId(next?.id || null);
        setEditableText(next ? (next.editedText || next.extractedText || '') : '');
      }
    } catch {
      setError('Could not delete document.');
    }
  };

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold">Insurance Assistant</h1>
          <p className="text-blue-50 mt-2">
            Upload your claim docs, review extracted details, then ask the chatbot for tailored guidance.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            {error}
          </div>
        )}

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Upload className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Upload</h2>
          </div>

          <label className={`block border-2 border-dashed rounded-xl p-6 text-center transition ${uploading ? 'opacity-60 border-gray-300 bg-gray-50' : 'border-blue-200 hover:bg-blue-50 cursor-pointer'}`}>
            <input
              type="file"
              onChange={onUpload}
              disabled={uploading}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />
            <p className="font-medium text-gray-800">{uploading ? 'Uploading...' : 'Click to upload document'}</p>
            <p className="text-sm text-gray-500 mt-1">PDF, PNG, JPG, JPEG, WEBP up to 10MB</p>
          </label>

          {documents.length > 0 && (
            <div className="mt-4 space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`rounded-lg border p-3 flex items-center justify-between ${selectedDocumentId === doc.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                >
                  <button
                    type="button"
                    className="text-left flex-1"
                    onClick={() => {
                      setSelectedDocumentId(doc.id);
                      setEditableText(doc.editedText || doc.extractedText || '');
                    }}
                  >
                    <p className="font-medium text-gray-800">{doc.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {Math.round((doc.fileSize || 0) / 1024)} KB • {doc.status || 'processed'}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-600 p-2"
                    onClick={() => onDelete(doc.id)}
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Key Insights</h2>
          </div>

          {!selectedDocument && (
            <p className="text-sm text-gray-600">Upload a document to see extracted insurance details.</p>
          )}

          {selectedDocument && (
            <div className="space-y-4">
              {insights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insights.map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                      <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">{formatLabel(key)}</p>
                      <p className="text-sm text-indigo-900 mt-1">{String(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  No structured insights found yet. You can still edit the extracted text below.
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Review / Correct Extracted Text</p>
                <textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="w-full min-h-48 rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Extracted text appears here..."
                />
                <div className="mt-3 flex justify-end">
                  {hasUnsavedChanges ? (
                    <button
                      type="button"
                      onClick={onSaveText}
                      disabled={saving || !editableText.trim()}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:bg-gray-300"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Already saved</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900">Next Steps</h2>
          </div>

          <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-2">
            <li>Upload your latest insurance document from the claim process.</li>
            <li>Review and correct extracted text or key facts if anything is wrong.</li>
            <li>Open the chatbot and ask insurance questions to get guidance grounded in this document.</li>
          </ol>

          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              The chatbot uses your saved edited text as additional context, so keeping this section accurate improves recommendations.
            </span>
          </div>
        </section>
      </div>
    </Layout>
  );
}
