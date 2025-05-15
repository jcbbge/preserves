import { useNavigate } from "@solidjs/router";
import { onMount } from "solid-js";
import { Title } from "@solidjs/meta";
import { usePeach } from "~/context/peach";
import { redirectIfAuthenticated } from "~/utils/authUtils";
import LoginForm from "~/components/LoginForm";
import styles from "./index.module.css";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = usePeach();

  // Use onMount to ensure we don't redirect during SSR
  onMount(() => {
    redirectIfAuthenticated(isAuthenticated, navigate);
  });


  return (
    <div class={styles["peach-preserve"]}>
      <Title>Peach Preserves</Title>
      <div class={styles["login-page"]}>
        <LoginForm />
      </div>
    </div>
  );
}
