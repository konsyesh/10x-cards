# REST API Plan - 10x-Cards

## 0. MVP Scope & Deferred Features

### Implemented in MVP

- **Flashcard Generation**: `POST /generations` - AI-powered flashcard generation
- **Generation History**: `GET /generations`, `GET /generations/:id` - Track generation sessions
- **Flashcard CRUD**: `POST/GET/PATCH/DELETE /flashcards` - Create, retrieve, update, delete flashcards
- **Bulk Save**: `POST /flashcards` with array of flashcards - Save multiple AI-generated/edited cards at once
- **Search & Filter**: Query parameters for flashcard listing with pagination

### Deferred (Post-MVP)

- **Authentication & Account Management**: `/auth/*` endpoints (register, login, logout, password-reset, account deletion)
- **Collections Management**: Create, list, manage flashcard collections
- **Analytics & Metrics**: User performance metrics (AI-acceptance rate, AI-usage rate)
- **Study Sessions**: Spaced repetition scheduler integration endpoints
- **Study Cards & Ratings**: Learning session endpoints for getting today's cards and rating responses

**Note**: Backend RLS (Row-Level Security) and authentication via Supabase Auth are still required for MVP, but dedicated API endpoints for auth will be added in phase 2.

## 1. Resources

- **Flashcards** - Cards for learning, mapped to `flashcards` table
- **Generations** - Generation sessions with candidate cards, mapped to `generations` table
- **Collections** - User's flashcard collections, mapped to `collections` table
- **Analytics** - User metrics and KPI data
- **Auth** - Authentication and account management (Supabase Auth)

---

## 2. Endpoints

### Flashcard Generation

#### Create Generation Session

- **Method**: `POST`
- **Path**: `/generations`
- **Description**: Initiate AI-powered flashcard generation from source text and receive generated flashcards (FR-01)
- **Authorization**: Required (JWT)
- **Rate Limit**: 5 requests per minute per user
- **Request Body**:
  ```json
  {
    "source_text": "Source text content...",
    "model": "gpt-4o-mini"
  }
  ```
- **Validation**:
  - Text length: 1000–50000 characters (FR-01, FR-12)
  - Model must be supported
