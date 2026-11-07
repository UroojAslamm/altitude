import { useQuery } from '@tanstack/react-query';
import { Facebook, Instagram, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cx } from './ui';

const LINKS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'google', label: 'Google review', icon: Star },
] as const;

export function SocialButtons({ links, className }: { links: Record<string, string> | undefined; className?: string }) {
  const shown = LINKS.filter((l) => links?.[l.key]);
  if (shown.length === 0) return null;
  return (
    <nav aria-label="Altitude social links" className={cx('flex flex-wrap justify-center gap-2', className)}>
      {shown.map(({ key, label, icon: Icon }) => (
        <a key={key} href={links?.[key]} target="_blank" rel="noreferrer" className="btn btn-gold">
          <Icon size={18} strokeWidth={1.75} />{label}
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
