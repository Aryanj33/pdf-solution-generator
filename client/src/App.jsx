import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, FileText, User, Hash, Users, Terminal, Eye, EyeOff } from 'lucide-react';

const App = () => {
  // State for form inputs, upload status, and UI toggles
  const [uploadResult, setUploadResult] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [enrollment, setEnrollment] = useState('');
  const [name, setName] = useState('');
  const [batch, setBatch] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMatrix, setShowMatrix] = useState(true);
  const [glitchText, setGlitchText] = useState('SOLVE_SAFE_QUICK');

  // Ref for the canvas element to avoid direct DOM queries in every render
  const canvasRef = useRef(null);

  // Matrix rain effect
  useEffect(() => {
    // Ensure canvasRef is available
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Ensure context is available
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
    const fontSize = 10;
    const columns = canvas.width / fontSize; 
    const drops = [];
    
    // Initialize drops array for each column
    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }

    const draw = () => {
      // Set a semi-transparent black background to create the fading trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0'; // Green text color
      ctx.font = `${fontSize}px monospace`;

      // Loop through each column
      for (let i = 0; i < drops.length; i++) {
        // Get a random character from the matrix string
        const text = matrix[Math.floor(Math.random() * matrix.length)];
        // Draw the character
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset the drop to the top if it has gone off-screen, with a random chance
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        // Move the drop down
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 35);
    
    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures this effect runs only once

  // Glitch effect for the main title
  useEffect(() => {
    const glitchChars = ['█', '▓', '▒', '░', '▄', '▀', '■', '□'];
    const originalText = 'SECURE_UPLOAD_PORTAL';
    
    const glitchInterval = setInterval(() => {
      // Randomly decide whether to apply the glitch effect in this interval
      if (Math.random() > 0.9) {
        const glitched = originalText.split('').map(char => 
          Math.random() > 0.8 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char
        ).join('');
        
        setGlitchText(glitched);
        
        // Revert to the original text after a short delay
        setTimeout(() => setGlitchText(originalText), 100);
      }
    }, 2000);

    // Cleanup function to clear the interval
    return () => clearInterval(glitchInterval);
  }, []); // Empty dependency array ensures this runs only once

  // Handles the upload form submission
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadResult('');
    
    // Simulate a multi-step upload process with animated text feedback
    setTimeout(() => setUploadResult('> INITIALIZING SECURE TRANSFER...'), 500);
    setTimeout(() => setUploadResult(prev => prev + '\n> ENCRYPTING DATA STREAM...'), 1500);
    setTimeout(() => setUploadResult(prev => prev + '\n> ESTABLISHING ANONYMOUS CONNECTION...'), 2500);

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('enrollment', enrollment);
    formData.append('name', name);
    formData.append('batch', batch);

    try {
      // Send the form data to the backend server
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`CONNECTION_ERROR: ${response.status}`);
      }
      
      const data = await response.json();
      setSubmissionId(data.submissionId); // Save submission ID for download
      
      // Display success message after a delay
      setTimeout(() => {
        setUploadResult(`> UPLOAD COMPLETE\n> SUBMISSION_ID: ${data.submissionId}\n> STATUS: ENCRYPTED & SECURED`);
        setIsUploading(false);
      }, 3500);
      
    } catch (error) {
      // Display error message after a delay
      setTimeout(() => {
        setUploadResult(`> ERROR: TRANSMISSION_FAILED\n> ${error.message}\n> RETRY_RECOMMENDED`);
        setIsUploading(false);
      }, 3500);
    }
  };

  // Handles the download request
  const handleDownload = () => {
    if (!submissionId) return;
    // Redirects the browser to the download URL
    window.location.href = `http://localhost:5000/download/${submissionId}`;
  };

  return (
    <>
      {/* Inline styles for animations to keep the component self-contained */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
            animation: fadeIn 0.5s ease-out;
        }
      `}</style>
      
      <div className="min-h-screen bg-black text-green-400 font-mono relative overflow-hidden">
        {/* Matrix Background Canvas */}
        <canvas 
          ref={canvasRef} 
          id="matrix-canvas" 
          className={`fixed inset-0 z-0 transition-opacity duration-1000 ${showMatrix ? 'opacity-30' : 'opacity-10'}`}
        />
        
        {/* Toggle Matrix Visibility Button */}
        <button
          onClick={() => setShowMatrix(!showMatrix)}
          className="fixed top-4 right-4 z-50 p-2 bg-black/50 border border-green-400/30 rounded text-green-400 hover:bg-green-400/10 transition-all duration-300"
          aria-label="Toggle matrix background visibility"
        >
          {showMatrix ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            
            {/* Header */}
            <header className="text-center mb-12">
              <div className="inline-block border-2 border-green-400 p-4 mb-4 bg-black/80 backdrop-blur">
                <Terminal className="inline-block mr-2 mb-1" size={24} />
                <h1 className="text-2xl md:text-4xl font-bold tracking-wider animate-pulse">
                  {glitchText}
                </h1>
              </div>
              <p className="text-green-300/70 text-sm tracking-widest">
                &gt; ANONYMOUS_ASSIGNMENT_DECODING_PROTOCOL_V2.1
              </p>
            </header>

            <main className="grid md:grid-cols-2 gap-8">
              
              {/* Upload Section */}
              <section className="bg-black/80 backdrop-blur border border-green-400/30 p-6 rounded-lg shadow-2xl shadow-green-500/10 hover:border-green-400/50 transition-all duration-300">
                <h2 className="text-xl font-bold mb-6 flex items-center">
                  <Upload className="mr-2 animate-bounce" size={20} />
                  UPLOAD_MODULE
                </h2>
                
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  {/* File Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <FileText className="mr-2" size={16} />
                      Week/ASSIGNMENT PDF
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf"
                        required
                        onChange={(e) => setFile(e.target.files[0])}
                        className="w-full p-3 bg-black/50 border border-green-400/30 rounded text-green-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-400/20 file:text-green-400 hover:file:bg-green-400/30 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400 transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Enrollment Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <Hash className="mr-2" size={16} />
                      ENROLLMENT_ID
                    </label>
                    <input
                      type="text"
                      value={enrollment}
                      onChange={(e) => setEnrollment(e.target.value)}
                      placeholder="23103061"
                      required
                      className="w-full p-3 bg-black/50 border border-green-400/30 rounded text-green-400 placeholder-green-400/40 focus:border-green-400 focus:bg-black/70 focus:outline-none focus:ring-1 focus:ring-green-400 transition-all duration-300"
                    />
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <User className="mr-2" size={16} />
                      USER_IDENTIFIER
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ARYAN"
                      required
                      className="w-full p-3 bg-black/50 border border-green-400/30 rounded text-green-400 placeholder-green-400/40 focus:border-green-400 focus:bg-black/70 focus:outline-none focus:ring-1 focus:ring-green-400 transition-all duration-300"
                    />
                  </div>

                  {/* Batch Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center">
                      <Users className="mr-2" size={16} />
                      BATCH_CODE
                    </label>
                    <input
                      type="text"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      placeholder="B3"
                      required
                      className="w-full p-3 bg-black/50 border border-green-400/30 rounded text-green-400 placeholder-green-400/40 focus:border-green-400 focus:bg-black/70 focus:outline-none focus:ring-1 focus:ring-green-400 transition-all duration-300"
                    />
                  </div>

                  {/* Upload Button */}
                  <button
                    type="submit"
                    disabled={isUploading || !file}
                    className="w-full p-4 bg-gradient-to-r from-green-600 to-green-400 text-black font-bold rounded hover:from-green-500 hover:to-green-300 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {isUploading ? 'TRANSMITTING...' : 'INITIATE_UPLOAD'}
                  </button>
                </form>

                {/* Upload Result Display */}
                {uploadResult && (
                  <div className="mt-6 p-4 bg-black/70 border border-green-400/50 rounded font-mono text-sm fade-in">
                    <pre className="whitespace-pre-wrap text-green-300">
                      {uploadResult}
                    </pre>
                  </div>
                )}
              </section>

              {/* Download Section */}
              <section className="bg-black/80 backdrop-blur border border-cyan-400/30 p-6 rounded-lg shadow-2xl shadow-cyan-500/10 hover:border-cyan-400/50 transition-all duration-300">
                <h2 className="text-xl font-bold mb-6 flex items-center text-cyan-400">
                  <Download className="mr-2 animate-bounce" size={20} />
                  DOWNLOAD_MODULE
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-cyan-400">
                      SUBMISSION_TOKEN
                    </label>
                    <input
                      type="text"
                      value={submissionId}
                      onChange={(e) => setSubmissionId(e.target.value)}
                      placeholder="ENTER_SUBMISSION_ID"
                      className="w-full p-3 bg-black/50 border border-cyan-400/30 rounded text-cyan-400 placeholder-cyan-400/40 focus:border-cyan-400 focus:bg-black/70 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all duration-300"
                    />
                  </div>
                  
                  <button
                    onClick={handleDownload}
                    disabled={!submissionId}
                    className="w-full p-4 bg-gradient-to-r from-cyan-600 to-cyan-400 text-black font-bold rounded hover:from-cyan-500 hover:to-cyan-300 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    RETRIEVE_SOLUTION
                  </button>
                </div>

                {/* Status Indicators */}
                <div className="mt-8 space-y-2 pt-4 border-t border-cyan-400/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-300">CONNECTION:</span>
                    <span className="text-green-400 animate-pulse">● SECURE</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-300">ENCRYPTION:</span>
                    <span className="text-green-400 animate-pulse">● ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-300">ANONYMITY:</span>
                    <span className="text-green-400 animate-pulse">● ENABLED</span>
                  </div>
                </div>
              </section>
            </main>

            {/* Footer */}
            <footer className="text-center mt-12 text-green-400/50 text-xs">
              <p className="animate-pulse">
                &gt; ALL_TRANSMISSIONS_ENCRYPTED_AND_ANONYMOUS
              </p>
              <p className="mt-2">
                &gt; UNAUTHORIZED_ACCESS_WILL_BE_TRACED_AND_TERMINATED
              </p>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
