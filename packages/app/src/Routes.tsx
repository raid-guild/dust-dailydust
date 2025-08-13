import { Route, Routes } from "react-router-dom";

import { ArticlePage } from "@/pages/ArticlePage";
import { BackPage } from "@/pages/BackPage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { EditorRoomPage } from "@/pages/EditorRoomPage";
import { FrontPage } from "@/pages/FrontPage";
import { LocalPage } from "@/pages/LocalPage";

export const FRONT_PAGE_PATH = "/";
export const LOCAL_PAGE_PATH = "/local";
export const BACK_PAGE_PATH = "/back-page";
export const DISCOVER_PAGE_PATH = "/discover";
export const EDITOR_PAGE_PATH = "/editor";
export const ARTICLE_PAGE_PATH = "/article/";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path={FRONT_PAGE_PATH} element={<FrontPage />} />
      <Route path={LOCAL_PAGE_PATH} element={<LocalPage />} />
      <Route path={BACK_PAGE_PATH} element={<BackPage />} />
      <Route path={DISCOVER_PAGE_PATH} element={<DiscoverPage />} />
      <Route path={EDITOR_PAGE_PATH} element={<EditorRoomPage />} />
      <Route path={`${ARTICLE_PAGE_PATH}:id`} element={<ArticlePage />} />
    </Routes>
  );
};

export default AppRoutes;
