import { Suspense } from "solid-js";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider } from "@solidjs/meta";
import { PeachProvider } from "./context/peach";
import "./app.css";

export default function App() {
  return (
    <MetaProvider>
      <div id="app">
        <Router root={(props) => (
          <Suspense fallback={<div class="loading">Loading...</div>}>
            <PeachProvider>
              {props.children}
            </PeachProvider>
          </Suspense>
        )}>
          <FileRoutes />
        </Router>
      </div>
    </MetaProvider>
  );
}
