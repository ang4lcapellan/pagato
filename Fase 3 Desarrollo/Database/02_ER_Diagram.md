# Diagrama entidad-relación inicial

El diagrama representa el esquema lógico del MVP. Las líneas muestran cardinalidad; los `CHECK`, índices parciales y triggers se documentan fuera del diagrama.

```mermaid
erDiagram
    USERS ||--|| USER_PROFILES : has
    USERS ||--o{ ACCOUNTS : owns
    USERS ||--o{ CATEGORIES : creates
    USERS ||--o{ TRANSACTIONS : owns
    USERS ||--o{ BUDGETS : defines
    USERS ||--o{ TAGS : owns

    ACCOUNTS ||--o{ TRANSACTIONS : receives_income_or_expense
    CATEGORIES o|--o{ TRANSACTIONS : classifies
    CATEGORIES o|--o{ BUDGETS : limits

    TRANSACTIONS ||--o| TRANSFERS : extends
    ACCOUNTS ||--o{ TRANSFERS : source
    ACCOUNTS ||--o{ TRANSFERS : destination

    TRANSACTIONS ||--o{ TRANSACTION_TAGS : tagged
    TAGS ||--o{ TRANSACTION_TAGS : assigned
    TRANSACTIONS ||--o| RECEIPTS : documents

    USERS {
        uuid id PK
        varchar email
        varchar email_normalized UK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    USER_PROFILES {
        uuid id PK
        uuid user_id FK,UK
        varchar display_name
        varchar preferred_language
        char base_currency
        char country_code
        varchar time_zone
    }

    ACCOUNTS {
        uuid id PK
        uuid user_id FK
        varchar name
        varchar account_type
        char currency_code
        numeric initial_balance
        date initial_balance_date
        boolean is_active
        boolean include_in_net_worth
        timestamptz deleted_at
    }

    CATEGORIES {
        uuid id PK
        uuid user_id FK
        varchar name
        varchar category_type
        boolean is_system
        boolean is_active
    }

    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        varchar transaction_type
        numeric amount
        char currency_code
        timestamptz transaction_date
        uuid account_id FK
        uuid category_id FK
        varchar status
        timestamptz deleted_at
    }

    TRANSFERS {
        uuid transaction_id PK,FK
        uuid user_id FK
        uuid source_account_id FK
        uuid destination_account_id FK
    }

    BUDGETS {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        varchar name
        numeric amount
        char currency_code
        varchar period_type
        date start_date
        date end_date
        varchar status
        numeric warning_threshold
    }

    TAGS {
        uuid id PK
        uuid user_id FK
        varchar name
    }

    TRANSACTION_TAGS {
        uuid transaction_id PK,FK
        uuid tag_id PK,FK
        uuid user_id FK
    }

    RECEIPTS {
        uuid id PK
        uuid transaction_id FK,UK
        varchar storage_key
        varchar file_name
        varchar content_type
        bigint file_size
    }
```

## Nota sobre categorías del sistema

`CATEGORIES.user_id` es nulo únicamente para categorías del sistema. Por eso la relación visual con `USERS` es opcional. Las categorías personales sí tienen exactamente un propietario.
