import { Suspense } from "react";
import { RecommendationsClient } from "./recommendations-client";

export default function RecommendationsPage() {
  return (
    <Suspense>
      <RecommendationsClient />
    </Suspense>
  );
}
