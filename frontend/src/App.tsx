import BookmarksHighlights from "./pages/BookmarksHighlights";
import AppBranding from "./components/AppBranding";
import LibraryBrowser from "./pages/LibraryBrowser";
import RegisterPage from "./pages/RegisterPage";
import { alpha, useTheme } from "@mui/material/styles";
import Layout from "./components/Layout";
import ProfilePage from "./pages/ProfilePage";
import { useAuth } from "./auth/AuthContext";
import BookDetail from "./pages/BookDetail";
import SeriesView from "./pages/SeriesView";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import Settings from "./pages/Settings";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { lazy, Suspense } from "react";

const ReaderPage = lazy(() => import("./pages/reader/ReaderPage"));

const AppRoutes = () => {
  const { t } = useTranslation("auth");
  const theme = useTheme();
  const { user, isLoading, needsFirstUser, apiUnavailable, retryConnection } = useAuth();

  if (isLoading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default">
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (apiUnavailable) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        bgcolor="background.default"
        px={2}
        sx={{
          backgroundImage: (th) => `radial-gradient(ellipse 120% 80% at 50% -20%, ${alpha(th.palette.primary.main, 0.12)}, transparent)`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textAlign: "center" }}>
          {t("apiUnreachableTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 420, textAlign: "center" }}>
          {t("apiUnreachableBody")}
        </Typography>
        <Button variant="contained" onClick={retryConnection} sx={{ textTransform: "none", color: theme.palette.mode === "light" ? "#000" : undefined }}>
          {t("retryConnection")}
        </Button>
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : needsFirstUser ? <Navigate to="/register" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route
        element={user ? <Layout /> : <Navigate to={needsFirstUser ? "/register" : "/login"} replace />}
      >
        <Route index element={<Dashboard />} />
        <Route path="library/:id" element={<LibraryBrowser />} />
        <Route path="series/:id" element={<SeriesView />} />
        <Route path="book/:id" element={<BookDetail />} />
        <Route path="bookmarks" element={<BookmarksHighlights />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route
        path="read/:bookId"
        element={
          user ? (
            <Suspense
              fallback={
                <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default">
                  <CircularProgress size={32} />
                </Box>
              }
            >
              <ReaderPage />
            </Suspense>
          ) : (
            <Navigate to={needsFirstUser ? "/register" : "/login"} replace />
          )
        }
      />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <AppBranding>
      <AppRoutes />
    </AppBranding>
  </BrowserRouter>
);

export default App;
