// Re-export the dynamic [type] page component with type='contracts'
// This ensures /contracts route works explicitly
import PageComponent from '../[type]/page';

interface SearchParamProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ContractsPage({
  searchParams,
}: SearchParamProps) {
  // Pass contracts as the type parameter
  return (
    <PageComponent
      params={Promise.resolve({ type: 'contracts' })}
      searchParams={searchParams}
    />
  );
}
