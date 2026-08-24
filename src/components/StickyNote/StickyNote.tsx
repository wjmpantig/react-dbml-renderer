import type { StickyNote as DbmlStickyNote } from "@dbml/core";
import type { Node } from "@xyflow/react";
import clsx from "clsx";
import styles from "./StickyNote.module.scss";

export type StickyNoteData = {
	note: DbmlStickyNote;
};

type Props = Partial<Node> & {
	data: StickyNoteData;
};

const StickyNote = (props: Props) => {
	const {
		data: { note },
	} = props;
	// [color: none] is DBML's way of asking for floating text with no card
	const plain = note.color === "none";
	return (
		<div
			className={clsx(styles.note, plain && styles.plain)}
			style={note.color && !plain ? { backgroundColor: note.color } : undefined}
		>
			<div className={styles.title}>{note.name}</div>
			<div className={styles.content}>{note.content}</div>
		</div>
	);
};
export default StickyNote;
