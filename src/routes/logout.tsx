import { useNavigate } from "@solidjs/router";
import { onMount } from "solid-js";
import { usePeach } from "~/context/peach";

export default function Logout() {
  const { logout } = usePeach();
  const navigate = useNavigate();
  
  onMount(() => {
    // Get user info before logging out
    const username = localStorage.getItem('peach_user') ? 
      JSON.parse(localStorage.getItem('peach_user') || '{}')?.username : null;
    
    // Clear user-specific localStorage items
    if (username) {
      const keyPrefix = `peach_preserves_${username}_`;
      localStorage.removeItem(`${keyPrefix}posts`);
      localStorage.removeItem(`${keyPrefix}cursor`);
      console.log('[LOGOUT] Cleared user-specific data for', username);
    }
    
    // Perform logout (clears auth data)
    logout();
    
    // Redirect to login page
    navigate('/');
  });
  
  return (
    <div class="logout-page">
      <div class="logout-message">
        <h1>Logging out...</h1>
        <p>You will be redirected shortly.</p>
      </div>
      
      <style>{`
        .logout-page {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background-color: var(--peach-background);
        }
        
        .logout-message {
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          max-width: 400px;
        }
        
        h1 {
          color: var(--peach-primary);
          margin-bottom: 1rem;
        }
        
        p {
          color: var(--text-dark);
        }
      `}</style>
    </div>
  );
}