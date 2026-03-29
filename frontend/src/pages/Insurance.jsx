import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Upload, AlertCircle, Clock, Home, DollarSign, FileText, Trash2 } from 'lucide-react';
import {
  uploadInsuranceDocument,
  getInsuranceDocuments,
  updateInsuranceDocument,
  deleteInsuranceDocument,
} from '../services/routes';

export default function Insurance({ userProfile }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [storedDocuments, setStoredDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [editableText, setEditableText] = useState('');

  const userId = userProfile?.uid || userProfile?.email || userProfile?.name || 'anonymous';

  // Load stored documents on mount
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await getInsuranceDocuments({ userId });
        const docs = Array.isArray(response?.documents) ? response.documents : [];
        setStoredDocuments(docs);
        if (docs.length > 0) {
          setSelectedDocumentId(docs[0].id);
          setEditableText(docs[0].editedText || docs[0].extractedText || '');
        }
      } catch (err) {
        console.error('Error loading documents:', err);
      }
    };
    loadDocuments();
  }, [userId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum 10MB allowed.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await uploadInsuranceDocument({ userId, file });
      const docMetadata = response?.document;
      if (!docMetadata) {
        throw new Error('No document metadata returned');
      }
      
      setUploadedFile(docMetadata);
      setStoredDocuments((prev) => [docMetadata, ...prev.filter((doc) => doc.id !== docMetadata.id)]);
      setSelectedDocumentId(docMetadata.id);
      setEditableText(docMetadata.editedText || docMetadata.extractedText || '');
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err?.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await deleteInsuranceDocument({ userId, documentId });
      const remaining = storedDocuments.filter((doc) => doc.id !== documentId);
      setStoredDocuments(remaining);
      if (uploadedFile?.id === documentId) {
        setUploadedFile(null);
      }
      if (selectedDocumentId === documentId) {
        const nextDoc = remaining[0] || null;
        setSelectedDocumentId(nextDoc?.id || null);
        setEditableText(nextDoc ? (nextDoc.editedText || nextDoc.extractedText || '') : '');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again.');
    }
  };

  const handleSelectDocument = (doc) => {
    setSelectedDocumentId(doc.id);
    setEditableText(doc.editedText || doc.extractedText || '');
  };

  const handleSaveEdits = async () => {
    if (!selectedDocumentId || !editableText.trim()) return;
    setSavingEdits(true);
    setError(null);
    try {
      const response = await updateInsuranceDocument({
        userId,
        documentId: selectedDocumentId,
        editedText: editableText,
      });
      const updated = response?.document;
      if (!updated) throw new Error('No updated document returned');

      setStoredDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
      if (uploadedFile?.id === updated.id) {
        setUploadedFile(updated);
      }
    } catch (err) {
      console.error('Error saving edits:', err);
      setError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSavingEdits(false);
    }
  };

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-green-600 rounded-2xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Insurance Guidance</h1>
          <p className="text-blue-50 text-lg">
            {userProfile?.hasInsurance
              ? 'Understand your coverage, timelines, and benefits after evacuation'
              : 'Quick steps to find emergency insurance coverage'}
          </p>
        </div>

        {/* UNINSURED PATH */}
        {!userProfile?.hasInsurance && (
          <>
            {/* Urgent Help Section */}
            <div className="bg-linear-to-r from-red-50 to-orange-50 rounded-xl shadow-sm p-8 border border-red-200">
              <div className="flex items-start space-x-4">
                <AlertCircle className="w-8 h-8 text-red-600 shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-semibold text-red-900 mb-3">You Don't Have Insurance Coverage</h2>
                  <p className="text-red-800 mb-4">
                    Without insurance, recovery becomes much more challenging. However, there are immediate steps you can take to protect yourself and access aid.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Insurance Options */}
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center space-x-3">
                <Home className="w-6 h-6 text-blue-600" />
                <span>Quick Insurance Options</span>
              </h2>

              <div className="space-y-6">
                {/* FAIR Plans */}
                <div className="border-l-4 border-blue-500 pl-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">FAIR Plans (Last Resort Coverage)</h3>
                  <p className="text-gray-600 mb-3">
                    If you've been denied insurance in the private market, you may qualify for a FAIR Plan (Facility and Insurance Rating). These are state-run insurance programs designed as a safety net.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2 ml-4 list-disc">
                    <li><strong>Timeline:</strong> Can apply immediately online or by phone</li>
                    <li><strong>Coverage:</strong> Covers dwelling and contents (limited coverage, higher premiums)</li>
                    <li><strong>What to do:</strong> Contact your state's insurance commissioner's office or insurance agent</li>
                    <li><strong>Note:</strong> Policies typically start 30–45 days after approval</li>
                  </ul>
                </div>

                {/* Temporary Coverage */}
                <div className="border-l-4 border-green-500 pl-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Emergency/Temporary Coverage</h3>
                  <p className="text-gray-600 mb-3">
                    Some insurers offer short-term policies or emergency homeowners insurance while your home is being rebuilt.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2 ml-4 list-disc">
                    <li>Call local insurance agents and ask about emergency reconstruction policies</li>
                    <li>Ask about temporary coverage while waiting for FAIR Plan approval</li>
                    <li>Some specialty insurers work with disaster-affected homeowners</li>
                  </ul>
                </div>

                {/* Renters Insurance */}
                <div className="border-l-4 border-purple-500 pl-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">If You Were a Renter</h3>
                  <p className="text-gray-600 mb-3">
                    Renters insurance is significantly cheaper than homeowners and easier to get, even after a loss.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2 ml-4 list-disc">
                    <li><strong>Cost:</strong> $10–30/month (vs. FAIR Plans at $50–200+/month)</li>
                    <li><strong>Coverage:</strong> Your personal belongings and temporary housing</li>
                    <li><strong>How to get:</strong> Call insurance agents or use online marketplaces (Lemonade, Thimble, etc.)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Government & Non-Profit Aid */}
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center space-x-3">
                <DollarSign className="w-6 h-6 text-green-600" />
                <span>Emergency Financial & Housing Aid (No Insurance Needed)</span>
              </h2>

              <div className="space-y-4 text-gray-700">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="font-semibold text-blue-900 mb-2">FEMA Individual Assistance</p>
                  <p className="text-sm text-blue-800 mb-2">
                    You may qualify for FEMA disaster assistance for housing, medical, and other recovery needs — regardless of insurance status.
                  </p>
                  <p className="text-xs text-blue-700">
                    <strong>How to apply:</strong> DisasterAssistance.gov or call 1-800-621-3362
                  </p>
                </div>

                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="font-semibold text-green-900 mb-2">State Disaster Assistance</p>
                  <p className="text-sm text-green-800">
                    Many states offer additional grants for uninsured or underinsured disaster victims. Contact your state's emergency management agency.
                  </p>
                </div>

                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                  <p className="font-semibold text-purple-900 mb-2">Non-Profit Organizations</p>
                  <p className="text-sm text-purple-800 mb-2">
                    Organizations like the Red Cross, United Way, and local nonprofits provide emergency grants for disaster survivors.
                  </p>
                  <p className="text-xs text-purple-700">
                    <strong>Search:</strong> DisasterRecoveryFunding.org or contact 211 (dial 2-1-1)
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 mb-3">Your Next Steps</h3>
              <ol className="text-yellow-800 text-sm space-y-2 ml-4 list-decimal">
                <li><strong>Apply for FEMA assistance immediately</strong> (don't wait for insurance)</li>
                <li><strong>Contact your state's insurance commissioner</strong> to inquire about FAIR Plan eligibility</li>
                <li><strong>Call local insurance agents</strong> to ask about emergency/temporary coverage options</li>
                <li><strong>Reach out to 211</strong> for non-profit aid and local resources</li>
                <li><strong>Document everything</strong> (photos, receipts) for insurance or aid applications</li>
              </ol>
            </div>
          </>
        )}

        {/* INSURED PATH */}
        {userProfile?.hasInsurance && (
          <>
            {/* Insurance Status Summary */}
            <div className={`rounded-xl shadow-sm p-6 border ${
              userProfile.insuranceClaimStatus === 'Approved'
                ? 'bg-green-50 border-green-200'
                : userProfile.insuranceClaimStatus === 'Denied'
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <p className="font-semibold text-gray-800 mb-1">Your Insurance Status</p>
              <p className={`text-sm ${
                userProfile.insuranceClaimStatus === 'Approved'
                  ? 'text-green-700'
                  : userProfile.insuranceClaimStatus === 'Denied'
                  ? 'text-red-700'
                  : 'text-blue-700'
              }`}>
                Coverage: <strong>{userProfile.insuranceType}</strong> | 
                Claim Status: <strong>{userProfile.insuranceClaimStatus || 'Not provided'}</strong>
              </p>
            </div>

            {/* Document Upload */}
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-800">Upload Your Insurance Document</h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  Upload your insurance policy, declaration page, or claim documents. We'll store them securely and use AI to extract key information like coverage limits, deductibles, and important deadlines.
                </p>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-blue-50 transition">
                  <input
                    type="file"
                    id="insurance-upload"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="hidden"
                  />
                  <label htmlFor="insurance-upload" className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium mb-1">
                      {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-500">PDF, PNG, JPG, DOC up to 10MB</p>
                  </label>
                </div>

                {/* Stored Documents List */}
                {storedDocuments.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-800">Your Documents ({storedDocuments.length})</h3>
                    {storedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`p-4 border rounded-lg cursor-pointer transition ${
                          selectedDocumentId === doc.id
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-green-50 border-green-200 hover:border-blue-200'
                        }`}
                        onClick={() => handleSelectDocument(doc)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-green-800 flex items-center space-x-2">
                              <FileText className="w-4 h-4" />
                              <span>{doc.fileName}</span>
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              {(doc.fileSize / 1024).toFixed(1)} KB • Uploaded{' '}
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                            <p className={`text-xs mt-1 font-medium ${
                              doc.status === 'pending_ai_analysis' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              Status: {doc.status.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id);
                            }}
                            className="text-green-700 hover:text-red-700 transition p-2"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedFile && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      ✓ Document processed. Review and edit extracted text below before chatting with the assistant.
                    </p>
                  </div>
                )}

                {selectedDocumentId && (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800">Review Extracted Text</h4>
                      <button
                        onClick={handleSaveEdits}
                        disabled={savingEdits || !editableText.trim()}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:bg-gray-300"
                      >
                        {savingEdits ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Correct anything parsed incorrectly. The assistant will use this edited version for insurance guidance.
                    </p>
                    <textarea
                      value={editableText}
                      onChange={(e) => setEditableText(e.target.value)}
                      className="w-full min-h-56 rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Extracted text from your insurance document will appear here..."
                    />
                  </div>
                )}
              </div>
            </div>
            </>
        )}

        {/* Coverage Timelines - Only show if insured */}
        {userProfile?.hasInsurance && (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <Clock className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-semibold text-gray-800">Coverage Timelines</h2>
            </div>

          <div className="space-y-6">
            <div className="border-l-4 border-green-500 pl-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Claim Filing</h3>
              <p className="text-gray-600 mb-3">
                Most insurance policies require claims to be filed within 1–2 years of the loss date. However, it's best to file as soon as possible.
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Notify your insurer within 30 days of loss (typical requirement)</li>
                <li>Provide proof of loss documentation within 60–90 days</li>
                <li>Document all damage with photos and written descriptions</li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-500 pl-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Adjuster Assignment & Inspection</h3>
              <p className="text-gray-600 mb-3">
                After filing, an insurance adjuster will be assigned to inspect damage and estimate repair/replacement costs.
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Initial assignment: 5–10 business days after claim filed</li>
                <li>Inspection scheduling: 1–3 weeks after assignment</li>
                <li>You can request a public adjuster to help you (at your own cost)</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 pl-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Settlement & Payment</h3>
              <p className="text-gray-600 mb-3">
                Once the claim is approved, payment timelines depend on your policy and claim complexity.
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Simple claims: 2–4 weeks after approval</li>
                <li>Complex claims: 1–3 months (disputes, appraisals, etc.)</li>
                <li>Deductible amount will be subtracted from payment</li>
              </ul>
            </div>
          </div>
        </div>
        )}

        {/* Housing Assistance - Only show if insured */}
        {userProfile?.hasInsurance && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <Home className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-800">Housing Assistance Coverage</h2>
          </div>

          <div className="space-y-4 text-gray-700">
            <p>
              Most homeowners and renters insurance policies include coverage for temporary housing while your home is being repaired or rebuilt.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="font-semibold text-blue-900 mb-2">What is typically covered?</p>
              <ul className="text-sm space-y-2 ml-4 list-disc">
                <li>Hotel, motel, or temporary rental costs</li>
                <li>Additional food expenses beyond normal living costs</li>
                <li>Storage fees for personal belongings</li>
                <li>Pet boarding (in some policies)</li>
              </ul>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="font-semibold text-green-900 mb-2">Coverage limits</p>
              <ul className="text-sm space-y-2 ml-4 list-disc">
                <li>Usually 20–30% of your dwelling coverage limit</li>
                <li>May be capped at $50–200 per day depending on policy</li>
                <li>Coverage period typically 12–24 months</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p className="font-semibold text-yellow-900 mb-2">What to do</p>
              <ul className="text-sm space-y-2 ml-4 list-disc">
                <li>Keep all receipts for temporary housing and meals</li>
                <li>Submit documentation to your insurer within 30 days of expenses</li>
                <li>Ask about the maximum benefit amount for your claim</li>
              </ul>
            </div>
          </div>
        </div>
        )}

        {/* Additional Living Expenses (ALE) - Only show if insured */}
        {userProfile?.hasInsurance && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-semibold text-gray-800">Additional Living Expenses (ALE)</h2>
          </div>

          <div className="space-y-4 text-gray-700">
            <p>
              ALE (also called "Loss of Use" coverage) reimburses you for extra costs you incur while temporarily displaced from your home.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="font-semibold text-blue-900 mb-2">Examples of ALE-covered expenses</p>
              <ul className="text-sm space-y-2 ml-4 list-disc">
                <li>Temporary housing (rental home, apartment, hotel)</li>
                <li>Utilities not normally paid (if renting temporary)</li>
                <li>Increased food and meals (above normal spending)</li>
                <li>Laundry and clothing replacement (limited)</li>
                <li>Pet boarding or kennel fees</li>
              </ul>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="font-semibold text-green-900 mb-2">What ALE does NOT cover</p>
              <ul className="text-sm space-y-2 ml-4 list-disc">
                <li>Rent or mortgage on original home</li>
                <li>Personal luxury items</li>
                <li>Childcare (separate coverage if available)</li>
                <li>Entertainment or vacation expenses</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p className="font-semibold text-yellow-900 mb-2">Tips for ALE claims</p>
              <ul className="text-sm space-y-2 ml-4 list-disc">
                <li><strong>Document everything:</strong> Save all receipts for housing, meals, and incidentals</li>
                <li><strong>Report promptly:</strong> Notify your insurer immediately about displacement</li>
                <li><strong>Know your limit:</strong> Ask for your policy's ALE limit (often 20–30% of dwelling coverage)</li>
                <li><strong>Submit regularly:</strong> File claims in monthly batches with supporting receipts</li>
              </ul>
            </div>
          </div>
        </div>
        )}

        {/* Help Section - Only show if insured */}
        {userProfile?.hasInsurance && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Need help with your claim?</h3>
          <p className="text-blue-800 text-sm mb-4">
            If you're unsure about coverage details, deductibles, or claim procedures, reach out to your insurance agent or the insurance company's claims department directly.
          </p>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>Tip:</strong> Keep a copy of your policy declaration page handy. It outlines your coverage limits and key details.
            </p>
          </div>
        </div>
        )}
      </div>
    </Layout>
  );
}
