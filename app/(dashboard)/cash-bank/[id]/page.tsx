import { AccountDetailsView } from "../_components/account-details-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CashAccountDetailsPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto px-4">
      <AccountDetailsView accountId={id} />
    </div>
  );
}
