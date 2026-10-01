import { BrowserRouter, Link, Route, Routes } from 'react-router';
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';
import '@fontsource/open-sans/400-italic.css';
import './index.css';
import './desktop-design.css';
import { AiProvider } from './ai/AiProvider';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { RecipeGeneratorPage } from './pages/RecipeGeneratorPage';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { LandingPage } from './pages/LandingPage';
import { RecipesPage } from './pages/RecipesPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { CreateRecipePage, EditRecipePage } from './pages/RecipeEditorPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AiProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage key="login" mode="login" />} />
          <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
          <Route path="/recipe-generator" element={<RecipeGeneratorPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/recipes/new" element={<CreateRecipePage />} />
            <Route path="/recipes/:id/edit" element={<EditRecipePage />} />
          </Route>
          <Route path="*" element={<main className="page-container"><h1>Page not found</h1><Link to="/">Go Home</Link></main>} />
        </Routes>
      </AiProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
