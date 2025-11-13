import { Handle, type HandleProps } from "@xyflow/react"
import clsx from "clsx"
import type { FC } from "react"
import styles from './Relation.module.scss'

type Props = HandleProps & {
  relation: string
}
const RELATION_STYLES: Record<string,string> = {
  '1': styles.relationOne,
  '*': styles.relationMany
}
const POSITION_STYLES: Record<string, string> = {
  left: styles.left,
  right: styles.right,
}
const Relation: FC<Props> = (props) => {
  const { relation, position, ...otherProps} = props
  const relationStyle = RELATION_STYLES[relation]
  
  const positionStyle = POSITION_STYLES[position]
  return (
    <Handle 
      {...otherProps}
      position={position}
      className={clsx(styles.base, positionStyle, relationStyle)}
    />
  )
}
export default Relation