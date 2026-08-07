import { LandingExperience } from '@/components/landing/LandingExperience';
import { getOptionalSession } from '@/server/auth/session';

export default async function HomePage() {
  const session = await getOptionalSession();
  return <LandingExperience authenticated={Boolean(session?.user)} />;
}
