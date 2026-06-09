import LoadDetailClient from './load-detail-client';

export default async function LoadDetailPage({
  params,
}: {
  params: Promise<{ loadId: string }>;
}) {
  const { loadId } = await params;
  return <LoadDetailClient loadId={loadId} />;
}
