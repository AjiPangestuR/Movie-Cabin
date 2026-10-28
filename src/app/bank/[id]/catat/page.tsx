import { CatatView } from '@/components/views/CatatView';

interface CatatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CatatPage({ params }: CatatPageProps) {
  const { id } = await params;
  return <CatatView id={Number(id)} />;
}
