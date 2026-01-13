import DbmlRenderer from "./DbmlRenderer";

import "./App.css";
const DEFAULT = `
Project sample_app_db {
  database_type: 'PostgreSQL'
  note: 'Comprehensive DBML sample for renderer testing'
}

/**********************************************************
 * Enums
 **********************************************************/
Enum user_status {
  ACTIVE
  INACTIVE
  BANNED [note: 'User is banned from the platform']
}

Enum payment_method_type {
  CARD
  E_WALLET
  BANK_TRANSFER
}

Enum currency_code {
  PHP
  USD
  JPY
}

/**********************************************************
 * Public schema
 **********************************************************/
Table public.users {
  id              bigint [pk, increment]
  email           varchar(254) [not null, unique]
  username        varchar(50) [not null, unique]
  password_hash   varchar(255) [not null]
  status          user_status [not null, default: 'ACTIVE']
  created_at      timestamptz [not null, default: \`now()\`]
  updated_at      timestamptz [not null, default: \`now()\`]
  referrer_id     bigint [note: 'Self-ref: referral tree']

  note: 'Application end users'
}

Table public.user_profiles {
  user_id       bigint [pk]
  full_name     text [not null]
  birthdate     date
  bio           text
  avatar_url    text
  timezone      text [default: '+08:00']

  note: 'One-to-one extension of users table'
}

Table public.roles {
  id          smallint [pk, increment]
  name        varchar(50) [not null, unique]
  description text
}

Table public.user_roles {
  user_id bigint [ref: > public.users.id]
  role_id smallint [ref: > public.roles.id]
  test_id int
  assigned_at timestamptz [not null, default: \`now()\`]

  Note: 'Many-to-many join table between users and roles (inline refs)'

  Indexes {
    (user_id, role_id) [unique, name: 'uq_user_roles_user_role']
  }
}

/**********************************************************
 * Restaurant & menu domain
 **********************************************************/
Table public.restaurants {
  id            bigint [pk, increment]
  owner_id      bigint [not null, ref: > public.users.id]
  slug          varchar(100) [not null, unique]
  name          text [not null]
  description   text
  is_published  boolean [not null, default: false]
  created_at    timestamptz [not null, default: \`now()\`]
  updated_at    timestamptz [not null, default: \`now()\`]

  note: 'Restaurant listing; owned by a user'
}

Table public.branches {
  id             bigint [pk, increment]
  restaurant_id  bigint [not null]
  name           text [not null]
  address_line1  text [not null]
  address_line2  text
  city           text [not null]
  latitude       numeric(10, 7)
  longitude      numeric(10, 7)
  is_main        boolean [not null, default: false]

  Note: 'Physical restaurant branches (ref defined via explicit Ref)'

  Indexes {
    (restaurant_id, is_main) [name: 'idx_branches_main_by_restaurant']
  }
}

Table public.menu_categories {
  id             bigint [pk, increment]
  restaurant_id  bigint [not null, ref: > public.restaurants.id]
  name           text [not null]
  sort_order     int [not null, default: 0]

  Indexes {
    (restaurant_id, sort_order)
  }
}

Table public.menu_items {
  id               bigint [pk, increment]
  restaurant_id    bigint [not null, ref: > public.restaurants.id]
  category_id      bigint [ref: > public.menu_categories.id]
  name             text [not null]
  description      text
  base_price_cents int [not null]
  currency         currency_code [not null, default: 'PHP']
  is_available     boolean [not null, default: true]
  created_at       timestamptz [not null, default: \`now()\`]

  Note: 'Menu items belonging to a restaurant and optionally a category'

  Indexes {
    restaurant_id
    (restaurant_id, is_available)
  }
}

/**********************************************************
 * Ordering & payments
 **********************************************************/
Table public.orders {
  id              bigint [pk, increment]
  user_id         bigint [not null, ref: > public.users.id]
  restaurant_id   bigint [not null, ref: > public.restaurants.id]
  branch_id       bigint [ref: > public.branches.id]
  total_amount    numeric(12,2) [not null]
  currency        currency_code [not null, default: 'PHP']
  status          varchar(32) [not null, default: 'PENDING']
  placed_at       timestamptz [not null, default: \`now()\`]
  paid_at         timestamptz
  canceled_at     timestamptz

  Note: 'Customer orders'

  Indexes {
    (user_id, placed_at) [name: 'idx_orders_user_placed_at']
    (restaurant_id, placed_at)
  }
}

Table public.order_items {
  id               bigint [pk, increment]
  order_id         bigint [not null, ref: > public.orders.id]
  menu_item_id     bigint [not null, ref: > public.menu_items.id]
  quantity         int [not null, default: 1]
  unit_price_cents int [not null]
  currency         currency_code [not null, default: 'PHP']

  Note: 'Line items of an order'

  Indexes {
    order_id
    (order_id, menu_item_id) [unique]
  }
}

/**********************************************************
 * Payments schema (separate logical boundary)
 **********************************************************/
Table payments.payment_methods {
  id                bigint [pk, increment]
  user_id           bigint [not null, ref: > public.users.id]
  method_type       payment_method_type [not null]
  display_label     text [not null]
  token             text [not null, note: 'Non-PCI token reference; no PAN storage']
  last4             char(4) [note: 'optional last 4 for cards']
  is_default        boolean [not null, default: false]
  created_at        timestamptz [not null, default: \`now()\`]
  deactivated_at    timestamptz

  Indexes {
    (user_id, is_default) [name: 'idx_payment_methods_default']
  }

  note: 'Stored, tokenized payment method'
}

Table payments.payment_intents {
  id                bigint [pk, increment]
  order_id          bigint [not null, ref: > public.orders.id]
  user_id           bigint [not null, ref: > public.users.id]
  payment_method_id bigint [ref: > payments.payment_methods.id]
  client_secret     text [not null]
  amount            numeric(12,2) [not null]
  currency          currency_code [not null]
  status            varchar(32) [not null, default: 'REQUIRES_PAYMENT_METHOD']
  created_at        timestamptz [not null, default: \`now()\`]
  confirmed_at      timestamptz
  canceled_at       timestamptz

  note: 'Stripe-like payment intent object'

  Indexes {
    order_id [unique, name: 'uq_payment_intents_by_order']
    (user_id, created_at)
  }
}

Table payments.payment_events {
  id                bigint [pk, increment]
  payment_intent_id bigint
  event_type        varchar(64) [not null]
  raw_payload       jsonb [not null]
  created_at        timestamptz [not null, default: \`now()\`]

  note: 'Audit log of gateway events (webhooks, status changes); ref via explicit Ref'
}

/**********************************************************
 * Many-to-many via join table: user <-> restaurant (favorites)
 * (explicit refs only)
 **********************************************************/
Table public.user_favorites {
  user_id       bigint [not null]
  restaurant_id bigint [not null]
  added_at      timestamptz [not null, default: \`now()\`]

  Indexes {
    (user_id, restaurant_id) [pk, name: 'pk_user_favorites']
  }

  note: 'Many-to-many relationship: users can favorite multiple restaurants'
}

/**********************************************************
 * Table groups (for visualization)
 **********************************************************/
TableGroup public_app {
  note: 'Core public schema tables used by the consumer-facing app'

    public.users
    public.user_profiles
    public.roles
    public.user_roles
    public.restaurants
    public.branches
    public.menu_categories
    public.menu_items
    public.orders
    public.order_items
    public.user_favorites
}

TableGroup payments_core {
  note: 'Payment-related tables for internal tools and services'

    payments.payment_methods
    payments.payment_intents
    payments.payment_events
}

/**********************************************************
 * Explicit Ref blocks (non-duplicate with inline refs)
 **********************************************************/

// One-to-many (explicit only): restaurant has many branches
Ref: public.restaurants.id < public.branches.restaurant_id

// One-to-one (explicit only): users -> user_profiles
Ref: public.users.id - public.user_profiles.user_id

// Many-to-many (explicit only): users favorites restaurants via user_favorites
Ref: public.users.id < public.user_favorites.user_id
Ref: public.restaurants.id < public.user_favorites.restaurant_id

// Self-referencing (explicit only): user referrer chain
Ref: public.users.id < public.users.referrer_id

// Cross-schema (explicit only): payment_events -> payment_intents
Ref: payments.payment_intents.id < payments.payment_events.payment_intent_id
  `;
function App() {
	return (
		<>
			<div className="app">
        
				<DbmlRenderer content={DEFAULT} />
			</div>
		</>
	);
}

export default App;
