import { PublicBoxPage } from '@/components/profile/ProfileSurface'

export default function ProfileBoxPage({ params }: { params: { slug: string } }) {
  return <PublicBoxPage slug={params.slug} />
}
