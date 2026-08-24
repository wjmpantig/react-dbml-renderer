import type { PropsWithChildren } from "react";
import styles from "./Details.module.scss";

type Props = PropsWithChildren<{
	heading: string;
}>;

// The panel that opens beside a row on hover or keyboard focus. Shared so a
// table note and a column note activate the same way.
const Details = (props: Props) => {
	const { heading, children } = props;
	return (
		<aside className={styles.details}>
			<div className={styles.heading}>{heading}</div>
			<div className={styles.content} data-testid="details-content">
				{children}
			</div>
		</aside>
	);
};
export default Details;
