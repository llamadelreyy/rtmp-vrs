// client/src/hooks/useAuth.js
import { useContext } from 'react';
import AuthContext from '../contexts/AuthContext';

const useAuth = () => {
  const auth = useContext(AuthContext);
  
  // Add the getAuthHeaders function to the hook
  return {
    ...auth,
    getAuthHeaders: () => {
      const token = localStorage.getItem('token');
      return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      };
    }
  };
};

export default useAuth;