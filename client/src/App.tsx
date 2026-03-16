import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Toaster } from "@/components/ui/toaster";
import UploadPage from "@/pages/UploadPage";
import GalleryPage from "@/pages/GalleryPage";
import AdminPage from "@/pages/AdminPage";
import PerplexityAttribution from "@/components/PerplexityAttribution";
import ThemeToggle from "@/components/ThemeToggle";
import NavBar from "@/components/NavBar";

export default function App() {
  return (
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
      <PerplexityAttribution />
      <Toaster />
    </div>
    </Router>
  );
}
