import { Route, Routes } from "react-router-dom";

import { FrontPage } from "./pages/FrontPage";
import { BackPage } from "./pages/BackPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { EditorRoomPage } from "./pages/EditorRoomPage";
import { LocalNewsPage } from "./pages/LocalNewsPage";

export const FRONT_PAGE_PATH = "/";
export const LOCAL_PAGE_PATH = "/local";
export const CLASSIFIEDS_PAGE_PATH = "/classifieds";
export const DISCOVER_PAGE_PATH = "/discover";
export const EDITOR_PAGE_PATH = "/editor";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path={FRONT_PAGE_PATH} element={<FrontPage />} />
      <Route path={LOCAL_PAGE_PATH} element={<LocalNewsPage />} />
      <Route path={CLASSIFIEDS_PAGE_PATH} element={<BackPage />} />
      <Route path={DISCOVER_PAGE_PATH} element={<DiscoverPage />} />
      <Route path={EDITOR_PAGE_PATH} element={<EditorRoomPage />} />
    </Routes>
  );
};

export default AppRoutes;
