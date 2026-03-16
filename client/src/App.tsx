import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import UploadPage from "@/pages/UploadPage";
import GalleryPage from "@/pages/GalleryPage";
import AdminPage from "@/pages/AdminPage";
import NavBar from "@/components/NavBar";
import { queryClient } from "@/lib/queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
          <NavBar />
          <Switch>
            <Route path="/" component={UploadPage} />
            <Route path="/gallery" component={GalleryPage} />
            <Route path="/admin" component={AdminPage} />
            <Route>
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--color-text)" }}>
                  Page not found
                </h1>
              </div>
            </Route>
          </Switch>
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  );
}
