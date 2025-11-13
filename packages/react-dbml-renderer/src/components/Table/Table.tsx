import type { Node } from '@xyflow/react';
import { useContext, useEffect, useRef, useState } from 'react';
import { PreviewContext } from '../../contexts/PreviewContext';
import Field from '../Field';
import styles from './Table.module.scss';
import { createTableId } from '../../utils/ids';
import type { DbmlTable } from '../../types';

type Props = Partial<Node> & {
  data: {
    table: DbmlTable;
  };
};
const Table = (props: Props) => {
  const {
    data: { table },
  } = props;
  const [rendered, setRendered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { setTable } = useContext(PreviewContext);

  const { fields, name, 
    // id, 
    schema, 
    // TODO: use note
    // note 
  } = table;
  const tableId = createTableId(table);
  useEffect(() => {
    if (!ref.current || !rendered) return;
    const { clientHeight: height, clientWidth: width } = ref.current;
    setTable(tableId, {
      width,
      height,
    });
  }, [rendered]);
  useEffect(() => {
    setRendered(true);
  }, []);

  return (
    <div className={styles.table} ref={ref}>
      <div className={styles.header}>{`${schema.name}.${name}`}</div>
      {fields.map((field) => {
        return <Field field={field} key={field.id} />;
      })}
    </div>
  );
};
export default Table;
