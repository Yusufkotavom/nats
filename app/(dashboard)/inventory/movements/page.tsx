"use client";

import { Suspense } from "react";
import { MovementsView } from "./_components/movements-view";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MovementsView />
    </Suspense>
  );
}
