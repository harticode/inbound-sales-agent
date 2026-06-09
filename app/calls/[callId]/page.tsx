import CallDetailClient from "./call-detail-client";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  return <CallDetailClient callId={callId} />;
}
