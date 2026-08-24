import type { SVGProps } from "react";

const Icon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		viewBox="0 0 16 16"
		width="1em"
		height="1em"
		fill="currentColor"
		aria-hidden="true"
		focusable="false"
		{...props}
	/>
);

export const KeyIcon = (props: SVGProps<SVGSVGElement>) => (
	<Icon {...props}>
		<path d="M10.5 1a4.5 4.5 0 0 0-4.28 5.9L1 12.1V15h3v-1.5h1.5V12H7v-1.5h1.1l1-1A4.5 4.5 0 1 0 10.5 1Zm1.25 2.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />
	</Icon>
);

export const NoteIcon = (props: SVGProps<SVGSVGElement>) => (
	<Icon {...props}>
		<path d="M2 1.5h12v8.25L9.75 14H2V1.5Zm1.5 1.5v9.5h5V9h3.5V3h-8.5Zm6.5 7.5v1.9l1.9-1.9H10Z" />
	</Icon>
);

export const ExpandIcon = (props: SVGProps<SVGSVGElement>) => (
	<Icon {...props}>
		<path d="M2 2h5v1.5H3.5V7H2V2Zm7 0h5v5h-1.5V3.5H9V2ZM2 9h1.5v3.5H7V14H2V9Zm10.5 0H14v5H9v-1.5h3.5V9Z" />
	</Icon>
);

export const CompressIcon = (props: SVGProps<SVGSVGElement>) => (
	<Icon {...props}>
		<path d="M6.5 2H8v6H2V6.5h4.5V2Zm3.5 0h1.5v4.5H16V8h-6V2ZM2 9.5h6v6H6.5V11H2V9.5Zm8 0h6V11h-4.5v4.5H10v-6Z" />
	</Icon>
);
