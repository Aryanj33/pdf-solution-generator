import React, { useState } from 'react';

function App() {
  const [uploadResult, setUploadResult] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [enrollment, setEnrollment] = useState('');
  const [name, setName] = useState('');
  const [batch, setBatch] = useState('');
  const [file, setFile] = useState(null);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadResult('');
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('enrollment', enrollment);
    formData.append('name', name);
    formData.append('batch', batch);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSubmissionId(data.submissionId);
      setUploadResult(`Submission ID: ${data.submissionId}`);
    } catch (error) {
      setUploadResult(`Error uploading file: ${error.message}`);
    }
  };

  const handleDownload = () => {
    if (!submissionId) return;
    window.location.href = `http://localhost:5000/download/${submissionId}`;
  };

  return (
    <div className="max-w-3xl mx-auto p-5 font-sans">
      <h1 className="text-3xl font-bold text-gray-800 mb-5">Upload Assignment PDF</h1>
      <form onSubmit={handleUploadSubmit} encType="multipart/form-data" className="mb-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">PDF:</label>
          <input
            type="file"
            name="pdf"
            accept=".pdf"
            required
            onChange={(e) => setFile(e.target.files[0])}
            className="p-2 w-full border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Enrollment:</label>
          <input
            type="text"
            name="enrollment"
            value={enrollment}
            onChange={(e) => setEnrollment(e.target.value)}
            placeholder="Enter Enrollment Number (e.g., 23103061)"
            required
            className="p-2 w-full border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name:</label>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter Name"
            required
            className="p-2 w-full border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Batch:</label>
          <input
            type="text"
            name="batch"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="Enter Batch (e.g., B3)"
            required
            className="p-2 w-full border border-gray-300 rounded"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Upload
        </button>
      </form>
      <div id="result" className="mb-5 text-green-600">{uploadResult}</div>

      <h2 className="text-2xl font-semibold text-gray-800 mb-3">Download Solution</h2>
      <div className="space-y-2">
        <input
          type="text"
          id="submissionId"
          value={submissionId}
          onChange={(e) => setSubmissionId(e.target.value)}
          placeholder="Enter submission ID"
          className="p-2 w-full border border-gray-300 rounded"
        />
        <button
          onClick={handleDownload}
          disabled={!submissionId}
          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${!submissionId ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Download
        </button>
      </div>
    </div>
  );
}

export default App;