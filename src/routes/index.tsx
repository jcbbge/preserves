import { useNavigate } from "@solidjs/router";
import { onMount } from "solid-js";
import { Title } from "@solidjs/meta";
import { usePeach } from "~/context/peach";
import { redirectIfAuthenticated } from "~/utils/authUtils";
import LoginForm from "~/components/LoginForm";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = usePeach();

  // Use onMount to ensure we don't redirect during SSR
  onMount(() => {
    redirectIfAuthenticated(isAuthenticated, navigate);
  });


  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      backgroundColor: "#f5f0e5"
    }}>
      <Title>Peach Preserves</Title>
      <div style={{ 
        flex: 1, 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        width: "100%", 
        height: "100vh" 
      }}>
        <LoginForm />
      </div>
    </div>
  );
}
