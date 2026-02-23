## 2025-05-15 - Reusable Image Upload Validation
**Vulnerability:** Unrestricted file uploads allow users to upload non-image files or massive files, potentially causing client-side Denial of Service (DoS) or resource exhaustion.
**Learning:** `input[type="file"]`'s `accept` attribute is only a UI hint and does not prevent users from selecting invalid files. Client-side validation is necessary before reading files into memory.
**Prevention:** Use a reusable validation function (like `validateImageUpload`) that checks `file.size` and `file.type` before processing any file upload.
