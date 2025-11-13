import { supabase, User } from './supabase/client';

export const login = async (username: string, pin: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    // Query users table with case-insensitive username
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', username)
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return { user: null, error: 'Database error. Please ensure the database is set up correctly.' };
    }

    if (!users || users.length === 0) {
      return { user: null, error: 'Invalid username' };
    }

    const user = users[0] as User;

    if (user.pin !== pin) {
      return { user: null, error: 'Invalid PIN' };
    }

    return { user, error: null };
  } catch (err) {
    console.error('Login error:', err);
    return { user: null, error: 'Login failed. Please check your connection.' };
  }
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('currentUser');
  if (!userStr) return null;
  return JSON.parse(userStr);
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
};

export const logout = () => {
  setCurrentUser(null);
};