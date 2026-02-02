# API Documentation

This document outlines the usage of the creation APIs for Patients, Packages, and Payments.

## Authentication
All endpoints require a valid JWT Access Token.
**Header:** `Authorization: Bearer <your_access_token>`

---

## 1. Create Patient API

**Endpoint:** `POST /patients`

**Description:** Creates a new patient record. Supports file uploads (optional).

**Authorization roles:** `ADMIN`, `RECEPTIONIST`

**Request Body (FormData):**
Since this endpoint supports file uploads, use `multipart/form-data`.

| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `registrationNumber` | String | Yes | Length 1-50 | Unique registration ID for the patient. |
| `name` | String | Yes | Length 1-100 | Full name of the patient. |
| `age` | Number | Yes | Min 0, Max 120 | Age of the patient. |
| `gender` | Enum | Yes | `MALE`, `FEMALE`, `OTHER` | Gender of the patient. |
| `mobile` | String | Yes | Must match `/^[6-9]\d{9}$/` | Valid Indian mobile number. |
| `referredDoctor` | String | No | - | Name of the referring doctor. |
| `files` | File[] | No | Max 10 files | Optional documents to attach. |

**Example Request (cURL):**
```bash
curl -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer <token>" \
  -F "registrationNumber=REG123" \
  -F "name=John Doe" \
  -F "age=30" \
  -F "gender=MALE" \
  -F "mobile=9876543210" \
  -F "referredDoctor=Dr. Smith"
  # -F "files=@/path/to/file1.pdf"
```

**Response (Success):**
Returns the created patient object.

---

## 2. Create Package API

**Endpoint:** `POST /packages`

**Description:** Creates a treatment package for a specific patient.

**Request Body (JSON):**

| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `patientId` | UUID | Yes | Valid UUID | ID of the patient. |
| `visitType` | String | Yes | - | Type of visit (e.g., "Home", "Clinic"). |
| `packageName` | String | Yes | - | Name of the package. |
| `originalAmount` | Number | Yes | Min 0, Number | Base price of the package. |
| `discountAmount` | Number | Yes | Min 0, Number | Discount applied. |
| `totalAmount` | Number | Yes | Min 0, Number | Final price after discount. |
| `totalSessions` | Number | Yes | Min 1, Integer | Total number of sessions included. |
| `perSessionAmount` | Number | Yes | Min 1, Number | Cost allocated per session. |

**Example Request (JSON):**
```json
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "visitType": "Clinic",
  "packageName": "Physio Recovery",
  "originalAmount": 5000,
  "discountAmount": 500,
  "totalAmount": 4500,
  "totalSessions": 10,
  "perSessionAmount": 450
}
```

**Response (Success):**
Returns the created package details.

---

## 3. Create Payment API

**Endpoint:** `POST /payments`

**Description:** Records a payment for a specific package. This endpoint is idempotent.

**Headers:**
*   `Authorization`: Bearer <token>
*   `idempotency-key`: <unique-string-uuid> (Required)

**Request Body (JSON):**

| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `patientId` | UUID | Yes | Valid UUID | ID of the patient making the payment. |
| `packageId` | UUID | Yes | Valid UUID | ID of the package being paid for. |
| `amountPaid` | Number | Yes | Min 1 | Amount being paid. |
| `paymentMode` | Enum | Yes | `CASH`, `ONLINE`, `UPI`, `CARD` | Mode of payment. |
| `paymentDate` | DateString | Yes | ISO 8601 Date | Date of payment (e.g., "2023-10-27T10:00:00Z"). |

**Example Request (JSON):**
```json
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "packageId": "660e8400-e29b-41d4-a716-446655440000",
  "amountPaid": 1000,
  "paymentMode": "CASH",
  "paymentDate": "2023-10-27T10:00:00.000Z"
}
```

**Response (Success):**
Returns the created payment record.

---

## 4. Upload Patient Documents API

**Endpoint:** `POST /patients/:patientId/documents`

**Description:** Uploads one or more documents for a specific patient.

**Authorization roles:** `ADMIN`, `RECEPTIONIST`

**Headers:**
*   `Authorization`: `Bearer <your_access_token>`

**Path Parameters:**
*   `patientId`: UUID of the patient.

**Request Body (FormData):**
This endpoint requires `multipart/form-data`.

| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `files` | File[] | Yes | Max 10 files. Max 5MB each. | List of files to upload. Allowed: `jpg`, `jpeg`, `png`, `pdf`. |

**Example Request (cURL):**
```bash
curl -X POST "{{prod_base_url}}/patients/{{patient_id}}/documents" \
  -H "Authorization: Bearer <token>" \
  -F "files=@/path/to/report.pdf" \
  -F "files=@/path/to/scan.jpg"
```

**Response (Success):**
Returns a JSON object containing the success status and the list of uploaded document details.

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "fileName": "report.pdf",
      "fileType": "application/pdf",
      "fileUrl": "https://res.cloudinary.com/...",
      "fileSize": 102400,
      "documentType": "REPORT",
      "uploadedAt": "2023-10-27T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

*   **400 Bad Request:** "No files provided", "Invalid file type", or "File too large".
*   **401 Unauthorized:** Invalid or missing token.
*   **403 Forbidden:** User does not have `ADMIN` or `RECEPTIONIST` role.

---

## 5. Hard Delete Patient API

**Endpoint:** `DELETE /patients/:id/hard`

**Description:** Permanently deletes a patient and all their associated data (documents, payments, sessions, packages, etc.) from the database and Cloudinary. **This action is irreversible.**

**Authorization roles:** `ADMIN`

**Headers:**
*   `Authorization`: `Bearer <your_access_token>`

**Path Parameters:**
*   `id`: UUID of the patient to delete.

**Example Request (cURL):**
```bash
curl -X DELETE "{{prod_base_url}}/patients/{{patient_id}}/hard" \
  -H "Authorization: Bearer <token>"
```

**Response (Success):**
Returns a success object.

```json
{
  "success": true
}
```

**Error Responses:**
*   **401 Unauthorized:** Invalid or missing token.
*   **403 Forbidden:** User does not have `ADMIN` role.
*   **404 Not Found:** Patient not found.

