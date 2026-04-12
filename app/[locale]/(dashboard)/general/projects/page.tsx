export const dynamic = "force-dynamic";

import { getProjects } from "../actions";
import { CreateProjectForm } from "@/app/[locale]/(dashboard)/general/_components/project-form";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { getTranslations } from "next-intl/server";
import { ProjectsView } from "./_components/projects-view";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";

export default async function ProjectsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["projects", 1, ""],
    queryFn: () => getProjects({ page: 1, search: "" }),
  });

  const t = await getTranslations("General.Projects");

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("title")} />
        <PageListActions><CreateProjectForm /></PageListActions>
      </PageListHeader>

      <PageListContent>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ProjectsView />
        </HydrationBoundary>
      </PageListContent>
    </PageListLayout>
  );
}
