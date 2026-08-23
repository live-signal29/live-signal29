import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Supabase mein naya password update karne ka code
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Password kamyabi se update ho gaya hai!');
      window.location.href = '/login'; // Aapke login route par bhej dega
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h2>Set New Password</h2>
      <form onSubmit={handleUpdatePassword}>
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
