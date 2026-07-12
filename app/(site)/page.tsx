import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/features/hero/hero";
import { Story } from "@/features/story/story";
import { Details } from "@/features/details/details";
import { Schedule } from "@/features/schedule/schedule";
import { Gallery } from "@/features/gallery/gallery";
import { Faq } from "@/features/faq/faq";
import { RsvpSection } from "@/features/rsvp/rsvp-section";
import { getWeddingContent } from "@/services/wedding-service";

/** Re-render hourly so content edited in Supabase (schedule, gallery,
 * FAQs) reaches guests without a redeploy. */
export const revalidate = 3600;

export default async function Home() {
  const { wedding, story, schedule, gallery, faqs } = await getWeddingContent();
  const monogram = `${wedding.brideName[0]} & ${wedding.groomName[0]}`;

  return (
    <>
      <SiteNav monogram={monogram} />
      <main>
        <Hero wedding={wedding} />
        <Story milestones={story} />
        <Details wedding={wedding} />
        <Schedule items={schedule} />
        <Gallery images={gallery} />
        <Faq faqs={faqs} />
        <RsvpSection wedding={wedding} />
      </main>
      <SiteFooter wedding={wedding} />
    </>
  );
}
