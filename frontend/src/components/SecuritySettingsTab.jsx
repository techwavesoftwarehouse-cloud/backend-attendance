import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { motion } from 'framer-motion';

const SecuritySettingsTab = () => {
  const [settings, setSettings] = useState({
    instituteLat: 0,
    instituteLng: 0,
    allowedRadiusMeters: 100,
    allowedIPs: '',
    enableLocationCheck: false,
    enableIPCheck: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axiosInstance.get('/api/admin/settings')
      .then(res => {
        if (res.data.settings) setSettings(res.data.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setMessage('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data } = await axiosInstance.put('/api/admin/settings', settings);
      setSettings(data.settings);
      setMessage('Settings saved successfully!');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported by browser.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings(prev => ({
          ...prev,
          instituteLat: pos.coords.latitude,
          instituteLng: pos.coords.longitude
        }));
      },
      () => alert('Could not get location. Ensure permissions are granted.'),
      { enableHighAccuracy: true }
    );
  };

  if (loading) return <div className="py-12 flex justify-center"><svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Security & Anti-Cheat Settings</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* IP Settings */}
          <div className="bg-slate-800/40 border border-slate-700/40 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-medium">Institute Wi-Fi (IP Check)</h3>
                <p className="text-slate-400 text-xs mt-1">Restrict attendance strictly to the institute's network.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="enableIPCheck" checked={settings.enableIPCheck} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {settings.enableIPCheck && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Allowed IP Addresses (Comma separated)</label>
                <input type="text" name="allowedIPs" value={settings.allowedIPs} onChange={handleChange} placeholder="e.g. 192.168.1.1, 203.0.113.5" className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            )}
          </div>

          {/* Location Settings */}
          <div className="bg-slate-800/40 border border-slate-700/40 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-medium">Geolocation Restriction (GPS)</h3>
                <p className="text-slate-400 text-xs mt-1">Requires student to be physically near the institute (Haversine formula).</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="enableLocationCheck" checked={settings.enableLocationCheck} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {settings.enableLocationCheck && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Latitude</label>
                  <input type="number" step="any" name="instituteLat" value={settings.instituteLat} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Longitude</label>
                  <input type="number" step="any" name="instituteLng" value={settings.instituteLng} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Allowed Radius (Meters)</label>
                  <input type="number" name="allowedRadiusMeters" value={settings.allowedRadiusMeters} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700/50 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="md:col-span-2 mt-2">
                  <button type="button" onClick={getCurrentLocation} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                    Use My Current Location
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-slate-700/50">
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors shadow-md">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {message && <span className={message.includes('success') ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>{message}</span>}
          </div>

        </form>
      </div>
    </motion.div>
  );
};

export default SecuritySettingsTab;
