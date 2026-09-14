import { DbmlRenderer } from "@wjmpantig/react-dbml-renderer";
import "@xyflow/react/dist/style.css";
import "@wjmpantig/react-dbml-renderer/style.css";

import "./App.css";
const DEFAULT = `
Project multi_schema_demo {
  database_type: 'PostgreSQL'
  note: 'Multi-schema DBML demo: public, payments, notifications'
}

/**********************************************************
 * Enums
 **********************************************************/
Enum user_status {
  ACTIVE
  INACTIVE
  BANNED
}

Enum payment_status {
  PENDING
  CONFIRMED
  FAILED
  REFUNDED
}

Enum notification_channel {
  EMAIL
  SMS
  PUSH
}

/**********************************************************
 * public schema
 **********************************************************/
Table public.users {
  id           bigint [pk, increment]
  email        varchar(254) [not null, unique]
  username     varchar(50)  [not null, unique]
  status       user_status  [not null, default: 'ACTIVE']
  created_at   timestamptz  [not null, default: \`now()\`]
}

Table public.products {
  id           bigint [pk, increment]
  name         text   [not null]
  price_cents  int    [not null]
  stock        int    [not null, default: 0]
  created_at   timestamptz [not null, default: \`now()\`]
}

Table public.orders {
  id           bigint [pk, increment]
  user_id      bigint [not null, ref: > public.users.id]
  total_cents  int    [not null]
  status       varchar(32) [not null, default: 'PENDING']
  placed_at    timestamptz [not null, default: \`now()\`]
}

Table public.order_items {
  id          bigint [pk, increment]
  order_id    bigint [not null, ref: > public.orders.id]
  product_id  bigint [not null, ref: > public.products.id]
  quantity    int    [not null, default: 1]
  unit_price  int    [not null]
}

/**********************************************************
 * payments schema
 **********************************************************/
Table payments.payment_methods {
  id           bigint [pk, increment]
  user_id      bigint [not null, ref: > public.users.id]
  provider     varchar(32) [not null]
  last4        char(4)
  is_default   boolean [not null, default: false]
  created_at   timestamptz [not null, default: \`now()\`]
}

Table payments.transactions {
  id                bigint [pk, increment]
  order_id          bigint [not null, ref: > public.orders.id]
  payment_method_id bigint [ref: > payments.payment_methods.id]
  amount_cents      int    [not null]
  status            payment_status [not null, default: 'PENDING']
  processed_at      timestamptz
  created_at        timestamptz [not null, default: \`now()\`]
}

Table payments.refunds {
  id             bigint [pk, increment]
  transaction_id bigint [not null, ref: > payments.transactions.id]
  amount_cents   int    [not null]
  reason         text
  created_at     timestamptz [not null, default: \`now()\`]
}

/**********************************************************
 * notifications schema
 **********************************************************/
Table notifications.templates {
  id         bigint [pk, increment]
  name       varchar(100) [not null, unique]
  channel    notification_channel [not null]
  subject    text [not null]
  body       text [not null]
  created_at timestamptz [not null, default: \`now()\`]
}

Table notifications.notifications {
  id          bigint [pk, increment]
  user_id     bigint [not null, ref: > public.users.id]
  template_id bigint [not null, ref: > notifications.templates.id]
  sent_at     timestamptz
  read_at     timestamptz
  created_at  timestamptz [not null, default: \`now()\`]
}

Table notifications.notification_preferences {
  user_id    bigint [pk, ref: > public.users.id]
  channel    notification_channel [not null]
  enabled    boolean [not null, default: true]
}
`;
function App() {
	return (
		<div className="app">
			<DbmlRenderer content={DEFAULT} />
		</div>
	);
}

export default App;
