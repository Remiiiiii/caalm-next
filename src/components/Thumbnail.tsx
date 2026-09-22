import Image from "next/image";
import { cn, getFileIcon } from "@/lib/utils";

interface Props {
	type: string;
	extension: string;
	url: string;
	imageClassName?: string;
	className?: string;
	/** Use the format icon even when the file is an image. */
	iconOnly?: boolean;
}

export const Thumbnail = ({
	type,
	extension,
	url = "",
	imageClassName,
	className,
	iconOnly = false,
}: Props) => {
	const isImage = !iconOnly && type === "image" && extension !== "svg";
	return (
		<figure className={cn("thumbnail", className)}>
			<Image
				src={isImage ? url : getFileIcon({ extension, type })}
				alt="thumbnail"
				width={100}
				height={100}
				className={cn(
					"size-8 object-contain",
					imageClassName,
					isImage && "thumbnail-image",
				)}
			/>
		</figure>
	);
};

export default Thumbnail;
