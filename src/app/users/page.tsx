"use client";

import React, { useState, useEffect } from 'react';

type UserData = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarColor: string;
  isActive: boolean;
  role: string;
  designation: string | null;
  apps: string[];
  appIds?: string[];
};

type AppData = {
  id: string;
  name: string;
};

export default function UserMaster() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string, email: string, password?: string, role: string, designation: string, avatar: string, avatarColor: string, appIds: string[] }>({ name: '', email: '', password: '', role: 'USER', designation: '', avatar: '', avatarColor: 'primary', appIds: [] });
  
  const [availableApps, setAvailableApps] = useState<AppData[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/apps');
      const data = await res.json();
      setAvailableApps(data);
    } catch (err) {
      console.error('Failed to fetch apps', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      
      // We need to map the apps array to also have appIds for the edit screen
      // Wait, the API doesn't return appIds in the GET /api/users currently, just names.
      // We need to update GET /api/users to return the full app objects or ids.
      // But we can just rely on mapping availableApps names to ids or update the backend.
      // For now, let's keep it simple and just do our best if they match names.
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u));
      }
    } catch (err) {
      console.error('Failed to update user', err);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const handleAddOrEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing ? `/api/users/${editingId}` : '/api/users';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = { ...formData };
      if (isEditing && !payload.password) {
        delete (payload as any).password;
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({ name: '', email: '', password: '', role: 'USER', designation: '', avatar: '', avatarColor: 'primary', appIds: [] });
        fetchUsers();
        window.dispatchEvent(new Event('user-updated'));
      }
    } catch (err) {
      console.error('Failed to save user', err);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', email: '', password: '', role: 'USER', designation: '', avatar: '', avatarColor: 'primary', appIds: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserData) => {
    setIsEditing(true);
    setEditingId(user.id);
    // Find appIds based on the string array of names
    const userAppIds = availableApps.filter(app => user.apps.includes(app.name)).map(app => app.id);
    
    setFormData({ 
      name: user.name, 
      email: user.email, 
      password: '', // Blank for security
      role: user.role, 
      designation: user.designation || '', 
      avatar: user.avatar || '',
      avatarColor: user.avatarColor,
      appIds: userAppIds
    });
    setIsModalOpen(true);
  };

  return (
    <div className="relative">
      {/* Background Decoration */}
      <div className="absolute -top-10 -right-10 -z-10 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="flex flex-col gap-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl font-bold text-on-surface tracking-tight mb-1">User Master</h2>
            <p className="font-body text-sm text-on-surface-variant">Manage playground users and their application access.</p>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 bg-secondary/20 text-secondary border border-secondary/30 px-6 py-2.5 rounded-xl font-display text-base font-semibold hover:bg-secondary/30 active:scale-95 transition-all shadow-sm">
            <span className="material-symbols-outlined">person_add</span>
            <span>Add User</span>
          </button>
        </div>

        {/* User Table Glass Card */}
        <div className="bg-surface-container/40 border border-outline-variant/50 rounded-xl overflow-hidden backdrop-blur-md shadow-lg">
          <div className="overflow-x-auto min-h-[400px]">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/50 bg-surface-container-high/30">
                    <th className="py-4 px-6 font-mono text-[12px] text-outline uppercase tracking-wider">User Details</th>
                    <th className="py-4 px-6 font-mono text-[12px] text-outline uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 font-mono text-[12px] text-outline uppercase tracking-wider">App Access</th>
                    <th className="py-4 px-6 font-mono text-[12px] text-outline uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-outline font-body">No users found. Add one to get started!</td>
                    </tr>
                  ) : users.map((user) => (
                    <tr key={user.id} className={`hover:bg-surface-bright/20 transition-colors group ${!user.isActive ? 'opacity-60' : ''}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full bg-${user.avatarColor}/20 flex items-center justify-center border border-${user.avatarColor}/30 overflow-hidden`}>
                            {user.avatar ? (
                              <img alt={user.name} className="w-full h-full object-cover" src={user.avatar} />
                            ) : (
                              <span className={`text-${user.avatarColor} font-display font-bold`}>{user.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-display text-base font-semibold text-on-surface">{user.name}</span>
                            <span className="font-body text-sm text-outline">{user.designation || user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              checked={user.isActive} 
                              onChange={() => toggleUserStatus(user.id, user.isActive)}
                              className="sr-only peer" 
                              type="checkbox" 
                            />
                            <div className="w-10 h-5 bg-surface-dim peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary border border-outline-variant/50"></div>
                          </label>
                          <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${user.isActive ? 'text-secondary' : 'text-outline'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-2 items-center">
                          {user.apps && user.apps.length > 0 ? (
                            user.apps.map(app => (
                              <span key={app} className="px-2 py-1 bg-surface-container-high rounded text-[10px] font-mono text-primary border border-outline-variant/50">
                                {app}
                              </span>
                            ))
                          ) : (
                            <span className="text-outline italic text-[10px] font-mono">No apps assigned</span>
                          )}
                          <button className="w-6 h-6 rounded flex items-center justify-center bg-surface-variant hover:bg-surface-bright text-outline transition-colors ml-1">
                            <span className="material-symbols-outlined text-sm">add</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button onClick={() => openEditModal(user)} className="p-2 rounded-lg hover:bg-surface-variant text-on-surface-variant transition-colors active:scale-90">
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button onClick={() => deleteUser(user.id)} className="p-2 rounded-lg hover:bg-error/20 text-on-surface-variant hover:text-error transition-colors active:scale-90 ml-1">
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Minimal Pagination */}
          <div className="p-6 border-t border-outline-variant/50 bg-surface-container-high/20 flex items-center justify-between">
            <span className="font-body text-sm text-outline">Showing {users.length} inhabitants</span>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors font-mono text-[10px] uppercase disabled:opacity-50">Previous</button>
              <button className="px-4 py-2 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors font-mono text-[10px] uppercase disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container-high/30 shrink-0">
              <h3 className="font-display text-xl font-bold">{isEditing ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleAddOrEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-outline uppercase mb-2">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="e.g. Alex Rivera"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-outline uppercase mb-2">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="e.g. alex@playground.io"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-outline uppercase mb-2">{isEditing ? 'New Password (Optional)' : 'Temporary Password'}</label>
                <input 
                  required={!isEditing}
                  type="password" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder={isEditing ? 'Leave blank to keep unchanged' : 'Enter a secure password'}
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-outline uppercase mb-2">Designation</label>
                <input 
                  type="text" 
                  value={formData.designation}
                  onChange={e => setFormData({...formData, designation: e.target.value})}
                  className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-outline uppercase mb-2">Profile Picture</label>
                <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    value={formData.avatar}
                    onChange={e => setFormData({...formData, avatar: e.target.value})}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="e.g. https://example.com/avatar.png (or upload below)"
                  />
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({ ...formData, avatar: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-outline file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                    </div>
                    {formData.avatar && (
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant">
                        <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-outline uppercase mb-2">System Role</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  >
                    <option value="USER">User (Standard)</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-outline uppercase mb-2">Theme Color</label>
                  <select 
                    value={formData.avatarColor}
                    onChange={e => setFormData({...formData, avatarColor: e.target.value})}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  >
                    <option value="primary">Primary (Blue)</option>
                    <option value="secondary">Secondary (Green)</option>
                    <option value="tertiary">Tertiary (Orange)</option>
                    <option value="error">Error (Red)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-mono text-outline uppercase mb-2">App Access</label>
                <div className="grid grid-cols-1 gap-2 bg-surface-dim border border-outline-variant rounded-lg p-3 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {availableApps.length === 0 ? (
                    <span className="text-sm text-outline italic">No apps available.</span>
                  ) : (
                    availableApps.map(app => (
                      <label key={app.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-surface-variant/50 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formData.appIds.includes(app.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData({ ...formData, appIds: [...formData.appIds, app.id] });
                            } else {
                              setFormData({ ...formData, appIds: formData.appIds.filter(id => id !== app.id) });
                            }
                          }}
                          className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary bg-surface-container"
                        />
                        <span className="text-sm font-display text-on-surface">{app.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-variant transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-on-primary hover:bg-primary-fixed transition-colors shadow-lg shadow-primary/20">
                  {isEditing ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
