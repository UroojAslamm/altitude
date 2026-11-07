import { useQuery } from '@tanstack/react-query';
import { Facebook, Instagram } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cx } from './ui';

/** Lucide has no Google mark. */
function GoogleLogo({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}

const LINKS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'google', label: 'Google review', icon: GoogleLogo },
] as const;

export function SocialButtons({ links, className }: { links: Record<string, string> | undefined; className?: string }) {
  const shown = LINKS.filter((l) => links?.[l.key]);
  if (shown.length === 0) return null;
  return (
    <nav aria-label="Altitude social links" className={cx('flex flex-wrap justify-center gap-2', className)}>
      {shown.map(({ key, label, icon: Icon }) => (
        <a key={key} href={links?.[key]} target="_blank" rel="noreferrer" aria-label={label} title={label} className="btn btn-gold !w-11 !px-0">
          <Icon size={20} />
        </a>
      ))}
    </nav>
  );
}

/** For signed-out pages, which cannot read settings. Stays hidden if the request fails. */
export function PublicSocialButtons({ className }: { className?: string }) {
  const links = useQuery({
    queryKey: ['public-social'],
    queryFn: async () => (await supabase.rpc('public_social_links')).data as Record<string, string> | null,
  });
  return <SocialButtons links={links.data ?? undefined} className={className} />;
}
