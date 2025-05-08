import { query } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";
import { Show, createSignal, onMount } from "solid-js";
import { usePeach } from "~/context/peach";
import styles from "./index.module.css";

// Add extensive console logging to debug
console.log("INDEX PAGE LOADING");


const connect = query(async (formData: FormData) => {
  "use server";

  console.log('[SERVER] Starting login request');

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // ACTUAL PROBLEM: The form isn't submitting values - this is why it's MISSING
  console.log('[SERVER] Raw form values:', {
    formDataEntries: Array.from(formData.entries()),
    email,
    password,
    emailType: typeof email,
    passwordType: typeof password,
    formDataKeys: Array.from(formData.keys())
  });

  if (!email || !password) {
    console.error('[SERVER] MISSING CREDENTIALS - THIS IS THE PROBLEM');
    return {
      success: false,
      error: 'Email and password are required'
    };
  }

  try {

    const requestBody = {
      'email': email,
      'password': password
    };

    const response = await fetch('https://v1.peachapi.com/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Log FULL response details
    console.log('[SERVER] Response status:', response.status);
    console.log('[SERVER] Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('[SERVER] COMPLETE response body:', JSON.stringify(data, null, 2));

    // Check for API error response
    if (data.success === 0) {
      console.error('[SERVER] API returned error:', data.error);
      throw new Error(data.error?.Message || 'Authentication failed');
    }

    // Log data structure to debug
    console.log('[SERVER] Data keys:', Object.keys(data));
    if (data.data) {
      console.log('[SERVER] data.data keys:', Object.keys(data.data));
    }

    // Get the token from data.data.token
    const authToken = data.data?.token;

    if (!authToken) {
      console.error('[SERVER] Could not find token in response');
      throw new Error('No authentication token in response');
    }

    console.log('[SERVER] Found token:', authToken ? 'YES' : 'NO');

    return {
      success: true,
      token: authToken,
      email,
      userData: data.data
    };
  } catch (error) {
    console.error('[SERVER] Authentication error with full details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}, "login");

export default function Home() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = usePeach();

  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  
  // Redirect if already authenticated
  const redirectAfterRender = () => {
    if (isAuthenticated()) {
      console.log('[INDEX] User authenticated, redirecting to dashboard');
      setTimeout(() => navigate('/dashboard'), 0);
    }
  };
  
  // Use onMount to ensure we don't redirect during SSR
  onMount(redirectAfterRender);


  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.target as HTMLFormElement;

    // CRITICAL DEBUGGING: Log form elements to see if they exist
    console.log('[CLIENT] Form elements:', {
      emailElement: form.elements.namedItem('email'),
      passwordElement: form.elements.namedItem('password'),
    });

    // Create a new FormData object
    const formData = new FormData();
    
    // Get input values directly
    const emailInput = form.querySelector('#email') as HTMLInputElement;
    const passwordInput = form.querySelector('#password') as HTMLInputElement;
    
    if (emailInput && passwordInput) {
      // Explicitly set form data values
      formData.set('email', emailInput.value);
      formData.set('password', passwordInput.value);
      
      console.log('[CLIENT] Form data manually set:', {
        email: emailInput.value,
        passwordPresent: Boolean(passwordInput.value)
      });
    } else {
      console.error('[CLIENT] COULD NOT FIND FORM INPUTS!');
    }

    try {
      const result = await connect(formData);
      console.warn('[CLIENT] Connect result:', result);

      if (result.success && result.token) {
        console.log('[CLIENT] Login successful, calling login() in context');
        login(result.token, { ...result.userData, email: result.email });
        console.log('[CLIENT] Navigating to dashboard');
        navigate('/dashboard');
      } else {
        console.log('[CLIENT] Login failed:', result.error);
        setError(result.error || "Failed to connect to Peach. Please check your credentials.");
      }
    } catch (error) {
      console.error('[CLIENT] Unexpected error during login:', error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      console.log('[CLIENT] Login attempt completed');
      setLoading(false);
    }
  };

  return (
    <div class={styles.app}>
      <div class={styles.card}>
        <div class={styles.logoContainer}>
          <img src="/peachdotcool.png" alt="Peach" class={styles.logo} />
        </div>

        <div class={styles.formContent}>
          <form onSubmit={handleSubmit}>
            <div class={styles.inputField}>
              <input
                type="text"
                id="email"
                name="email"
                placeholder="email / username"
                required
                disabled={loading()}
                aria-label="Email or username"
              />
            </div>

            <div class={styles.inputField}>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="password"
                required
                disabled={loading()}
                aria-label="Password"
              />
            </div>

            {error() && (
              <div class={styles.errorMessage}>
                {error()}
              </div>
            )}

            <button
              type="submit"
              class={styles.connectButton}
              disabled={loading()}
            >
              {loading() ? 'Connecting...' : 'Connect Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