- **Response (201 Created)**:
  ```json
  {
    "generation_id": 12345,
    "status": "completed",
    "model": "gpt-4o-mini",
    "generated_count": 25,
    "generation_duration_ms": 28500,
    "flashcards_candidates": [
      {
        "front": "What is photosynthesis?",
        "back": "Biological process converting light energy into chemical energy",
        "source": "ai-full"
      },
      {
        "front": "Name three types of plants",
        "back": "1. Flowering plants 2. Ferns 3. Mosses",
        "source": "ai-full"
      }
    ],
    "message": "Generation completed. 25 flashcards generated."
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Text outside valid range (1k–50k chars)
  - `429 Too Many Requests`: Rate limit exceeded
  - `503 Service Unavailable`: LLM service unavailable
  - `504 Gateway Timeout`: LLM request timed out

#### List Generations

- **Method**: `GET`
- **Path**: `/generations`
- **Description**: Retrieve user's generation history and sessions
- **Authorization**: Required (JWT)
- **Query Parameters**:
  - `page` (default: 1): Page number for pagination
  - `per_page` (default: 10): Items per page
  - `sort` (default: `created_at`): Sort field - `created_at|generation_duration_ms`
  - `order` (default: `desc`): Sort order - `asc|desc`
- **Response (200 OK)**:
  ```json
  {
    "generations": [
      {
        "id": 12345,
        "model": "gpt-4o-mini",
        "source_text_hash": "d6c90e10449febb2b2bb8c9a3c4e19c8fb6b49f3a6d8e9c5b2a1f3e4d6c7b8a",
        "source_text_length": 15000,
        "generated_count": 25,
        "accepted_unedited_count": 18,
        "accepted_edited_count": 5,
        "generation_duration_ms": 28500,
        "created_at": "2025-10-23T10:00:00Z",
        "updated_at": "2025-10-23T10:00:30Z"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 10,
      "total": 42,
      "total_pages": 5
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Generation not found
  - `403 Forbidden`: User not authorized

#### Get Generation Details

- **Method**: `GET`
- **Path**: `/generations/:generation_id`
- **Description**: Get status and metadata of a specific generation session
- **Authorization**: Required (JWT)
- **Response (200 OK)**:
  ```json
  {
    "id": 12345,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "model": "gpt-4o-mini",
    "source_text_hash": "d6c90e10449febb2b2bb8c9a3c4e19c8fb6b49f3a6d8e9c5b2a1f3e4d6c7b8a",
    "source_text_length": 15000,
    "generated_count": 25,
    "accepted_unedited_count": 18,
    "accepted_edited_count": 5,
    "generation_duration_ms": 28500,
    "created_at": "2025-10-23T10:00:00Z",
    "updated_at": "2025-10-23T10:00:30Z"
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Generation not found or belongs to another user
  - `403 Forbidden`: User not authorized to access this generation

---

### Flashcard Management

#### Create or Bulk Save Flashcards

- **Method**: `POST`
- **Path**: `/flashcards`
- **Description**: Create manual flashcard or bulk save AI-generated/edited flashcards from generation (FR-03, FR-05)
- **Authorization**: Required (JWT)
- **Request Body** (unified - always array):
  ```json
  {
    "flashcards": [
      {
        "front": "Question or prompt",
        "back": "Answer or explanation",
        "source": "manual",
        "generation_id": null
      }
    ],
    "collection_id": null
  }
  ```
- **Request Body Example** (bulk AI-generated):
  ```json
  {
    "flashcards": [
      {
        "front": "What is photosynthesis?",
        "back": "Biological process converting light energy into chemical energy",
        "source": "ai-full",
        "generation_id": 12345
      },
      {
        "front": "Edited plant types",
        "back": "1. Flowering plants 2. Ferns 3. Mosses (edited)",
        "source": "ai-edited",
        "generation_id": 12345
      }
    ],
    "collection_id": null
  }
  ```
- **Validation**:
  - `flashcards`: Array with at least one item
  - `flashcards[].front`: 1–200 characters (FR-04)
  - `flashcards[].back`: 1–500 characters (FR-04)
  - `flashcards[].source`: One of `manual|ai-full|ai-edited` (FR-04)
  - `flashcards[].generation_id`: Optional; must reference valid generation if provided
  - `collection_id`: Optional; must belong to authenticated user
- **Response (201 Created)** (unified for single and bulk):
  ```json
  {
    "saved_count": 2,
    "flashcards": [
      {
        "id": 2001,
        "front": "What is photosynthesis?",
        "back": "Biological process converting light energy into chemical energy",
        "source": "ai-full",
        "generation_id": 12345,
        "collection_id": null,
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "created_at": "2025-10-23T10:00:00Z",
        "updated_at": "2025-10-23T10:00:00Z"
      },
      {
        "id": 2002,
        "front": "Edited plant types",
        "back": "1. Flowering plants 2. Ferns 3. Mosses (edited)",
        "source": "ai-edited",
        "generation_id": 12345,
        "collection_id": null,
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "created_at": "2025-10-23T10:00:01Z",
        "updated_at": "2025-10-23T10:00:01Z"
      }
    ],
    "collection_id": null,
    "message": "2 flashcards successfully saved"
  }
  ```
- **Side Effects**:
  - Registers all flashcards with spaced repetition scheduler (FR-08)
  - Updates `generations.accepted_unedited_count` and `accepted_edited_count` for bulk save with generation_id
  - Triggers analytics events for AI-usage rate calculation (FR-10)
- **Error Responses**:
  - `400 Bad Request`: Empty array, text exceeds length limits, or validation fails
  - `403 Forbidden`: Cannot save to collection owned by another user
  - `404 Not Found`: Collection not found or generation_id references invalid generation
  - `503 Service Unavailable`: Scheduler integration failed

#### List Flashcards

- **Method**: `GET`
- **Path**: `/flashcards`
- **Description**: Retrieve user's flashcards with search, filtering, and sorting (FR-06)
- **Authorization**: Required (JWT)
- **Query Parameters**:
  - `page` (default: 1): Page number for pagination
  - `per_page` (default: 20, max: 100): Items per page
  - `search` (optional): Full-text search in front/back fields
  - `collection_id` (optional): Filter by collection
  - `source` (optional): Filter by source - `ai-full|ai-edited|manual`
  - `sort` (default: `created_at`): Sort field - `created_at|updated_at|front`
  - `order` (default: `desc`): Sort order - `asc|desc`
- **Response (200 OK)**:
  ```json
  {
    "flashcards": [
      {
        "id": 2001,
        "front": "What is photosynthesis?",
        "back": "Biological process converting light energy into chemical energy",
        "source": "ai-edited",
        "collection_id": 3001,
        "generation_id": 12345,
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "created_at": "2025-10-23T10:00:00Z",
        "updated_at": "2025-10-23T10:05:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 156,
      "total_pages": 8
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid query parameters

#### Get Flashcard Details

- **Method**: `GET`
- **Path**: `/flashcards/:flashcard_id`
- **Description**: Retrieve a single flashcard with metadata
- **Authorization**: Required (JWT)
- **Response (200 OK)**:
  ```json
  {
    "id": 2001,
    "front": "What is photosynthesis?",
    "back": "Biological process converting light energy into chemical energy",
    "source": "ai-edited",
    "collection_id": 3001,
    "generation_id": 12345,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-10-23T10:00:00Z",
    "updated_at": "2025-10-23T10:05:00Z"
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Flashcard not found or belongs to another user
  - `403 Forbidden`: User not authorized to access

#### Update Flashcard

- **Method**: `PATCH`
- **Path**: `/flashcards/:flashcard_id`
- **Description**: Edit existing flashcard (FR-06, FR-14)
- **Authorization**: Required (JWT)
- **Request Body**:
  ```json
  {
    "front": "Updated question",
    "back": "Updated answer",
    "collection_id": null
  }
  ```
- **Validation**:
  - `front`: 1–200 characters (if provided)
  - `back`: 1–500 characters (if provided)
  - `collection_id`: Optional; must belong to authenticated user
- **Response (200 OK)**:
  ```json
  {
    "id": 2001,
    "front": "Updated question",
    "back": "Updated answer",
    "source": "ai-edited",
    "collection_id": null,
    "updated_at": "2025-10-23T10:10:00Z"
  }
  ```
- **Side Effects**:
  - Updates `updated_at` timestamp automatically (via database trigger)
  - Notifies spaced repetition scheduler of edit
  - Logs edit event (FR-14) without storing sensitive content
- **Error Responses**:
  - `400 Bad Request`: Text exceeds length limits
  - `404 Not Found`: Flashcard not found
  - `403 Forbidden`: User not authorized to edit
  - `409 Conflict`: Flashcard edited by another user session (conflict detection - US-24)

#### Delete Flashcard

- **Method**: `DELETE`
- **Path**: `/flashcards/:flashcard_id`
- **Description**: Delete a flashcard (FR-06, FR-14)
- **Authorization**: Required (JWT)
- **Response (200 OK)**:
  ```json
  {
    "id": 2001,
    "message": "Flashcard successfully deleted"
  }
  ```
- **Side Effects**:
  - Removes flashcard from spaced repetition scheduler (FR-08)
  - Logs deletion event (FR-14)
- **Error Responses**:
  - `404 Not Found`: Flashcard not found
  - `403 Forbidden`: User not authorized to delete

---

### Collections Management

#### Create Collection

- **Method**: `POST`
- **Path**: `/collections`
- **Description**: Create a new flashcard collection
- **Authorization**: Required (JWT)
- **Request Body**:
  ```json
  {
    "name": "Biology 101"
  }
  ```
- **Validation**:
  - `name`: 1–100 characters
- **Response (201 Created)**:
  ```json
  {
    "id": 3001,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Biology 101",
    "created_at": "2025-10-23T10:00:00Z",
    "updated_at": "2025-10-23T10:00:00Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid name length

#### List Collections

- **Method**: `GET`
- **Path**: `/collections`
- **Description**: Retrieve user's collections
- **Authorization**: Required (JWT)
- **Query Parameters**:
  - `page` (default: 1): Page number
  - `per_page` (default: 50): Items per page
  - `sort` (default: `created_at`): Sort by `created_at|name`
  - `order` (default: `desc`): Sort order
- **Response (200 OK)**:
  ```json
  {
    "collections": [
      {
        "id": 3001,
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Biology 101",
        "flashcard_count": 42,
        "created_at": "2025-10-23T10:00:00Z",
        "updated_at": "2025-10-23T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 50,
      "total": 5,
      "total_pages": 1
    }
  }
  ```

#### Get Collection Details

- **Method**: `GET`
- **Path**: `/collections/:collection_id`
- **Description**: Get collection info and associated flashcards
- **Authorization**: Required (JWT)
- **Query Parameters**:
  - `page` (default: 1): Page of flashcards
  - `per_page` (default: 20): Flashcards per page
- **Response (200 OK)**:
  ```json
  {
    "id": 3001,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Biology 101",
    "created_at": "2025-10-23T10:00:00Z",
    "updated_at": "2025-10-23T10:00:00Z",
    "flashcards": [
      {
        "id": 2001,
        "front": "Question",
        "back": "Answer"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 42,
      "total_pages": 3
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Collection not found
  - `403 Forbidden`: User not authorized

#### Update Collection

- **Method**: `PATCH`
- **Path**: `/collections/:collection_id`
- **Description**: Update collection name
- **Authorization**: Required (JWT)
- **Request Body**:
  ```json
  {
    "name": "Advanced Biology"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": 3001,
    "name": "Advanced Biology",
    "updated_at": "2025-10-23T10:05:00Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid name
  - `404 Not Found`: Collection not found

#### Delete Collection

- **Method**: `DELETE`
- **Path**: `/collections/:collection_id`
- **Description**: Delete collection (flashcards are moved to default/null collection)
- **Authorization**: Required (JWT)
- **Response (200 OK)**:
  ```json
  {
    "id": 3001,
    "message": "Collection deleted"
  }
  ```
- **Side Effects**:
  - Sets `collection_id = null` for all flashcards in collection
- **Error Responses**:
  - `404 Not Found`: Collection not found
  - `403 Forbidden`: User not authorized

---

### Analytics & Metrics

#### Get User Analytics

- **Method**: `GET`
- **Path**: `/analytics`
- **Description**: Retrieve user's performance metrics (FR-10, FR-18)
- **Authorization**: Required (JWT)
- **Query Parameters**:
  - `range` (default: `today`): Time range - `today|week|month|all`
- **Response (200 OK)**:
  ```json
  {
    "period": {
      "range": "today",
      "start_date": "2025-10-23T00:00:00Z",
      "end_date": "2025-10-23T23:59:59Z"
    },
    "generation_metrics": {
      "total_generations": 3,
      "total_candidates_generated": 87,
      "total_text_characters_processed": 45000,
      "average_generation_time_ms": 28500
    },
    "acceptance_metrics": {
      "total_accepted": 65,
      "total_rejected": 22,
      "accepted_unedited": 30,
      "accepted_edited": 35,
      "ai_acceptance_rate": 0.747
    },
    "flashcard_metrics": {
      "total_flashcards": 156,
      "created_today": 65,
      "ai_generated_count": 65,
      "manual_count": 91,
      "ai_usage_rate": 0.417
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid time range parameter

---

## 3. Authentication & Authorization

### Authentication Method

- **Type**: JWT (JSON Web Tokens) via Supabase Auth
- **Token Location**: HTTP `Authorization` header with `Bearer` scheme
- **Implementation**:
  - User credentials managed entirely by Supabase Auth
  - Access tokens issued with configurable expiration (default: 1 hour)
  - Refresh tokens for obtaining new access tokens
  - Session timeout after configured period of inactivity (US-23, configurable server-side)

### Authorization Strategy

- **Row-Level Security (RLS)** enforced at database level:
  - Users can only access/modify records where `user_id = auth.uid()`
  - Service role bypasses RLS for system operations (batch cleanup, account deletion)
- **Endpoint-level Authorization**:
  - All endpoints (except `/auth/register`, `/auth/login`, `/auth/password-reset`) require valid JWT
  - Resource ownership verified at API layer for fail-fast error responses
  - Collection access verified when creating/updating flashcards

### CSRF & XSS Protection

- CSRF tokens for state-changing operations (POST/PATCH/DELETE)
- XSS protection via:
  - Content-Type headers enforced to `application/json`
  - HTML escaping of user-generated content (front/back fields)
  - CSP headers configured server-side

### Rate Limiting (FR-30)

- **Generations endpoint**: 5 requests per minute per authenticated user
- **Auth endpoints**: 5 login attempts per 15 minutes per IP address
- **General endpoints**: 100 requests per minute per authenticated user
- **Response on limit exceeded**: `429 Too Many Requests` with `Retry-After` header

---

## 4. Validation & Business Logic

### Field-Level Validations

#### Flashcard Fields (FR-04)

| Field           | Type           | Constraints                              | Error Code             |
| --------------- | -------------- | ---------------------------------------- | ---------------------- |
| `id`            | number         | Auto-generated, primary key              | —                      |
| `front`         | String         | 1–200 characters, non-empty              | `FRONT_LENGTH_INVALID` |
| `back`          | String         | 1–500 characters, non-empty              | `BACK_LENGTH_INVALID`  |
| `source`        | String         | One of: `ai-full`, `ai-edited`, `manual` | `SOURCE_INVALID`       |
| `user_id`       | string         | UUID, references auth.users              | —                      |
| `collection_id` | number \| null | References collections.id or null        | —                      |
| `generation_id` | number \| null | References generations.id or null        | —                      |

#### Generation Input (FR-01, FR-12)

| Field   | Type   | Constraints             | Error Code            |
| ------- | ------ | ----------------------- | --------------------- |
| `text`  | String | 1,000–50,000 characters | `TEXT_LENGTH_INVALID` |
| `model` | String | Supported LLM model     | `MODEL_UNSUPPORTED`   |

#### Generation Metadata Fields

| Field                     | Type           | Constraints                                | Error Code |
| ------------------------- | -------------- | ------------------------------------------ | ---------- |
| `id`                      | number         | Auto-generated, primary key                | —          |
| `user_id`                 | string         | UUID, references auth.users                | —          |
| `model`                   | string         | LLM model identifier (e.g., "gpt-4o-mini") | —          |
| `source_text_hash`        | string         | SHA-256 hash of source text                | —          |
| `source_text_length`      | number         | 1,000–50,000 characters                    | —          |
| `generated_count`         | number         | Count of candidates generated              | —          |
| `accepted_unedited_count` | number \| null | Count of unedited accepted candidates      | —          |
| `accepted_edited_count`   | number \| null | Count of edited accepted candidates        | —          |
| `generation_duration_ms`  | number         | Time taken in milliseconds                 | —          |

#### Collection Fields

| Field     | Type   | Constraints                 | Error Code            |
| --------- | ------ | --------------------------- | --------------------- |
| `id`      | number | Auto-generated, primary key | —                     |
| `name`    | String | 1–100 characters            | `NAME_LENGTH_INVALID` |
| `user_id` | string | UUID, references auth.users | —                     |

### Business Logic Implementation

#### Generation Workflow (FR-01 → FR-03)

1. **Initiate**: `POST /generations` validates text length (1k–50k chars)
2. **Process**: Async task sends text to LLM via AI SDK v5, tracks `generation_duration_ms`
3. **Generate**: LLM produces flashcards; each flashcard validated for length constraints (front ≤200, back ≤500)
4. **Response**: `POST /generations` returns list of flashcards with `source: 'ai-full'` (no storage yet)
5. **Frontend Review**: Frontend displays generated flashcards in local state; user can edit, accept, or reject
6. **Bulk Save**: User submits edited/accepted flashcards via `POST /flashcards` (bulk endpoint with `flashcards` array)
7. **Save Logic**: Bulk endpoint inserts all flashcards, marks source as `ai-full` or `ai-edited`, updates `generations` counters
8. **Schedule**: Automatic registration with spaced repetition scheduler via background job

#### AI Acceptance Rate Calculation (FR-10)

- **Formula**: `accepted_count / generated_count` per generation session
- **Aggregation**: `SUM(accepted_count) / SUM(generated_count)` across all generations in period
- **Target KPI**: ≥75% (from PRD)
- **Implementation**: Calculated from `generations` table on-demand via aggregation

#### AI Usage Rate Calculation (FR-10)

- **Formula**: `count(flashcards where source IN ['ai-full', 'ai-edited']) / count(all flashcards)` per period
- **Target KPI**: ≥75% (from PRD)
- **Implementation**: Calculated from `flashcards` table with source filtering

#### Cascading Data Deletion (FR-11, FR-19)

When `DELETE /auth/account` is called:

1. Verify password confirmation
2. Mark user for deletion (optional soft-delete period)
3. Hard-delete all related records with CASCADE:
   - `generations` and related `generation_error_logs`
   - `flashcards` and references to scheduler
   - `collections`
4. Delete auth.users record via Supabase Auth
5. Invalidate all active sessions
6. Log deletion event (without user data) for compliance

#### Conflict Detection & Resolution (US-24)

- **Optimistic locking** via `updated_at` timestamp:
  - Client sends `updated_at` value with PATCH request
  - Server compares with current database value
  - If mismatch: return `409 Conflict` with current state
  - Client UI prompts user to merge or overwrite

#### Source Text Hash Tracking

- Store `source_text_hash` (SHA-256) in `generations` table
- Prevents duplicate processing of identical source texts
- Enables retries without duplicate candidate generation (US-20)
- Not stored in generation_error_logs for privacy

#### Study Scheduling Integration (FR-08, FR-09)

- Upon flashcard creation/save: Register with spaced repetition scheduler
- Scheduler returns initial interval and next review date
- `GET /study/cards-today` queries scheduler for today's due cards
- `POST /study/cards/:id/rate` updates scheduler algorithm state
- Scheduler choice: Open-source implementation (Anki algorithm or similar, TBD in implementation)

### Error Handling Patterns

#### Generation Errors (FR-20)

- **Timeout**: Return `504 Gateway Timeout` with option to retry after delay
- **LLM API Error**: Return `503 Service Unavailable` with `error_code` and `error_message` in `generation_error_logs`
- **Invalid Input**: Return `400 Bad Request` with validation details
- **Rate limit exceeded**: Return `429 Too Many Requests`

#### Database Errors

- Constraint violations (e.g., duplicate email): Return `409 Conflict` with user-friendly message
- Referential integrity (e.g., collection not found): Return `404 Not Found`
- Transaction failures: Return `500 Internal Server Error` (should not occur in normal flow)

#### Authorization Errors

- Missing/invalid JWT: Return `401 Unauthorized`
- Valid JWT but resource not owned by user: Return `403 Forbidden`
- Session expired: Return `401 Unauthorized` with hint to refresh token

### Audit & Compliance (FR-14, FR-28)

#### Audit Logging Strategy

- **What is logged**: User ID, action (create/update/delete), resource type, resource ID, timestamp
- **What is NOT logged**: Full flashcard content, source text, user passwords
- **Implementation**: Async writes to audit table with retention policy (90 days default, configurable)
- **Access**: Only admin/system roles can query audit logs

#### GDPR Compliance (FR-11, FR-27)

- **Data export**: User can request full data export (deferred feature, US-33)
- **Data deletion**: `DELETE /auth/account` implements right to be forgotten
- **Transparency**: Privacy policy and data processing terms accessible to users
- **Consent**: Terms accepted at registration; can be updated via dashboard (future)

---

## 5. Response Format Standards

All API responses follow this structure:

### Success Response (2xx)

```json
{
  "data": {
    /* resource data */
  },
  "meta": {
    "timestamp": "2025-10-23T10:00:00Z",
    "status": "success"
  }
}
```

### List Response with Pagination

```json
{
  "data": [
    {
      /* item 1 */
    },
    {
      /* item 2 */
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  },
  "meta": {
    "timestamp": "2025-10-23T10:00:00Z",
    "status": "success"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User-friendly error message",
    "details": [
      {
        "field": "front",
        "message": "Must be between 1 and 200 characters"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-10-23T10:00:00Z",
    "status": "error"
  }
}
```

---

## 6. Performance & Scalability Considerations

### Caching Strategy

- **Generations candidates**: Cache in Redis with 1-hour TTL (candidates are immutable)
- **Collections**: Cache per user with 5-minute TTL
- **Study cards**: No caching (time-sensitive scheduling data)

### Database Indexes

- `flashcards(user_id)` - for user's flashcard queries
- `flashcards(generation_id)` - for generation-to-flashcard relationships
- `flashcards(LOWER(front))` - for case-insensitive full-text search (FR-06, FR-15)
- `flashcards(LOWER(back))` - for full-text search
- `generations(user_id)` - for user's generation history
- `generation_error_logs(user_id)` - for error diagnostics
- `collections(user_id)` - for user's collections

### Pagination Defaults

- Default page size: 20 items (flashcards), 10 items (candidates)
- Maximum page size: 100 items (prevent memory exhaustion)
- Offset-based pagination for MVP (cursor-based recommended for v2)

### Async Operations

- Generation processing: Background job (Supabase Jobs, Bull queue, or similar)
- Scheduler integration: Async hook after flashcard creation
- Error logging: Async batch writes
- Email sending: Background job queue

---

## 7. Error Code Reference

| Code                   | HTTP Status | Meaning                               | Example                                            |
| ---------------------- | ----------- | ------------------------------------- | -------------------------------------------------- |
| `VALIDATION_ERROR`     | 400         | Request data failed validation        | Invalid text length                                |
| `TEXT_LENGTH_INVALID`  | 400         | Source text outside 1k–50k range      | "Text must be 1,000–50,000 chars"                  |
| `FRONT_LENGTH_INVALID` | 400         | Front field exceeds 200 characters    | —                                                  |
| `BACK_LENGTH_INVALID`  | 400         | Back field exceeds 500 characters     | —                                                  |
| `UNAUTHORIZED`         | 401         | Missing or invalid JWT                | "Authorization required"                           |
| `FORBIDDEN`            | 403         | User lacks permission                 | "Cannot access this resource"                      |
| `RESOURCE_NOT_FOUND`   | 404         | Requested resource doesn't exist      | "Flashcard not found"                              |
| `CONFLICT`             | 409         | Resource state conflict               | "Email already exists" or "Edit conflict detected" |
| `UNPROCESSABLE_ENTITY` | 422         | Request understood but cannot process | "Cannot save candidate already saved"              |
| `RATE_LIMIT_EXCEEDED`  | 429         | Too many requests                     | "5 generation requests per minute allowed"         |
| `SERVICE_UNAVAILABLE`  | 503         | LLM or scheduler service down         | "Generation service temporarily unavailable"       |
| `GATEWAY_TIMEOUT`      | 504         | LLM request timed out                 | "Generation took too long; please retry"           |

---

## 8. Implementation Notes

1. **Supabase Integration**:
   - Use `context.locals.supabase` (from Astro middleware) in API routes instead of importing `supabaseClient` directly
   - Use `SupabaseClient` type from `src/db/supabase.client.ts`, not from `@supabase/supabase-js`
   - Leverage Supabase Auth directly for session management via JWT tokens
2. **API Framework**: Astro API Routes (since project uses Astro 5); route handlers in `/src/pages/api/`
3. **Request Validation**: Use Zod or similar TypeScript validation library for validating request bodies against database types
4. **Error Handling**: Custom error classes for consistent error response formatting aligned with error code reference
5. **Logging**: Implement structured logging (e.g., pino) for audit trails and debugging; never log sensitive fields (passwords, source text)
6. **Monitoring**: Track generation success rates, response times, and LLM costs; alert on exceeded thresholds
7. **Security Headers**: CORS configured for frontend origin; security headers (CSP, X-Frame-Options, Strict-Transport-Security)
8. **API Documentation**: Use OpenAPI/Swagger for auto-generated docs (optional for MVP)
9. **Type Safety**: Leverage generated types from `database.types.ts` in all API handlers to ensure request/response consistency
