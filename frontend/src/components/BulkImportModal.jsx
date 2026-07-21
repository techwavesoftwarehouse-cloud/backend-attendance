import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';

const BulkImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file.');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('csv', file);

    try {
      const { data } = await axiosInstance.post('/api/admin/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import students.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setResults(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div
              className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-lg font-semibold text-white">Bulk Import Students</h2>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5">
                {results ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">✅</div>
                      <h3 className="text-white font-medium">Import Complete</h3>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 text-sm flex flex-col gap-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Created:</span>
                        <span className="text-emerald-400 font-bold">{results.created.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Skipped (duplicate):</span>
                        <span className="text-amber-400 font-bold">{results.skipped.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Errors:</span>
                        <span className="text-rose-400 font-bold">{results.errors.length}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => { onSuccess(); handleClose(); }}
                      className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-colors"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-300">
                      <p className="mb-2 font-medium">CSV Format required:</p>
                      <code className="block bg-slate-900 p-2 rounded text-emerald-400 text-xs">
                        name,rollNumber,email<br/>
                        Ali Hassan,CS-2024-001,ali@example.com
                      </code>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Select CSV File
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
                      />
                    </div>

                    {error && <p className="text-rose-400 text-sm">{error}</p>}

                    <div className="flex gap-3 mt-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !file}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {loading ? 'Uploading...' : 'Import'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BulkImportModal;
