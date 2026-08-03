import PageComponent from "../[type]/page";

interface SearchParamProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DocumentsPage({
	searchParams,
}: SearchParamProps) {
	return (
		<PageComponent
			params={Promise.resolve({ type: "documents" })}
			searchParams={searchParams}
		/>
	);
}
