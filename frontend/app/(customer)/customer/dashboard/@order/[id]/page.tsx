import OrderProductDetailsPage from './OrderProductDetailsPage';

export default async function Page({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 ">
        <div className="w-full max-w-6xl mx-auto px-4 py-10">
          <p className="text-sm text-gray-600">Missing product id.</p>
        </div>
      </div>
    );
  }

  return <OrderProductDetailsPage id={id} />;
}
