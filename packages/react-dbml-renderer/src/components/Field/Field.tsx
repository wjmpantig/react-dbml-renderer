import type DbmlField from '@dbml/core/types/model_structure/field';
import { Position, useEdges, type HandleType } from '@xyflow/react';
import clsx from 'clsx';
import {
  type HTMLAttributes,
  type ReactNode,
  useState,
} from 'react';
import styles from './Field.module.scss';
import Relation from '../Relation/Relation';
import type Ref from '@dbml/core/types/model_structure/ref';
import type Endpoint from '@dbml/core/types/model_structure/endpoint';

type Props = HTMLAttributes<HTMLDivElement> & {
  field: DbmlField;
};

// const HANDLE_TYPES = ['source','target']
// const POSITIONS = ['left','right']
const Field = (props: Props) => {
  const { field, } = props;
  const { name, type, not_null, pk, note, 
    // endpoints, table, 
    id, 
    // _enum
  } = field;
  const edges = useEdges()

  const handleIdPrefix = `field-${id}-`;
  const connectedEdges = edges.filter(edge => edge.sourceHandle?.startsWith(handleIdPrefix) || edge.targetHandle?.startsWith(handleIdPrefix))
  const [showNotes, setShowNotes] = useState(false);

  const handles = connectedEdges.map<ReactNode>((edge) => {
    const regex = /field-\d+-(source|target)-(left|right)/
    const isSource = edge.sourceHandle?.startsWith(handleIdPrefix)
    const { sourceHandle, targetHandle } = edge
    const handleId = isSource ? sourceHandle : targetHandle
    const [, handleType, position] = handleId?.match(regex) || []
    const ref = edge.data?.ref as Ref
    if (!ref) {
      return null
    }
    const [source, target] = ref.endpoints
    const isTarget = handleType === 'target';
    const endpoint: Endpoint = isTarget ? target : source
    return <Relation
              key={edge.id}
              id={handleId}
              type={handleType as HandleType}
              position={position === 'left' ? Position.Left : Position.Right}
              relation={endpoint.relation}
               />
  })

  return (
    <div className={styles.field}>
      <div className={styles.label}>
        <span className={clsx(styles.fieldName, pk && styles.fieldNamePk)}>
          {name}
          {note && (
          <button
            type="button"
            onMouseEnter={() => {
              setShowNotes(true);
            }}
            onMouseLeave={() => {
              setShowNotes(false);
            }}
          >
            N
            {showNotes && <div className={styles.note}>{note}</div>}
          </button>
        )}
        </span>{' '}
        : {type?.type_name}
      </div>
      {handles}
      <div className={styles.properties}>
        {pk && (
          <button type="button" title="Primary Key">PK</button>
        )}
        {not_null && (
          <button type="button" title="Not null">NN</button>
        )}
        
        
      </div>
    </div>
  );
};

export default Field;
