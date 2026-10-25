"use client";

import Splash from "@/components/Splash";
import StoryStrip from "@/components/Stories";
import TravelMap from "@/components/TravelMap";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cityActivity } from "@/lib/cityActivity";
import { todayIso } from "@/lib/stay";
import { useLoad } from "@/lib/useLoad";

export default function Home() {
  const auth = useAuth();
  const [data, reload] = useLoad(async () => {
    const [stories, companions, reviews] = await Promise.all([auth.repo.listStories(), auth.repo.listCompanions(), auth.repo.listReviews()]);
    return { stories, companions, reviews };
  }, `home:${auth.userId}`);

  const today = todayIso();
  const cities = data
    ? cityActivity({
        stories: data.stories,
        companions: data.companions.filter((c) => c.status === "open" && c.date >= today),
        reviews: data.reviews.map((r) => ({ dest: r.to })),
      })
    : [];

  return (
    <>
      <Splash />
      <div className="flex flex-col gap-6">
        <StoryStrip stories={data?.stories ?? []} onPosted={reload} />
        <section>
          <h2 className="mb-3 font-semibold">여행자들이 있는 곳</h2>
          <TravelMap cities={cities} routes={auth.trips} />
        </section>
      </div>
    </>
  );
}
