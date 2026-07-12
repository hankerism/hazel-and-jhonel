import { MusicPlayer } from "@/components/music-player";
import { getWeddingContent } from "@/services/wedding-service";

/** Public site chrome: background music mounts here (not on /login or
 * /dashboard) so playback follows guests through the whole site. */
export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { wedding } = await getWeddingContent();

  return (
    <>
      {children}
      <MusicPlayer src={wedding.musicUrl} autoplay={wedding.musicAutoplay} />
    </>
  );
}
