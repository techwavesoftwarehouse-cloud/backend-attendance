import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PrintQRModal — shows a clean printable static QR code
 * that links directly to /attendance (no expiring token).
 * Security = WebAuthn fingerprint + Geolocation anti-cheat.
 */
const PrintQRModal = ({ isOpen, onClose, origin }) => {
  const attendanceUrl = `${origin}/attendance`;
  const printRef = useRef(null);

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TechWave Attendance QR Code</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #fff;
            }
            .card {
              text-align: center;
              border: 2px solid #e2e8f0;
              border-radius: 20px;
              padding: 40px;
              max-width: 400px;
              width: 100%;
            }
            .logo { font-size: 32px; margin-bottom: 8px; }
            h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
            .sub { font-size: 14px; color: #64748b; margin-bottom: 24px; }
            .qr-wrap { display: inline-block; padding: 16px; border: 2px solid #e2e8f0; border-radius: 16px; background: #fff; }
            .steps { margin-top: 24px; text-align: left; }
            .steps h2 { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 10px; }
            .step { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; font-size: 13px; color: #475569; }
            .step-num { background: #3b82f6; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
            .url { margin-top: 16px; font-size: 11px; color: #94a3b8; word-break: break-all; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
          >
            <div
              className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-lg font-semibold text-white">Print Attendance QR Code</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5">
                {/* Preview */}
                <div ref={printRef}>
                  <div className="card" style={{textAlign:'center',border:'2px solid #e2e8f0',borderRadius:'20px',padding:'32px',background:'#fff'}}>
                    <div className="logo" style={{display:'flex',justifyContent:'center',marginBottom:'8px'}}>
                      <img src={`${origin}/Tech_wave_logo_1-removebg-preview.png`} alt="TechWave Logo" style={{width:'56px',height:'56px',objectFit:'contain'}} />
                    </div>
                    <h1 style={{fontSize:'20px',fontWeight:'700',color:'#0f172a',marginBottom:'4px'}}>TechWave Software House</h1>
                    <p className="sub" style={{fontSize:'13px',color:'#64748b',marginBottom:'20px'}}>Attendance — Scan to Mark</p>
                    <div className="qr-wrap" style={{display:'inline-block',padding:'14px',border:'2px solid #e2e8f0',borderRadius:'14px'}}>
                      <QRCodeSVG value={attendanceUrl} size={200} level="M" />
                    </div>
                    <div className="steps" style={{marginTop:'20px',textAlign:'left'}}>
                      <h2 style={{fontSize:'13px',fontWeight:'600',color:'#334155',marginBottom:'8px'}}>How to mark attendance:</h2>
                      {[
                        'Open your phone\'s camera or QR scanner',
                        'Scan this QR code',
                        'Enter your Roll Number / Student ID',
                        'Verify with your fingerprint or face recognition ✅',
                      ].map((s, i) => (
                        <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px',marginBottom:'6px',fontSize:'12px',color:'#475569'}}>
                          <span style={{background:'#3b82f6',color:'#fff',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:'700',flexShrink:0}}>{i+1}</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{marginTop:'14px',fontSize:'10px',color:'#94a3b8',wordBreak:'break-all'}}>{attendanceUrl}</p>
                  </div>
                </div>

                <p className="text-slate-500 text-xs text-center mt-3 mb-4">
                  Print and place this QR code anywhere — it will not expire
                </p>

                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl transition-colors text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print / Save PDF
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PrintQRModal;
