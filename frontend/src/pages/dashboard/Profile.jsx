import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { User, Bell, Shield, Moon, Sun, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);

  // Controlled inputs
  const [firstName, setFirstName] = useState(() => {
    const parts = (user?.display_name || user?.name || '').split(' ');
    return parts[0] || '';
  });
  const [lastName, setLastName] = useState(() => {
    const parts = (user?.display_name || user?.name || '').split(' ');
    return parts.slice(1).join(' ') || '';
  });
  const [email, setEmail] = useState(() => user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(() => user?.avatar_url || user?.avatar || '');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    const displayName = `${firstName} ${lastName}`.trim();

    try {
      // Backend expects PUT /api/user/profile
      const res = await api.put('/user/profile', {
        display_name: displayName,
        email,
        avatar_url: avatarUrl
      });

      if (res.data?.success) {
        // ALWAYS replace, never merge partially
        updateUser(res.data.user);
        setSuccess('Profile updated successfully!');
      } else {
        setError(res.data?.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Profile update failed:', err);
      setError(err.response?.data?.error || 'Something went wrong while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Sidebar Nav */}
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400 font-medium">
            <User size={18} /> Account Info
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
            <Bell size={18} /> Notifications
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
            <Shield size={18} /> Privacy & Security
          </button>
        </div>

        {/* Content */}
        <div className="md:col-span-2 space-y-6">
          
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-6">Public Profile</h2>
            <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                <img 
                  src={avatarUrl || "/avatar-placeholder.png"} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-dark-border bg-white object-cover" 
                  onError={(e) => { e.target.src = "/avatar-placeholder.png"; }}
                />
                <div className="absolute bottom-0 right-0 p-1.5 bg-primary-600 text-white rounded-full border-2 border-white dark:border-dark-card">
                  <User size={14} />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  {user?.display_name || user?.name || "Student"}
                </h3>
                <p className="text-gray-500 text-sm">{user?.email}</p>
              </div>
            </div>

            {error && (
              <div role="alert" className="mb-6 flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div role="alert" className="mb-6 flex items-start gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
                <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">First Name</label>
                  <input 
                    type="text" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Avatar Image URL</label>
                <input 
                  type="text" 
                  value={avatarUrl} 
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                />
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-md shadow-primary-500/20 mt-2 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                Save Changes
              </button>
            </form>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4">Preferences</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-bg/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-dark-card rounded-lg text-gray-600 dark:text-gray-400">
                    {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Dark Mode</h4>
                    <p className="text-xs text-gray-500">Toggle dark theme appearance</p>
                  </div>
                </div>
                <button 
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-bg/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-dark-card rounded-lg text-gray-600 dark:text-gray-400">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Study Reminders</h4>
                    <p className="text-xs text-gray-500">Receive email alerts for study plans</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${notifications ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border border-red-100 dark:border-red-900/30">
            <h2 className="text-lg font-bold mb-4 text-red-600 dark:text-red-400">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Sign out of your account on this device.</p>
              <button 
                onClick={logout}
                className="px-4 py-2 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
