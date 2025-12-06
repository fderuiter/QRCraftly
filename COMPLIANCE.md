# Privacy and Compliance

## HIPAA Compliance Alignment

This application is designed to support HIPAA-compliant workflows through a **Zero Knowledge Client-Side Architecture**.

### 1. Data Privacy (The "Won't Use Your Data" Guarantee)
*   **Local Processing:** All QR code generation happens locally within the user's browser using HTML5 Canvas and JavaScript.
*   **No Data Transmission:** The data you enter to generate a QR code (which may include PHI) is **never sent to our servers**. It remains strictly in your device's memory.
*   **Volatile Memory:** Data entered into the application is cleared when the browser tab is closed or refreshed.

### 2. Logging & Metrics Policy
To maintain security, performance, and legal accountability, we collect basic access logs. However, our architecture ensures this **does not compromise PHI**.

*   **What IS Logged:**
    *   IP Address (for security auditing).
    *   User Agent (browser/device type).
    *   Request Path (e.g., `/`, `/about` - which are static).
    *   Timestamp.
*   **What is NOT Logged:**
    *   **User Input:** Since the application runs client-side, the text, URLs, or WiFi passwords you type are never part of the HTTP request to the server.
    *   **Generated Images:** The QR codes created are generated in the browser and never uploaded.

### 3. Technical Safeguards
*   **HTTPS:** All connections are secured via HTTPS.
*   **State Isolation:** The application does not store user input in URL query parameters (e.g., `?data=...`), ensuring that sensitive data does not leak into browser history, proxy logs, or server access logs.

## Certification Note

While this software is architected to support HIPAA compliance by preventing PHI from reaching the server, "HIPAA Certification" is a process that applies to the *organization* and its *practices*. This tool provides the *technical safeguards* to allow you to use it within a compliant environment legally, provided you ensure the physical security of the client device.
